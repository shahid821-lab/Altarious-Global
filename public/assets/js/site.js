/* Altarious Global — interaction layer.
   Progressive enhancement only: every page works with JS disabled (except form POST).
   No dependencies. IntersectionObserver + one rAF scroll loop. ~7KB. */
(function () {
  'use strict';
  var d = document, w = window;
  var $ = function (s, el) { return (el || d).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || d).querySelectorAll(s)); };
  var reduced = w.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var coarse = w.matchMedia('(pointer: coarse)').matches;

  /* ---------------- theme ---------------- */
  var root = d.documentElement;
  function setTheme(t, persist) {
    root.setAttribute('data-theme', t);
    if (persist) { try { localStorage.setItem('ag-theme', t); } catch (e) {} }
    var btn = $('.theme-toggle');
    if (btn) btn.setAttribute('aria-label', t === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
  }
  var toggle = $('.theme-toggle');
  if (toggle) {
    toggle.addEventListener('click', function () {
      var current = root.getAttribute('data-theme') || (w.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      setTheme(current === 'dark' ? 'light' : 'dark', true);
    });
    var stored = null;
    try { stored = localStorage.getItem('ag-theme'); } catch (e) {}
    setTheme(stored || root.getAttribute('data-theme') || (w.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'), false);
  }

  /* ---------------- navigation ---------------- */
  var navBtn = $('.nav-toggle'), nav = $('#site-nav');
  if (navBtn && nav) {
    navBtn.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      navBtn.setAttribute('aria-expanded', String(open));
      d.body.classList.toggle('nav-open', open);
    });
    $$('.dd-toggle', nav).forEach(function (b) {
      b.addEventListener('click', function () { b.parentElement.classList.toggle('expanded'); });
    });
    // close on navigation / escape
    $$('a', nav).forEach(function (a) { a.addEventListener('click', function () { nav.classList.remove('open'); navBtn.setAttribute('aria-expanded', 'false'); d.body.classList.remove('nav-open'); }); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && nav.classList.contains('open')) navBtn.click(); });
  }

  /* ---------------- reveal on scroll ----------------
     Driven by the shared scroll loop (below) so a missed IntersectionObserver
     callback can never leave content invisible. */
  var pending = $$('[data-reveal]');
  if (reduced) {
    pending.forEach(function (el) { el.classList.add('in'); });
    pending = [];
  } else {
    // auto-stagger siblings inside a grid
    $$('.grid').forEach(function (g) {
      $$('[data-reveal]', g).forEach(function (k, i) { if (!k.style.getPropertyValue('--i')) k.style.setProperty('--i', String(i % 4)); });
    });
  }
  function revealVisible() {
    if (!pending.length) return;
    var limit = w.innerHeight * 0.94, still = [];
    for (var i = 0; i < pending.length; i++) {
      var el = pending[i];
      if (el.getBoundingClientRect().top < limit) el.classList.add('in');
      else still.push(el);
    }
    pending = still;
  }

  /* ---------------- counters ---------------- */
  $$('[data-count]').forEach(function (el) {
    var target = parseFloat(el.getAttribute('data-count'));
    if (isNaN(target)) return;
    var suffix = el.getAttribute('data-suffix') || '';
    if (reduced || !('IntersectionObserver' in w)) { el.textContent = target + suffix; return; }
    var done = false;
    var o = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting || done) return;
        done = true; o.disconnect();
        var start = performance.now(), dur = 1500;
        (function tick(now) {
          var p = Math.min(1, (now - start) / dur);
          var eased = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(target * eased) + suffix;
          if (p < 1) requestAnimationFrame(tick);
        })(start);
      });
    }, { threshold: 0.5 });
    o.observe(el);
  });

  /* ---------------- sticky process steps ---------------- */
  var steps = $$('.step');
  if (steps.length && 'IntersectionObserver' in w) {
    var so = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { steps.forEach(function (s) { s.classList.remove('on'); }); e.target.classList.add('on'); }
      });
    }, { rootMargin: '-45% 0px -45% 0px' });
    steps.forEach(function (s) { so.observe(s); });
    steps[0].classList.add('on');
  }

  /* ---------------- 3D tilt ---------------- */
  if (!reduced && !coarse) {
    $$('.tilt').forEach(function (card) {
      var raf = null;
      card.addEventListener('pointermove', function (e) {
        if (raf) return;
        raf = requestAnimationFrame(function () {
          raf = null;
          var r = card.getBoundingClientRect();
          var px = (e.clientX - r.left) / r.width - 0.5;
          var py = (e.clientY - r.top) / r.height - 0.5;
          card.style.transform = 'perspective(900px) rotateX(' + (-py * 5).toFixed(2) + 'deg) rotateY(' + (px * 6).toFixed(2) + 'deg) translateY(-4px)';
        });
      });
      card.addEventListener('pointerleave', function () { card.style.transform = ''; });
    });
  }

  /* ---------------- single scroll loop: progress, header, parallax, reading bar ---------------- */
  var progress = $('.scroll-progress');
  var header = $('.site-header');
  var parallaxEls = reduced ? [] : $$('[data-parallax]');
  var readingBar = $('.reading-bar i');
  var articleBody = $('.article-body');
  var ticking = false;

  function onScroll() {
    revealVisible();
    var y = w.scrollY || w.pageYOffset;
    var docH = d.documentElement.scrollHeight - w.innerHeight;

    if (progress) progress.style.transform = 'scaleX(' + (docH > 0 ? Math.min(1, y / docH) : 0) + ')';
    if (header) header.classList.toggle('stuck', y > 8);

    for (var i = 0; i < parallaxEls.length; i++) {
      var el = parallaxEls[i];
      var speed = parseFloat(el.getAttribute('data-parallax')) || 0.15;
      var r = el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > w.innerHeight + 200) continue;
      var offset = (r.top + r.height / 2 - w.innerHeight / 2) * speed;
      var scale = el.getAttribute('data-parallax-scale');
      el.style.transform = 'translate3d(0,' + offset.toFixed(1) + 'px,0)' + (scale ? ' scale(' + scale + ')' : '');
    }

    if (readingBar && articleBody) {
      var b = articleBody.getBoundingClientRect();
      var total = b.height - w.innerHeight * 0.4;
      var read = Math.min(1, Math.max(0, (-b.top + w.innerHeight * 0.4) / (total > 0 ? total : 1)));
      readingBar.style.width = (read * 100).toFixed(1) + '%';
    }
    ticking = false;
  }
  function request() { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }
  w.addEventListener('scroll', request, { passive: true });
  w.addEventListener('resize', request, { passive: true });
  onScroll();

  /* ---------------- ticker: duplicate track for seamless loop ---------------- */
  $$('.ticker-track').forEach(function (t) {
    if (reduced) return;
    t.innerHTML += t.innerHTML;
  });

  /* ---------------- inquiry forms ---------------- */
  var qs = new URLSearchParams(location.search);
  function slug(s) { return String(s).toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }

  $$('form[data-inquiry]').forEach(function (form) {
    form.started_at.value = String(Date.now());
    if (qs.get('vertical') && !form.vertical.value) {
      form.vertical.value = qs.get('vertical');
      Array.prototype.forEach.call(form.vertical_interest.options, function (o) { if (slug(o.value) === qs.get('vertical')) form.vertical_interest.value = o.value; });
    }
    if (qs.get('sub') && !form.sub_vertical.value) {
      form.sub_vertical.value = qs.get('sub');
      Array.prototype.forEach.call(form.sub_vertical_interest.options, function (o) { if (slug(o.value) === qs.get('sub')) form.sub_vertical_interest.value = o.value; });
    }
    if (qs.get('product') && !form.product.value) form.product.value = qs.get('product');
    if (!form.source_url.value) form.source_url.value = location.pathname;

    var vi = form.vertical_interest, svi = form.sub_vertical_interest;
    function filterSubs() {
      Array.prototype.forEach.call(svi.options, function (o) {
        if (!o.value) return;
        var show = !vi.value || vi.value === 'Other' || o.dataset.vertical === vi.value;
        o.hidden = !show;
        if (!show && svi.value === o.value) svi.value = '';
      });
    }
    vi.addEventListener('change', filterSubs);
    filterSubs();

    $$('[required]', form).forEach(function (el) {
      el.addEventListener('blur', function () { el.classList.toggle('invalid', !el.checkValidity()); });
      el.addEventListener('input', function () { if (el.checkValidity()) el.classList.remove('invalid'); });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var status = $('.form-status', form), ok = true;
      $$('[required]', form).forEach(function (el) {
        var valid = el.checkValidity();
        el.classList.toggle('invalid', !valid);
        if (!valid && ok) { el.focus(); ok = false; }
      });
      if (!ok) { status.className = 'form-status err'; status.textContent = 'Please complete the required fields.'; return; }
      var btn = $('button[type=submit]', form);
      btn.disabled = true;
      status.className = 'form-status';
      status.textContent = 'Sending…';
      var data = { page_title: d.title };
      new FormData(form).forEach(function (v, k) { data[k] = v; });
      fetch('/api/inquiries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) {
          if (res.ok) {
            form.classList.add('sent');
            status.className = 'form-status ok';
            status.textContent = res.j.message || 'Thank you. Your inquiry has been received.';
          } else {
            status.className = 'form-status err';
            status.textContent = res.j.error || 'Something went wrong. Please try again or email us directly.';
            btn.disabled = false;
          }
        })
        .catch(function () {
          status.className = 'form-status err';
          status.textContent = 'Network error. Please try again or email us directly.';
          btn.disabled = false;
        });
    });
  });
})();

