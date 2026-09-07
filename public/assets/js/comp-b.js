/* ============================================================
   Altarious Global — component batch B (C11–C20) behaviour
   One IIFE. ES5 syntax. Self-initialising, guarded throughout.
   ============================================================ */
(function () {
  'use strict';

  var d = document;

  function $(sel, root) { return (root || d).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || d).querySelectorAll(sel)); }
  function on(el, ev, fn, opt) { if (el && el.addEventListener) el.addEventListener(ev, fn, opt); }
  function reduced() {
    try { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
    catch (e) { return false; }
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function safe(fn) { return function () { try { return fn.apply(this, arguments); } catch (e) { if (window.console) console.error('[comp-b]', e); } }; }

  var FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

  /* =========================================================
     C11 — multi-step enquiry
     ========================================================= */
  function initSteps(root) {
    var form = $('.ag-steps-form', root);
    var done = $('[data-ag-done]', root);
    if (!form) return;

    var panes = $$('.ag-steps-pane', form);
    var marks = $$('.ag-steps-step', form);
    var bar = $('.ag-steps-bar i', form);
    var back = $('[data-ag-back]', form);
    var next = $('[data-ag-next]', form);
    var submit = $('.ag-steps-submit', form);
    var status = $('.ag-steps-status', form);
    if (!panes.length) return;

    var last = panes.length - 1;
    var i = 0;

    /* timing gate + page title, exactly as the single-step form does */
    if (form.started_at) form.started_at.value = String(Date.now());
    if (form.page_title && !form.page_title.value) form.page_title.value = d.title;
    if (form.source_url && !form.source_url.value) form.source_url.value = location.pathname;

    /* query-string pre-fill, mirroring the site's existing behaviour */
    var qs;
    try { qs = new URLSearchParams(location.search); } catch (e) { qs = null; }
    function slug(s) { return String(s).toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }
    if (qs) {
      if (qs.get('vertical') && form.vertical && !form.vertical.value) {
        form.vertical.value = qs.get('vertical');
        if (form.vertical_interest) {
          $$('option', form.vertical_interest).forEach(function (o) { if (slug(o.value) === qs.get('vertical')) form.vertical_interest.value = o.value; });
        }
      }
      if (qs.get('sub') && form.sub_vertical && !form.sub_vertical.value) {
        form.sub_vertical.value = qs.get('sub');
        if (form.sub_vertical_interest) {
          $$('option', form.sub_vertical_interest).forEach(function (o) { if (slug(o.value) === qs.get('sub')) form.sub_vertical_interest.value = o.value; });
        }
      }
      if (qs.get('product') && form.product && !form.product.value) form.product.value = qs.get('product');
    }

    /* sub-vertical list follows the chosen vertical */
    var vi = form.vertical_interest, svi = form.sub_vertical_interest;
    function filterSubs() {
      if (!vi || !svi) return;
      $$('option', svi).forEach(function (o) {
        if (!o.value) return;
        var show = !vi.value || vi.value === 'Other' || o.getAttribute('data-vertical') === vi.value;
        o.hidden = !show;
        if (!show && svi.value === o.value) svi.value = '';
      });
    }
    on(vi, 'change', filterSubs);
    filterSubs();

    function fieldOf(el) { return el.closest ? el.closest('.ag-steps-f') : null; }
    function clearPane(p) {
      $$('.ag-steps-f', p).forEach(function (f) {
        f.classList.remove('is-bad');
        var e = $('.ag-steps-err', f);
        if (e) e.textContent = '';
      });
    }
    function fail(el, msg) {
      var f = fieldOf(el);
      if (f) {
        f.classList.add('is-bad');
        var e = $('.ag-steps-err', f);
        if (e) e.textContent = msg;
      }
      try { el.focus(); } catch (e2) {}
      return false;
    }
    function validPane(n) {
      var p = panes[n];
      if (!p) return true;
      clearPane(p);
      var fields = $$('[required]', p), ok = true;
      fields.forEach(function (el) {
        if (!ok) return;
        if (!el.value || !String(el.value).trim()) { ok = fail(el, 'This field is required.'); return; }
        if (el.checkValidity && !el.checkValidity()) {
          ok = fail(el, el.type === 'email' ? 'Enter a valid business email.' : (el.validationMessage || 'Please check this field.'));
        }
      });
      return ok;
    }

    function show(n) {
      i = Math.max(0, Math.min(last, n));
      panes.forEach(function (p, k) { p.classList.toggle('is-on', k === i); });
      marks.forEach(function (s, k) {
        s.classList.toggle('is-on', k === i);
        s.classList.toggle('is-done', k < i);
      });
      if (bar) bar.style.width = ((i + 1) / panes.length * 100).toFixed(4) + '%';
      if (back) back.disabled = i === 0;
      root.classList.toggle('is-last', i === last);
      var f = $('input,select,textarea', panes[i]);
      if (f && n > 0) { try { f.focus(); } catch (e) {} }
    }

    on(next, 'click', function () { if (validPane(i)) show(i + 1); });
    on(back, 'click', function () { show(i - 1); });

    on(form, 'keydown', function (e) {
      if (e.key === 'Enter' && e.target && e.target.tagName === 'INPUT' && i < last) {
        e.preventDefault();
        if (next) next.click();
      }
    });

    on(form, 'submit', function (e) {
      e.preventDefault();
      /* validate every pane, not just the visible one */
      for (var k = 0; k <= last; k++) {
        if (!validPane(k)) { show(k); return; }
      }
      if (submit) submit.disabled = true;
      if (status) { status.className = 'ag-steps-status'; status.textContent = 'Sending…'; }

      var data = { page_title: d.title };
      try {
        new FormData(form).forEach(function (v, k2) { data[k2] = v; });
      } catch (err) {
        $$('input,select,textarea', form).forEach(function (el) { if (el.name) data[el.name] = el.value; });
      }

      fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j || {} }; }, function () { return { ok: r.ok, j: {} }; }); })
        .then(function (res) {
          if (res.ok && res.j.ok !== false) {
            if (status) { status.className = 'ag-steps-status is-ok'; status.textContent = ''; }
            form.hidden = true;
            if (done) {
              done.hidden = false;
              var sum = $('.ag-steps-sum', done);
              if (sum) sum.textContent = res.j.message || 'Thank you. Your enquiry has been received and our team will be in touch shortly.';
              var h = $('h3', done);
              if (h) { h.setAttribute('tabindex', '-1'); try { h.focus(); } catch (e2) {} }
            }
          } else {
            if (status) { status.className = 'ag-steps-status is-err'; status.textContent = res.j.error || 'Something went wrong. Please try again or email us directly.'; }
            if (submit) submit.disabled = false;
          }
        })
        .catch(function () {
          if (status) { status.className = 'ag-steps-status is-err'; status.textContent = 'Network error. Please try again or email us directly.'; }
          if (submit) submit.disabled = false;
        });
    });

    root.setAttribute('data-ag-ready', '');
    show(0);
  }

  /* =========================================================
     C12 — call widget
     ========================================================= */
  function initCall(root) {
    var TZ = 'America/New_York';
    var youEl = $('[data-ag-you]', root), youZ = $('[data-ag-youz]', root), usEl = $('[data-ag-us]', root);
    var pill = $('[data-ag-pill]', root);
    if (!youEl && !usEl && !pill) return;

    function fmt(tz) {
      try { return new Intl.DateTimeFormat([], { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz }); }
      catch (e) { try { return new Intl.DateTimeFormat([], { hour: '2-digit', minute: '2-digit', hour12: false }); } catch (e2) { return null; } }
    }
    var fYou = fmt(undefined), fUs = fmt(TZ);
    if (youZ) {
      try { youZ.textContent = (Intl.DateTimeFormat().resolvedOptions().timeZone) || 'Local time'; }
      catch (e) { youZ.textContent = 'Local time'; }
    }

    var SCHED = { 0: null, 1: [480, 1200], 2: [480, 1200], 3: [480, 1200], 4: [480, 1200], 5: [480, 1200], 6: [540, 900] };

    function deskParts(dt) {
      try {
        var parts = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(dt);
        var g = {};
        parts.forEach(function (p) { g[p.type] = p.value; });
        var map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
        var day = map[g.weekday];
        return { day: day === undefined ? dt.getDay() : day, mins: (Number(g.hour) % 24) * 60 + Number(g.minute) };
      } catch (e) {
        return { day: dt.getDay(), mins: dt.getHours() * 60 + dt.getMinutes() };
      }
    }

    function tick() {
      var dt = new Date();
      if (youEl && fYou) youEl.textContent = fYou.format(dt);
      if (usEl && fUs) usEl.textContent = fUs.format(dt);
      var p = deskParts(dt), win = SCHED[p.day];
      var open = !!win && p.mins >= win[0] && p.mins < win[1];
      if (pill) {
        pill.classList.toggle('is-open', open);
        pill.classList.toggle('is-shut', !open);
        var b = $('b', pill);
        if (b) b.textContent = open ? 'Desk open now' : 'Desk closed — leave a message';
      }
      $$('.ag-call-hours tr', root).forEach(function (tr) {
        var k = tr.getAttribute('data-ag-day') || '';
        tr.classList.toggle('is-now', k.split(' ').indexOf(String(p.day)) > -1);
      });
    }
    tick();
    var iv = setInterval(tick, 30000);
    on(window, 'pagehide', function () { clearInterval(iv); });
  }

  /* =========================================================
     C13 — key takeaways (copy summary)
     ========================================================= */
  function initTakeaways(root) {
    var btn = $('[data-ag-copy]', root);
    if (!btn) return;
    var lbl = $('.ag-takeaways-ct', btn) || btn;
    var t;

    function text() {
      var out = ['Key takeaways'];
      $$('.ag-takeaways-pts li p', root).forEach(function (p, n) { out.push((n + 1) + '. ' + p.textContent.trim()); });
      var why = $('.ag-takeaways-why', root);
      if (why) { out.push(''); out.push('Why this matters: ' + why.textContent.replace(/^\s*Why this matters\s*/i, '').trim()); }
      return out.join('\n');
    }
    function flash(msg) {
      btn.classList.add('is-done');
      lbl.textContent = msg;
      clearTimeout(t);
      t = setTimeout(function () { btn.classList.remove('is-done'); lbl.textContent = 'Copy summary'; }, 2200);
    }
    function fallback(s) {
      var ta = d.createElement('textarea');
      ta.value = s;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:0;left:-9999px';
      root.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = d.execCommand('copy'); } catch (e) {}
      root.removeChild(ta);
      flash(ok ? 'Copied' : 'Press Ctrl+C');
    }
    on(btn, 'click', function () {
      var s = text();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(s).then(function () { flash('Copied'); }, function () { fallback(s); });
      } else fallback(s);
    });
  }

  /* =========================================================
     C14 — related rail
     ========================================================= */
  function initRail(root) {
    var track = $('.ag-rail-track', root);
    if (!track) return;
    var items = $$('.ag-rail-item', track);
    if (!items.length) return;
    var prev = $('[data-ag-prev]', root), next = $('[data-ag-next]', root);
    var fill = $('.ag-rail-line i', root), cnt = $('.ag-rail-cnt b', root);
    var gap = 16;

    function step() { return (items[0].offsetWidth || 260) + gap; }
    function go(dir) {
      var per = Math.max(1, Math.floor(track.clientWidth / step()));
      track.scrollBy({ left: dir * step() * per, behavior: reduced() ? 'auto' : 'smooth' });
    }
    on(prev, 'click', function () { go(-1); });
    on(next, 'click', function () { go(1); });

    function sync() {
      var max = track.scrollWidth - track.clientWidth;
      var p = max > 0 ? track.scrollLeft / max : 0;
      var vis = Math.max(1, Math.round(track.clientWidth / step()));
      var w = Math.min(100, Math.max(14, (vis / items.length) * 100));
      if (fill) { fill.style.width = w + '%'; fill.style.marginLeft = (p * (100 - w)) + '%'; }
      if (prev) prev.disabled = track.scrollLeft < 4;
      if (next) next.disabled = track.scrollLeft >= max - 4;
      if (cnt) cnt.textContent = String(Math.min(items.length, Math.round(track.scrollLeft / step()) + 1));
    }
    on(track, 'scroll', function () { sync(); }, { passive: true });
    on(window, 'resize', sync);
    on(track, 'keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
      else if (e.key === 'Home') { e.preventDefault(); track.scrollTo({ left: 0, behavior: reduced() ? 'auto' : 'smooth' }); }
      else if (e.key === 'End') { e.preventDefault(); track.scrollTo({ left: track.scrollWidth, behavior: reduced() ? 'auto' : 'smooth' }); }
    });
    sync();
    setTimeout(sync, 300);
  }

  /* =========================================================
     C15 — in-prose term tooltips
     ========================================================= */
  function initTerms() {
    var data = $('[data-ag-term-data]');
    if (!data) return;
    var defs;
    try { defs = JSON.parse(data.textContent || '[]'); } catch (e) { return; }
    if (!defs || !defs.length) return;

    var proses = $$('.prose');
    if (!proses.length) return;

    var byTerm = {};
    defs.forEach(function (g) { if (g && g.t) byTerm[String(g.t).toLowerCase()] = g; });
    var terms = defs.map(function (g) { return g.t; }).filter(Boolean)
      .sort(function (a, b) { return b.length - a.length; });
    if (!terms.length) return;

    function rx(term) {
      return new RegExp('(^|[^\\w-])(' + term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')(?=$|[^\\w-])', 'i');
    }

    var seen = {};
    var SKIP = { A: 1, BUTTON: 1, SCRIPT: 1, STYLE: 1, CODE: 1, PRE: 1, H1: 1, H2: 1, H3: 1 };

    proses.forEach(function (prose) {
      var walker = d.createTreeWalker(prose, NodeFilter.SHOW_TEXT, null, false);
      var nodes = [], n;
      while ((n = walker.nextNode())) nodes.push(n);
      nodes.forEach(function (node) {
        var parent = node.parentNode;
        if (!parent || SKIP[parent.nodeName] || (parent.classList && parent.classList.contains('ag-term'))) return;
        for (var k = 0; k < terms.length; k++) {
          var term = terms[k];
          if (seen[term.toLowerCase()]) continue;              /* first occurrence only */
          var m = rx(term).exec(node.nodeValue);
          if (!m) continue;
          seen[term.toLowerCase()] = true;
          var idx = m.index + m[1].length;
          var after = node.splitText(idx);
          after.splitText(m[2].length);
          var btn = d.createElement('button');
          btn.type = 'button';
          btn.className = 'ag-term';
          btn.setAttribute('data-ag-term', term.toLowerCase());
          btn.setAttribute('aria-expanded', 'false');
          btn.textContent = after.nodeValue;
          parent.replaceChild(btn, after);
          return;
        }
      });
    });

    var buttons = $$('.ag-term');
    if (!buttons.length) return;

    var pop = d.createElement('div');
    pop.className = 'ag-term-pop';
    pop.setAttribute('role', 'tooltip');
    pop.hidden = true;
    pop.innerHTML = '<span class="ag-term-k"></span><b class="ag-term-t"></b><span class="ag-term-d"></span>';
    d.body.appendChild(pop);

    var live = d.createElement('span');
    live.className = 'ag-term-sr';
    live.setAttribute('aria-live', 'polite');
    d.body.appendChild(live);

    var cur = null, hideT;

    function place(el) {
      var tr = el.getBoundingClientRect();
      pop.style.left = '0px';
      pop.style.top = '0px';
      var pw = pop.offsetWidth, ph = pop.offsetHeight, pad = 12;
      var cx = tr.left + tr.width / 2;
      var left = Math.min(Math.max(pad, cx - pw / 2), window.innerWidth - pw - pad);
      var below = tr.bottom + ph + 12 < window.innerHeight;
      var top = below ? tr.bottom + 8 : tr.top - ph - 8;
      top = Math.max(pad, top);
      pop.style.left = (left + window.pageXOffset) + 'px';
      pop.style.top = (top + window.pageYOffset) + 'px';
    }
    function show(el) {
      clearTimeout(hideT);
      var g = byTerm[el.getAttribute('data-ag-term') || ''];
      if (!g) return;
      if (cur && cur !== el) { cur.classList.remove('is-on'); cur.setAttribute('aria-expanded', 'false'); }
      cur = el;
      el.classList.add('is-on');
      el.setAttribute('aria-expanded', 'true');
      $('.ag-term-k', pop).textContent = g.k || '';
      $('.ag-term-t', pop).textContent = g.h || g.t || '';
      $('.ag-term-d', pop).textContent = g.d || '';
      pop.hidden = false;
      place(el);
      live.textContent = (g.h || g.t) + ': ' + (g.d || '');
    }
    function hide() {
      hideT = setTimeout(function () {
        pop.hidden = true;
        live.textContent = '';
        if (cur) { cur.classList.remove('is-on'); cur.setAttribute('aria-expanded', 'false'); cur = null; }
      }, 120);
    }

    buttons.forEach(function (el) {
      on(el, 'mouseenter', function () { show(el); });
      on(el, 'mouseleave', hide);
      on(el, 'focus', function () { show(el); });
      on(el, 'blur', hide);
      on(el, 'click', function (e) {
        e.preventDefault();
        if (cur === el && !pop.hidden) { clearTimeout(hideT); pop.hidden = true; el.classList.remove('is-on'); el.setAttribute('aria-expanded', 'false'); cur = null; }
        else show(el);
      });
    });
    on(pop, 'mouseenter', function () { clearTimeout(hideT); });
    on(pop, 'mouseleave', hide);
    on(d, 'keydown', function (e) {
      if (e.key === 'Escape' && !pop.hidden) {
        pop.hidden = true;
        if (cur) { var c = cur; cur = null; c.classList.remove('is-on'); c.setAttribute('aria-expanded', 'false'); try { c.focus(); } catch (e2) {} }
      }
    });
    on(window, 'resize', function () { if (cur && !pop.hidden) place(cur); });
    on(window, 'scroll', function () { if (cur && !pop.hidden) place(cur); }, { passive: true });
  }

  /* =========================================================
     C16 — fact strip (entrance only; values render server-side)
     ========================================================= */
  function initFacts(root) {
    if (!$('.ag-facts-strip', root)) return;
    if (reduced()) { root.classList.add('is-in'); return; }
    var done = false;
    function reveal() { if (!done) { done = true; root.classList.add('is-in'); } }
    if (window.IntersectionObserver) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) { reveal(); io.disconnect(); } });
      }, { threshold: .25 });
      io.observe(root);
    }
    setTimeout(reveal, 1500);   /* always settles */
  }

  /* =========================================================
     C18 — metric ribbon (count-up)
     ========================================================= */
  function initRibbon(root) {
    var ms = $$('.ag-ribbon-m', root);
    if (!ms.length) return;

    var parsed = ms.map(function (m) {
      var raw = m.getAttribute('data-ag-to') || '';
      var num = parseFloat(String(raw).replace(/[^0-9.\-]/g, ''));
      var decs = (String(raw).split('.')[1] || '').replace(/[^0-9]/g, '').length;
      var grouped = /,/.test(raw);
      return {
        el: m,
        num: m.querySelector('.ag-ribbon-num'),
        bar: m.querySelector('.ag-ribbon-bar i'),
        raw: raw,
        to: isNaN(num) ? null : num,
        decs: decs,
        grouped: grouped,
        suffix: m.getAttribute('data-ag-suffix') || '',
        pct: parseFloat(m.getAttribute('data-ag-bar') || '0') || 0
      };
    });

    function settle() {
      parsed.forEach(function (p) {
        if (p.num) p.num.textContent = p.raw + p.suffix;
        if (p.bar) p.bar.style.width = p.pct + '%';
      });
    }
    function fmt(p, v) {
      var s = p.decs ? v.toFixed(p.decs) : String(Math.round(v));
      if (p.grouped) { try { s = Number(s).toLocaleString('en-US', { minimumFractionDigits: p.decs, maximumFractionDigits: p.decs }); } catch (e) {} }
      return s + p.suffix;
    }

    var ran = false;
    function run() {
      if (ran) return;
      ran = true;
      if (reduced() || !window.requestAnimationFrame) { settle(); return; }
      var guard = setTimeout(settle, 3000);   /* never depend on rAF alone */
      parsed.forEach(function (p, idx) {
        if (p.bar) { p.bar.style.width = '0%'; setTimeout(function () { p.bar.style.width = p.pct + '%'; }, idx * 100 + 30); }
        if (p.to === null || !p.num) return;
        p.num.textContent = fmt(p, 0);
        var t0 = null, dur = 1100;
        function frame(t) {
          if (t0 === null) t0 = t;
          var prog = Math.min(1, (t - t0) / dur);
          var eased = 1 - Math.pow(1 - prog, 3);
          p.num.textContent = fmt(p, p.to * eased);
          if (prog < 1) requestAnimationFrame(frame);
          else { p.num.textContent = p.raw + p.suffix; if (idx === parsed.length - 1) clearTimeout(guard); }
        }
        setTimeout(function () { requestAnimationFrame(frame); }, idx * 100);
      });
    }

    if (window.IntersectionObserver) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) { run(); io.disconnect(); } });
      }, { threshold: .3 });
      io.observe(root);
      setTimeout(run, 2000);
    } else run();
  }

  /* =========================================================
     C19 — command palette
     ========================================================= */
  function initPalette(root) {
    var trigger = $('[data-ag-palette-open]', root);
    var dialog = $('[data-ag-palette-dialog]', root);
    var scrim = $('[data-ag-palette-scrim]', root);
    var input = $('[data-ag-palette-input]', root);
    var listEl = $('[data-ag-palette-results]', root);
    var count = $('[data-ag-palette-count]', root);
    if (!trigger || !dialog || !input || !listEl) return;

    var mod = $('[data-ag-palette-mod]', root);
    var isMac = /Mac|iPhone|iPad|iPod/.test((navigator.platform || '') + ' ' + (navigator.userAgent || ''));
    if (mod && isMac) mod.textContent = '⌘';

    var INDEX = null, loading = false, loadError = null;
    var rows = [], sel = 0, lastFocus = null, open = false;

    function fuzzy(text, q) {
      if (!q) return { score: 0, marks: null };
      var lt = String(text).toLowerCase(), lq = q.toLowerCase();
      var idx = lt.indexOf(lq);
      if (idx > -1) return { score: 1000 - idx * 2 + (idx === 0 ? 200 : 0), marks: [[idx, idx + lq.length]] };
      var i = 0, m = [], last = -2, sc = 0;
      for (var j = 0; j < lt.length && i < lq.length; j++) {
        if (lt.charAt(j) === lq.charAt(i)) {
          m.push([j, j + 1]);
          sc += (j === last + 1 ? 12 : 4) + (j === 0 || /[\s\-:\/]/.test(lt.charAt(j - 1) || '') ? 6 : 0);
          last = j; i++;
        }
      }
      return i === lq.length ? { score: sc, marks: m } : null;
    }
    function hi(text, marks) {
      if (!marks) return esc(text);
      var out = '', p = 0;
      marks.forEach(function (m) { out += esc(text.slice(p, m[0])) + '<mark>' + esc(text.slice(m[0], m[1])) + '</mark>'; p = m[1]; });
      return out + esc(text.slice(p));
    }
    function initial(g) { return String(g || '?').charAt(0).toUpperCase(); }

    function message(html) {
      listEl.innerHTML = '<p class="ag-palette-empty">' + html + '</p>';
      rows = [];
      if (count) count.textContent = '';
    }

    function render() {
      if (loadError) { message(esc(loadError)); return; }
      if (!INDEX) { message('Loading…'); return; }
      var q = input.value.trim();
      var hits = [];
      INDEX.forEach(function (item) {
        var m = fuzzy(item.t, q);
        if (m) hits.push({ d: item, score: m.score, marks: m.marks });
        else if (q && fuzzy(item.g || '', q)) hits.push({ d: item, score: 1, marks: null });
      });
      if (q) hits.sort(function (a, b) { return b.score - a.score; });
      hits = hits.slice(0, 40);

      listEl.innerHTML = '';
      rows = [];
      if (!hits.length) {
        message('No matches for &ldquo;' + esc(q) + '&rdquo;');
        if (count) count.textContent = '0 results';
        return;
      }
      var groups = [], seen = {};
      hits.forEach(function (h) {
        var g = h.d.g || 'Other';
        if (!seen[g]) { seen[g] = []; groups.push(g); }
        seen[g].push(h);
      });
      groups.forEach(function (g) {
        var head = d.createElement('div');
        head.className = 'ag-palette-grp';
        head.setAttribute('role', 'presentation');
        head.textContent = g;
        listEl.appendChild(head);
        seen[g].forEach(function (h) {
          var a = d.createElement('a');
          a.className = 'ag-palette-row';
          a.setAttribute('role', 'option');
          a.setAttribute('aria-selected', 'false');
          a.setAttribute('tabindex', '-1');
          a.href = h.d.u || '#';
          a.id = 'ag-palette-o' + rows.length;
          a.innerHTML = '<span class="ag-palette-ic" aria-hidden="true">' + esc(initial(g)) + '</span>'
            + '<span class="ag-palette-tx">' + hi(h.d.t || '', h.marks) + '</span>'
            + '<span class="ag-palette-go">Open ↵</span>';
          (function (el) {
            on(el, 'mousemove', function () { mark(rows.indexOf(el)); });
          })(a);
          listEl.appendChild(a);
          rows.push(a);
        });
      });
      if (count) count.textContent = rows.length + ' result' + (rows.length === 1 ? '' : 's');
      mark(0);
    }

    function mark(n) {
      if (!rows.length) return;
      sel = Math.max(0, Math.min(rows.length - 1, n));
      rows.forEach(function (el, i2) { el.setAttribute('aria-selected', i2 === sel ? 'true' : 'false'); });
      var el = rows[sel];
      input.setAttribute('aria-activedescendant', el.id);
      var er = el.getBoundingClientRect(), lr = listEl.getBoundingClientRect();
      if (er.top < lr.top) listEl.scrollTop -= (lr.top - er.top);
      else if (er.bottom > lr.bottom) listEl.scrollTop += (er.bottom - lr.bottom);
    }

    function load() {
      if (INDEX || loading) return;
      loading = true;
      if (!window.fetch) { loadError = 'Search is unavailable in this browser.'; loading = false; render(); return; }
      fetch('/search-index.json', { credentials: 'same-origin' })
        .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
        .then(function (j) {
          INDEX = (j && j.length ? j : []).filter(function (x) { return x && x.t; });
          loading = false;
          if (!INDEX.length) loadError = 'The search index is empty.';
          render();
        })
        .catch(function () {
          loading = false;
          loadError = 'Search is unavailable right now. Please use the site navigation.';
          render();
        });
    }

    function trapKeys(e) {
      if (e.key !== 'Tab') return;
      var f = $$(FOCUSABLE, dialog);
      if (!f.length) { e.preventDefault(); return; }
      var first = f[0], lastEl = f[f.length - 1];
      if (e.shiftKey && d.activeElement === first) { e.preventDefault(); lastEl.focus(); }
      else if (!e.shiftKey && d.activeElement === lastEl) { e.preventDefault(); first.focus(); }
    }
    function guardFocus(e) {
      if (!open) return;
      if (!dialog.contains(e.target)) { e.stopPropagation(); try { input.focus(); } catch (er) {} }
    }

    function openPalette() {
      if (open) return;
      open = true;
      lastFocus = d.activeElement;
      if (scrim) scrim.hidden = false;
      dialog.hidden = false;
      input.value = '';
      load();
      render();
      try { input.focus(); } catch (e) {}
      setTimeout(function () { try { if (open && d.activeElement !== input) input.focus(); } catch (e) {} }, 60);
      d.addEventListener('focusin', guardFocus, true);
    }
    function closePalette() {
      if (!open) return;
      open = false;
      if (scrim) scrim.hidden = true;
      dialog.hidden = true;
      d.removeEventListener('focusin', guardFocus, true);
      try { (lastFocus && lastFocus.focus ? lastFocus : trigger).focus(); } catch (e) {}
    }

    on(trigger, 'click', openPalette);
    on(scrim, 'click', closePalette);
    on($('[data-ag-palette-close]', root), 'click', closePalette);
    on(input, 'input', render);
    on(dialog, 'keydown', trapKeys);
    on(input, 'keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); mark(sel + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); mark(sel - 1); }
      else if (e.key === 'Home') { e.preventDefault(); mark(0); }
      else if (e.key === 'End') { e.preventDefault(); mark(rows.length - 1); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        if (rows[sel] && rows[sel].href) { var href = rows[sel].getAttribute('href'); closePalette(); location.href = href; }
      } else if (e.key === 'Escape') { e.preventDefault(); closePalette(); }
    });
    on(dialog, 'keydown', function (e) { if (e.key === 'Escape') { e.preventDefault(); closePalette(); } });
    on(d, 'keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        if (open) closePalette(); else openPalette();
      }
    });
  }

  /* =========================================================
     C20 — consent bar
     ========================================================= */
  function initConsent(root) {
    var bar = $('[data-ag-consent-bar]', root);
    if (!bar) return;
    var live = $('[data-ag-consent-live]', root);
    var an = $('[data-ag-consent-k="analytics"]', root);
    var mk = $('[data-ag-consent-k="marketing"]', root);
    var KEY = 'ag_consent_v1';
    var mem = null;

    function store(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { mem = o; } }
    function load() {
      try { var v = localStorage.getItem(KEY); return v ? JSON.parse(v) : mem; }
      catch (e) { return mem; }
    }

    function commit(o) {
      o.necessary = true;
      o.at = Date.now();
      store(o);
      root.hidden = true;
      if (live) live.textContent = 'Consent preferences saved.';
      try {
        d.dispatchEvent(new CustomEvent('ag:consent', { detail: o }));
      } catch (e) {
        if (d.createEvent) { var ev = d.createEvent('Event'); ev.initEvent('ag:consent', true, true); ev.detail = o; d.dispatchEvent(ev); }
      }
    }

    $$('[data-ag-consent-act]', root).forEach(function (b) {
      on(b, 'click', function () {
        var a = b.getAttribute('data-ag-consent-act');
        if (a === 'all') { if (an) an.checked = true; if (mk) mk.checked = true; commit({ analytics: true, marketing: true }); }
        else if (a === 'reject') { if (an) an.checked = false; if (mk) mk.checked = false; commit({ analytics: false, marketing: false }); }
        else commit({ analytics: !!(an && an.checked), marketing: !!(mk && mk.checked) });
      });
    });

    var existing = load();
    if (existing && typeof existing.at === 'number') { root.hidden = true; return; }
    root.hidden = false;
  }

  /* =========================================================
     boot
     ========================================================= */
  function boot() {
    $$('[data-ag-steps]').forEach(safe(initSteps));
    $$('[data-ag-call]').forEach(safe(initCall));
    $$('[data-ag-takeaways]').forEach(safe(initTakeaways));
    $$('[data-ag-rail]').forEach(safe(initRail));
    safe(initTerms)();
    $$('[data-ag-facts]').forEach(safe(initFacts));
    $$('[data-ag-ribbon]').forEach(safe(initRibbon));
    $$('[data-ag-palette]').forEach(safe(initPalette));
    $$('[data-ag-consent]').forEach(safe(initConsent));
  }

  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', boot);
  else boot();
})();


/* ---------- ag-consent-manage-step ----------
   Progressive refinement of the consent bar: the granular toggles start collapsed
   behind a Manage control, and the bar waits for the page to settle before it
   appears so it never lands on top of the hero as it is being read. */
(function () {
  'use strict';
  function boot() {
    var root = document.querySelector('.ag-consent');
    if (!root || root.hidden) return;
    var bar = root.querySelector('.ag-consent-bar');
    var acts = root.querySelector('.ag-consent-acts');
    if (!bar || !acts || bar.querySelector('[data-ag-manage]')) return;

    var manage = document.createElement('button');
    manage.type = 'button';
    manage.className = 'ag-consent-btn';
    manage.setAttribute('data-ag-manage', '');
    manage.setAttribute('aria-expanded', 'false');
    manage.textContent = 'Manage';
    manage.addEventListener('click', function () {
      var open = bar.classList.toggle('is-manage');
      manage.setAttribute('aria-expanded', String(open));
      manage.textContent = open ? 'Hide options' : 'Manage';
    });
    acts.insertBefore(manage, acts.firstChild);

    /* let the page settle first */
    root.style.visibility = 'hidden';
    window.setTimeout(function () { root.style.visibility = ''; }, 1200);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
