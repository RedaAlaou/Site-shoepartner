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

  /* ---------- formulaire de devis (validation côté client) ---------- */
  var form = document.querySelector('form[data-quote]');
  if(form){
    form.addEventListener('submit', function(e){
      e.preventDefault();
      var ok = true;
      [].forEach.call(form.querySelectorAll('[required]'), function(inp){
        var field = inp.closest('.field');
        var bad = !inp.value.trim() || (inp.type === 'email' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(inp.value));
        field.classList.toggle('bad', bad);
        if(bad && ok){ inp.focus(); ok = false; }
      });
      if(!ok) return;
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
})();
