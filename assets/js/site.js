/* ShoePartner — comportements du site.
   Détection de visibilité manuelle (getBoundingClientRect + heartbeat) plutôt
   qu'IntersectionObserver : fonctionne aussi dans les webviews où les
   observers et requestAnimationFrame sont bridés. */
(function(){
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- menu mobile ---------- */
  var burger = document.querySelector('.burger');
  var mnav = document.querySelector('.mnav');
  if(burger && mnav){
    var setMenu = function(open){
      mnav.classList.toggle('open', open);
      mnav.setAttribute('aria-hidden', String(!open));
      burger.setAttribute('aria-expanded', String(open));
      document.body.classList.toggle('lock', open);
    };
    burger.addEventListener('click', function(){ setMenu(!mnav.classList.contains('open')); });
    var closeBtn = mnav.querySelector('.close');
    if(closeBtn) closeBtn.addEventListener('click', function(){ setMenu(false); });
    [].forEach.call(mnav.querySelectorAll('a'), function(a){
      a.addEventListener('click', function(){ setMenu(false); });
    });
    document.addEventListener('keydown', function(e){
      if(e.key === 'Escape' && mnav.classList.contains('open')) setMenu(false);
    });
  }

  /* ---------- mémoire de la langue ----------
     L'arabe est la langue principale du site. On retient le choix contraire
     pour que la page d'accueil s'ouvre directement en français au retour
     — la bascule elle-même reste toujours visible dans l'en-tête. */
  [].forEach.call(document.querySelectorAll('.lang,.lang-m'), function(a){
    a.addEventListener('click', function(){
      try{ localStorage.setItem('sp-lang', a.getAttribute('hreflang') || 'ar'); }catch(e){}
    });
  });

  /* ---------- onglets (maquette plateforme) ---------- */
  var tabs = [].slice.call(document.querySelectorAll('.ptab'));
  var panels = [].slice.call(document.querySelectorAll('.ppanel'));
  var cur = 0, auto = null;
  function showTab(i){
    cur = i;
    tabs.forEach(function(t, j){
      t.classList.toggle('on', j === i);
      t.setAttribute('aria-selected', String(j === i));
    });
    panels.forEach(function(p, j){ p.classList.toggle('on', j === i); });
  }
  tabs.forEach(function(t, i){
    t.addEventListener('click', function(){
      if(auto){ clearInterval(auto); auto = null; }
      showTab(i);
    });
  });

  /* ---------- accordéon ---------- */
  [].forEach.call(document.querySelectorAll('.acc-b'), function(btn){
    btn.addEventListener('click', function(){
      var item = btn.closest('.acc-i');
      var panel = item.querySelector('.acc-p');
      var open = item.classList.contains('open');
      // un seul ouvert à la fois par accordéon
      var group = item.closest('.acc');
      if(group) [].forEach.call(group.querySelectorAll('.acc-i.open'), function(o){
        o.classList.remove('open');
        o.querySelector('.acc-p').style.maxHeight = '';
        o.querySelector('.acc-b').setAttribute('aria-expanded','false');
      });
      if(!open){
        item.classList.add('open');
        panel.style.maxHeight = panel.scrollHeight + 'px';
        btn.setAttribute('aria-expanded','true');
      }
    });
  });

  /* ---------- compteurs ---------- */
  function fmt(n){
    return n >= 1000 ? String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : String(n);
  }
  function startCount(el){
    var target = parseInt(el.getAttribute('data-n'), 10);
    /* data-raw : pas de séparateur de milliers — une année s'écrit 2018, pas 2 018 */
    var show = el.hasAttribute('data-raw') ? String : fmt;
    if(reduced){ el.textContent = show(target); return; }
    var t0 = Date.now();
    var iv = setInterval(function(){
      var p = Math.min((Date.now() - t0) / 1400, 1);
      p = 1 - Math.pow(1 - p, 3);
      el.textContent = show(Math.round(target * p));
      if(p >= 1) clearInterval(iv);
    }, 16);
  }

  /* ---------- balayage : révélations, compteurs, header, retour-haut ---------- */
  var pendingRv = [].slice.call(document.querySelectorAll('.rv'));
  var pendingN  = [].slice.call(document.querySelectorAll('[data-n]'));
  var header    = document.querySelector('header.site');
  var toTop     = document.querySelector('.totop');
  var browserEl = document.querySelector('.browser');

  function sweep(){
    var vh = window.innerHeight || document.documentElement.clientHeight;
    var sy = window.scrollY || document.documentElement.scrollTop;

    pendingRv = pendingRv.filter(function(el){
      var r = el.getBoundingClientRect();
      if(r.top < vh * 0.93 && r.bottom > 0){ el.classList.add('in'); return false; }
      return true;
    });

    pendingN = pendingN.filter(function(el){
      var r = el.getBoundingClientRect();
      if(r.top < vh * 0.93 && r.bottom > 0){ startCount(el); return false; }
      return true;
    });

    if(header) header.classList.toggle('stuck', sy > 8);
    if(toTop)  toTop.classList.toggle('on', sy > vh * 0.9);

    if(browserEl && tabs.length && !reduced){
      var br = browserEl.getBoundingClientRect();
      var visible = br.top < vh * 0.82 && br.bottom > vh * 0.18;
      if(visible && !auto){
        auto = setInterval(function(){ showTab((cur + 1) % tabs.length); }, 4800);
      } else if(!visible && auto){
        clearInterval(auto); auto = null;
      }
    }
  }

  window.addEventListener('scroll', sweep, {passive:true});
  window.addEventListener('resize', sweep, {passive:true});
  window.addEventListener('load', sweep);
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', sweep);
  else sweep();
  setInterval(sweep, 700);   /* filet : rien ne doit rester invisible */

  if(toTop) toTop.addEventListener('click', function(){
    window.scrollTo({top:0, behavior: reduced ? 'auto' : 'smooth'});
  });

  /* ---------- WhatsApp : construction d'un lien prérempli ---------- */
  var WA = '212661474232';
  function waLink(text){ return 'https://wa.me/' + WA + '?text=' + encodeURIComponent(text); }

  /* ---------- formulaire de devis → message WhatsApp ---------- */
  var form = document.querySelector('form[data-quote]');
  if(form){
    /* ?sujet=cuir présélectionne le besoin */
    try{
      var sujet = new URLSearchParams(location.search).get('sujet');
      var sel = form.querySelector('select#f-sujet');
      if(sujet && sel && sel.querySelector('option[value="' + sujet + '"]')) sel.value = sujet;
    }catch(e){}
    form.addEventListener('submit', function(e){
      e.preventDefault();
      var ok = true;
      [].forEach.call(form.querySelectorAll('[required]'), function(inp){
        var field = inp.closest('.field');
        var bad = !inp.value.trim();
        field.classList.toggle('bad', bad);
        if(bad && ok){ inp.focus(); ok = false; }
      });
      if(!ok) return;
      var lines = [form.getAttribute('data-intro') || ''];
      [].forEach.call(form.querySelectorAll('input,select,textarea'), function(inp){
        if(!inp.value.trim()) return;
        var lab = form.querySelector('label[for="' + inp.id + '"]');
        var name = lab ? lab.childNodes[0].textContent.trim() : inp.name;
        var val = inp.tagName === 'SELECT' ? inp.options[inp.selectedIndex].text : inp.value.trim();
        lines.push('• ' + name + ' : ' + val);
      });
      window.open(waLink(lines.join('\n')), '_blank', 'noopener');
      form.style.display = 'none';
      var okBox = document.querySelector('.formok');
      if(okBox){
        okBox.classList.add('on');
        okBox.scrollIntoView({block:'center', behavior: reduced ? 'auto' : 'smooth'});
      }
    });
    [].forEach.call(form.querySelectorAll('input,select,textarea'), function(inp){
      inp.addEventListener('input', function(){
        var f = inp.closest('.field');
        if(f) f.classList.remove('bad');
      });
    });
  }

  /* ---------- configurateur de lot (page Chaussures) ---------- */
  var cfg = document.querySelector('[data-cfg]');
  if(cfg){
    var grid = cfg.querySelector('[data-sizes-grid]');
    var totalEl = cfg.querySelector('[data-cfg-total]');
    var send = cfg.querySelector('[data-cfg-send]');
    var nameEl = cfg.querySelector('[data-cfg-name]');
    var colorEl = cfg.querySelector('[data-cfg-color]');
    var explodeBtn = cfg.querySelector('[data-explode]');
    var models = [].slice.call(cfg.querySelectorAll('[data-model]'));
    var colors = [].slice.call(cfg.querySelectorAll('[data-color]'));
    var qty = {};   /* quantités gardées d'un modèle à l'autre */

    var cur = function(list){ return list.filter(function(b){ return b.classList.contains('on'); })[0] || list[0]; };
    function emit(){
      var m = cur(models), c = cur(colors);
      if(nameEl) nameEl.textContent = m.textContent;
      if(colorEl) colorEl.textContent = c.getAttribute('title');
      document.dispatchEvent(new CustomEvent('sp:config', {detail:{
        model: m.getAttribute('data-model'), color: c.getAttribute('data-color'),
        explode: explodeBtn && explodeBtn.getAttribute('aria-pressed') === 'true'
      }}));
      update();
    }
    function sizes(){
      var r = (cur(models).getAttribute('data-sizes') || '39-46').split('-');
      var out = []; for(var s = +r[0]; s <= +r[1]; s++) out.push(s); return out;
    }
    function buildGrid(){
      grid.innerHTML = '';
      sizes().forEach(function(s){
        var box = document.createElement('label'); box.className = 'size';
        box.innerHTML = '<span>' + s + '</span><input type="number" min="0" max="999" inputmode="numeric" placeholder="0" aria-label="' + s + '">';
        var inp = box.querySelector('input');
        if(qty[s]) inp.value = qty[s];
        inp.addEventListener('input', function(){ qty[s] = Math.max(0, parseInt(inp.value, 10) || 0); update(); });
        grid.appendChild(box);
      });
      update();
    }
    function update(){
      var tot = 0, parts = [];
      sizes().forEach(function(s, i){
        var q = qty[s] || 0; tot += q;
        var box = grid.children[i]; if(box) box.classList.toggle('has', q > 0);
        if(q) parts.push(s + ' × ' + q);
      });
      totalEl.textContent = tot;
      var d = cfg.dataset;
      var msg = [d.intro,
        '• ' + d.lModel + ' : ' + cur(models).textContent,
        '• ' + d.lColor + ' : ' + cur(colors).getAttribute('title'),
        '• ' + d.lSizes + ' : ' + (parts.join(', ') || '—'),
        '• ' + d.lTotal + ' : ' + tot + ' ' + d.lPairs].join('\n');
      send.href = waLink(msg);
      send.setAttribute('aria-disabled', tot ? 'false' : 'true');
    }
    send.addEventListener('click', function(e){
      if(totalEl.textContent === '0'){
        e.preventDefault();
        var first = grid.querySelector('input'); if(first) first.focus();
        grid.animate && grid.animate([{transform:'translateX(0)'},{transform:'translateX(-6px)'},{transform:'translateX(6px)'},{transform:'translateX(0)'}], {duration:300});
      }
    });
    /* série type : répartition en cloche centrée sur la pointure médiane */
    [].forEach.call(cfg.querySelectorAll('[data-run]'), function(b){
      b.addEventListener('click', function(){
        var n = +b.getAttribute('data-run'), ss = sizes();
        ss.forEach(function(s){ qty[s] = 0; });
        if(n){
          var mid = (ss.length - 1) / 2, w = ss.map(function(_, i){ return Math.exp(-Math.pow((i - mid) / (ss.length / 3.2), 2)); });
          var sum = w.reduce(function(a, b){ return a + b; }, 0), left = n;
          var alloc = w.map(function(x){ var q = Math.floor(n * x / sum); left -= q; return q; });
          var order = w.map(function(x, i){ return i; }).sort(function(a, b){ return w[b] - w[a]; });
          for(var k = 0; left > 0; k++, left--) alloc[order[k % order.length]]++;
          ss.forEach(function(s, i){ qty[s] = alloc[i]; });
        }
        buildGrid();
      });
    });
    models.forEach(function(b){ b.addEventListener('click', function(){
      models.forEach(function(x){ x.classList.toggle('on', x === b); }); buildGrid(); emit();
    }); });
    colors.forEach(function(b){ b.addEventListener('click', function(){
      colors.forEach(function(x){ x.classList.toggle('on', x === b); }); emit();
    }); });
    if(explodeBtn) explodeBtn.addEventListener('click', function(){
      explodeBtn.setAttribute('aria-pressed', String(explodeBtn.getAttribute('aria-pressed') !== 'true')); emit();
    });
    buildGrid(); emit();
  }

  /* ---------- 3D : filet de sécurité ----------
     Si le module 3D n'a pas démarré (navigateur ancien, WebGL coupé),
     les blocs basculent sur leur version fixe. */
  setTimeout(function(){
    [].forEach.call(document.querySelectorAll('[data-3d]'), function(el){
      if(!el.classList.contains('ready')) el.classList.add('no3d');
    });
  }, 5000);
})();
