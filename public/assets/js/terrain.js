/* ============================================================
   Altarious Global — "Signal Terrain"
   Canvas wireframe demand-heightfield for hero backgrounds.

   Public API
     window.AGTerrain.mount(el, { preset, seed, peaks, label }) -> { destroy: fn }
     window.AGTerrain.presets  (read-only list of preset names)

   Auto-mount: every [data-terrain] element on DOM ready.
     data-terrain="home|vertical|sub|product|article|page"
     data-terrain-seed="insurance-auto"
     data-terrain-peaks='[{"label":"Auto Insurance","x":0.30,"h":0.85}]'
     data-terrain-label="Insurance"

   Vanilla ES5. No libraries. Canvas 2D only. Decorative + aria-hidden.
   ============================================================ */
(function (window, document) {
  'use strict';

  if (!window || !document) return;
  if (window.AGTerrain) return;

  /* ---------------------------------------------------------
     0. capability probe
     --------------------------------------------------------- */
  function canvasSupported() {
    try {
      var c = document.createElement('canvas');
      return !!(c.getContext && c.getContext('2d'));
    } catch (e) { return false; }
  }

  var HAS_CANVAS = canvasSupported();
  var HAS_RAF = typeof window.requestAnimationFrame === 'function';
  var HAS_IO = typeof window.IntersectionObserver === 'function';
  var HAS_RO = typeof window.ResizeObserver === 'function';
  var HAS_MO = typeof window.MutationObserver === 'function';

  function now() {
    return (window.performance && window.performance.now)
      ? window.performance.now() : new Date().getTime();
  }

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function smooth(t) { return t * t * (3 - 2 * t); }

  /* ---------------------------------------------------------
     1. deterministic noise
     Seed -> 32bit int -> value noise lattice -> fbm.
     No Math.random anywhere in the render path.
     --------------------------------------------------------- */
  function hashSeed(str) {
    var h = 2166136261, i;
    str = String(str == null ? 'altarious' : str);
    for (i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h + (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24)) >>> 0;
    }
    return h >>> 0;
  }

  /* integer hash -> [0,1) */
  function hash2(ix, iy, seed) {
    var n = (ix * 374761393 + iy * 668265263 + seed * 1274126177) >>> 0;
    n = (n ^ (n >>> 13)) >>> 0;
    n = (n * 1274126177) >>> 0;
    n = (n ^ (n >>> 16)) >>> 0;
    return n / 4294967296;
  }

  /* smooth 2D value noise */
  function valueNoise(x, y, seed) {
    var xi = Math.floor(x), yi = Math.floor(y);
    var xf = x - xi, yf = y - yi;
    var u = smooth(xf), v = smooth(yf);
    var a = hash2(xi, yi, seed);
    var b = hash2(xi + 1, yi, seed);
    var c = hash2(xi, yi + 1, seed);
    var d = hash2(xi + 1, yi + 1, seed);
    return lerp(lerp(a, b, u), lerp(c, d, u), v);
  }

  /* fractal brownian motion, octaves fixed for cost predictability */
  function fbm(x, y, seed, octaves) {
    var sum = 0, amp = 0.5, freq = 1, norm = 0, i;
    for (i = 0; i < octaves; i++) {
      sum += valueNoise(x * freq, y * freq, seed + i * 7919) * amp;
      norm += amp;
      amp *= 0.5;
      freq *= 2.03;
    }
    return sum / (norm || 1);
  }

  /* ridged variant — gives the landscape its engineered creases */
  function ridged(x, y, seed, octaves) {
    var sum = 0, amp = 0.5, freq = 1, norm = 0, i, n;
    for (i = 0; i < octaves; i++) {
      n = 1 - Math.abs(valueNoise(x * freq, y * freq, seed + i * 3571) * 2 - 1);
      sum += n * n * amp;
      norm += amp;
      amp *= 0.5;
      freq *= 2.11;
    }
    return sum / (norm || 1);
  }

  /* ---------------------------------------------------------
     2. named demand shapes (home preset morphs between these)
     x = across (0..1), z = depth (0..1), h = height, s = spread
     --------------------------------------------------------- */
  var SHAPES = [
    {
      name: 'Insurance',
      peaks: [
        { x: 0.24, z: 0.34, h: 1.00, s: 0.15 },
        { x: 0.62, z: 0.63, h: 0.80, s: 0.17 },
        { x: 0.86, z: 0.22, h: 0.46, s: 0.19 },
        { x: 0.42, z: 0.86, h: 0.36, s: 0.21 }
      ]
    },
    {
      name: 'Home Services',
      peaks: [
        { x: 0.31, z: 0.71, h: 0.94, s: 0.16 },
        { x: 0.72, z: 0.35, h: 0.88, s: 0.15 },
        { x: 0.10, z: 0.47, h: 0.44, s: 0.20 },
        { x: 0.55, z: 0.11, h: 0.34, s: 0.18 }
      ]
    },
    {
      name: 'Web Leads',
      peaks: [
        { x: 0.18, z: 0.56, h: 0.76, s: 0.18 },
        { x: 0.52, z: 0.27, h: 1.00, s: 0.14 },
        { x: 0.80, z: 0.73, h: 0.64, s: 0.17 },
        { x: 0.93, z: 0.39, h: 0.40, s: 0.16 }
      ]
    }
  ];

  /* ---------------------------------------------------------
     3. presets
     amp      vertical scale of the field
     fbmAmp   how much broken terrain rides on the massifs
     cols/rows mesh density caps (hard ceiling 48 x 26)
     fps      target frame rate (frames skipped to hold it)
     speed    camera glide
     horizon  fraction of height where the horizon sits
     morph    cycle between SHAPES
     channels routing-lane grouping (product)
     --------------------------------------------------------- */
  var PRESETS = {
    home: {
      amp: 1.00, fbmAmp: 0.42, cols: 48, rows: 26, fps: 60,
      speed: 1.25, horizon: 0.40, depth: 26, camLift: 0.42,
      morph: true, morphHold: 6.0, channels: 0,
      glow: 1.00, fill: 1.00, longEvery: 4, massif: 1.0
    },
    vertical: {
      amp: 0.82, fbmAmp: 0.30, cols: 44, rows: 24, fps: 45,
      speed: 0.72, horizon: 0.42, depth: 24, camLift: 0.40,
      morph: false, channels: 0,
      glow: 0.85, fill: 0.95, longEvery: 5, massif: 1.35,
      shape: [{ x: 0.38, z: 0.52, h: 1.00, s: 0.26 }, { x: 0.78, z: 0.30, h: 0.34, s: 0.18 }]
    },
    sub: {
      amp: 0.68, fbmAmp: 0.26, cols: 40, rows: 20, fps: 40,
      speed: 0.60, horizon: 0.45, depth: 16, camLift: 0.34,
      morph: false, channels: 0,
      glow: 0.72, fill: 0.9, longEvery: 5, massif: 1.0,
      shape: [{ x: 0.50, z: 0.46, h: 1.00, s: 0.19 }]
    },
    product: {
      amp: 0.74, fbmAmp: 0.20, cols: 48, rows: 24, fps: 45,
      speed: 0.85, horizon: 0.42, depth: 22, camLift: 0.38,
      morph: false, channels: 5,
      glow: 0.78, fill: 0.85, longEvery: 3, massif: 0.55,
      shape: [{ x: 0.30, z: 0.55, h: 0.80, s: 0.22 }, { x: 0.70, z: 0.40, h: 0.72, s: 0.22 }]
    },
    article: {
      amp: 0.30, fbmAmp: 0.14, cols: 36, rows: 18, fps: 24,
      speed: 0.26, horizon: 0.46, depth: 18, camLift: 0.30,
      morph: false, channels: 0,
      glow: 0.42, fill: 0.62, longEvery: 6, massif: 0.9,
      shape: [{ x: 0.44, z: 0.50, h: 0.70, s: 0.30 }]
    },
    page: {
      amp: 0.58, fbmAmp: 0.24, cols: 42, rows: 22, fps: 36,
      speed: 0.55, horizon: 0.44, depth: 20, camLift: 0.36,
      morph: false, channels: 0,
      glow: 0.62, fill: 0.8, longEvery: 5, massif: 1.0,
      shape: [{ x: 0.34, z: 0.44, h: 0.80, s: 0.24 }, { x: 0.74, z: 0.62, h: 0.58, s: 0.22 }]
    }
  };

  var MAX_COLS = 48, MAX_ROWS = 26;

  /* ---------------------------------------------------------
     4. theme reading
     --------------------------------------------------------- */
  function parseColor(str) {
    if (!str) return null;
    str = String(str).trim();
    var m;
    if (str.charAt(0) === '#') {
      var hex = str.slice(1);
      if (hex.length === 3) {
        hex = hex.charAt(0) + hex.charAt(0) + hex.charAt(1) + hex.charAt(1) + hex.charAt(2) + hex.charAt(2);
      }
      if (hex.length < 6) return null;
      return [
        parseInt(hex.substr(0, 2), 16),
        parseInt(hex.substr(2, 2), 16),
        parseInt(hex.substr(4, 2), 16)
      ];
    }
    m = str.match(/rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
    if (m) return [+m[1], +m[2], +m[3]];
    return null;
  }

  function rgbToHsl(rgb) {
    var r = rgb[0] / 255, g = rgb[1] / 255, b = rgb[2] / 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    var h = 0, s = 0, l = (mx + mn) / 2, d = mx - mn;
    if (d) {
      s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      if (mx === r) h = ((g - b) / d + (g < b ? 6 : 0));
      else if (mx === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return [h, s * 100, l * 100];
  }

  function readTheme() {
    var root = document.documentElement;
    var cs;
    try { cs = window.getComputedStyle(root); } catch (e) { cs = null; }

    function v(name, fallback) {
      var raw = cs ? cs.getPropertyValue(name) : '';
      raw = raw ? raw.trim() : '';
      return raw || fallback;
    }

    var themeAttr = root.getAttribute('data-theme');
    var dark = themeAttr === 'dark';
    if (!themeAttr && window.matchMedia) {
      try { dark = window.matchMedia('(prefers-color-scheme: dark)').matches; } catch (e2) { dark = false; }
    }

    var brand = parseColor(v('--brand', dark ? '#2dd4bf' : '#0d9488')) || [45, 212, 191];
    var accent = parseColor(v('--accent', dark ? '#60a5fa' : '#2563eb')) || [96, 165, 250];
    var ink = parseColor(v('--ink', dark ? '#f2f6fd' : '#0a1628')) || [242, 246, 253];
    var deep = parseColor(v('--bg-deep', dark ? '#050810' : '#eaf0f9')) || [5, 8, 16];
    var heroBg = parseColor(v('--hero-bg', dark ? '#04070e' : '#06111f')) || [4, 7, 14];

    var bH = rgbToHsl(brand), aH = rgbToHsl(accent);

    /* The hero ground is dark in BOTH themes, so the terrain always
       renders "on black". In light theme we pull the far hue toward the
       brand teal/blue instead of running out to violet, which keeps the
       terrain reading as brand rather than as a neon toy. */
    var nearHue, farHue, sat, baseLight;
    if (dark) {
      nearHue = bH[0];                 /* cyan/teal near the camera */
      farHue = aH[0] + 42;             /* drifts toward violet at depth */
      sat = 96;
      baseLight = 62;
    } else {
      nearHue = bH[0] + 6;
      farHue = aH[0] - 4;              /* teal -> blue only */
      sat = 82;
      baseLight = 66;
    }

    return {
      dark: dark,
      nearHue: nearHue,
      farHue: farHue,
      sat: sat,
      light: baseLight,
      ink: ink,
      heroBg: heroBg,
      deep: deep,
      labelInk: dark ? '#e8f7ff' : '#eaf3ff',
      labelBg: 'rgba(' + heroBg[0] + ',' + heroBg[1] + ',' + heroBg[2] + ',.82)'
    };
  }

  /* ---------------------------------------------------------
     5. instance
     --------------------------------------------------------- */
  function mount(el, opts) {
    if (!el || el.nodeType !== 1) return null;
    if (!HAS_CANVAS) return null;
    if (el.__agTerrain) return el.__agTerrain;

    opts = opts || {};

    var presetName = String(opts.preset || 'page');
    if (!PRESETS[presetName]) presetName = 'page';
    var P = PRESETS[presetName];

    var seedStr = opts.seed != null ? String(opts.seed) : (presetName + '-altarious');
    var seed = hashSeed(seedStr);

    var label = opts.label ? String(opts.label) : '';
    var peaks = normalisePeaks(opts.peaks, seed);

    var layer = null, canvas = null, ctx = null;
    var destroyed = false;

    try {
      layer = document.createElement('div');
      /* Only a static host needs promoting; an already-positioned one (the hero
         media layer) must keep the position it was given. */
      try {
        var cs = window.getComputedStyle(el);
        if (cs && cs.position === 'static') el.style.position = 'relative';
      } catch (e) {}
      layer.className = 'terrain-layer';
      layer.setAttribute('aria-hidden', 'true');
      layer.setAttribute('data-terrain-preset', presetName);

      canvas = document.createElement('canvas');
      canvas.className = 'terrain-canvas';
      canvas.setAttribute('aria-hidden', 'true');
      ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('no 2d context');

      var scrim = document.createElement('div');
      scrim.className = 'terrain-scrim';
      scrim.setAttribute('aria-hidden', 'true');

      var grain = document.createElement('div');
      grain.className = 'terrain-grain';
      grain.setAttribute('aria-hidden', 'true');

      layer.appendChild(canvas);
      layer.appendChild(scrim);
      layer.appendChild(grain);

      if (el.firstChild) el.insertBefore(layer, el.firstChild);
      else el.appendChild(layer);
    } catch (e) {
      safeRemove(layer);
      return null;
    }

    /* ---- geometry state ---- */
    var W = 1, H = 1, dpr = 1, HZ = 0;
    var COLS = P.cols, ROWS = P.rows;
    var theme = readTheme();

    var camZ = 3.2;            /* start mid-glide: still frame is a composition */
    var blend = 0;             /* home preset morph position */
    var blendTarget = 0;
    var holdT = 0;

    var running = false, raf = 0, lastTs = 0, acc = 0;
    var visible = !HAS_IO;     /* without IO, assume visible */
    var reducedMQ = null, reduced = false;

    try {
      if (window.matchMedia) {
        reducedMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
        reduced = !!reducedMQ.matches;
      }
    } catch (e) { reduced = false; }

    var frameInterval = 1000 / (P.fps || 30);

    /* ---- static shape for non-morphing presets ---- */
    var staticShape = P.shape || SHAPES[0].peaks;

    function normalisePeaks(list, sd) {
      if (!list) return [];
      var out = [], i, p;
      if (typeof list === 'string') {
        try { list = JSON.parse(list); } catch (e) { return []; }
      }
      if (!list || typeof list.length !== 'number') return [];
      for (i = 0; i < list.length && i < 6; i++) {
        p = list[i];
        if (!p || !p.label) continue;
        out.push({
          label: String(p.label),
          x: clamp(typeof p.x === 'number' ? p.x : hash2(i + 11, 3, sd), 0.06, 0.94),
          h: clamp(typeof p.h === 'number' ? p.h : 0.8, 0.15, 1),
          /* depth is placed in the near half so labels stay low on canvas */
          z: clamp(typeof p.z === 'number' ? p.z : 0.62 + hash2(i + 5, 9, sd) * 0.26, 0.5, 0.94)
        });
      }
      return out;
    }

    /* ---- height field ---------------------------------------------------
       u: 0..1 across, w: 0..1 world depth (wraps with the camera)
       -------------------------------------------------------------------- */
    function massifs(u, w) {
      var i, p, dx, dz, h = 0, list, f;

      if (P.morph) {
        var n = SHAPES.length;
        var a = Math.floor(blend) % n;
        var b = (a + 1) % n;
        f = smooth(blend - Math.floor(blend));
        h = gauss(SHAPES[a].peaks, u, w) * (1 - f) + gauss(SHAPES[b].peaks, u, w) * f;
        return h;
      }

      list = staticShape;
      h = gauss(list, u, w);

      /* user-supplied peaks add their own massifs so labels sit on real hills */
      for (i = 0; i < peaks.length; i++) {
        p = peaks[i];
        dx = u - p.x; dz = w - p.z;
        h += p.h * 0.85 * Math.exp(-(dx * dx + dz * dz) / (2 * 0.11 * 0.11));
      }
      return h;
    }

    function gauss(list, u, w) {
      var h = 0, i, p, dx, dz;
      for (i = 0; i < list.length; i++) {
        p = list[i];
        dx = u - p.x; dz = w - p.z;
        h += p.h * Math.exp(-(dx * dx + dz * dz) / (2 * p.s * p.s));
      }
      return h;
    }

    /* routing-lane channels: quantise across-axis into corridors and
       carve troughs between them, so ridges read as lanes not dunes */
    function channelMask(u) {
      if (!P.channels) return 1;
      var lanes = P.channels;
      var t = u * lanes;
      var f = t - Math.floor(t);
      var edge = Math.abs(f - 0.5) * 2;        /* 0 centre .. 1 edge */
      return 1 - Math.pow(edge, 2.2) * 0.85;   /* deep grooves at lane edges */
    }

    function heightAt(u, w) {
      var base = massifs(u, w) * P.massif;
      var detail = P.channels
        ? ridged(u * 6.2, w * 3.4, seed, 3)
        : (fbm(u * 4.6, w * 3.2, seed, 3) - 0.5) * 2 * 0.5 + ridged(u * 3.1, w * 2.2, seed, 2) * 0.5;
      var h = (base + detail * P.fbmAmp) * channelMask(u);
      return h * P.amp;
    }

    /* ---- projection ----
       Horizontal spread scales with width so the field always fills the hero;
       vertical relief scales with HEIGHT, so a 1600px-wide hero does not get
       a mountain range six times taller than a 600px one. */
    function project(x, y, z) {
      var f = 1 / (z * 0.09 + 0.55);
      return {
        x: W / 2 + x * f * W * 0.030,
        y: HZ + (H * 0.60) * f * P.camLift - y * f * H * 0.026,
        f: f
      };
    }

    function measure() {
      var r = el.getBoundingClientRect();
      W = Math.max(1, r.width || el.offsetWidth || 1);
      H = Math.max(1, r.height || el.offsetHeight || 1);
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      HZ = H * P.horizon;

      /* mesh scales down on narrow viewports, never above the hard cap */
      var narrow = W < 480;
      var mid = W < 900;
      COLS = Math.min(MAX_COLS, narrow ? Math.round(P.cols * 0.62) : (mid ? Math.round(P.cols * 0.82) : P.cols));
      ROWS = Math.min(MAX_ROWS, narrow ? Math.round(P.rows * 0.65) : (mid ? Math.round(P.rows * 0.85) : P.rows));
      COLS = Math.max(14, COLS);
      ROWS = Math.max(8, ROWS);
    }

    /* ---- draw ---- */
    function draw() {
      if (destroyed || !ctx) return;

      var hueNear = theme.nearHue, hueFar = theme.farHue, S = theme.sat, L = theme.light;
      var i, j, r0;

      ctx.clearRect(0, 0, W, H);

      /* horizon glow */
      var gh = Math.max(28, H * 0.16);
      var g = ctx.createLinearGradient(0, HZ - gh, 0, HZ + gh * 0.5);
      g.addColorStop(0, 'hsla(' + hueFar + ',' + S + '%,' + L + '%,0)');
      g.addColorStop(0.72, 'hsla(' + hueNear + ',' + S + '%,' + L + '%,' + (0.28 * P.glow).toFixed(3) + ')');
      g.addColorStop(1, 'hsla(' + hueNear + ',' + S + '%,' + L + '%,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, HZ - gh, W, gh * 1.5);

      /* horizon line */
      ctx.fillStyle = 'hsla(' + hueNear + ',' + S + '%,' + (L + 16) + '%,' + (0.72 * P.glow).toFixed(3) + ')';
      ctx.fillRect(0, HZ - 0.5, W, 1);
      ctx.fillStyle = 'hsla(' + hueFar + ',' + S + '%,' + (L + 8) + '%,' + (0.10 * P.glow).toFixed(3) + ')';
      ctx.fillRect(0, HZ - 3, W, 6);

      /* build rows far -> near */
      var rows = [];
      var scroll = camZ * 0.035;
      for (j = ROWS - 1; j >= 0; j--) {
        var z = 0.7 + (j / ROWS) * P.depth;
        var world = (scroll + j / ROWS) % 1;
        if (world < 0) world += 1;
        var pts = [];
        for (i = 0; i <= COLS; i++) {
          var u = i / COLS;
          var hgt = heightAt(u, world);
          var p = project((u - 0.5) * 22, hgt * 7.6, z);
          p.h = hgt; p.u = u; p.world = world;
          pts.push(p);
        }
        rows.push({ pts: pts, z: z, world: world });
      }

      /* painter's algorithm — far rows first */
      for (r0 = 0; r0 < rows.length; r0++) {
        var row = rows[r0], next = rows[r0 + 1];
        var t = 1 - row.z / (P.depth + 1);          /* 0 far .. 1 near */
        var fog = Math.pow(Math.max(0, t), 1.5);    /* real depth fog */
        var hue = hueFar + (hueNear - hueFar) * t;

        if (next && P.fill > 0) {
          ctx.beginPath();
          ctx.moveTo(row.pts[0].x, row.pts[0].y);
          for (i = 1; i < row.pts.length; i++) ctx.lineTo(row.pts[i].x, row.pts[i].y);
          for (i = next.pts.length - 1; i >= 0; i--) ctx.lineTo(next.pts[i].x, next.pts[i].y);
          ctx.closePath();
          ctx.fillStyle = 'hsla(' + hue + ',' + (S * 0.8) + '%,' +
            (5 + fog * 7).toFixed(1) + '%,' + (P.fill * (0.34 + fog * 0.46)).toFixed(3) + ')';
          ctx.fill();
        }

        ctx.beginPath();
        ctx.moveTo(row.pts[0].x, row.pts[0].y);
        for (i = 1; i < row.pts.length; i++) ctx.lineTo(row.pts[i].x, row.pts[i].y);
        ctx.strokeStyle = 'hsla(' + hue + ',' + S + '%,' + (L - 4 + fog * 14).toFixed(1) + '%,' +
          (0.14 + fog * 0.86).toFixed(3) + ')';
        ctx.lineWidth = 0.85 + fog * 1.35;          /* fine linework, still hairline at distance */
        ctx.stroke();
      }

      /* longitudinal lines — the wireframe read */
      var every = P.longEvery;
      ctx.lineWidth = 0.7;
      ctx.strokeStyle = 'hsla(' + hueFar + ',' + S + '%,' + (L + 4) + '%,' +
        (0.26 * (P.channels ? 1.5 : 1)).toFixed(3) + ')';
      for (i = 0; i <= COLS; i += every) {
        ctx.beginPath();
        for (r0 = 0; r0 < rows.length; r0++) {
          var pp = rows[r0].pts[i];
          if (r0 === 0) ctx.moveTo(pp.x, pp.y); else ctx.lineTo(pp.x, pp.y);
        }
        ctx.stroke();
      }

      if (peaks.length) drawLabels(rows);
      if (label) drawCorner();
    }

    /* Labels ride the peaks and are hard-clipped to the lower 45% of the
       canvas so they can never collide with the hero headline. */
    function drawLabels(rows) {
      /* Everything a label draws — dot, stem and box — stays inside the
         lower 45% of the canvas, so the headline band is never touched. */
      var minY = H * 0.55 + 34;
      var maxY = H - 16;
      if (minY >= maxY) return;
      var out = [], i, k;

      for (i = 0; i < peaks.length; i++) {
        var pk = peaks[i];
        var best = null, bd = 9;
        for (k = 0; k < rows.length; k++) {
          var d = Math.abs(rows[k].world - pk.z);
          d = Math.min(d, 1 - d);
          if (d < bd) { bd = d; best = rows[k]; }
        }
        if (!best || bd > 0.08) continue;
        var idx = clamp(Math.round(pk.x * COLS), 0, COLS);
        var pt = best.pts[idx];
        var t = 1 - best.z / (P.depth + 1);
        if (pt.x < 10 || pt.x > W - 10) continue;
        /* A summit may sit high in the frame; the label never does. The
           anchor is clamped into the lower 45% so it cannot reach the
           headline band, and it fades as it is pushed away from its peak. */
        var y = clamp(pt.y, minY, maxY);
        var drift = Math.abs(y - pt.y) / Math.max(1, H * 0.45);
        var a = clamp(0.25 + t * 1.2, 0, 1) * clamp(1 - drift * 0.55, 0.28, 1);
        out.push({ x: pt.x, y: y, txt: pk.label, t: t, a: a });
      }
      out.sort(function (a, b) { return a.t - b.t; });

      var hue = theme.nearHue, S = theme.sat, L = theme.light;
      for (i = 0; i < out.length; i++) {
        var Lb = out[i];
        var stem = 14 + Lb.t * 8;
        var fs = 8.5 + Lb.t * 2.0;
        ctx.save();
        ctx.globalAlpha = Lb.a;                       /* fade with depth */

        ctx.beginPath();
        ctx.moveTo(Lb.x, Lb.y);
        ctx.lineTo(Lb.x, Lb.y - stem);
        ctx.strokeStyle = 'hsla(' + hue + ',' + S + '%,' + (L + 16) + '%,.6)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(Lb.x, Lb.y, 2.2, 0, 6.2832);
        ctx.fillStyle = 'hsla(' + hue + ',' + S + '%,' + (L + 24) + '%,.95)';
        ctx.fill();

        ctx.font = '500 ' + fs.toFixed(1) + 'px "JetBrains Mono", ui-monospace, SFMono-Regular, Consolas, monospace';
        var txt = Lb.txt.toUpperCase();
        var tw = ctx.measureText(txt).width;
        var bw = tw + 12, bh = fs + 9;
        var bx = clamp(Lb.x - bw / 2, 6, Math.max(6, W - bw - 6));
        var by = Math.max(H * 0.55, Lb.y - stem - bh - 2);

        ctx.fillStyle = theme.labelBg;
        ctx.fillRect(bx, by, bw, bh);
        ctx.strokeStyle = 'hsla(' + hue + ',' + S + '%,' + (L + 8) + '%,.34)';
        ctx.lineWidth = 1;
        ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);
        ctx.fillStyle = theme.labelInk;
        ctx.textBaseline = 'middle';
        ctx.fillText(txt, bx + 6, by + bh / 2);
        ctx.restore();
      }
    }

    function drawCorner() {
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.font = '500 9px "JetBrains Mono", ui-monospace, SFMono-Regular, Consolas, monospace';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = 'hsla(' + theme.nearHue + ',' + theme.sat + '%,' + (theme.light + 18) + '%,.85)';
      var txt = label.toUpperCase();
      ctx.fillText(txt, 14, H - 14);
      var w = ctx.measureText(txt).width;
      ctx.fillRect(14, H - 10, w, 1);
      ctx.restore();
    }

    /* ---- animation loop ---- */
    function step(ts) {
      if (!running || destroyed) return;
      raf = window.requestAnimationFrame(step);

      var dt = ts - lastTs;
      if (lastTs && dt < frameInterval - 1) return;   /* frame skipping */
      var sec = clamp(lastTs ? dt / 1000 : 0.016, 0, 0.05);
      lastTs = ts;

      camZ += sec * P.speed;

      if (P.morph) {
        holdT += sec;
        if (holdT > (P.morphHold || 6)) { holdT = 0; blendTarget = Math.round(blend) + 1; }
        var d = blendTarget - blend;
        if (Math.abs(d) > 0.0005) blend += d * Math.min(1, sec * 1.6);
        if (blend >= SHAPES.length) { blend -= SHAPES.length; blendTarget -= SHAPES.length; }
      }

      try { draw(); } catch (e) { fail(); }
    }

    function start() {
      if (running || destroyed || reduced || !HAS_RAF) return;
      if (!visible || document.hidden) return;
      running = true;
      lastTs = 0;
      /* Paint one frame synchronously so the hero is never blank while waiting on the
         first animation frame — which a throttled or background tab may not deliver. */
      try { draw(); } catch (e) { fail(); return; }
      raf = window.requestAnimationFrame(step);
    }

    function stop() {
      running = false;
      if (raf && window.cancelAnimationFrame) window.cancelAnimationFrame(raf);
      raf = 0;
    }

    function redraw() {
      try { draw(); } catch (e) { fail(); }
    }

    /* ---- observers ---- */
    var io = null, ro = null, mo = null, roTimer = 0;

    function onVisibility() {
      if (document.hidden) stop(); else start();
    }
    function onReduced() {
      reduced = !!(reducedMQ && reducedMQ.matches);
      if (reduced) { stop(); redraw(); } else start();
    }

    /* ---- teardown / failure ---- */
    function fail() {
      /* leave the hero's own background intact */
      destroy();
    }

    function destroy() {
      if (destroyed) return;
      destroyed = true;
      stop();
      try { if (io) io.disconnect(); } catch (e) {}
      try { if (ro) ro.disconnect(); } catch (e) {}
      try { if (mo) mo.disconnect(); } catch (e) {}
      if (roTimer) { clearTimeout(roTimer); roTimer = 0; }
      try { document.removeEventListener('visibilitychange', onVisibility); } catch (e) {}
      try {
        if (reducedMQ) {
          if (reducedMQ.removeEventListener) reducedMQ.removeEventListener('change', onReduced);
          else if (reducedMQ.removeListener) reducedMQ.removeListener(onReduced);
        }
      } catch (e) {}
      try { window.removeEventListener('pagehide', destroy); } catch (e) {}
      safeRemove(layer);
      try { delete el.__agTerrain; } catch (e) { el.__agTerrain = null; }
    }

    /* ---- boot ---- */
    var api = { destroy: destroy, preset: presetName, seed: seedStr, redraw: redraw };
    el.__agTerrain = api;

    try {
      measure();
      redraw();
      if (destroyed) return null;

      if (HAS_IO) {
        io = new window.IntersectionObserver(function (entries) {
          var vis = false, n;
          for (n = 0; n < entries.length; n++) if (entries[n].isIntersecting) vis = true;
          visible = vis;
          if (vis) start(); else stop();
        }, { threshold: 0.01 });
        io.observe(el);
      } else {
        visible = true;
        start();
      }

      if (HAS_RO) {
        ro = new window.ResizeObserver(function () {
          if (roTimer) clearTimeout(roTimer);
          roTimer = setTimeout(function () {           /* debounced */
            roTimer = 0;
            if (destroyed) return;
            measure();
            redraw();
          }, 140);
        });
        ro.observe(el);
      }

      if (HAS_MO) {
        mo = new window.MutationObserver(function () {
          theme = readTheme();
          redraw();
        });
        mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
      }

      document.addEventListener('visibilitychange', onVisibility);
      if (reducedMQ) {
        if (reducedMQ.addEventListener) reducedMQ.addEventListener('change', onReduced);
        else if (reducedMQ.addListener) reducedMQ.addListener(onReduced);
      }
      window.addEventListener('pagehide', destroy);
    } catch (e) {
      destroy();
      return null;
    }

    return api;
  }

  function safeRemove(node) {
    try { if (node && node.parentNode) node.parentNode.removeChild(node); } catch (e) {}
  }

  /* ---------------------------------------------------------
     6. auto-mount
     --------------------------------------------------------- */
  function autoMount(root) {
    var scope = root || document;
    var list, i, node;
    try { list = scope.querySelectorAll('[data-terrain]'); } catch (e) { return; }
    for (i = 0; i < list.length; i++) {
      node = list[i];
      if (node.__agTerrain) continue;
      var peaks = null;
      var rawPeaks = node.getAttribute('data-terrain-peaks');
      if (rawPeaks) {
        try { peaks = JSON.parse(rawPeaks); } catch (e) { peaks = null; }
      }
      try {
        mount(node, {
          preset: node.getAttribute('data-terrain') || 'page',
          seed: node.getAttribute('data-terrain-seed') || null,
          peaks: peaks,
          label: node.getAttribute('data-terrain-label') || ''
        });
      } catch (e2) { /* a single bad hero must not break the page */ }
    }
  }

  window.AGTerrain = {
    mount: mount,
    refresh: autoMount,
    presets: ['home', 'vertical', 'sub', 'product', 'article', 'page']
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { autoMount(); });
  } else {
    autoMount();
  }

}(window, document));