/* ============================================================
   Approved design directions D1–D10
   Appended to the interaction layer. Vanilla, no dependencies.
   ============================================================ */
(function () {
  'use strict';
  var d = document, w = window;
  var $ = function (s, el) { return (el || d).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || d).querySelectorAll(s)); };
  var reduced = w.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var coarse = w.matchMedia('(pointer: coarse)').matches;
  var inView = function (el, margin) {
    var r = el.getBoundingClientRect();
    return r.top < w.innerHeight * (margin || 0.85) && r.bottom > 0;
  };

  /* ---------- D1 · instrumented scroll ---------- */
  (function () {
    var readout = d.createElement('div');
    readout.className = 'scroll-readout';
    readout.setAttribute('aria-hidden', 'true');
    d.body.appendChild(readout);
    var hideTimer = null;
    function update() {
      var max = d.documentElement.scrollHeight - w.innerHeight;
      var pct = max > 0 ? Math.round((w.scrollY / max) * 100) : 0;
      readout.textContent = String(pct).padStart(2, '0') + '%';
      readout.classList.add('on');
      clearTimeout(hideTimer);
      hideTimer = setTimeout(function () { readout.classList.remove('on'); }, 1100);
    }
    w.addEventListener('scroll', update, { passive: true });

    /* Scroll itself stays native. Hijacking the wheel to add inertia fights the OS,
       the trackpad and the user's own scroll settings, and it drifts out of sync on
       Windows mice — the readout, rail and scrollbar give the instrumented feel
       without taking the scroll away from the browser. */
  })();

  /* ---------- D2 · scrubbed hero sequence ---------- */
  (function () {
    var hero = $('.hero');
    if (!hero) return;
    var reveal = function () { hero.classList.add('seq'); };
    requestAnimationFrame(function () { requestAnimationFrame(reveal); });
    setTimeout(reveal, 400);
  })();

  /* ---------- D3 · signal path diagram ---------- */
  $$('.signal').forEach(function (box) {
    var path = $('.wire-base', box), lit = $('.wire-lit', box), dot = $('.pulse', box);
    var nodes = $$('.node', box), steps = $$('.signal-steps li', box);
    if (!path) return;
    var len = path.getTotalLength();
    var playing = false, played = false;
    function reset() {
      nodes.forEach(function (n) { n.classList.remove('on'); });
      steps.forEach(function (s) { s.classList.remove('on'); });
      lit.style.opacity = 0;
      if (dot) dot.style.opacity = 0;
    }
    function run() {
      if (playing) return;
      playing = true;
      reset();
      lit.style.opacity = 1;
      if (dot) dot.style.opacity = 1;
      var start = performance.now(), dur = reduced ? 240 : 2200;
      (function step(now) {
        var p = Math.min(1, (now - start) / dur);
        var e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        var pt = path.getPointAtLength(e * len);
        if (dot) { dot.setAttribute('cx', pt.x); dot.setAttribute('cy', pt.y); }
        lit.setAttribute('stroke-dasharray', (e * len) + ' ' + len);
        nodes.forEach(function (n, i) {
          if (pt.x >= (+n.dataset.x) - 2 && !n.classList.contains('on')) {
            n.classList.add('on');
            if (steps[i]) steps[i].classList.add('on');
          }
        });
        if (p < 1) requestAnimationFrame(step);
        else { if (dot) dot.style.opacity = 0; playing = false; }
      })(start);
    }
    reset();
    var btn = $('.signal-replay', box);
    if (btn) btn.addEventListener('click', run);
    function maybe() { if (!played && inView(box, 0.75)) { played = true; run(); } }
    w.addEventListener('scroll', maybe, { passive: true });
    maybe();
  });

  /* ---------- D4 · operations board feed ---------- */
  $$('[data-feed]').forEach(function (feed) {
    var rows;
    try { rows = JSON.parse(feed.dataset.feed); } catch (e) { return; }
    var i = 0;
    function push() {
      var r = rows[i % rows.length]; i++;
      var el = d.createElement('div');
      el.innerHTML = '<span>' + r[0] + '</span><span class="st">' + r[1] + '</span>';
      feed.insertBefore(el, feed.firstChild);
      while (feed.children.length > 6) feed.removeChild(feed.lastChild);
    }
    for (var k = 0; k < 6; k++) push();
    if (!reduced) setInterval(function () { if (inView(feed, 1)) push(); }, 2800);
  });

  /* ---------- D5 · vertical explorer ---------- */
  $$('.explorer').forEach(function (box) {
    var buttons = $$('.ex-list a, .ex-list button', box);
    var pane = $('.ex-pane', box);
    var data;
    try { data = JSON.parse(box.dataset.items); } catch (e) { return; }
    var idx = -1;
    function show(i) {
      if (i === idx) return;
      idx = i;
      var it = data[i];
      buttons.forEach(function (b, n) { b.classList.toggle('on', n === i); b.setAttribute('aria-selected', String(n === i)); });
      pane.innerHTML =
        '<div class="ex-media"><img src="' + it.img + '" srcset="' + it.img.replace('.jpg', '-sm.jpg') + ' 760w, ' + it.img + ' 1500w" sizes="(max-width:900px) 100vw, 40vw" alt="" width="700" height="466" loading="lazy" decoding="async"></div>' +
        '<div class="ex-body"><p class="eyebrow">' + it.vertical + '</p><h3>' + it.name + '</h3><p>' + it.text + '</p>' +
        '<div class="ex-tags"><span class="pill inbound-calls">Inbound Calls</span><span class="pill live-transfers">Live Transfers</span></div>' +
        '<div class="ex-actions"><a class="btn btn-primary" href="' + it.href + '">View ' + it.name + '</a>' +
        '<a class="btn btn-ghost" href="' + it.href + 'inbound-calls/">Inbound calls</a></div></div>';
      if (!reduced) { pane.classList.remove('ex-swap'); void pane.offsetWidth; pane.classList.add('ex-swap'); }
    }
    buttons.forEach(function (b, i) {
      b.addEventListener('mouseenter', function () { show(i); });
      b.addEventListener('focus', function () { show(i); });
      b.addEventListener('click', function (e) { e.preventDefault(); show(i); });
    });
    $('.ex-list', box).addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      e.preventDefault();
      var n = (idx + (e.key === 'ArrowDown' ? 1 : buttons.length - 1)) % buttons.length;
      buttons[n].focus();
    });
    show(0);
  });

  /* ---------- D6 · transfer visualiser ---------- */
  $$('.transfer').forEach(function (box) {
    var cv = $('canvas', box), log = $('.transfer-log', box), states = $$('.transfer-states span', box);
    if (!cv) return;
    var ctx = cv.getContext('2d'), t = 0, amp = 0.18, stage = -1, running = false, started = false;
    function size() { cv.width = cv.clientWidth * Math.min(2, w.devicePixelRatio || 1); cv.height = 100 * Math.min(2, w.devicePixelRatio || 1); }
    size();
    w.addEventListener('resize', size);
    var css = getComputedStyle(d.documentElement);
    function draw() {
      var W = cv.width, H = cv.height, mid = H / 2;
      ctx.clearRect(0, 0, W, H);
      ctx.lineWidth = 2 * Math.min(2, w.devicePixelRatio || 1);
      ctx.strokeStyle = stage >= 3 ? (css.getPropertyValue('--blue-400') || '#60a5fa').trim() : (css.getPropertyValue('--teal-400') || '#2dd4bf').trim();
      ctx.beginPath();
      for (var x = 0; x < W; x += 2) {
        var n = Math.sin(x * 0.012 + t) * Math.sin(x * 0.0029 + t * 0.6) * Math.sin(t * 0.8 + x * 0.0009);
        var y = mid + n * mid * amp;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
      if (!reduced) t += 0.05;
      requestAnimationFrame(draw);
    }
    draw();
    var script = JSON.parse(box.dataset.script || '[]');
    function run() {
      if (running || !script.length) return;
      running = true;
      var i = 0;
      (function next() {
        if (i >= script.length) { running = false; return; }
        var s = script[i];
        stage = s.stage;
        states.forEach(function (el, n) { el.className = n < s.stage ? 'done' : (n === s.stage ? 'on' : ''); });
        log.textContent = s.text;
        amp = s.amp;
        i++;
        setTimeout(next, reduced ? 350 : 1700);
      })();
    }
    var btn = $('.transfer-replay', box);
    if (btn) btn.addEventListener('click', function () { running = false; run(); });
    function maybe() { if (!started && inView(box, 0.8)) { started = true; run(); } }
    w.addEventListener('scroll', maybe, { passive: true });
    maybe();
  });

  /* ---------- D7 · spotlight + magnetic CTA ---------- */
  if (!coarse && !reduced) {
    $$('.cta-band').forEach(function (band) {
      var btn = $('.btn', band);
      if (btn) btn.classList.add('magnetic');
      band.addEventListener('pointermove', function (e) {
        var r = band.getBoundingClientRect();
        band.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        band.style.setProperty('--my', (e.clientY - r.top) + 'px');
        band.style.setProperty('--so', '1');
        if (!btn) return;
        var b = btn.getBoundingClientRect();
        var dx = e.clientX - (b.left + b.width / 2), dy = e.clientY - (b.top + b.height / 2);
        btn.style.transform = Math.hypot(dx, dy) < 150 ? 'translate(' + (dx * 0.24).toFixed(1) + 'px,' + (dy * 0.24).toFixed(1) + 'px)' : '';
      });
      band.addEventListener('pointerleave', function () {
        band.style.setProperty('--so', '0');
        if (btn) btn.style.transform = '';
      });
    });
  }

  /* ---------- D8 · editorial reading mode ---------- */
  (function () {
    var toc = $('.article-toc'), body = $('.article-body');
    if (!toc || !body) return;
    var links = $$('a', toc);
    var heads = links.map(function (a) { return d.getElementById(a.getAttribute('href').slice(1)); }).filter(Boolean);
    if (!heads.length) return;
    function spy() {
      var active = 0;
      heads.forEach(function (h, i) { if (h.getBoundingClientRect().top < 140) active = i; });
      links.forEach(function (a, i) { a.classList.toggle('on', i === active); });
    }
    w.addEventListener('scroll', spy, { passive: true });
    spy();
  })();

  /* ---------- D9 · sparklines draw on view ---------- */
  $$('.spark polyline').forEach(function (line) {
    var len = line.getTotalLength();
    line.style.strokeDasharray = len;
    line.style.strokeDashoffset = reduced ? 0 : len;
    var done = reduced;
    function maybe() {
      if (done || !inView(line.closest('.spark'), 0.9)) return;
      done = true;
      line.style.transition = 'stroke-dashoffset 1.5s cubic-bezier(.16,1,.3,1)';
      line.style.strokeDashoffset = 0;
    }
    w.addEventListener('scroll', maybe, { passive: true });
    maybe();
  });

  /* ---------- D10 · same-document fallback for cross-document view transitions ---------- */
  (function () {
    if (!d.startViewTransition || reduced) return;
    if ('CSSViewTransitionRule' in w || CSS.supports('view-transition-name: none')) return; // native cross-document handles it
  })();
})();
