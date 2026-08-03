/* Vectoriseur ShoePartner — trace les contours du logo bitmap vers des chemins SVG.
   Usage (console) :
     SP.load(cb) -> charge window.__DATAURI dans un canvas et classe les pixels
     SP.report() -> couleurs exactes + bandes de contenu
     SP.build(opts) -> renvoie { navy:"path", gold:"path", vb:[...] }
*/
(function(){
  'use strict';
  var SP = window.SP = {};

  /* ---------- classification ---------- */
  function classify(r, g, b){
    var lum = 0.299*r + 0.587*g + 0.114*b;
    if(lum > 225) return 0;      // fond
    if(b > r + 10) return 1;     // marine
    return 2;                    // or
  }

  SP.load = function(cb){
    var img = new Image();
    img.onload = function(){
      var W = img.naturalWidth, H = img.naturalHeight;
      var cv = document.createElement('canvas');
      cv.width = W; cv.height = H;
      var ctx = cv.getContext('2d', {willReadFrequently:true});
      ctx.drawImage(img, 0, 0);
      var d = ctx.getImageData(0, 0, W, H).data;
      var cm = new Uint8Array(W*H);
      for(var i=0, p=0; i<W*H; i++, p+=4) cm[i] = classify(d[p], d[p+1], d[p+2]);
      SP.W = W; SP.H = H; SP.cm = cm; SP.rgba = d; SP.ready = true;
      cb && cb();
    };
    img.onerror = function(){ SP.error = 'image load failed'; cb && cb(); };
    img.src = window.__DATAURI;
  };

  /* ---------- couleurs exactes (pixels intérieurs uniquement) ---------- */
  SP.pureColor = function(cls){
    var W=SP.W, H=SP.H, cm=SP.cm, d=SP.rgba;
    var r=0,g=0,b=0,n=0;
    for(var y=2;y<H-2;y++){
      for(var x=2;x<W-2;x++){
        var i=y*W+x;
        if(cm[i]!==cls) continue;
        // n'accepter que si tout le voisinage 5x5 est de la meme classe
        var ok=true;
        for(var dy=-2;dy<=2 && ok;dy++)
          for(var dx=-2;dx<=2;dx++)
            if(cm[(y+dy)*W+(x+dx)]!==cls){ ok=false; break; }
        if(!ok) continue;
        var p=i*4; r+=d[p]; g+=d[p+1]; b+=d[p+2]; n++;
      }
    }
    if(!n) return null;
    var R=Math.round(r/n), G=Math.round(g/n), B=Math.round(b/n);
    return {rgb:[R,G,B], hex:'#'+[R,G,B].map(function(v){return ('0'+v.toString(16)).slice(-2);}).join('').toUpperCase(), n:n};
  };

  /* ---------- bandes horizontales de contenu (separer marque / wordmark) ---------- */
  SP.bands = function(){
    var W=SP.W, H=SP.H, cm=SP.cm, out=[], inB=false, st=0;
    for(var y=0;y<H;y++){
      var c=0, base=y*W;
      for(var x=0;x<W;x++) if(cm[base+x]) c++;
      var on = c > 4;
      if(on && !inB){ inB=true; st=y; }
      else if(!on && inB){ inB=false; out.push([st, y-1]); }
    }
    if(inB) out.push([st, H-1]);
    return out;
  };

  SP.bbox = function(y0, y1){
    var W=SP.W, cm=SP.cm, minx=1e9, maxx=-1;
    for(var y=y0;y<=y1;y++){
      var base=y*W;
      for(var x=0;x<W;x++) if(cm[base+x]){ if(x<minx)minx=x; if(x>maxx)maxx=x; }
    }
    return {x0:minx, x1:maxx, y0:y0, y1:y1};
  };

  /* ---------- nettoyage : supprimer les composantes minuscules ---------- */
  function despeckle(m, W, H, minArea){
    var lab = new Int32Array(W*H).fill(-1), out = new Uint8Array(W*H);
    var stack = new Int32Array(W*H), comp = 0;
    for(var s=0;s<W*H;s++){
      if(m[s]!==1 || lab[s]!==-1) continue;
      var sp=0, area=0, cells=[];
      stack[sp++]=s; lab[s]=comp;
      while(sp){
        var i=stack[--sp]; cells.push(i); area++;
        var x=i%W, y=(i/W)|0;
        if(x>0   && m[i-1]===1 && lab[i-1]===-1){ lab[i-1]=comp; stack[sp++]=i-1; }
        if(x<W-1 && m[i+1]===1 && lab[i+1]===-1){ lab[i+1]=comp; stack[sp++]=i+1; }
        if(y>0   && m[i-W]===1 && lab[i-W]===-1){ lab[i-W]=comp; stack[sp++]=i-W; }
        if(y<H-1 && m[i+W]===1 && lab[i+W]===-1){ lab[i+W]=comp; stack[sp++]=i+W; }
      }
      if(area >= minArea) for(var c=0;c<cells.length;c++) out[cells[c]]=1;
      comp++;
    }
    return out;
  }

  /* combler les trous plus petits que minArea (bruit JPEG) */
  function fillHoles(m, W, H, minArea){
    var inv = new Uint8Array(W*H);
    for(var i=0;i<W*H;i++) inv[i] = m[i] ? 0 : 1;
    var lab = new Int32Array(W*H).fill(-1), stack = new Int32Array(W*H), comp=0;
    var out = m.slice();
    for(var s=0;s<W*H;s++){
      if(inv[s]!==1 || lab[s]!==-1) continue;
      var sp=0, cells=[], touchesEdge=false;
      stack[sp++]=s; lab[s]=comp;
      while(sp){
        var idx=stack[--sp]; cells.push(idx);
        var x=idx%W, y=(idx/W)|0;
        if(x===0||y===0||x===W-1||y===H-1) touchesEdge=true;
        if(x>0   && inv[idx-1]===1 && lab[idx-1]===-1){ lab[idx-1]=comp; stack[sp++]=idx-1; }
        if(x<W-1 && inv[idx+1]===1 && lab[idx+1]===-1){ lab[idx+1]=comp; stack[sp++]=idx+1; }
        if(y>0   && inv[idx-W]===1 && lab[idx-W]===-1){ lab[idx-W]=comp; stack[sp++]=idx-W; }
        if(y<H-1 && inv[idx+W]===1 && lab[idx+W]===-1){ lab[idx+W]=comp; stack[sp++]=idx+W; }
      }
      if(!touchesEdge && cells.length < minArea)
        for(var c=0;c<cells.length;c++) out[cells[c]]=1;
      comp++;
    }
    return out;
  }

  /* ---------- contours : aretes dirigees -> boucles fermees ---------- */
  function contours(m, W, H){
    function ins(x,y){ return (x<0||y<0||x>=W||y>=H) ? 0 : m[y*W+x]; }
    var edges = new Map();
    function add(ax,ay,bx,by){
      var k = ax+','+ay, a = edges.get(k);
      if(!a){ a=[]; edges.set(k,a); }
      a.push(bx+','+by);
    }
    for(var y=0;y<H;y++){
      for(var x=0;x<W;x++){
        if(!m[y*W+x]) continue;
        if(!ins(x,y-1)) add(x,y,     x+1,y);
        if(!ins(x+1,y)) add(x+1,y,   x+1,y+1);
        if(!ins(x,y+1)) add(x+1,y+1, x,y+1);
        if(!ins(x-1,y)) add(x,y+1,   x,y);
      }
    }
    var loops = [], keys = Array.from(edges.keys());
    for(var ki=0; ki<keys.length; ki++){
      var startKey = keys[ki];
      while(edges.has(startKey) && edges.get(startKey).length){
        var loop = [], curKey = startKey, guard = 0;
        while(guard++ < 2000000){
          var a = edges.get(curKey);
          if(!a || !a.length) break;
          var nxt = a.pop();
          if(!a.length) edges.delete(curKey);
          var pr = curKey.split(',');
          loop.push([+pr[0], +pr[1]]);
          curKey = nxt;
          if(curKey === startKey) break;
        }
        if(loop.length > 16) loops.push(loop);
      }
    }
    return loops;
  }

  /* ---------- Douglas-Peucker ---------- */
  function rdp(pts, eps){
    var n = pts.length;
    if(n < 4) return pts.slice();
    var keep = new Uint8Array(n);
    keep[0] = 1; keep[n-1] = 1;
    var stack = [[0, n-1]];
    while(stack.length){
      var sg = stack.pop(), a = sg[0], b = sg[1];
      if(b - a < 2) continue;
      var ax=pts[a][0], ay=pts[a][1], bx=pts[b][0], by=pts[b][1];
      var dx=bx-ax, dy=by-ay, len=Math.sqrt(dx*dx+dy*dy)||1;
      var best=-1, bd=eps;
      for(var i=a+1;i<b;i++){
        var d = Math.abs((pts[i][0]-ax)*dy - (pts[i][1]-ay)*dx) / len;
        if(d > bd){ bd = d; best = i; }
      }
      if(best > 0){ keep[best]=1; stack.push([a,best],[best,b]); }
    }
    var out=[];
    for(var i=0;i<n;i++) if(keep[i]) out.push(pts[i]);
    return out;
  }

  /* ---------- polygone ferme -> chemin cubique lisse, angles preserves ---------- */
  function toPath(P, tension, sharpDeg){
    var n = P.length;
    if(n < 3) return '';
    var k = tension / 6;
    var cosLim = Math.cos(sharpDeg * Math.PI / 180);
    var sharp = new Uint8Array(n);
    for(var i=0;i<n;i++){
      var p0=P[(i-1+n)%n], p1=P[i], p2=P[(i+1)%n];
      var ax=p1[0]-p0[0], ay=p1[1]-p0[1], bx=p2[0]-p1[0], by=p2[1]-p1[1];
      var la=Math.sqrt(ax*ax+ay*ay)||1, lb=Math.sqrt(bx*bx+by*by)||1;
      var dot = (ax*bx + ay*by) / (la*lb);
      sharp[i] = dot < cosLim ? 1 : 0;   // virage serre -> angle vif
    }
    function f(v){ return (Math.round(v*100)/100); }
    var d = 'M' + f(P[0][0]) + ' ' + f(P[0][1]);
    for(var i=0;i<n;i++){
      var p0=P[(i-1+n)%n], p1=P[i], p2=P[(i+1)%n], p3=P[(i+2)%n];
      var segx = p2[0]-p1[0], segy = p2[1]-p1[1];
      var segLen = Math.sqrt(segx*segx + segy*segy) || 1;
      var c1x, c1y, c2x, c2y;
      if(sharp[i]){ c1x=p1[0]; c1y=p1[1]; }
      else {
        c1x = p1[0] + (p2[0]-p0[0])*k;
        c1y = p1[1] + (p2[1]-p0[1])*k;
        var h1 = Math.sqrt((c1x-p1[0])*(c1x-p1[0]) + (c1y-p1[1])*(c1y-p1[1]));
        var mx = segLen/3;
        if(h1 > mx){ var s=mx/h1; c1x=p1[0]+(c1x-p1[0])*s; c1y=p1[1]+(c1y-p1[1])*s; }
      }
      var j = (i+1)%n;
      if(sharp[j]){ c2x=p2[0]; c2y=p2[1]; }
      else {
        c2x = p2[0] - (p3[0]-p1[0])*k;
        c2y = p2[1] - (p3[1]-p1[1])*k;
        var h2 = Math.sqrt((c2x-p2[0])*(c2x-p2[0]) + (c2y-p2[1])*(c2y-p2[1]));
        var mx2 = segLen/3;
        if(h2 > mx2){ var s2=mx2/h2; c2x=p2[0]+(c2x-p2[0])*s2; c2y=p2[1]+(c2y-p2[1])*s2; }
      }
      d += 'C' + f(c1x)+' '+f(c1y)+' '+f(c2x)+' '+f(c2y)+' '+f(p2[0])+' '+f(p2[1]);
    }
    return d + 'Z';
  }

  /* ---------- pipeline ---------- */
  SP.build = function(o){
    o = o || {};
    var eps = o.eps || 4, tension = o.tension === undefined ? 0.95 : o.tension;
    var sharpDeg = o.sharpDeg || 52, side = o.side || 200;
    var b = o.box;
    var W = b.x1-b.x0+1, H = b.y1-b.y0+1;

    // echelle vers viewBox carre, centre
    var sc = side / Math.max(W, H);
    var ox = (side - W*sc)/2, oy = (side - H*sc)/2;

    function mask(cls){
      var m = new Uint8Array(W*H);
      for(var y=0;y<H;y++)
        for(var x=0;x<W;x++)
          m[y*W+x] = (SP.cm[(y+b.y0)*SP.W + (x+b.x0)] === cls) ? 1 : 0;
      m = despeckle(m, W, H, o.minArea || 90);
      m = fillHoles(m, W, H, o.minHole || 90);
      return m;
    }

    function pathFor(cls){
      var m = mask(cls);
      var loops = contours(m, W, H);
      var parts = [], pts = 0;
      loops.forEach(function(L){
        var s = rdp(L, eps);
        if(s.length < 5) return;
        var P = s.map(function(p){ return [p[0]*sc+ox, p[1]*sc+oy]; });
        parts.push(toPath(P, tension, sharpDeg));
        pts += P.length;
      });
      return {d: parts.join(''), loops: loops.length, pts: pts};
    }

    return { navy: pathFor(1), gold: pathFor(2), side: side, srcW: W, srcH: H };
  };
})();
