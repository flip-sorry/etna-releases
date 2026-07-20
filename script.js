/* Etna landing — scroll choreography + notch timer.
   No dependencies. The page is complete without JS (hero at p=0).

   Choreography (mirrors the app's native island → panel morph):
     p 0.00–0.25  the half-closed lid swings open; screen glow leaves the deck
     p 0.26–0.38  brand fades out
     p 0.28–0.52  MacBook scales up about its notch and settles with its top
                  edge TOP_PAD from the viewport top — the Mac stays visible
     p 0.55–0.75  the notch island morphs into the panel: a clip-path grows
                  from the island's exact rect to the full panel (bottom
                  radius 10 → 38), content fades in
     p 0.82–0.97  the copy hands off to the transcript dialogue (bubbles
                  stagger in, app-style); the Download capsule stays put */
(function () {
  'use strict';

  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduced) {
    document.querySelectorAll('.meet video').forEach(function (v) {
      v.removeAttribute('autoplay');
      v.pause();
    });
  }

  /* ---------- meeting timer (tiny island + panel strip) ---------- */
  if (!reduced) {
    var timers = document.querySelectorAll('.js-timer');
    var t0 = 7;
    var tick = function () {
      var m = Math.floor(t0 / 60), s = t0 % 60;
      var text = (m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s);
      timers.forEach(function (el) { el.textContent = text; });
      t0++;
    };
    tick();
    setInterval(tick, 1000);
  }

  /* ---------- scroll-driven morph ---------- */
  var zoom     = document.getElementById('zoom');
  var sticky   = document.getElementById('sticky');
  var hero     = document.getElementById('hero');
  var macbook  = document.getElementById('macbook');
  var island   = document.getElementById('mockIsland');
  var panelPos = document.getElementById('panelPos');
  var panel    = document.getElementById('panel');
  var panelBody  = panel.querySelector('.panel__body');
  var panelStrip = panel.querySelector('.panel__strip');
  var panelCopy  = panel.querySelector('.panel__copy');
  var dialogEl   = panel.querySelector('.panel__dialog');
  var dlgScroll  = document.getElementById('dlgScroll');
  var msgs       = panel.querySelectorAll('.panel__dialog .msg');
  var msgBubbles = [], msgTexts = [];
  msgs.forEach(function (el) {
    var b = el.querySelector('b');
    msgBubbles.push(b);
    msgTexts.push(b.textContent);
  });
  var zoomFade   = document.getElementById('zoomFade');
  var aurora     = document.getElementById('aurora');
  var islandBits = island.querySelectorAll('.wave, .timer');
  var lid  = macbook.querySelector('.mb-lid');
  var glow = macbook.querySelector('.mb-glow');
  var veil = macbook.querySelector('.mb-veil');
  var brand = hero.querySelector('.hero__brand');

  var BRAND_BIG = 2.4;       // brand scale while the lid is shut
  var BRAND_MID = 0.46;      // …centered at this fraction of the viewport

  var TOP_PAD = 120;         // Mac top edge rests here — the Mac stays readable
  var PANEL_VH = 0.62;       // opened panel ≈ 62% of the viewport height
  var PANEL_W = 365;         // panel layout width (app pt)
  var LID_CLOSED = 88;       // hero lid angle — nearly shut, a luminous slit
  /* the dialogue owns nearly half the 780vh track, so each streamed turn
     gets ~30vh of scroll — deliberately low scroll-sensitivity */
  var LID0 = 0.00, LID1 = 0.18;      // lid-opening window
  var MAC0 = 0.20, MAC1 = 0.37;      // Mac move window
  var MORPH0 = 0.39, MORPH1 = 0.53;  // island → panel morph window
  var DIA0 = 0.56, DIA1 = 1.00;      // copy → dialogue handoff window

  var small = function () { return innerWidth < 768 || innerHeight < 600; };

  if (reduced || small()) {
    document.body.classList.add('no-zoom');
    // static layout hides the Mac — abort the meeting-video downloads
    document.querySelectorAll('.meet video').forEach(function (v) {
      v.removeAttribute('autoplay');
      v.removeAttribute('src');
      v.load();
    });
    if (reduced) return;
  }

  var m = null;

  function measure() {
    if (document.body.classList.contains('no-zoom')) return;
    var prevM = macbook.style.transform;
    var prevL = lid.style.transform;
    var prevB = brand.style.transform;
    macbook.style.transform = 'none';
    lid.style.transform = 'none';           // measure with the lid open
    brand.style.transform = 'none';
    panel.style.zoom = '1';
    var st = sticky.getBoundingClientRect();
    var n  = island.getBoundingClientRect();
    var mb = macbook.getBoundingClientRect();
    var br = brand.getBoundingClientRect();
    var panelH = panel.offsetHeight;
    macbook.style.transform = prevM;
    lid.style.transform = prevL;
    brand.style.transform = prevB;

    // slide needed to center the big lockup mid-viewport while shut
    var brandTy = Math.max(0,
      BRAND_MID * innerHeight - (br.top - st.top) - br.height * BRAND_BIG / 2);

    var pz = Math.min(1.8, Math.max(1, (innerHeight * PANEL_VH) / panelH));
    panel.style.zoom = String(pz);

    // Mac end scale: zoom until the island reaches true panel proportions —
    // the mock island (285 app-pt wide) must land at exactly 285×pz visual px,
    // so the 285→365 island→panel morph happens at the app's native ratio.
    // The Mac's sides may crop; its top stays at TOP_PAD.
    var sF = pz / (n.width / 285);

    var originX = n.left - mb.left + n.width / 2;   // island center, Mac-local
    var originY = n.top - mb.top + n.height / 2;
    macbook.style.transformOrigin = originX + 'px ' + originY + 'px';

    m = {
      brandTy: brandTy,
      stW: st.width,
      notchX0: n.left - st.left + n.width / 2,      // island center, sticky coords
      notchY0: n.top - st.top + n.height / 2,
      originY: originY,
      sF: sF,
      pz: pz,
      panelH: panelH,
      // island rect mapped into the panel's local (pre-zoom) coordinates
      wi: n.width * sF / pz,
      hi: n.height * sF / pz,
      r0: (n.width / 285 * 10) * sF / pz
    };

    // the panel's strip top coincides with the island top at the end state
    panelPos.style.top = (TOP_PAD + (originY - n.height / 2) * sF) + 'px';
  }

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function map(p, a, b) { return clamp01((p - a) / (b - a)); }
  function ease(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function lerp(a, b, t) { return a + (b - a) * t; }

  var forceP = null;   // QA: overrides scroll-derived progress when set

  function render() {
    var track = zoom.offsetHeight - innerHeight;
    var p = forceP !== null ? forceP
          : clamp01(-zoom.getBoundingClientRect().top / track);

    /* lid: swings open from half-closed; screen glow drains off the deck */
    var l = ease(map(p, LID0, LID1));
    lid.style.transform = l >= 1 ? 'none'
      : 'rotateX(' + (-LID_CLOSED * (1 - l)) + 'deg)';
    glow.style.opacity = String(1 - l);
    /* the wash is a grazing-angle effect — gone once the screen is readable */
    veil.style.opacity = String(1 - map(l, 0, 0.35));

    /* brand: big at mid-screen while shut; lifts home and shrinks as the
       lid opens, then the whole hero fades */
    brand.style.transform = 'translateY(' + lerp(m.brandTy, 0, l) + 'px) ' +
      'scale(' + lerp(BRAND_BIG, 1, l) + ')';
    var h = map(p, 0.19, 0.27);
    hero.style.opacity = String(1 - h);
    hero.style.transform = 'translateY(' + (-24 * h) + 'px)';

    /* Mac: scale about the notch, settle with its top at TOP_PAD */
    var z = ease(map(p, MAC0, MAC1));
    var s = lerp(1, m.sF, z);
    var tx = z * (m.stW / 2 - m.notchX0);
    var ty = z * (TOP_PAD + m.originY * m.sF - m.notchY0);
    macbook.style.transform =
      'translate3d(' + tx + 'px,' + ty + 'px,0) scale(' + s + ')';
    zoomFade.style.opacity = String(z);   // melt the Mac's cut edge as it grows
    aurora.style.opacity = String(z);     // backdrop lights up as the Mac fills

    /* island → panel morph */
    var f = ease(map(p, MORPH0, MORPH1));
    if (p < MORPH0) {
      panelPos.style.visibility = 'hidden';
      islandBits.forEach(function (el) { el.style.opacity = ''; });
    } else {
      panelPos.style.visibility = 'visible';
      // island's own waveform/timer hand over to the panel strip
      islandBits.forEach(function (el) {
        el.style.opacity = String(1 - map(f, 0, 0.3));
      });
      if (f >= 1) {
        panel.style.clipPath = 'none';
      } else {
        // side insets end at -8px so the concave ears emerge as the panel
        // reaches full width (they sit just outside the border box)
        var ix = (PANEL_W - lerp(m.wi, PANEL_W, f)) / 2 - 8 * f;
        var ib = m.panelH - lerp(m.hi, m.panelH, f);
        var r  = lerp(m.r0, 38, f);   // ends concentric with the CTA pill
        panel.style.clipPath = 'inset(0px ' + ix + 'px ' + ib + 'px ' + ix +
          'px round 0 0 ' + r + 'px ' + r + 'px)';
      }
      panelStrip.style.opacity = String(map(f, 0, 0.3));
      panelBody.style.opacity  = String(map(f, 0.45, 1));

      /* copy → dialogue: the headline block exits COMPLETELY first, then
         bubbles start on plain black — the two never share the stage */
      var d = ease(map(p, DIA0, DIA1));
      var cOut = map(d, 0, 0.12);
      panelCopy.style.opacity = String(1 - cOut);
      panelCopy.style.transform = 'translateY(' + (10 * cOut) + 'px)';
      /* turns stream in one at a time: the bubble pops, then its text
         types on with the scroll (like the app's live partials); the feed
         follows the live edge once it outgrows the panel */
      var start = 0.16;   // bubbles begin only after the copy is fully out
      var slot = (1 - start) / msgs.length;
      var off = 0;
      msgs.forEach(function (el, i) {
        var t = map(d, start + i * slot, start + (i + 1) * slot);
        el.style.opacity = String(map(t, 0, 0.15));
        el.style.transform = 'translateY(' + (6 * (1 - map(t, 0, 0.3))) + 'px)';
        var want = msgTexts[i].slice(0,
          Math.round(msgTexts[i].length * map(t, 0.08, 0.96)));
        if (msgBubbles[i].textContent !== want) msgBubbles[i].textContent = want;
        if (t > 0) {
          var need = el.offsetTop + el.offsetHeight - dialogEl.clientHeight;
          if (need > off) off = need;
        }
      });
      dlgScroll.style.transform = 'translateY(' + (-off) + 'px)';
    }
    panel.style.pointerEvents = f > 0.6 ? 'auto' : 'none';
  }

  var dirty = true, rafId = null;

  function loop() {
    if (dirty) { dirty = false; render(); }
    rafId = requestAnimationFrame(loop);
  }

  addEventListener('scroll', function () { dirty = true; }, { passive: true });

  function clearDriven() {
    [hero, brand, macbook, panel, panelPos, panelBody, panelStrip, panelCopy].forEach(function (el) {
      el.style.opacity = ''; el.style.transform = '';
      el.style.pointerEvents = ''; el.style.visibility = '';
    });
    msgs.forEach(function (el, i) {
      el.style.opacity = ''; el.style.transform = '';
      msgBubbles[i].textContent = msgTexts[i];
    });
    dlgScroll.style.transform = '';
    islandBits.forEach(function (el) { el.style.opacity = ''; });
    zoomFade.style.opacity = '';
    aurora.style.opacity = '';
    lid.style.transform = '';
    glow.style.opacity = '';
    veil.style.opacity = '';
    macbook.style.transformOrigin = '';
    panel.style.clipPath = '';
    panel.style.zoom = '';
    panelPos.style.top = '';
  }

  var resizeT = null;
  addEventListener('resize', function () {
    clearTimeout(resizeT);
    resizeT = setTimeout(function () {
      var wasStatic = document.body.classList.contains('no-zoom');
      var nowStatic = small();
      document.body.classList.toggle('no-zoom', nowStatic);
      if (nowStatic && !wasStatic) clearDriven();
      if (!nowStatic) { measure(); dirty = true; }
    }, 120);
  });

  new IntersectionObserver(function (entries) {
    var on = entries[0].isIntersecting && !document.body.classList.contains('no-zoom');
    if (on && rafId === null) {
      macbook.style.willChange = 'transform';
      panel.style.willChange = 'clip-path';
      dirty = true;
      rafId = requestAnimationFrame(loop);
    } else if (!on && rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
      macbook.style.willChange = '';
      panel.style.willChange = '';
    }
  }).observe(zoom);

  if (!document.body.classList.contains('no-zoom')) {
    measure();
    render();
  }

  /* debug/QA hook: window.__etna.setP(0.7) jumps the choreography to p;
     #p=0.7 in the URL forces that state without scrolling (headless QA) */
  window.__etna = {
    setP: function (pp) {
      var track = zoom.offsetHeight - innerHeight;
      window.scrollTo({ top: track * pp, behavior: 'instant' });
      if (m) render();
    },
    remeasure: function () { measure(); if (m) render(); }
  };
  var qa = location.hash.match(/p=([\d.]+)/);
  if (qa && m) { forceP = clamp01(parseFloat(qa[1])); render(); }
})();
