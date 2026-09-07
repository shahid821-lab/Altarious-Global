/* ============================================================
   Altarious Global — component set A (C1–C10) behaviour
   One IIFE. ES5 syntax. No globals. Every module guards its
   own elements, so a page missing a component never throws.
   ============================================================ */
(function () {
  'use strict';

  var d = document;
  var w = window;
  var reduced = false;
  try {
    reduced = !!(w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches);
  } catch (e) { reduced = false; }

  function all(sel, ctx) {
    try {
      return Array.prototype.slice.call((ctx || d).querySelectorAll(sel));
    } catch (e) { return []; }
  }
  function one(sel, ctx) {
    try { return (ctx || d).querySelector(sel); } catch (e) { return null; }
  }
  function on(el, type, fn, opts) {
    if (el && el.addEventListener) el.addEventListener(type, fn, opts);
  }
  function num(n) { return Math.round(n).toLocaleString('en-US'); }
  function money(n) { return '$' + num(n); }
  function closest(el, sel) {
    while (el && el.nodeType === 1) {
      if (el.matches ? el.matches(sel) : false) return el;
      el = el.parentNode;
    }
    return null;
  }
  function escHtml(s) {
    return String(s).replace(/[&<>]/g, function (c) {
      return c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;';
    });
  }

  /* Animate a number, always with a timeout that jumps to the end state
     in case animation frames are throttled or never fire. */
  function tween(el, from, to, dur, format) {
    if (!el) return;
    if (el._agRaf && w.cancelAnimationFrame) w.cancelAnimationFrame(el._agRaf);
    if (el._agT) w.clearTimeout(el._agT);
    if (reduced || !w.requestAnimationFrame || !w.performance) {
      el.textContent = format(to);
      return;
    }
    el._agT = w.setTimeout(function () {
      if (el._agRaf && w.cancelAnimationFrame) w.cancelAnimationFrame(el._agRaf);
      el.textContent = format(to);
    }, dur + 120);
    var start = w.performance.now();
    var step = function (t) {
      var p = Math.min(1, (t - start) / dur);
      var e = 1 - Math.pow(1 - p, 3);
      el.textContent = format(from + (to - from) * e);
      if (p < 1) el._agRaf = w.requestAnimationFrame(step);
      else { el.textContent = format(to); if (el._agT) w.clearTimeout(el._agT); }
    };
    el._agRaf = w.requestAnimationFrame(step);
  }

  /* ---------- C1 · .ag-anchor ---------- */
  all('[data-ag-anchor]').forEach(function (root) {
    var links = all('.ag-anchor__link', root);
    var ind = one('.ag-anchor__indicator', root);
    if (!links.length || !ind) return;

    var top0 = 0;
    function place(link) {
      var t = link.offsetTop + 4;
      var h = Math.max(14, link.offsetHeight - 8);
      ind.style.height = h + 'px';
      ind.style.transform = 'translateY(' + (t - top0) + 'px)';
      root.classList.add('is-ready');
    }
    function setActive(id) {
      links.forEach(function (l) {
        var isOn = l.getAttribute('data-ag-target') === id;
        l.classList.toggle('is-active', isOn);
        if (isOn) { l.setAttribute('aria-current', 'true'); place(l); }
        else l.removeAttribute('aria-current');
      });
    }
    function spy() {
      var probe = (w.pageYOffset || d.documentElement.scrollTop) + 140;
      var current = links[0].getAttribute('data-ag-target');
      links.forEach(function (l) {
        var sec = d.getElementById(l.getAttribute('data-ag-target'));
        if (!sec) return;
        var abs = sec.getBoundingClientRect().top + (w.pageYOffset || d.documentElement.scrollTop);
        if (abs <= probe) current = l.getAttribute('data-ag-target');
      });
      var doc = d.documentElement;
      if (w.innerHeight + (w.pageYOffset || doc.scrollTop) >= doc.scrollHeight - 4) {
        current = links[links.length - 1].getAttribute('data-ag-target');
      }
      setActive(current);
    }

    top0 = links[0] ? links[0].offsetTop + 4 : 0;
    links.forEach(function (l) {
      on(l, 'click', function () { setActive(l.getAttribute('data-ag-target')); });
    });
    on(w, 'scroll', spy, { passive: true });
    on(w, 'resize', function () {
      top0 = links[0].offsetTop + 4;
      spy();
    }, { passive: true });
    spy();
    w.setTimeout(spy, 60);
  });

  /* ---------- C2 · .ag-coverage ---------- */
  var BIG = ['CA', 'TX', 'FL', 'NY', 'PA', 'IL', 'OH', 'GA', 'NC', 'MI'];
  var LEVELS = ['Not live', 'Limited', 'Active', 'High volume'];
  var PRODUCT_NAMES = {
    'web-leads': 'Web Leads', 'inbound-calls': 'Inbound Calls', 'live-transfers': 'Live Transfers'
  };
  function coverageLevel(ab, product) {
    var key = ab + product, seed = 0, i;
    for (i = 0; i < key.length; i++) seed = (seed * 31 + key.charCodeAt(i)) % 9973;
    if (BIG.indexOf(ab) > -1) return product === 'inbound-calls' ? 3 : (seed % 4 === 0 ? 2 : 3);
    var r = seed % 100;
    if (product === 'inbound-calls') return r < 12 ? 0 : r < 40 ? 1 : r < 78 ? 2 : 3;
    return r < 26 ? 0 : r < 58 ? 1 : r < 88 ? 2 : 3;
  }

  all('[data-ag-coverage]').forEach(function (root) {
    var grid = one('.ag-coverage__grid', root);
    var tip = one('.ag-coverage__tip', root);
    var count = one('.ag-coverage__count', root);
    var tabs = all('.ag-coverage__tab', root);
    if (!grid) return;
    var cells = all('.ag-coverage__cell', grid);
    if (!cells.length) return;
    var product = root.getAttribute('data-product') || 'inbound-calls';

    function stateName(cell) {
      var lbl = cell.getAttribute('aria-label') || '';
      return lbl.split(':')[0];
    }

    function render() {
      var live = 0;
      var pname = PRODUCT_NAMES[product] || product;
      cells.forEach(function (cell) {
        var ab = cell.getAttribute('data-ab');
        var lv = coverageLevel(ab, product);
        if (lv > 0) live++;
        cell.className = 'ag-coverage__cell is-l' + lv;
        cell.setAttribute('data-level', String(lv));
        cell.setAttribute('aria-label', stateName(cell) + ': ' + LEVELS[lv] + ', ' + pname);
      });
      if (count) count.textContent = live + ' / 50 states live · ' + pname;
      root.setAttribute('data-product', product);
      hide();
    }

    function show(cell) {
      if (!tip) return;
      var lv = parseInt(cell.getAttribute('data-level'), 10) || 0;
      tip.innerHTML = '<b>' + escHtml(stateName(cell) + ' · ' + cell.getAttribute('data-ab')) + '</b>' +
        escHtml(LEVELS[lv] + ' · ' + (PRODUCT_NAMES[product] || product));
      tip.hidden = false;
      var r = cell.getBoundingClientRect(), rr = root.getBoundingClientRect();
      var x = r.left - rr.left + r.width / 2;
      tip.style.left = Math.max(8, Math.min(rr.width - 8, x)) + 'px';
      tip.style.top = (r.top - rr.top - 6) + 'px';
    }
    function hide() { if (tip) tip.hidden = true; }

    on(grid, 'mouseover', function (e) { var c = closest(e.target, '.ag-coverage__cell'); if (c) show(c); });
    on(grid, 'mouseleave', hide);
    on(grid, 'focusin', function (e) { var c = closest(e.target, '.ag-coverage__cell'); if (c) show(c); });
    on(grid, 'focusout', hide);

    tabs.forEach(function (t) {
      on(t, 'click', function () {
        tabs.forEach(function (o) {
          var isOn = o === t;
          o.classList.toggle('is-on', isOn);
          o.setAttribute('aria-selected', isOn ? 'true' : 'false');
        });
        product = t.getAttribute('data-product');
        render();
      });
    });
  });

  /* ---------- C3 · .ag-compare ---------- */
  all('[data-ag-compare]').forEach(function (root) {
    var table = one('.ag-compare__table', root);
    if (!table) return;
    var cells = all('[data-col]', table);
    if (!cells.length) return;
    var locked = [];
    cells.forEach(function (c) { if (c.classList.contains('is-hot')) locked.push(c); });

    function highlight(col) {
      cells.forEach(function (c) {
        var isOn = col ? c.getAttribute('data-col') === col : locked.indexOf(c) > -1;
        c.classList.toggle('is-hot', isOn);
      });
    }
    on(table, 'mouseover', function (e) {
      var c = closest(e.target, '[data-col]');
      highlight(c ? c.getAttribute('data-col') : null);
    });
    on(table, 'mouseleave', function () { highlight(null); });
    all('thead th[data-col]', table).forEach(function (th) {
      th.tabIndex = 0;
      on(th, 'focus', function () { highlight(th.getAttribute('data-col')); });
      on(th, 'blur', function () { highlight(null); });
    });
  });

  /* ---------- C4 · .ag-calc ---------- */
  all('[data-ag-calc]').forEach(function (root) {
    var price = parseFloat(root.getAttribute('data-price')) || 38;
    var days = parseFloat(root.getAttribute('data-days')) || 22;
    var vol = one('[data-ag-input="vol"]', root);
    var close = one('[data-ag-input="close"]', root);
    var value = one('[data-ag-input="value"]', root);
    if (!vol || !close || !value) return;

    var outs = {};
    all('[data-ag-out]', root).forEach(function (el) { outs[el.getAttribute('data-ag-out')] = el; });
    var prev = { cust: null, cpa: null, rev: null };

    function fill(inp) {
      var min = parseFloat(inp.min), max = parseFloat(inp.max);
      var pct = max > min ? (parseFloat(inp.value) - min) / (max - min) * 100 : 0;
      inp.style.setProperty('--ag-fill', pct + '%');
    }
    function setOut(id, text) { var el = one('#' + id, root); if (el) el.textContent = text; }

    function update() {
      var v = +vol.value, c = +close.value, av = +value.value;
      setOut('ag-calc-vol-out', String(v));
      setOut('ag-calc-close-out', c + '%');
      setOut('ag-calc-value-out', money(av));
      fill(vol); fill(close); fill(value);

      var monthly = v * days;
      var cust = monthly * (c / 100);
      var spend = monthly * price;
      var targets = { cust: cust, cpa: cust > 0 ? spend / cust : 0, rev: cust * av };

      ['cust', 'cpa', 'rev'].forEach(function (k) {
        var el = outs[k];
        if (!el) return;
        var from = prev[k] === null ? targets[k] : prev[k];
        prev[k] = targets[k];
        tween(el, from, targets[k], 420, k === 'cust' ? num : money);
      });
    }

    on(vol, 'input', update);
    on(close, 'input', update);
    on(value, 'input', update);
    update();
  });

  /* ---------- C5 · .ag-criteria ---------- */
  all('[data-ag-criteria]').forEach(function (root) {
    var chips = all('.ag-criteria__chip', root);
    var sentence = one('.ag-criteria__sentence', root);
    var barFill = one('.ag-criteria__fill', root);
    var volEl = one('.ag-criteria__vol', root);
    var reset = one('.ag-criteria__reset', root);
    if (!chips.length || !sentence || !barFill || !volEl) return;

    var base = parseFloat(root.getAttribute('data-base')) || 1850;
    var shown = base;

    function render() {
      var onChips = chips.filter(function (c) { return c.getAttribute('aria-pressed') === 'true'; });
      var factor = 1;
      onChips.forEach(function (c) { factor *= parseFloat(c.getAttribute('data-factor')) || 1; });

      if (!onChips.length) {
        sentence.innerHTML = 'Send us <b>every consumer</b> in your licensed states.';
      } else {
        var parts = onChips.map(function (c) { return escHtml(c.getAttribute('data-phrase') || ''); });
        var joined = parts.length === 1
          ? parts[0]
          : parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1];
        sentence.innerHTML = 'Only send consumers matching <b>' + joined + '</b>.';
      }
      barFill.style.width = Math.max(6, factor * 100) + '%';
      var target = base * factor;
      tween(volEl, shown, target, 380, num);
      shown = target;
    }

    chips.forEach(function (c) {
      on(c, 'click', function () {
        c.setAttribute('aria-pressed', c.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
        render();
      });
    });
    on(reset, 'click', function () {
      chips.forEach(function (c) { c.setAttribute('aria-pressed', 'false'); });
      render();
    });
  });

  /* ---------- C6 · .ag-timeline ---------- */
  all('[data-ag-timeline]').forEach(function (root) {
    var days = all('.ag-timeline__day', root);
    var panels = all('.ag-timeline__panel', root);
    var lineFill = one('.ag-timeline__line-fill', root);
    if (days.length < 2 || panels.length !== days.length) return;

    function select(i, focus) {
      days.forEach(function (dd, j) {
        var isOn = j === i;
        dd.classList.toggle('is-on', isOn);
        dd.classList.toggle('is-done', j < i);
        dd.setAttribute('aria-selected', isOn ? 'true' : 'false');
        dd.tabIndex = isOn ? 0 : -1;
      });
      panels.forEach(function (p, j) {
        p.hidden = j !== i;
        p.classList.toggle('is-on', j === i);
      });
      if (lineFill) lineFill.style.width = (i / (days.length - 1) * 100) + '%';
      if (focus) days[i].focus();
    }

    days.forEach(function (dd, i) {
      on(dd, 'click', function () { select(i); });
      on(dd, 'keydown', function (e) {
        var k = e.key, n = null;
        if (k === 'ArrowRight' || k === 'ArrowDown') n = (i + 1) % days.length;
        else if (k === 'ArrowLeft' || k === 'ArrowUp') n = (i - 1 + days.length) % days.length;
        else if (k === 'Home') n = 0;
        else if (k === 'End') n = days.length - 1;
        if (n !== null) { e.preventDefault(); select(n, true); }
      });
    });
    select(0);
  });

  /* ---------- C7 · .ag-marquee ---------- */
  all('[data-ag-marquee]').forEach(function (root) {
    var belt = one('.ag-marquee__belt', root);
    var sets = all('.ag-marquee__set', root);
    if (!belt || sets.length < 2) return;
    if (!reduced) root.classList.add('is-ready');
  });

  /* ---------- C8 · .ag-faq ---------- */
  all('[data-ag-faq]').forEach(function (root) {
    var list = one('.ag-faq__list', root);
    var items = all('.ag-faq__item', root);
    var searchBox = one('[data-ag-faq-search]', root);
    var empty = one('.ag-faq__empty', root);
    var count = one('.ag-faq__count', root);
    if (!list || !items.length) return;

    items.forEach(function (item) {
      var btn = one('.ag-faq__q', item);
      var ans = one('.ag-faq__a', item);
      if (!btn || !ans) return;
      on(btn, 'click', function () {
        var open = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', open ? 'false' : 'true');
        ans.hidden = open;
      });
    });

    if (!searchBox) return;
    searchBox.hidden = false;
    if (count) count.hidden = false;
    var input = one('.ag-faq__input', searchBox);
    if (!input) return;

    function mark(text, term) {
      var safe = escHtml(text);
      if (!term) return safe;
      var re = new RegExp('(' + term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig');
      return safe.replace(re, '<mark>$1</mark>');
    }

    function render() {
      var term = input.value.replace(/^\s+|\s+$/g, '');
      var lo = term.toLowerCase();
      var shown = 0;
      items.forEach(function (item) {
        var q = item.getAttribute('data-q') || '';
        var a = item.getAttribute('data-a') || '';
        var hit = !lo || q.indexOf(lo) > -1 || a.indexOf(lo) > -1;
        item.hidden = !hit;
        if (!hit) return;
        shown++;
        var qt = one('.ag-faq__qt', item);
        var ap = one('.ag-faq__a p', item);
        var btn = one('.ag-faq__q', item);
        var ans = one('.ag-faq__a', item);
        if (qt) qt.innerHTML = mark(qt.textContent, term);
        if (ap) ap.innerHTML = mark(ap.textContent, term);
        if (lo && q.indexOf(lo) === -1 && btn && ans) {
          btn.setAttribute('aria-expanded', 'true');
          ans.hidden = false;
        }
      });
      if (empty) {
        empty.hidden = shown > 0;
        var b = one('b', empty);
        if (b) b.textContent = '"' + term + '"';
      }
      list.hidden = shown === 0;
      if (count) count.textContent = shown + ' of ' + items.length + ' questions';
    }

    on(input, 'input', render);
    all('.ag-faq__sugg', root).forEach(function (b) {
      on(b, 'click', function () { input.value = b.textContent; render(); input.focus(); });
    });
    render();
  });

  /* ---------- C9 · .ag-models ---------- */
  all('[data-ag-models]').forEach(function (root) {
    var toggle = one('[data-ag-models-toggle]', root);
    var bodies = all('.ag-models__body', root);
    if (!toggle || !bodies.length) return;
    toggle.hidden = false;
    var tabs = all('.ag-models__tab', toggle);
    if (!tabs.length) return;

    function render(mode, animate) {
      bodies.forEach(function (b) {
        var text = b.getAttribute('data-' + mode);
        if (text === null) return;
        b.textContent = text;
        if (animate && !reduced) {
          b.classList.remove('is-swap');
          void b.offsetWidth;
          b.classList.add('is-swap');
        }
      });
    }

    tabs.forEach(function (t) {
      on(t, 'click', function () {
        tabs.forEach(function (o) {
          var isOn = o === t;
          o.classList.toggle('is-on', isOn);
          o.setAttribute('aria-selected', isOn ? 'true' : 'false');
        });
        render(t.getAttribute('data-mode') || 'how', true);
      });
    });
  });

  /* ---------- C10 · .ag-enquirybar ---------- */
  all('[data-ag-enquirybar]').forEach(function (root) {
    var x = one('[data-ag-dismiss]', root);
    var threshold = parseFloat(root.getAttribute('data-threshold'));
    if (isNaN(threshold)) threshold = 0.4;
    var visible = false;
    var dismissed = false;

    root.classList.add('is-enhanced');
    if (x) x.hidden = false;

    function progress() {
      var doc = d.documentElement;
      var max = doc.scrollHeight - w.innerHeight;
      if (max <= 0) return 1;
      return (w.pageYOffset || doc.scrollTop) / max;
    }
    function update() {
      if (dismissed) return;
      var p = progress();
      if (p >= threshold && !visible) { root.classList.add('is-in'); visible = true; }
      else if (p < threshold && visible) { root.classList.remove('is-in'); visible = false; }
    }

    on(x, 'click', function () {
      dismissed = true;
      visible = false;
      root.classList.remove('is-in');
      w.setTimeout(function () { root.classList.add('is-gone'); }, reduced ? 0 : 380);
    });

    on(w, 'scroll', update, { passive: true });
    on(w, 'resize', update, { passive: true });
    update();
    w.setTimeout(update, 200);
  });
})();
