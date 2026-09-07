/* Altarious Global — Admin CMS (vanilla JS, no dependencies) */
(function () {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const slugify = (s) => String(s).toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const KIND_LABEL = { vertical: 'Vertical', 'sub-vertical': 'Sub-Vertical', product: 'Product', article: 'Article', page: 'Page', site: 'Site Settings', settings: 'Operational Settings' };
  const TYPE_NAME = { 'inbound-calls': 'Inbound Calls', 'live-transfers': 'Live Transfers' };
  const main = $('#main');
  let all = null; // relationship index: rows [{kind, slug, data}]
  let status = {};

  /* ---------------- api ---------------- */
  async function api(path, opts = {}) {
    const res = await fetch(path, { credentials: 'same-origin', headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) }, ...opts, body: opts.body && typeof opts.body !== 'string' ? JSON.stringify(opts.body) : opts.body });
    if (res.status === 401) { showLogin(); throw new Error('Unauthorized'); }
    const j = await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }));
    if (!res.ok || j.ok === false) throw new Error(j.error || `HTTP ${res.status}`);
    return j;
  }
  const toast = (msg, cls = '') => { const t = $('#toast'); t.textContent = msg; t.className = 'toast ' + cls; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => (t.hidden = true), 3200); };

  async function loadAll(force) {
    if (all && !force) return all;
    const r = await api('/api/admin/content?all=1');
    all = r.rows;
    return all;
  }
  const byKind = (k) => (all || []).filter((r) => r.kind === k);
  const find = (k, slug) => (all || []).find((r) => r.kind === k && r.slug === slug);

  /* ---------------- auth ---------------- */
  function showLogin() { $('#login').hidden = false; $('#shell').hidden = true; }
  async function boot() {
    const s = await fetch('/api/admin/login', { credentials: 'same-origin' }).then((r) => r.json()).catch(() => ({}));
    status = s;
    if (!s.configured) { $('#login-msg').textContent = 'Admin is not configured. Set ADMIN_PASSWORD and SESSION_SECRET (see DEPLOY.md).'; showLogin(); return; }
    if (!s.authenticated) { showLogin(); return; }
    $('#login').hidden = true; $('#shell').hidden = false;
    await refreshPublish();
    route();
  }
  $('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('#login-msg').textContent = '';
    try { await api('/api/admin/login', { method: 'POST', body: { password: e.target.password.value } }); e.target.reset(); boot(); }
    catch (err) { $('#login-msg').textContent = err.message; }
  });
  $('#logout').addEventListener('click', async (e) => { e.preventDefault(); await fetch('/api/admin/login', { method: 'DELETE', credentials: 'same-origin' }); all = null; showLogin(); });

  /* ---------------- publish ---------------- */
  async function refreshPublish() {
    try {
      const p = await api('/api/admin/publish');
      const btn = $('#btn-publish');
      btn.classList.toggle('dirty', p.unpublished);
      btn.disabled = !p.configured;
      $('#publish-status').textContent = !p.configured ? 'Publishing not configured (DEPLOY_HOOK_URL).' : p.unpublished ? 'Unpublished changes.' : p.lastPublishAt ? 'Last published ' + fmt(p.lastPublishAt) : 'Never published.';
      status.publish = p;
    } catch (e) { $('#publish-status').textContent = e.message; }
  }
  $('#btn-publish').addEventListener('click', async () => {
    if (!confirm('Publish the site now? The static site will be rebuilt from the current content (takes 1–2 minutes).')) return;
    try { const r = await api('/api/admin/publish', { method: 'POST' }); toast(r.message, 'ok'); refreshPublish(); } catch (e) { toast(e.message, 'err'); }
  });

  /* ---------------- router ---------------- */
  window.addEventListener('hashchange', route);
  async function route() {
    if ($('#shell').hidden) return;
    const h = location.hash.replace(/^#\/?/, '') || 'dashboard';
    const [view, a, b] = h.split('/');
    const navKey = view === 'list' ? `list:${a}` : view === 'edit' && a === 'site' ? 'site' : view === 'widget' ? 'widgets' : view;
    $$('#side-nav a').forEach((el) => el.classList.toggle('on', el.dataset.view === navKey));
    main.innerHTML = '<p class="muted">Loading…</p>';
    try {
      if (view === 'dashboard') await dashboard();
      else if (view === 'inquiries') await inquiries();
      else if (view === 'widgets') await widgetsIndex();
      else if (view === 'widget') await widgetEditor(a);
      else if (view === 'list') await list(a);
      else if (view === 'edit') await editor(a, b ? decodeURIComponent(b) : null);
      else if (view === 'new') await editor(a, null, Object.fromEntries(new URLSearchParams(b || '')));
      else main.innerHTML = '<p>Not found.</p>';
    } catch (e) { main.innerHTML = `<div class="notice err">${esc(e.message)}</div>`; }
  }

  /* ---------------- dashboard ---------------- */
  async function dashboard() {
    await loadAll(true);
    const inq = await api('/api/admin/inquiries?limit=8');
    const c = inq.counts || {};
    if (c.new) { $('#badge-new').textContent = c.new; $('#badge-new').hidden = false; } else $('#badge-new').hidden = true;
    const products = byKind('product');
    const articles = byKind('article');
    const weak = products.filter((p) => articles.filter((a) => a.data.subVertical === p.data.subVertical && a.data.product === p.data.type).length < 2);
    const empty = all.length === 0;
    main.innerHTML = `
      <div class="page-head"><h1>Dashboard</h1><div class="actions"><a class="btn" href="#/new/article">+ New article</a><a class="btn" href="#/new/sub-vertical">+ New sub-vertical</a></div></div>
      ${empty ? `<div class="notice"><strong>The CMS database is empty.</strong> Import the seed content (3 verticals, 35 sub-verticals, 70 products, 140 articles) to start editing. <button id="btn-seed" class="btn sm primary">Import seed content</button></div>` : ''}
      ${weak.length ? `<div class="notice err"><strong>${weak.length} product page(s) have fewer than 2 articles.</strong> The site build will fail until each active product has at least two. ${weak.slice(0, 6).map((p) => `<a href="#/list/article?product=${p.slug}">${esc(p.data.name)}</a>`).join(', ')}${weak.length > 6 ? '…' : ''}</div>` : ''}
      <div class="cards">
        ${stat(c.new || 0, 'New inquiries', '#/inquiries?status=new')}${stat(inq.total, 'Total inquiries', '#/inquiries')}
        ${stat(byKind('vertical').length, 'Verticals', '#/list/vertical')}${stat(byKind('sub-vertical').length, 'Sub-verticals', '#/list/sub-vertical')}
        ${stat(products.length, 'Product pages', '#/list/product')}${stat(articles.length, 'Articles', '#/list/article')}
      </div>
      <div class="card"><h2>Recent inquiries</h2>${inqTable(inq.inquiries)}</div>
      <div class="card"><h2>Publishing</h2><p class="kv">${status.publish?.configured ? `Last published: <b>${status.publish.lastPublishAt ? fmt(status.publish.lastPublishAt) : 'never'}</b> · Content last changed: <b>${status.publish.contentUpdatedAt ? fmt(status.publish.contentUpdatedAt) : '—'}</b>` : 'Set <b>DEPLOY_HOOK_URL</b> to enable one-click publishing (see DEPLOY.md).'}</p>
      <p class="muted tiny">Saving content stores it in the database immediately. The public website is static and updates when you press <b>Publish site</b>.</p></div>`;
    $('#btn-seed')?.addEventListener('click', async (e) => {
      e.target.disabled = true; e.target.textContent = 'Importing…';
      try { const r = await api('/api/admin/seed', { method: 'POST', body: {} }); toast(`Imported ${r.added} items`, 'ok'); await loadAll(true); dashboard(); refreshPublish(); } catch (err) { toast(err.message, 'err'); e.target.disabled = false; }
    });
    bindInqRows();
  }
  const stat = (n, label, href) => `<a class="stat" href="${href}"><strong>${n}</strong><span>${label}</span></a>`;

  /* ---------------- inquiries ---------------- */
  async function inquiries() {
    const params = new URLSearchParams(location.hash.split('?')[1] || '');
    const q = params.get('q') || '', st = params.get('status') || '', vt = params.get('vertical') || '', pg = params.get('page') || '1';
    const r = await api(`/api/admin/inquiries?${new URLSearchParams({ q, status: st, vertical: vt, page: pg, limit: 25 })}`);
    await loadAll();
    const verts = byKind('vertical');
    main.innerHTML = `
      <div class="page-head"><h1>Inquiries <span class="muted" style="font-size:1rem">(${r.total})</span></h1>
      <div class="actions">
        <a class="btn sm primary" href="/api/admin/inquiries?format=csv&${new URLSearchParams({ q, status: st, vertical: vt })}">Export CSV / Excel</a>
        <a class="btn sm" href="/api/admin/inquiries?limit=500&${new URLSearchParams({ q, status: st, vertical: vt })}" target="_blank">Export JSON ↗</a>
      </div></div>
      <form class="toolbar" id="inq-filter">
        <input name="q" placeholder="Search name, company, email, phone, message…" value="${esc(q)}">
        <select name="status"><option value="">All statuses</option>${['new', 'contacted', 'qualified', 'closed'].map((s) => `<option ${s === st ? 'selected' : ''}>${s}</option>`).join('')}</select>
        <select name="vertical"><option value="">All verticals</option>${verts.map((v) => `<option value="${esc(v.slug)}" ${v.slug === vt ? 'selected' : ''}>${esc(v.data.name)}</option>`).join('')}</select>
        <button class="btn">Filter</button> <a class="btn" href="#/inquiries">Reset</a>
        <span class="muted tiny">New ${r.counts.new || 0} · Contacted ${r.counts.contacted || 0} · Qualified ${r.counts.qualified || 0} · Closed ${r.counts.closed || 0}</span>
      </form>
      ${inqTable(r.inquiries)}
      <div class="pager">Page ${r.page} of ${Math.max(1, Math.ceil(r.total / r.limit))}
        ${r.page > 1 ? `<a class="btn sm" href="#/inquiries?${new URLSearchParams({ q, status: st, vertical: vt, page: r.page - 1 })}">‹ Prev</a>` : ''}
        ${r.page * r.limit < r.total ? `<a class="btn sm" href="#/inquiries?${new URLSearchParams({ q, status: st, vertical: vt, page: r.page + 1 })}">Next ›</a>` : ''}</div>`;
    $('#inq-filter').addEventListener('submit', (e) => { e.preventDefault(); const fd = new FormData(e.target); location.hash = '#/inquiries?' + new URLSearchParams(Object.fromEntries(fd)); });
    bindInqRows();
  }
  function inqTable(rows) {
    if (!rows.length) return '<p class="muted">No inquiries yet.</p>';
    return `<table><thead><tr><th>Date</th><th>Contact</th><th>Interest</th><th>Source page</th><th>Status</th></tr></thead><tbody>${rows
      .map((i) => `<tr class="clickable" data-id="${i.id}"><td>${fmt(i.created_at)}</td><td><b>${esc(i.full_name)}</b><br><span class="muted">${esc(i.company)}</span><br>${esc(i.email)}</td><td>${esc(i.service_interest)}<br><span class="muted">${esc(i.vertical_interest)}${i.sub_vertical_interest ? ' · ' + esc(i.sub_vertical_interest) : ''}</span></td><td>${esc(i.source_page || '-')}<br><span class="muted tiny">${[i.vertical, i.sub_vertical, i.product].filter(Boolean).join(' → ') || ''}</span></td><td><span class="pill ${i.status}">${i.status}</span></td></tr>`)
      .join('')}</tbody></table>`;
  }
  function bindInqRows() { $$('tr[data-id]').forEach((tr) => tr.addEventListener('click', () => inquiryDrawer(tr.dataset.id))); }
  async function inquiryDrawer(id) {
    const { inquiry: i } = await api(`/api/admin/inquiries?id=${id}`);
    const d = document.createElement('div');
    d.className = 'drawer';
    d.innerHTML = `<div class="page-head"><h2>Inquiry #${i.id}</h2><button class="icon-btn" data-close>×</button></div>
      <dl><dt>Received</dt><dd>${fmt(i.created_at)}</dd><dt>Name</dt><dd>${esc(i.full_name)}</dd><dt>Company</dt><dd>${esc(i.company)}</dd><dt>Email</dt><dd><a href="mailto:${esc(i.email)}">${esc(i.email)}</a></dd><dt>Phone</dt><dd><a href="tel:${esc(i.phone)}">${esc(i.phone)}</a></dd>
      <dt>Service</dt><dd>${esc(i.service_interest)}</dd><dt>Vertical</dt><dd>${esc(i.vertical_interest)}${i.sub_vertical_interest ? ' · ' + esc(i.sub_vertical_interest) : ''}</dd>
      <dt>Source page</dt><dd>${esc(i.source_page || '-')}${i.source_url ? ` <a href="${esc(i.source_url)}" target="_blank">↗</a>` : ''}</dd><dt>Tagged</dt><dd>${[i.vertical, i.sub_vertical, i.product].filter(Boolean).join(' → ') || '-'}</dd>
      <dt>Location</dt><dd>${esc(i.country || '-')} · ${esc(i.ip || '-')}</dd><dt>Browser</dt><dd class="tiny muted">${esc(i.user_agent || '-')}</dd></dl>
      <h3>Message</h3><p style="white-space:pre-wrap">${esc(i.message)}</p>
      <h3>Status</h3><select id="d-status">${['new', 'contacted', 'qualified', 'closed'].map((s) => `<option ${s === i.status ? 'selected' : ''}>${s}</option>`).join('')}</select>
      <h3 style="margin-top:14px">Internal notes</h3><textarea id="d-notes">${esc(i.notes || '')}</textarea>
      <div class="toolbar" style="margin-top:12px"><button class="btn primary" data-save>Save</button><button class="btn danger" data-del>Delete</button></div>`;
    document.body.appendChild(d);
    const close = () => d.remove();
    d.querySelector('[data-close]').onclick = close;
    d.querySelector('[data-save]').onclick = async () => { try { await api('/api/admin/inquiries', { method: 'PATCH', body: { id: i.id, status: $('#d-status', d).value, notes: $('#d-notes', d).value } }); toast('Saved', 'ok'); close(); route(); } catch (e) { toast(e.message, 'err'); } };
    d.querySelector('[data-del]').onclick = async () => { if (!confirm('Delete this inquiry permanently?')) return; await api(`/api/admin/inquiries?id=${i.id}`, { method: 'DELETE' }); toast('Deleted'); close(); route(); };
  }

  /* ---------------- content lists ---------------- */
  async function list(kind) {
    await loadAll(true);
    const params = new URLSearchParams(location.hash.split('?')[1] || '');
    const fv = params.get('vertical') || '', fs = params.get('sub') || '', fp = params.get('product') || '', q = (params.get('q') || '').toLowerCase();
    let items = byKind(kind);
    if (fv) items = items.filter((r) => r.data.vertical === fv);
    if (fs) items = items.filter((r) => r.data.subVertical === fs || r.slug === fs);
    if (fp) items = items.filter((r) => kind === 'article' ? `${r.data.subVertical}--${r.data.product}` === fp : r.slug === fp);
    if (q) items = items.filter((r) => JSON.stringify(r.data).toLowerCase().includes(q));
    const verts = byKind('vertical'), subs = byKind('sub-vertical');
    const name = (r) => r.data.name || r.data.title || r.slug;
    const vName = (s) => find('vertical', s)?.data.name || s, sName = (s) => find('sub-vertical', s)?.data.name || s;
    items.sort((a, b) => (kind === 'article' ? (a.data.publishedAt < b.data.publishedAt ? 1 : -1) : (a.data.order ?? 999) - (b.data.order ?? 999) || name(a).localeCompare(name(b))));
    const filters = kind === 'vertical' || kind === 'page' ? '' : `
      <select name="vertical"><option value="">All verticals</option>${verts.map((v) => `<option value="${v.slug}" ${v.slug === fv ? 'selected' : ''}>${esc(v.data.name)}</option>`).join('')}</select>
      ${kind !== 'sub-vertical' ? `<select name="sub"><option value="">All sub-verticals</option>${subs.filter((s) => !fv || s.data.vertical === fv).map((s) => `<option value="${s.slug}" ${s.slug === fs ? 'selected' : ''}>${esc(s.data.name)}</option>`).join('')}</select>` : ''}`;
    const cols = {
      vertical: ['Order', 'Name', 'Tagline', 'Sub-verticals', 'Active'],
      'sub-vertical': ['Order', 'Name', 'Vertical', 'Products / Articles', 'Active'],
      product: ['Name', 'Type', 'Vertical', 'Sub-vertical', 'Articles', 'Active'],
      article: ['Title', 'Assigned to', 'Published', 'Author', 'Active'],
      page: ['Page', 'Title'],
    }[kind];
    const row = (r) => {
      const d = r.data;
      const act = `<span class="pill ${d.active === false ? 'off' : 'qualified'}">${d.active === false ? 'inactive' : 'active'}</span>`;
      if (kind === 'vertical') return [d.order ?? '', `<b>${esc(d.name)}</b><br><code class="tiny">/${r.slug}/</code>`, esc(d.tagline || ''), subs.filter((s) => s.data.vertical === r.slug).length, act];
      if (kind === 'sub-vertical') { const np = byKind('product').filter((p) => p.data.subVertical === r.slug).length, na = byKind('article').filter((a) => a.data.subVertical === r.slug).length; return [d.order ?? '', `<b>${esc(d.name)}</b><br><code class="tiny">/${d.vertical}/${r.slug}/</code>`, esc(vName(d.vertical)), `${np} / ${na}${np < 2 ? ' <span class="pill off">missing product</span>' : ''}`, act]; }
      if (kind === 'product') { const na = byKind('article').filter((a) => a.data.subVertical === d.subVertical && a.data.product === d.type).length; return [`<b>${esc(d.name)}</b><br><code class="tiny">/${d.vertical}/${d.subVertical}/${d.type}/</code>`, `<span class="pill ${d.type}">${TYPE_NAME[d.type]}</span>`, esc(vName(d.vertical)), esc(sName(d.subVertical)), `${na}${na < 2 ? ' <span class="pill off">needs 2</span>' : ''}`, act]; }
      if (kind === 'article') return [`<b>${esc(d.title)}</b><br><code class="tiny">${r.slug}</code>`, `${esc(vName(d.vertical))} → ${esc(sName(d.subVertical))} → <span class="pill ${d.product}">${TYPE_NAME[d.product] || d.product}</span>`, d.publishedAt, esc(d.author || ''), act];
      return [`<b>${esc(r.slug)}</b>`, esc(d.seo?.title || d.index?.seo?.title || '')];
    };
    main.innerHTML = `
      <div class="page-head"><h1>${KIND_LABEL[kind]}s <span class="muted" style="font-size:1rem">(${items.length})</span></h1>
        ${kind !== 'page' ? `<div class="actions"><a class="btn primary" href="#/new/${kind}${fs ? '?subVertical=' + fs + '&vertical=' + (find('sub-vertical', fs)?.data.vertical || fv) : fv ? '?vertical=' + fv : ''}">+ New ${KIND_LABEL[kind]}</a></div>` : ''}</div>
      <form class="toolbar" id="list-filter"><input name="q" placeholder="Search…" value="${esc(params.get('q') || '')}">${filters}<button class="btn">Filter</button><a class="btn" href="#/list/${kind}">Reset</a></form>
      <table><thead><tr>${cols.map((c) => `<th>${c}</th>`).join('')}<th></th></tr></thead><tbody>${items.map((r) => `<tr>${row(r).map((c) => `<td>${c}</td>`).join('')}<td><a class="btn sm" href="#/edit/${kind}/${encodeURIComponent(r.slug)}">Edit</a></td></tr>`).join('')}</tbody></table>
      ${!items.length ? '<p class="muted" style="margin-top:12px">Nothing here yet.</p>' : ''}`;
    $('#list-filter').addEventListener('submit', (e) => { e.preventDefault(); location.hash = `#/list/${kind}?` + new URLSearchParams(Object.fromEntries(new FormData(e.target))); });
  }

  /* ---------------- editor ---------------- */
  const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];
  const COVERAGE_LEVELS = [['', 'Not live'], ['limited', 'Limited'], ['active', 'Active'], ['high', 'High volume']];

  const SCHEMAS = {
    vertical: [
      { k: 'name', t: 'text', l: 'Name', req: true }, { k: 'slug', t: 'slug', l: 'Slug (URL)', help: 'Lowercase, hyphens. Changing this changes URLs.' },
      { k: 'order', t: 'number', l: 'Order' }, { k: 'active', t: 'bool', l: 'Active (shown on site)' },
      { k: 'tagline', t: 'text', l: 'Tagline', req: true }, { k: 'description', t: 'textarea', l: 'Short description', req: true },
      { k: 'intro', t: 'paras', l: 'Intro paragraphs', help: 'One paragraph per blank-line-separated block.' },
      { k: 'featuredImage', t: 'text', l: 'Featured image path', help: 'e.g. /assets/img/vertical-insurance.svg' },
      { k: 'highlights', t: 'lines', l: 'Highlights (one per line)' },
      { k: 'seo', t: 'seo' },
    ],
    'sub-vertical': [
      { k: 'name', t: 'text', l: 'Name', req: true }, { k: 'slug', t: 'slug', l: 'Slug (URL)' }, { k: 'vertical', t: 'vertical', l: 'Parent vertical', req: true },
      { k: 'order', t: 'number', l: 'Order' }, { k: 'active', t: 'bool', l: 'Active' },
      { k: 'shortDescription', t: 'textarea', l: 'Short description (one sentence)', req: true },
      { k: 'description', t: 'paras', l: 'Description paragraphs' }, { k: 'consumerProfile', t: 'textarea', l: 'Consumer profile' },
      { k: 'intentSignals', t: 'lines', l: 'Intent signals (one per line)' }, { k: 'qualificationCriteria', t: 'lines', l: 'Qualification criteria (one per line)' },
      { k: 'keywords', t: 'lines', l: 'Consumer search terms (one per line)' }, { k: 'marketContext', t: 'textarea', l: 'Market context' },
      { k: 'inboundCallsAngle', t: 'textarea', l: 'Why inbound calls fit' }, { k: 'liveTransfersAngle', t: 'textarea', l: 'Why live transfers fit' },
      { k: 'faq', t: 'faq', l: 'FAQ' }, { k: 'featuredImage', t: 'text', l: 'Featured image path' }, { k: 'seo', t: 'seo' },
    ],
    product: [
      { k: 'vertical', t: 'vertical', l: 'Vertical', req: true }, { k: 'subVertical', t: 'subVertical', l: 'Sub-vertical', req: true }, { k: 'type', t: 'type', l: 'Product type', req: true },
      { k: 'name', t: 'text', l: 'Product name', req: true, help: 'e.g. Auto Insurance Inbound Calls' }, { k: 'active', t: 'bool', l: 'Active' },
      { k: 'hero', t: 'group', l: 'Hero', fields: [{ k: 'headline', t: 'text', l: 'Headline' }, { k: 'subheadline', t: 'textarea', l: 'Value proposition' }, { k: 'cta', t: 'text', l: 'Primary CTA label' }] },
      { k: 'overview', t: 'paras', l: 'Product overview paragraphs' }, { k: 'targetConsumer', t: 'textarea', l: 'Target consumer' }, { k: 'consumerIntent', t: 'textarea', l: 'Consumer intent' },
      { k: 'howGenerated', t: 'textarea', l: 'How calls/transfers are generated' }, { k: 'qualification', t: 'textarea', l: 'Qualification approach' }, { k: 'delivery', t: 'textarea', l: 'Delivery process' },
      { k: 'process', t: 'objlist', l: 'How it works (steps)' }, { k: 'benefits', t: 'objlist', l: 'Benefits' }, { k: 'whyUs', t: 'lines', l: 'Why businesses use this (one per line)' },
      { k: 'faq', t: 'faq', l: 'FAQ' },
      { k: 'cta', t: 'group', l: 'Inquiry CTA', fields: [{ k: 'headline', t: 'text', l: 'Headline' }, { k: 'text', t: 'textarea', l: 'Text' }, { k: 'button', t: 'text', l: 'Button label' }] },
      { k: 'seo', t: 'seo' },
    ],
    article: [
      { k: 'title', t: 'text', l: 'Title', req: true }, { k: 'slug', t: 'slug', l: 'Slug (URL)' },
      { k: 'vertical', t: 'vertical', l: 'Vertical', req: true }, { k: 'subVertical', t: 'subVertical', l: 'Sub-vertical', req: true }, { k: 'product', t: 'productType', l: 'Related product', req: true, help: 'The article card appears on this product page.' },
      { k: 'excerpt', t: 'textarea', l: 'Short excerpt (card text)', req: true }, { k: 'author', t: 'text', l: 'Author' }, { k: 'publishedAt', t: 'date', l: 'Publication date', req: true },
      { k: 'featuredImage', t: 'text', l: 'Featured image path' }, { k: 'active', t: 'bool', l: 'Published (active)' },
      { k: 'body', t: 'md', l: 'Article content (Markdown)', req: true },
      { k: 'seo', t: 'seo', keywords: true },
    ],
    settings: [
      { k: 'coverage.enabled', t: 'bool', l: 'Publish the coverage map', help: 'Until this is on, no coverage section appears anywhere on the site. Never publish states you cannot actually deliver.' },
      { k: '__coverage', t: 'coverage', l: 'State coverage' },
      { k: 'hours.enabled', t: 'bool', l: 'Show operating hours on the call widget' },
      { k: 'hours.timezone', t: 'text', l: 'Time zone (IANA)', help: 'e.g. America/New_York' },
      { k: 'hours.timezoneLabel', t: 'text', l: 'Time zone label', help: 'e.g. ET' },
      { k: 'hours.weekdays.open', t: 'text', l: 'Weekdays open (HH:MM)' },
      { k: 'hours.weekdays.close', t: 'text', l: 'Weekdays close (HH:MM)' },
      { k: 'hours.saturday.open', t: 'text', l: 'Saturday open (HH:MM, blank = closed)' },
      { k: 'hours.saturday.close', t: 'text', l: 'Saturday close (HH:MM)' },
      { k: 'metrics.enabled', t: 'bool', l: 'Publish the results ribbon on Case Studies', help: 'Only publish figures you can evidence. Off means the section does not render.' },
      { k: '__metrics', t: 'metrics', l: 'Published figures' },
      { k: 'liveFeed.enabled', t: 'bool', l: 'Show the delivery activity panel on the home page' },
      { k: 'liveFeed.label', t: 'text', l: 'Activity panel label', help: 'Shown on the panel. Keep it honest, e.g. "Illustrative delivery activity".' },
      { k: 'calculator.defaultAvgValue', t: 'number', l: 'Calculator default customer value ($)' },
    ],
    site: [
      { k: 'name', t: 'text', l: 'Company name', req: true }, { k: 'legalName', t: 'text', l: 'Legal name' }, { k: 'domain', t: 'text', l: 'Canonical domain (https://…)', req: true },
      { k: 'tagline', t: 'text', l: 'Tagline' }, { k: 'positioning', t: 'textarea', l: 'Positioning statement' },
      { k: 'contact', t: 'group', l: 'Contact', fields: [{ k: 'email', t: 'text', l: 'Email' }, { k: 'phone', t: 'text', l: 'Phone' }, { k: 'address', t: 'text', l: 'Address' }] },
      { k: 'ctas', t: 'group', l: 'CTA labels', fields: [{ k: 'primary', t: 'text', l: 'Primary' }, { k: 'secondary', t: 'text', l: 'Secondary' }, { k: 'getStarted', t: 'text', l: 'Get Started' }, { k: 'moreInfo', t: 'text', l: 'More info' }, { k: 'contact', t: 'text', l: 'Contact' }] },
      { k: 'turnstileSiteKey', t: 'text', l: 'Cloudflare Turnstile site key', help: 'Leave empty to disable the Turnstile widget (honeypot + rate limit still protect forms).' },
      { k: 'footerNote', t: 'textarea', l: 'Footer disclaimer' },
    ],
    page: [{ k: '__json', t: 'json', l: 'Page content (JSON)', help: 'Structured page content. Edit carefully and keep valid JSON.' }],
  };

  const DEFAULTS = {
    vertical: () => ({ active: true, order: 10, intro: [], highlights: [], featuredImage: '/assets/img/og-default.svg', seo: { title: '', description: '', keywords: [] } }),
    'sub-vertical': () => ({ active: true, order: 10, description: [], intentSignals: [], qualificationCriteria: [], keywords: [], faq: [], seo: { title: '', description: '' } }),
    product: (pre) => {
      const sv = find('sub-vertical', pre.subVertical)?.data, type = pre.type || 'inbound-calls', tn = TYPE_NAME[type];
      const n = sv ? sv.name : '';
      return { active: true, type, name: n ? `${n} ${tn}` : '', hero: { headline: n ? `${n} ${tn}` : '', subheadline: n ? `Connect with high-intent consumers actively looking for ${n.toLowerCase()} solutions.` : '', cta: type === 'inbound-calls' ? 'Request More Information' : 'Talk to Our Team' },
        overview: [], targetConsumer: sv?.consumerProfile || '', consumerIntent: '', howGenerated: '', qualification: sv ? `Standard criteria include: ${(sv.qualificationCriteria || []).join('; ')}.` : '', delivery: '',
        process: type === 'inbound-calls' ? [{ title: 'PPC / Traffic Acquisition', text: '' }, { title: 'Consumer Interest', text: '' }, { title: 'Call Initiated', text: '' }, { title: 'Qualification', text: '' }, { title: 'Inbound Call Delivered', text: '' }] : [{ title: 'Traffic Acquisition', text: '' }, { title: 'Consumer Interest', text: '' }, { title: 'Qualification', text: '' }, { title: 'Live Connection', text: '' }, { title: 'Transfer to Client', text: '' }],
        benefits: [{ title: 'High-intent consumers', text: '' }, { title: 'Real-time opportunities', text: '' }, { title: 'Industry targeting', text: '' }, { title: 'Faster customer acquisition', text: '' }, { title: 'Qualified consumer engagement', text: '' }],
        whyUs: [], faq: sv?.faq || [], cta: { headline: n ? `Interested in ${n} ${tn}?` : '', text: '', button: type === 'inbound-calls' ? 'Request More Information' : 'Talk to Our Team' }, seo: { title: '', description: '' } };
    },
    article: (pre) => {
      const sv = find('sub-vertical', pre.subVertical)?.data, tn = TYPE_NAME[pre.product] || '';
      return { active: true, author: 'Altarious Global Research', publishedAt: new Date().toISOString().slice(0, 10), featuredImage: pre.vertical ? `/assets/img/vertical-${pre.vertical}.svg` : '/assets/img/og-default.svg', excerpt: '',
        body: `Introduction paragraph explaining why this topic matters for ${sv ? sv.name.toLowerCase() : 'this market'} businesses.\n\n## Who the consumer is\n\n${sv?.consumerProfile || ''}\n\n## Key signals\n\n${(sv?.intentSignals || []).map((s) => '- ' + s).join('\n')}\n\n## Qualification\n\n${(sv?.qualificationCriteria || []).map((s) => '- ' + s).join('\n')}\n\n## Why this matters\n\nExplain the impact on conversion, cost and scale.\n\n## Next steps\n\n${sv ? `Explore the [${sv.name} ${tn}](/${sv.vertical}/${sv.slug}/${pre.product || 'inbound-calls'}/) product page or return to the [${sv.name}](/${sv.vertical}/${sv.slug}/) overview.` : ''}`,
        seo: { title: '', description: '', keywords: [] } };
    },
    site: () => ({}), page: () => ({}),
    settings: () => ({ coverage: { enabled: false, 'inbound-calls': {}, 'live-transfers': {} }, hours: { enabled: true, timezone: 'America/New_York', timezoneLabel: 'ET', weekdays: { open: '08:00', close: '20:00' }, saturday: null, sunday: null }, metrics: { enabled: false, items: [] }, liveFeed: { enabled: true, mode: 'simulated', label: 'Illustrative delivery activity' }, calculator: { enabled: true, defaultAvgValue: 900 } }),
  };

  async function editor(kind, slug, pre = {}) {
    await loadAll();
    const isNew = !slug;
    let data, prevSlug = slug;
    if (isNew) data = { ...DEFAULTS[kind](pre), ...pre };
    else { const r = await api(`/api/admin/content?kind=${kind}&slug=${encodeURIComponent(slug)}`); data = r.data; }
    const schema = SCHEMAS[kind];
    const title = isNew ? `New ${KIND_LABEL[kind]}` : `Edit ${KIND_LABEL[kind]}: ${data.name || data.title || slug}`;
    const publicUrl = urlFor(kind, slug, data);

    main.innerHTML = `
      <div class="page-head"><div><a class="tiny" href="#/${kind === 'site' ? 'dashboard' : 'list/' + kind}">‹ Back</a><h1>${esc(title)}</h1></div>
        <div class="actions">${publicUrl ? `<a class="btn" href="${publicUrl}" target="_blank" rel="noopener">View page ↗</a>` : ''}${!isNew && kind !== 'site' && kind !== 'page' ? '<button class="btn danger" id="btn-delete">Delete</button>' : ''}<button class="btn primary" id="btn-save">Save</button></div></div>
      <form id="edit-form" class="form"><div class="col" id="col-main"></div><div class="col"><div class="sticky-actions" id="col-side"></div></div></form>`;
    const colMain = $('#col-main'), colSide = $('#col-side');
    const sideKeys = new Set(['active', 'order', 'vertical', 'subVertical', 'type', 'product', 'publishedAt', 'author', 'featuredImage', 'slug']);
    for (const f of schema) (sideKeys.has(f.k) && kind !== 'site' ? colSide : colMain).appendChild(field(f, data, kind));
    colSide.appendChild(relationsCard(kind, slug, data));

    /* cascading selects */
    const vSel = $('[name=vertical]', main), sSel = $('[name=subVertical]', main), pSel = $('[name=product]', main);
    if (vSel && sSel) {
      const fillSubs = () => { const cur = sSel.value || data.subVertical; sSel.innerHTML = '<option value="">Select…</option>' + byKind('sub-vertical').filter((s) => s.data.vertical === vSel.value).map((s) => `<option value="${s.slug}" ${s.slug === cur ? 'selected' : ''}>${esc(s.data.name)}</option>`).join(''); fillProducts(); };
      const fillProducts = () => { if (!pSel) return; const cur = pSel.value || data.product; const prods = byKind('product').filter((p) => p.data.subVertical === sSel.value); pSel.innerHTML = '<option value="">Select…</option>' + prods.map((p) => `<option value="${p.data.type}" ${p.data.type === cur ? 'selected' : ''}>${esc(p.data.name)}</option>`).join(''); $('#product-help', main) && ($('#product-help', main).textContent = prods.length ? '' : 'This sub-vertical has no product pages yet. Create them first.'); };
      vSel.addEventListener('change', () => { sSel.value = ''; fillSubs(); });
      sSel.addEventListener('change', fillProducts);
      fillSubs();
    }
    /* product name auto-fill */
    if (kind === 'product') {
      const tSel = $('[name=type]', main), nameIn = $('[name=name]', main);
      const auto = () => { const sv = find('sub-vertical', sSel.value)?.data; if (sv && (isNew || !nameIn.value)) { nameIn.value = `${sv.name} ${TYPE_NAME[tSel.value]}`; const h = $('[name="hero.headline"]', main); if (h && !h.value) h.value = nameIn.value; } };
      sSel.addEventListener('change', auto); tSel.addEventListener('change', auto);
    }
    /* slug auto from title/name for new items */
    const slugIn = $('[name=slug]', main), srcIn = $('[name=title]', main) || $('[name=name]', main);
    if (slugIn && srcIn && isNew) srcIn.addEventListener('input', () => { if (!slugIn.dataset.touched) slugIn.value = slugify(srcIn.value); });
    slugIn?.addEventListener('input', () => (slugIn.dataset.touched = '1'));

    $('#btn-save').addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        const out = collect(schema, data, kind);
        let newSlug = kind === 'site' ? 'site' : kind === 'page' ? slug : kind === 'product' ? `${out.subVertical}--${out.type}` : slugify(out.slug || out.title || out.name);
        if (!newSlug) throw new Error('A slug is required.');
        const r = await api('/api/admin/content', { method: 'PUT', body: { kind, slug: newSlug, prevSlug, data: out } });
        toast('Saved. Press "Publish site" to update the website.', 'ok');
        all = null; refreshPublish();
        if (isNew || r.slug !== prevSlug) location.hash = `#/edit/${kind}/${encodeURIComponent(r.slug)}`; else editor(kind, r.slug);
      } catch (err) { toast(err.message, 'err'); }
    });
    $('#btn-delete')?.addEventListener('click', async () => {
      if (!confirm(`Delete this ${KIND_LABEL[kind].toLowerCase()}? This cannot be undone.`)) return;
      try { await api(`/api/admin/content?kind=${kind}&slug=${encodeURIComponent(slug)}`, { method: 'DELETE' }); toast('Deleted'); all = null; location.hash = `#/list/${kind}`; } catch (err) { toast(err.message, 'err'); }
    });
  }

  function urlFor(kind, slug, d) {
    if (!slug) return '';
    if (kind === 'vertical') return `/${slug}/`;
    if (kind === 'sub-vertical') return `/${d.vertical}/${slug}/`;
    if (kind === 'product') return `/${d.vertical}/${d.subVertical}/${d.type}/`;
    if (kind === 'article') return `/resources/${d.vertical}/${d.subVertical}/${d.product}/${slug}/`;
    if (kind === 'page') return { home: '/', about: '/about/', services: '/services/', 'case-studies': '/case-studies/', contact: '/contact/' }[slug] || '';
    return '/';
  }

  function relationsCard(kind, slug, d) {
    const box = document.createElement('div');
    box.className = 'card';
    let html = '<h3>Relationships</h3>';
    if (kind === 'vertical' && slug) { const subs = byKind('sub-vertical').filter((s) => s.data.vertical === slug); html += `<p class="kv"><b>${subs.length}</b> sub-verticals</p><ul class="rel-list">${subs.slice(0, 12).map((s) => `<li><a href="#/edit/sub-vertical/${s.slug}">${esc(s.data.name)}</a></li>`).join('')}</ul><a class="btn sm" href="#/new/sub-vertical?vertical=${slug}">+ Add sub-vertical</a>`; }
    else if (kind === 'sub-vertical' && slug) {
      const prods = byKind('product').filter((p) => p.data.subVertical === slug);
      html += `<p class="kv"><b>${prods.length}</b> product pages</p><ul class="rel-list">${prods.map((p) => { const n = byKind('article').filter((a) => a.data.subVertical === slug && a.data.product === p.data.type).length; return `<li><a href="#/edit/product/${p.slug}">${esc(p.data.name)}</a> <span class="muted">· ${n} articles${n < 2 ? ' ⚠' : ''}</span></li>`; }).join('')}</ul>`;
      for (const t of ['inbound-calls', 'live-transfers']) if (!prods.find((p) => p.data.type === t)) html += `<a class="btn sm" href="#/new/product?vertical=${d.vertical}&subVertical=${slug}&type=${t}">+ Create ${TYPE_NAME[t]} page</a> `;
    } else if (kind === 'product' && slug) {
      const arts = byKind('article').filter((a) => a.data.subVertical === d.subVertical && a.data.product === d.type);
      html += `<p class="kv"><b>${arts.length}</b> related articles ${arts.length < 2 ? '<span class="pill off">needs 2</span>' : ''}</p><ul class="rel-list">${arts.map((a) => `<li><a href="#/edit/article/${a.slug}">${esc(a.data.title)}</a></li>`).join('')}</ul><a class="btn sm" href="#/new/article?vertical=${d.vertical}&subVertical=${d.subVertical}&product=${d.type}">+ Write article for this product</a>`;
    } else if (kind === 'article') {
      const sib = byKind('article').filter((a) => a.slug !== slug && a.data.subVertical === d.subVertical);
      html += `<p class="kv">Appears on: <b>${esc(find('product', `${d.subVertical}--${d.product}`)?.data.name || '(select a product)')}</b></p><p class="kv">Other ${esc(find('sub-vertical', d.subVertical)?.data.name || '')} articles:</p><ul class="rel-list">${sib.slice(0, 8).map((a) => `<li><a href="#/edit/article/${a.slug}">${esc(a.data.title)}</a></li>`).join('') || '<li class="muted">none</li>'}</ul>`;
    } else html += '<p class="muted tiny">Save to see relationships.</p>';
    box.innerHTML = html;
    return box;
  }

  /* ----- field rendering ----- */
  function field(f, data, kind, prefix = '') {
    const name = prefix + f.k;
    /* a dotted key reads through the nested settings object */
    const dotted = (obj, k) => k.split('.').reduce((o, part) => (o == null ? o : o[part]), obj);
    const v = f.k === '__json' ? data : (f.k.indexOf('.') > -1 ? dotted(data, f.k) : data[f.k]);
    const w = document.createElement('div');
    w.className = 'field' + (f.t === 'bool' ? ' inline' : '');
    const label = f.l ? `<label for="f-${name}">${esc(f.l)}${f.req ? ' *' : ''}</label>` : '';
    const help = f.help ? `<span class="help">${esc(f.help)}</span>` : '';
    switch (f.t) {
      case 'text': case 'slug': case 'date': {
        w.innerHTML = `${label}<input id="f-${name}" name="${name}" type="${f.t === 'date' ? 'date' : 'text'}" value="${esc(v ?? '')}">${help}`;
        if (f.k === 'featuredImage') {
          const input = $('input', w);
          const bar = document.createElement('div');
          bar.style.cssText = 'display:flex;gap:8px;align-items:center;margin-top:6px';
          bar.innerHTML = '<button type="button" class="btn sm" data-choose>Choose image\u2026</button><img class="thumb" alt="" style="height:40px;border-radius:6px;border:1px solid var(--line)">';
          const thumb = $('.thumb', bar);
          const sync = () => { if (input.value) { thumb.src = input.value; thumb.style.display = ''; } else { thumb.removeAttribute('src'); thumb.style.display = 'none'; } };
          $('[data-choose]', bar).onclick = () => mediaPicker((item) => { input.value = item.url; sync(); });
          input.addEventListener('input', sync);
          sync();
          w.appendChild(bar);
        }
        break;
      }
      case 'number': w.innerHTML = `${label}<input id="f-${name}" name="${name}" type="number" value="${esc(v ?? '')}">${help}`; break;
      case 'bool': w.innerHTML = `<input id="f-${name}" name="${name}" type="checkbox" ${v !== false ? 'checked' : ''}><label for="f-${name}">${esc(f.l)}</label>`; break;
      case 'textarea': w.innerHTML = `${label}<textarea id="f-${name}" name="${name}">${esc(v ?? '')}</textarea>${help}`; break;
      case 'paras': w.innerHTML = `${label}<textarea id="f-${name}" name="${name}" style="min-height:160px">${esc((v || []).join('\n\n'))}</textarea><span class="help">Separate paragraphs with a blank line.</span>`; break;
      case 'lines': w.innerHTML = `${label}<textarea id="f-${name}" name="${name}" style="min-height:120px">${esc((v || []).join('\n'))}</textarea><span class="help">One item per line.</span>`; break;
      case 'vertical': w.innerHTML = `${label}<select id="f-${name}" name="${name}"><option value="">Select…</option>${byKind('vertical').map((x) => `<option value="${x.slug}" ${x.slug === v ? 'selected' : ''}>${esc(x.data.name)}</option>`).join('')}</select>`; break;
      case 'subVertical': w.innerHTML = `${label}<select id="f-${name}" name="${name}"><option value="">Select…</option></select>`; break;
      case 'type': w.innerHTML = `${label}<select id="f-${name}" name="${name}">${Object.entries(TYPE_NAME).map(([k, n]) => `<option value="${k}" ${k === v ? 'selected' : ''}>${n}</option>`).join('')}</select>`; break;
      case 'productType': w.innerHTML = `${label}<select id="f-${name}" name="${name}"><option value="">Select…</option></select><span class="help" id="product-help"></span>${help}`; break;
      case 'group': { w.innerHTML = `<fieldset><legend>${esc(f.l)}</legend></fieldset>`; const fs = w.firstChild; for (const sub of f.fields) fs.appendChild(field(sub, v || {}, kind, name + '.')); break; }
      case 'seo': { w.innerHTML = `<fieldset><legend>SEO</legend><div class="field"><label>SEO title</label><input name="${name}.title" value="${esc(v?.title || '')}" maxlength="70"><span class="help">Up to ~60 characters. Site name is appended automatically.</span></div><div class="field"><label>Meta description</label><textarea name="${name}.description" maxlength="170">${esc(v?.description || '')}</textarea><span class="help">120–160 characters.</span></div>${f.keywords ? `<div class="field"><label>Keywords (comma separated)</label><input name="${name}.keywords" value="${esc((v?.keywords || []).join(', '))}"></div>` : ''}</fieldset>`; break; }
      case 'objlist': case 'faq': {
        const isFaq = f.t === 'faq'; const items = v || [];
        w.innerHTML = `${label}<div class="objlist ${isFaq ? 'faq' : ''}" data-name="${name}">${items.map((it) => objItem(it, isFaq)).join('')}</div><button type="button" class="btn sm" data-add>+ Add ${isFaq ? 'question' : 'item'}</button>`;
        const list = $('.objlist', w);
        $('[data-add]', w).onclick = () => list.insertAdjacentHTML('beforeend', objItem({}, isFaq));
        w.addEventListener('click', (e) => { if (e.target.dataset.rm !== undefined) e.target.closest('.item').remove(); });
        break;
      }
      case 'md': {
        w.innerHTML = `${label}<div class="md-tools"><button type="button" class="btn" data-md="h2">H2</button><button type="button" class="btn" data-md="h3">H3</button><button type="button" class="btn" data-md="b">Bold</button><button type="button" class="btn" data-md="ul">• List</button><button type="button" class="btn" data-md="ol">1. List</button><button type="button" class="btn primary" data-md="link">🔗 Insert internal link</button><button type="button" class="btn primary" data-md="image">🖼 Insert image</button><button type="button" class="btn" data-md="preview">Toggle preview</button><span class="help" id="wc"></span></div>
          <div class="md-wrap"><textarea id="f-${name}" name="${name}" class="md">${esc(v ?? '')}</textarea><div class="preview" id="md-preview"></div></div><span class="help">Markdown: ## Heading, ### Sub-heading, - bullets, 1. numbered, **bold**, [link text](/path/). Use "Insert internal link" to link products, sub-verticals and articles.</span>`;
        const ta = $('textarea', w), pv = $('#md-preview', w), wc = $('#wc', w);
        const upd = () => { pv.innerHTML = md(ta.value); wc.textContent = `${ta.value.split(/\s+/).filter(Boolean).length} words`; };
        ta.addEventListener('input', upd); upd();
        $$('[data-md]', w).forEach((b) => b.addEventListener('click', () => mdAction(b.dataset.md, ta, upd, w)));
        break;
      }
      case 'coverage': {
        const cov = data.coverage || {};
        const grid = (prod) => US_STATES.map((ab) => {
          const cur = (cov[prod] || {})[ab] || '';
          return '<label class="cov-cell"><span>' + ab + '</span><select data-cov="' + prod + '" data-ab="' + ab + '">' +
            COVERAGE_LEVELS.map(([v, t2]) => '<option value="' + v + '"' + (v === cur ? ' selected' : '') + '>' + t2 + '</option>').join('') +
            '</select></label>';
        }).join('');
        w.innerHTML = '<label>' + esc(f.l) + '</label><span class="help">Set each state per product. Anything left as Not live is simply omitted from the map.</span>' +
          '<div class="cov-tabs"><button type="button" class="btn sm on" data-covtab="inbound-calls">Inbound Calls</button>' +
          '<button type="button" class="btn sm" data-covtab="live-transfers">Live Transfers</button>' +
          '<button type="button" class="btn sm" data-covbulk>Set all visible…</button></div>' +
          '<div class="cov-grid" data-covpane="inbound-calls">' + grid('inbound-calls') + '</div>' +
          '<div class="cov-grid" data-covpane="live-transfers" hidden>' + grid('live-transfers') + '</div>';
        const show = (prod) => {
          $$('[data-covpane]', w).forEach((el) => { el.hidden = el.dataset.covpane !== prod; });
          $$('[data-covtab]', w).forEach((b) => b.classList.toggle('on', b.dataset.covtab === prod));
        };
        $$('[data-covtab]', w).forEach((b) => b.addEventListener('click', () => show(b.dataset.covtab)));
        $('[data-covbulk]', w).addEventListener('click', () => {
          const prod = $('[data-covtab].on', w).dataset.covtab;
          const val = prompt('Set every state for this product to: blank (not live), limited, active or high', 'active');
          if (val === null) return;
          $$('[data-cov="' + prod + '"]', w).forEach((sel) => { sel.value = COVERAGE_LEVELS.some(([v]) => v === val) ? val : ''; });
        });
        break;
      }
      case 'metrics': {
        const items = (data.metrics && data.metrics.items) || [];
        const row = (it) => '<div class="item"><input placeholder="Value (e.g. 92)" value="' + esc(it.value != null ? it.value : '') + '">' +
          '<input placeholder="Suffix (%, min)" value="' + esc(it.suffix || '') + '">' +
          '<input placeholder="Label" value="' + esc(it.label || '') + '">' +
          '<input placeholder="Bar 0-1" value="' + esc(it.bar != null ? it.bar : '') + '">' +
          '<button type="button" class="icon-btn" data-rm title="Remove">&times;</button></div>';
        w.innerHTML = '<label>' + esc(f.l) + '</label><span class="help">Each row becomes one figure in the Case Studies ribbon. Publish only what you can evidence.</span>' +
          '<div class="objlist metrics" data-name="__metrics">' + items.map(row).join('') + '</div>' +
          '<button type="button" class="btn sm" data-add>+ Add figure</button>';
        const list = $('.objlist', w);
        $('[data-add]', w).addEventListener('click', () => list.insertAdjacentHTML('beforeend', row({})));
        w.addEventListener('click', (e) => { if (e.target.dataset.rm !== undefined) e.target.closest('.item').remove(); });
        break;
      }
      case 'json': w.innerHTML = `${label}<textarea id="f-${name}" name="${name}" class="md" style="min-height:560px">${esc(JSON.stringify(v, null, 2))}</textarea>${help}`; break;
    }
    return w;
  }
  const objItem = (it, faq) => faq ? `<div class="item"><textarea placeholder="Question">${esc(it.q || '')}</textarea><textarea placeholder="Answer">${esc(it.a || '')}</textarea><button type="button" class="icon-btn" data-rm title="Remove">×</button></div>` : `<div class="item"><input placeholder="Title" value="${esc(it.title || '')}"><textarea placeholder="Text">${esc(it.text || '')}</textarea><button type="button" class="icon-btn" data-rm title="Remove">×</button></div>`;

  function collect(schema, orig, kind) {
    const form = $('#edit-form');
    if (kind === 'page') { try { return JSON.parse(form.elements['__json'].value); } catch (e) { throw new Error('Invalid JSON: ' + e.message); } }
    const out = JSON.parse(JSON.stringify(orig));
    const read = (f, target, prefix = '') => {
      const name = prefix + f.k;
      const el = form.elements[name];
      switch (f.t) {
        case 'text': case 'slug': case 'date': case 'vertical': case 'subVertical': case 'type': case 'productType': target[f.k] = el.value.trim(); break;
        case 'textarea': target[f.k] = el.value.trim(); break;
        case 'number': target[f.k] = el.value === '' ? undefined : Number(el.value); break;
        case 'bool': target[f.k] = el.checked; break;
        case 'paras': target[f.k] = el.value.split(/\n\s*\n/).map((s) => s.trim().replace(/\s*\n\s*/g, ' ')).filter(Boolean); break;
        case 'lines': target[f.k] = el.value.split('\n').map((s) => s.trim()).filter(Boolean); break;
        case 'group': target[f.k] = target[f.k] || {}; for (const sub of f.fields) read(sub, target[f.k], name + '.'); break;
        case 'seo': target.seo = { ...(target.seo || {}), title: form.elements[name + '.title'].value.trim(), description: form.elements[name + '.description'].value.trim() }; if (f.keywords) target.seo.keywords = form.elements[name + '.keywords'].value.split(',').map((s) => s.trim()).filter(Boolean); break;
        case 'objlist': target[f.k] = $$(`.objlist[data-name="${name}"] .item`, form).map((it) => ({ title: $('input', it).value.trim(), text: $('textarea', it).value.trim() })).filter((x) => x.title); break;
        case 'faq': target[f.k] = $$(`.objlist[data-name="${name}"] .item`, form).map((it) => { const t = $$('textarea', it); return { q: t[0].value.trim(), a: t[1].value.trim() }; }).filter((x) => x.q); break;
        case 'md': target[f.k] = el.value; break;
        case 'coverage': {
          target.coverage = target.coverage || {};
          ['inbound-calls', 'live-transfers'].forEach((prod) => {
            const map = {};
            $$('[data-cov="' + prod + '"]', form).forEach((sel) => { if (sel.value) map[sel.dataset.ab] = sel.value; });
            target.coverage[prod] = map;
          });
          break;
        }
        case 'metrics': {
          target.metrics = target.metrics || {};
          target.metrics.items = $$('.objlist.metrics .item', form).map((it) => {
            const v = $$('input', it).map((x) => x.value.trim());
            return { value: Number(v[0]) || 0, suffix: v[1], label: v[2], bar: Math.max(0, Math.min(1, Number(v[3]) || 0)) };
          }).filter((x) => x.label);
          break;
        }
      }
      if (f.req && (target[f.k] === '' || target[f.k] == null)) throw new Error(`"${f.l}" is required.`);
    };
    for (const f of schema) read(f, out);
    /* dotted field keys describe nested settings; rebuild that shape on save */
    for (const key of Object.keys(out)) {
      if (key.indexOf('.') === -1 || key.startsWith('__')) continue;
      const parts = key.split('.');
      let node = out;
      for (let i = 0; i < parts.length - 1; i++) { node[parts[i]] = node[parts[i]] || {}; node = node[parts[i]]; }
      node[parts[parts.length - 1]] = out[key];
      delete out[key];
    }
    delete out.__coverage; delete out.__metrics;
    if (kind === 'settings' && out.hours && out.hours.saturday && !out.hours.saturday.open) out.hours.saturday = null;
    if (kind === 'product') out.slug = out.type;
    return out;
  }

  /* ================= widgets =================
     A friendlier view over the single `settings` record. Every editor here
     reads the current settings, patches exactly one slice and PUTs the whole
     object back, so no other widget's data is ever dropped. */

  const getPath = (obj, p) => String(p).split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
  function setPath(obj, p, val) {
    const parts = String(p).split('.');
    let node = obj;
    for (let i = 0; i < parts.length - 1; i++) { if (node[parts[i]] == null || typeof node[parts[i]] !== 'object') node[parts[i]] = {}; node = node[parts[i]]; }
    node[parts[parts.length - 1]] = val;
  }
  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

  const WIDGETS = [
    {
      key: 'coverage', slice: 'coverage', name: 'Coverage map', where: 'Coverage section on product and service pages.',
      count: (s) => plural(Object.keys((s && s['inbound-calls']) || {}).length + Object.keys((s && s['live-transfers']) || {}).length, 'live state'),
      help: 'Set each state per product. Anything left as Not live is omitted from the map.',
      custom: 'coverage',
    },
    {
      key: 'hours', slice: 'hours', name: 'Operating hours', where: 'Call widget and contact page.',
      count: (s) => (s && s.weekdays && s.weekdays.open ? `${s.weekdays.open}–${s.weekdays.close} ${s.timezoneLabel || ''}`.trim() : 'not set'),
      fields: [
        { k: 'timezone', t: 'text', l: 'Time zone (IANA)', help: 'e.g. America/New_York' },
        { k: 'timezoneLabel', t: 'text', l: 'Time zone label', help: 'e.g. ET' },
        { k: 'weekdays.open', t: 'text', l: 'Weekdays open (HH:MM)' },
        { k: 'weekdays.close', t: 'text', l: 'Weekdays close (HH:MM)' },
        { k: 'saturday.open', t: 'text', l: 'Saturday open (HH:MM, blank = closed)' },
        { k: 'saturday.close', t: 'text', l: 'Saturday close (HH:MM)' },
        { k: 'sunday.open', t: 'text', l: 'Sunday open (HH:MM, blank = closed)' },
        { k: 'sunday.close', t: 'text', l: 'Sunday close (HH:MM)' },
      ],
      after: (slice) => {
        for (const day of ['saturday', 'sunday']) if (slice[day] && !slice[day].open) slice[day] = null;
      },
    },
    {
      key: 'metrics', slice: 'metrics', name: 'Results ribbon', where: 'Figures ribbon on the Case Studies page.',
      count: (s) => plural(((s && s.items) || []).length, 'figure'),
      rows: {
        path: 'items', type: 'obj', label: 'Published figures', add: 'figure',
        help: 'Publish only figures you can evidence. An empty list hides the ribbon.',
        cols: [
          { k: 'value', l: 'Value', t: 'number', w: '90px' },
          { k: 'suffix', l: 'Suffix', t: 'text', w: '90px' },
          { k: 'label', l: 'Label', t: 'text' },
          { k: 'bar', l: 'Bar 0–1', t: 'number', w: '90px', min: 0, max: 1 },
        ],
        required: 'label',
      },
    },
    {
      key: 'liveFeed', slice: 'liveFeed', name: 'Delivery activity feed', where: 'Activity panel on the home page.',
      count: (s) => plural(((s && s.rows) || []).length, 'row'),
      fields: [
        { k: 'label', t: 'text', l: 'Panel label', help: 'Keep it honest, e.g. "Illustrative delivery activity".' },
        { k: 'mode', t: 'select', l: 'Mode', options: [['simulated', 'Simulated (cycles the rows)'], ['static', 'Static (no cycling)'], ['off', 'Off']] },
      ],
      rows: {
        path: 'rows', type: 'pair', label: 'Activity rows', add: 'row',
        cols: [{ l: 'Product / vertical', t: 'text' }, { l: 'Status', t: 'text' }],
      },
    },
    {
      key: 'board', slice: 'board', name: 'Operations board tiles', where: 'Operations board on the home page.',
      count: (s) => plural(((s && s.tiles) || []).length, 'tile'),
      rows: {
        path: 'tiles', type: 'obj', label: 'Tiles', add: 'tile', icon: true,
        help: 'Values starting with "auto:" are derived from live content and cannot be typed over (auto:verticals, auto:subVerticals).',
        cols: [{ k: 'label', l: 'Label', t: 'text' }, { k: 'value', l: 'Value', t: 'text' }],
        required: 'label',
      },
    },
    {
      key: 'calculator', slice: 'calculator', name: 'Volume calculator', where: 'Volume model on the services and product pages.',
      count: (s) => (s ? `${(s.callsPerDay || {}).min ?? '?'}–${(s.callsPerDay || {}).max ?? '?'} calls/day` : '—'),
      fields: [
        { k: 'defaultAvgValue', t: 'number', l: 'Default customer value ($)' },
        { k: 'callsPerDay.min', t: 'number', l: 'Calls per day — min' },
        { k: 'callsPerDay.max', t: 'number', l: 'Calls per day — max' },
        { k: 'callsPerDay.default', t: 'number', l: 'Calls per day — default' },
        { k: 'closeRate.min', t: 'number', l: 'Close rate % — min' },
        { k: 'closeRate.max', t: 'number', l: 'Close rate % — max' },
        { k: 'closeRate.default', t: 'number', l: 'Close rate % — default' },
        { k: 'avgValue.min', t: 'number', l: 'Customer value $ — min' },
        { k: 'avgValue.max', t: 'number', l: 'Customer value $ — max' },
        { k: 'avgValue.default', t: 'number', l: 'Customer value $ — default' },
        { k: 'disclaimer', t: 'textarea', l: 'Disclaimer' },
      ],
      validate: (slice) => {
        const names = { callsPerDay: 'Calls per day', closeRate: 'Close rate', avgValue: 'Customer value' };
        for (const k of Object.keys(names)) {
          const r = slice[k] || {};
          if (r.min == null && r.max == null && r.default == null) continue;
          if (!Number.isFinite(r.min) || !Number.isFinite(r.max)) throw new Error(`${names[k]}: both a minimum and a maximum are required, as numbers.`);
          if (r.min >= r.max) throw new Error(`${names[k]}: the minimum (${r.min}) must be lower than the maximum (${r.max}).`);
          if (Number.isFinite(r.default) && (r.default < r.min || r.default > r.max)) throw new Error(`${names[k]}: the default (${r.default}) must sit between ${r.min} and ${r.max}.`);
        }
      },
    },
    {
      key: 'comparison', slice: 'comparison', name: 'Product comparison', where: 'Web Leads / Inbound Calls / Live Transfers table on the services pages.',
      count: (s) => plural(((s && s.rows) || []).length, 'row'),
      rows: {
        path: 'rows', type: 'obj', label: 'Comparison rows', add: 'row', stacked: true,
        cols: [
          { k: 'attribute', l: 'Attribute', t: 'text' },
          { k: 'webLeads', l: 'Web Leads', t: 'text' },
          { k: 'inboundCalls', l: 'Inbound Calls', t: 'text' },
          { k: 'liveTransfers', l: 'Live Transfers', t: 'text' },
        ],
        required: 'attribute',
      },
    },
    {
      key: 'criteria', slice: 'criteria', name: 'Qualification chips', where: 'Qualification builder on sub-vertical and product pages.',
      count: (s) => plural(((s && s.chips) || []).length, 'chip'),
      rows: { path: 'chips', type: 'string', label: 'Chips', add: 'chip', cols: [{ l: 'Criterion', t: 'text' }], help: 'Sub-vertical criteria are appended automatically on the page.' },
    },
    {
      key: 'onboarding', slice: 'onboarding', name: 'Onboarding timeline', where: 'Timeline on the services index and the contact page.',
      count: (s) => plural(((s && s.steps) || []).length, 'step'),
      rows: {
        path: 'steps', type: 'obj', label: 'Steps', add: 'step', icon: true, stacked: true,
        cols: [{ k: 'day', l: 'Day', t: 'text', w: '120px' }, { k: 'title', l: 'Title', t: 'text' }, { k: 'text', l: 'Text', t: 'textarea' }],
        required: 'title',
      },
    },
    {
      key: 'commercial', slice: 'commercial', name: 'Commercial models', where: 'Pricing model cards on the services and contact pages.',
      count: (s) => plural(((s && s.models) || []).length, 'model'),
      fields: [{ k: 'recommended', t: 'text', l: 'Recommended model id', help: 'Must match one of the model ids below, or leave blank for none.' }],
      rows: {
        path: 'models', type: 'obj', label: 'Models', add: 'model', icon: true, stacked: true,
        cols: [{ k: 'id', l: 'Id', t: 'text', w: '160px' }, { k: 'name', l: 'Name', t: 'text' }, { k: 'how', l: 'How it works', t: 'textarea' }, { k: 'bestFor', l: 'Best for', t: 'textarea' }],
        required: 'name',
      },
    },
    {
      key: 'glossary', slice: 'glossary', name: 'Glossary terms', where: 'Definitions shown inline wherever the term appears in body copy.',
      count: (s) => plural(((s && s.terms) || []).length, 'term'),
      rows: {
        path: 'terms', type: 'obj', label: 'Terms', add: 'term', stacked: true,
        cols: [{ k: 'term', l: 'Term', t: 'text', w: '180px' }, { k: 'definition', l: 'Definition', t: 'textarea' }],
        required: 'term',
      },
    },
  ];
  const widgetSpec = (key) => WIDGETS.find((w) => w.key === key);

  async function loadSettings() {
    try {
      const r = await api('/api/admin/content?kind=settings&slug=settings');
      return r.data || {};
    } catch (e) {
      if (/not found/i.test(e.message)) return DEFAULTS.settings(); /* first run: no record yet */
      throw e;
    }
  }
  async function saveSettings(sliceKey, sliceValue) {
    const current = await loadSettings();
    current[sliceKey] = sliceValue;
    await api('/api/admin/content', { method: 'PUT', body: { kind: 'settings', slug: 'settings', prevSlug: 'settings', data: current } });
  }

  /* ----- icon library (fetched at runtime; degrades to a text input) ----- */
  let ICONS = null; /* null = not loaded yet, [] = unavailable */
  async function loadIcons() {
    if (ICONS !== null) return ICONS;
    try {
      const res = await fetch('/admin/icons.json', { credentials: 'same-origin' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const j = await res.json();
      ICONS = Array.isArray(j) ? j.filter((i) => i && i.key) : [];
    } catch (e) { ICONS = []; }
    return ICONS;
  }

  function iconPicker(value) {
    const w = document.createElement('div');
    w.className = 'icon-picker';
    let current = value || '';
    w.innerHTML = '<label class="icon-picker-label">Icon</label><div class="icon-fallback"><input type="text" class="icon-key" value="' + esc(current) + '" placeholder="Icon key (optional)" aria-label="Icon key"></div>';
    const input = $('.icon-key', w);
    w.getIcon = () => input.value.trim();
    loadIcons().then((icons) => {
      if (!icons.length) return; /* no icons.json: the plain text input stays */
      const grid = document.createElement('div');
      grid.className = 'icon-grid';
      grid.setAttribute('role', 'group');
      grid.setAttribute('aria-label', 'Choose an icon');
      grid.innerHTML = '<button type="button" class="icon-opt' + (current ? '' : ' on') + '" data-icon="" aria-pressed="' + (current ? 'false' : 'true') + '" title="No icon">—</button>' +
        icons.map((i) => '<button type="button" class="icon-opt' + (i.key === current ? ' on' : '') + '" data-icon="' + esc(i.key) + '" aria-pressed="' + (i.key === current ? 'true' : 'false') + '" title="' + esc(i.key) + '"><span class="icon-svg">' + (i.svg || '') + '</span><span class="icon-name">' + esc(i.key) + '</span></button>').join('');
      grid.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-icon]');
        if (!btn) return;
        current = btn.dataset.icon;
        input.value = current;
        $$('.icon-opt', grid).forEach((b) => { const on = b.dataset.icon === current; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
      });
      input.addEventListener('input', () => {
        current = input.value.trim();
        $$('.icon-opt', grid).forEach((b) => { const on = b.dataset.icon === current; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
      });
      $('.icon-fallback', w).classList.add('with-grid');
      w.insertBefore(grid, $('.icon-fallback', w));
    });
    return w;
  }

  /* ----- widgets index ----- */
  async function widgetsIndex() {
    const s = await loadSettings();
    main.innerHTML = `
      <div class="page-head"><div><h1>Widgets</h1><p class="muted tiny" style="margin:0">Every editable card, table and number shown on the public site. Empty widgets are hidden on the site rather than filled with invented content.</p></div>
        <div class="actions"><a class="btn" href="#/edit/settings/settings">Operational Settings (raw)</a></div></div>
      <div class="widgets">${WIDGETS.map((wd) => {
        const slice = s[wd.slice] || {};
        const on = slice.enabled !== false;
        return `<div class="widget-card">
          <div class="widget-card-head"><h2>${esc(wd.name)}</h2><span class="pill ${on ? 'qualified' : 'off'}">${on ? 'on' : 'off'}</span></div>
          <p class="muted tiny widget-where">${esc(wd.where)}</p>
          <p class="widget-count">${esc(wd.count(slice))}</p>
          <a class="btn sm primary" href="#/widget/${wd.key}">Edit</a>
        </div>`;
      }).join('')}</div>`;
  }

  /* ----- one widget ----- */
  function widgetRow(spec, value) {
    const rs = spec.rows;
    const item = document.createElement('div');
    item.className = 'w-row' + (rs.stacked ? ' stacked' : '');
    const cells = document.createElement('div');
    cells.className = 'w-cells';
    rs.cols.forEach((c, i) => {
      const val = rs.type === 'obj' ? (value && value[c.k] != null ? value[c.k] : '') : rs.type === 'pair' ? ((value || [])[i] != null ? value[i] : '') : (value != null ? value : '');
      const cell = document.createElement('div');
      cell.className = 'w-cell';
      if (c.w) cell.style.flex = '0 0 ' + c.w;
      const id = 'wf-' + Math.random().toString(36).slice(2, 9);
      cell.innerHTML = '<label for="' + id + '">' + esc(c.l) + '</label>' +
        (c.t === 'textarea'
          ? '<textarea id="' + id + '" data-cell="' + i + '">' + esc(val) + '</textarea>'
          : '<input id="' + id + '" data-cell="' + i + '" type="' + (c.t === 'number' ? 'number' : 'text') + '"' + (c.t === 'number' ? ' step="any"' : '') + ' value="' + esc(val) + '">');
      cells.appendChild(cell);
    });
    item.appendChild(cells);
    if (rs.icon) {
      const ip = iconPicker(value && value.icon);
      item.appendChild(ip);
      item.getIcon = () => ip.getIcon();
    }
    const ctl = document.createElement('div');
    ctl.className = 'w-row-ctl';
    ctl.innerHTML = '<button type="button" class="btn sm" data-up aria-label="Move up" title="Move up">↑</button>' +
      '<button type="button" class="btn sm" data-down aria-label="Move down" title="Move down">↓</button>' +
      '<button type="button" class="btn sm danger" data-rm aria-label="Remove row" title="Remove">×</button>';
    item.appendChild(ctl);
    return item;
  }

  async function widgetEditor(key) {
    const spec = widgetSpec(key);
    if (!spec) { main.innerHTML = '<div class="notice err">Unknown widget.</div>'; return; }
    const settings = await loadSettings();
    const slice = settings[spec.slice] || {};

    main.innerHTML = `
      <div class="page-head"><div><a class="tiny" href="#/widgets">‹ All widgets</a><h1>${esc(spec.name)}</h1><p class="muted tiny" style="margin:0">${esc(spec.where)}</p></div>
        <div class="actions"><button class="btn primary" id="w-save">Save</button></div></div>
      <form class="widget-editor" id="w-form">
        <div class="card">
          <div class="field inline"><input type="checkbox" id="w-enabled" ${slice.enabled !== false ? 'checked' : ''}><label for="w-enabled">Enabled — show this widget on the site</label></div>
          ${spec.help ? `<span class="help">${esc(spec.help)}</span>` : ''}
        </div>
        <div class="card" id="w-fields" hidden></div>
        <div class="card" id="w-rows" hidden></div>
        <div class="card" id="w-custom" hidden></div>
      </form>`;

    /* simple fields */
    const fieldsBox = $('#w-fields');
    if (spec.fields && spec.fields.length) {
      fieldsBox.hidden = false;
      fieldsBox.innerHTML = '<h2>Settings</h2><div class="w-fields-grid"></div>';
      const grid = $('.w-fields-grid', fieldsBox);
      spec.fields.forEach((f) => {
        const v = getPath(slice, f.k);
        const id = 'wfld-' + f.k.replace(/\./g, '-');
        const d = document.createElement('div');
        d.className = 'field';
        const label = '<label for="' + id + '">' + esc(f.l) + '</label>';
        const help = f.help ? '<span class="help">' + esc(f.help) + '</span>' : '';
        if (f.t === 'textarea') d.innerHTML = label + '<textarea id="' + id + '" data-fld="' + f.k + '">' + esc(v == null ? '' : v) + '</textarea>' + help;
        else if (f.t === 'select') d.innerHTML = label + '<select id="' + id + '" data-fld="' + f.k + '">' + f.options.map(([ov, ol]) => '<option value="' + esc(ov) + '"' + (ov === v ? ' selected' : '') + '>' + esc(ol) + '</option>').join('') + '</select>' + help;
        else d.innerHTML = label + '<input id="' + id + '" data-fld="' + f.k + '" type="' + (f.t === 'number' ? 'number' : 'text') + '"' + (f.t === 'number' ? ' step="any"' : '') + ' value="' + esc(v == null ? '' : v) + '">' + help;
        if (f.t === 'textarea') d.classList.add('wide');
        grid.appendChild(d);
      });
    }

    /* repeatable rows */
    const rowsBox = $('#w-rows');
    let listEl = null;
    if (spec.rows) {
      const rs = spec.rows;
      rowsBox.hidden = false;
      rowsBox.innerHTML = '<h2>' + esc(rs.label) + '</h2>' + (rs.help ? '<span class="help">' + esc(rs.help) + '</span>' : '') +
        '<div class="w-rows"></div><button type="button" class="btn sm" id="w-add">+ Add ' + esc(rs.add) + '</button>';
      listEl = $('.w-rows', rowsBox);
      const existing = getPath(slice, rs.path) || [];
      existing.forEach((it) => listEl.appendChild(widgetRow(spec, it)));
      $('#w-add').addEventListener('click', () => {
        const el = widgetRow(spec, rs.type === 'obj' ? {} : rs.type === 'pair' ? [] : '');
        listEl.appendChild(el);
        const first = el.querySelector('input, textarea');
        if (first) first.focus();
      });
      listEl.addEventListener('click', (e) => {
        const row = e.target.closest('.w-row');
        if (!row) return;
        if (e.target.hasAttribute('data-rm')) { const nxt = row.nextElementSibling || row.previousElementSibling; row.remove(); if (nxt) { const b = nxt.querySelector('[data-rm]'); if (b) b.focus(); } }
        else if (e.target.hasAttribute('data-up') && row.previousElementSibling) { listEl.insertBefore(row, row.previousElementSibling); e.target.focus(); }
        else if (e.target.hasAttribute('data-down') && row.nextElementSibling) { listEl.insertBefore(row.nextElementSibling, row); e.target.focus(); }
      });
    }

    /* coverage is a grid, not a row list */
    const customBox = $('#w-custom');
    if (spec.custom === 'coverage') {
      customBox.hidden = false;
      const cov = slice || {};
      const grid = (prod) => US_STATES.map((ab) => {
        const cur = (cov[prod] || {})[ab] || '';
        return '<label class="cov-cell"><span>' + ab + '</span><select data-cov="' + prod + '" data-ab="' + ab + '" aria-label="' + ab + ' ' + prod + '">' +
          COVERAGE_LEVELS.map(([v, t2]) => '<option value="' + v + '"' + (v === cur ? ' selected' : '') + '>' + t2 + '</option>').join('') + '</select></label>';
      }).join('');
      customBox.innerHTML = '<h2>State coverage</h2>' +
        '<div class="cov-tabs"><button type="button" class="btn sm on" data-covtab="inbound-calls">Inbound Calls</button>' +
        '<button type="button" class="btn sm" data-covtab="live-transfers">Live Transfers</button>' +
        '<button type="button" class="btn sm" data-covbulk>Set all visible…</button></div>' +
        '<div class="cov-grid" data-covpane="inbound-calls">' + grid('inbound-calls') + '</div>' +
        '<div class="cov-grid" data-covpane="live-transfers" hidden>' + grid('live-transfers') + '</div>';
      const show = (prod) => {
        $$('[data-covpane]', customBox).forEach((el) => { el.hidden = el.dataset.covpane !== prod; });
        $$('[data-covtab]', customBox).forEach((b) => b.classList.toggle('on', b.dataset.covtab === prod));
      };
      $$('[data-covtab]', customBox).forEach((b) => b.addEventListener('click', () => show(b.dataset.covtab)));
      $('[data-covbulk]', customBox).addEventListener('click', () => {
        const prod = $('[data-covtab].on', customBox).dataset.covtab;
        const val = prompt('Set every state for this product to: blank (not live), limited, active or high', 'active');
        if (val === null) return;
        $$('[data-cov="' + prod + '"]', customBox).forEach((sel) => { sel.value = COVERAGE_LEVELS.some(([v]) => v === val) ? val : ''; });
      });
    }

    function build() {
      const out = JSON.parse(JSON.stringify(slice));
      out.enabled = $('#w-enabled').checked;

      (spec.fields || []).forEach((f) => {
        const el = $('[data-fld="' + f.k + '"]', main);
        if (!el) return;
        const raw = el.value.trim();
        if (f.t === 'number') {
          if (raw === '') { setPath(out, f.k, undefined); return; }
          const n = Number(raw);
          if (!Number.isFinite(n)) throw new Error('"' + f.l + '" must be a number.');
          setPath(out, f.k, n);
        } else setPath(out, f.k, raw);
      });

      if (spec.rows) {
        const rs = spec.rows;
        const items = [];
        $$('.w-row', listEl).forEach((row) => {
          const inputs = $$('[data-cell]', row);
          const vals = inputs.map((el) => el.value.trim());
          if (rs.type === 'string') { if (vals[0]) items.push(vals[0]); return; }
          if (rs.type === 'pair') { if (vals.some(Boolean)) items.push(vals); return; }
          const obj = {};
          rs.cols.forEach((c, i) => {
            if (c.t === 'number') {
              if (vals[i] === '') return;
              let n = Number(vals[i]);
              if (!Number.isFinite(n)) throw new Error('"' + c.l + '" must be a number (got "' + vals[i] + '").');
              if (c.min != null) n = Math.max(c.min, n);
              if (c.max != null) n = Math.min(c.max, n);
              obj[c.k] = n;
            } else obj[c.k] = vals[i];
          });
          if (rs.icon && row.getIcon) { const ic = row.getIcon(); if (ic) obj.icon = ic; }
          const req = rs.required;
          if (req && !obj[req]) return; /* an unfilled row is simply dropped */
          items.push(obj);
        });
        setPath(out, rs.path, items);
      }

      if (spec.custom === 'coverage') {
        ['inbound-calls', 'live-transfers'].forEach((prod) => {
          const map = {};
          $$('[data-cov="' + prod + '"]', main).forEach((sel) => { if (sel.value) map[sel.dataset.ab] = sel.value; });
          out[prod] = map;
        });
      }

      if (spec.after) spec.after(out);
      if (spec.validate) spec.validate(out);
      return out;
    }

    $('#w-save').addEventListener('click', async (e) => {
      e.preventDefault();
      const btn = e.target;
      try {
        const out = build();
        btn.disabled = true;
        await saveSettings(spec.slice, out);
        toast('Saved. Press "Publish site" to update the website.', 'ok');
        refreshPublish();
      } catch (err) { toast(err.message, 'err'); }
      finally { btn.disabled = false; }
    });
    $('#w-form').addEventListener('submit', (e) => e.preventDefault());
  }

  /* ----- markdown tools ----- */
  function mdAction(kind, ta, upd, wrap) {
    const s = ta.selectionStart, e = ta.selectionEnd, sel = ta.value.slice(s, e);
    const insert = (txt, cursorOffset) => { ta.setRangeText(txt, s, e, 'end'); if (cursorOffset != null) ta.selectionStart = ta.selectionEnd = s + cursorOffset; ta.focus(); upd(); };
    if (kind === 'h2') insert(`\n## ${sel || 'Heading'}\n`);
    else if (kind === 'h3') insert(`\n### ${sel || 'Sub-heading'}\n`);
    else if (kind === 'b') insert(`**${sel || 'bold text'}**`);
    else if (kind === 'ul') insert('\n' + (sel || 'Item one\nItem two').split('\n').map((l) => '- ' + l).join('\n') + '\n');
    else if (kind === 'ol') insert('\n' + (sel || 'Step one\nStep two').split('\n').map((l, i) => `${i + 1}. ${l}`).join('\n') + '\n');
    else if (kind === 'preview') $('.md-wrap', wrap).classList.toggle('single');
    else if (kind === 'link') linkPicker((label, url) => insert(`[${sel || label}](${url})`));
    else if (kind === 'image') mediaPicker((item) => insert('\n![' + (item.alt || sel || '') + '](' + item.url + (item.caption ? ' "' + item.caption + '"' : '') + ')\n'));
  }
  /* ----- media library: upload (resized in the browser) + pick ----- */
  const MAX_EDGE = 1600, JPEG_Q = 0.82;

  function resizeImage(file) {
    return new Promise((resolve, reject) => {
      if (file.type === 'image/svg+xml' || file.type === 'image/gif') {
        const fr = new FileReader();
        fr.onload = () => resolve({ dataUrl: fr.result, mime: file.type, width: null, height: null });
        fr.onerror = () => reject(new Error('Could not read that file.'));
        fr.readAsDataURL(file);
        return;
      }
      const url = URL.createObjectURL(file);
      const im = new Image();
      im.onload = () => {
        URL.revokeObjectURL(url);
        const scale = Math.min(1, MAX_EDGE / Math.max(im.width, im.height));
        const w = Math.round(im.width * scale), h = Math.round(im.height * scale);
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const g = c.getContext('2d');
        g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
        g.drawImage(im, 0, 0, w, h);
        const keepPng = file.type === 'image/png' && file.size < 300000;
        resolve({ dataUrl: c.toDataURL(keepPng ? 'image/png' : 'image/jpeg', JPEG_Q), mime: keepPng ? 'image/png' : 'image/jpeg', width: w, height: h });
      };
      im.onerror = () => { URL.revokeObjectURL(url); reject(new Error('That file is not a readable image.')); };
      im.src = url;
    });
  }

  async function uploadImage(file) {
    const r = await resizeImage(file);
    return api('/api/admin/media', { method: 'POST', body: { filename: file.name, mime: r.mime, dataUrl: r.dataUrl, width: r.width, height: r.height } });
  }

  function mediaPicker(onPick) {
    const modal = $('#modal'), body = $('#modal-body');
    $('#modal-title').textContent = 'Images';
    modal.hidden = false;
    body.innerHTML = '<div class="media-drop" id="drop">' +
      '<p style="margin:0 0 8px"><strong>Drop an image here</strong> or <label class="btn sm" style="display:inline-flex">choose a file<input type="file" id="file" accept="image/*" hidden></label></p>' +
      '<p class="tiny muted" style="margin:0">Images are resized to 1600px and compressed in your browser before upload. Limit 1.5 MB after resizing.</p>' +
      '<p class="msg tiny" id="up-msg"></p></div>' +
      '<input id="media-q" placeholder="Search the image library...">' +
      '<div class="media-grid" id="media-grid"><p class="muted tiny">Loading...</p></div>';
    const grid = $('#media-grid'), msg = $('#up-msg'), qIn = $('#media-q');
    let items = [];
    const render = () => {
      const q = qIn.value.toLowerCase();
      const list = items.filter((i) => !q || (i.filename + ' ' + (i.alt || '')).toLowerCase().includes(q));
      grid.innerHTML = list.length
        ? list.map((i) => '<figure data-id="' + i.id + '"><img src="' + esc(i.url) + '" alt="' + esc(i.alt || '') + '" loading="lazy"><figcaption title="' + esc(i.filename) + '">' + esc(i.filename) + '</figcaption><button type="button" class="rm" data-del="' + i.id + '" title="Delete">&times;</button></figure>').join('')
        : '<p class="muted tiny">No images yet. Upload one above.</p>';
    };
    const load = async () => {
      try { items = (await api('/api/admin/media?limit=120')).items; render(); }
      catch (e) { grid.innerHTML = '<p class="msg tiny">' + esc(e.message) + '</p>'; }
    };
    load();
    qIn.addEventListener('input', render);
    grid.addEventListener('click', async (e) => {
      const del = e.target.dataset.del;
      if (del) {
        e.stopPropagation();
        if (!confirm('Delete this image from the library? Pages already using it will show a broken image.')) return;
        try { await api('/api/admin/media?id=' + del, { method: 'DELETE' }); items = items.filter((i) => i.id !== del); render(); toast('Image deleted'); }
        catch (err) { toast(err.message, 'err'); }
        return;
      }
      const fig = e.target.closest('figure[data-id]');
      if (!fig) return;
      const item = items.find((i) => i.id === fig.dataset.id);
      const alt = prompt('Alt text (describe the image for screen readers and SEO):', item.alt || '') || '';
      const caption = prompt('Caption shown under the image (leave blank for none):', '') || '';
      modal.hidden = true;
      onPick({ url: item.url, alt: alt, caption: caption });
    });
    const doUpload = async (file) => {
      if (!file) return;
      msg.textContent = 'Uploading...'; msg.style.color = 'var(--muted)';
      try {
        const r = await uploadImage(file);
        msg.textContent = 'Uploaded ' + file.name + ' (' + Math.round(r.bytes / 1024) + ' KB)';
        msg.style.color = 'var(--green)';
        await load();
      } catch (e) { msg.textContent = e.message; msg.style.color = 'var(--red)'; }
    };
    $('#file').addEventListener('change', (e) => doUpload(e.target.files[0]));
    const drop = $('#drop');
    ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
    ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
    drop.addEventListener('drop', (e) => doUpload(e.dataTransfer.files[0]));
  }

  function linkPicker(onPick) {
    const options = [];
    for (const v of byKind('vertical')) options.push({ label: v.data.name, url: `/${v.slug}/`, kind: 'Vertical' });
    for (const s of byKind('sub-vertical')) options.push({ label: s.data.name, url: `/${s.data.vertical}/${s.slug}/`, kind: 'Sub-vertical' });
    for (const p of byKind('product')) options.push({ label: p.data.name, url: `/${p.data.vertical}/${p.data.subVertical}/${p.data.type}/`, kind: 'Product' });
    for (const a of byKind('article')) options.push({ label: a.data.title, url: `/resources/${a.data.vertical}/${a.data.subVertical}/${a.data.product}/${a.slug}/`, kind: 'Article' });
    for (const [l, u] of [['Services', '/services/'], ['PPC / Performance Marketing', '/services/ppc-performance-marketing/'], ['Web Lead Generation', '/services/web-lead-generation/'], ['Inbound Calls (service)', '/services/inbound-calls/'], ['Live Transfers (service)', '/services/live-transfers/'], ['Contact', '/contact/'], ['About', '/about/'], ['Case Studies', '/case-studies/']]) options.push({ label: l, url: u, kind: 'Page' });
    const modal = $('#modal'), body = $('#modal-body');
    $('#modal-title').textContent = 'Insert internal link';
    modal.hidden = false;
    body.innerHTML = `<input id="pick-q" placeholder="Search products, sub-verticals, articles, pages…" autofocus><ul class="pick" id="pick-list"></ul>`;
    const listEl = $('#pick-list'), qIn = $('#pick-q');
    const render = () => { const q = qIn.value.toLowerCase(); listEl.innerHTML = options.filter((o) => !q || o.label.toLowerCase().includes(q) || o.url.includes(q)).slice(0, 60).map((o, i) => `<li data-i="${options.indexOf(o)}"><span><span class="pill">${o.kind}</span> ${esc(o.label)}</span><code>${esc(o.url)}</code></li>`).join('') || '<li class="muted">No matches</li>'; };
    qIn.addEventListener('input', render); render(); qIn.focus();
    listEl.onclick = (e) => { const li = e.target.closest('li[data-i]'); if (!li) return; const o = options[Number(li.dataset.i)]; modal.hidden = true; onPick(o.label, o.url); };
  }
  $('#modal-close').onclick = () => ($('#modal').hidden = true);
  $('#modal').addEventListener('click', (e) => { if (e.target === e.currentTarget) e.currentTarget.hidden = true; });

  /* ----- markdown preview (mirrors scripts/lib/util.mjs md()) ----- */
  function md(src = '') {
    const lines = src.replace(/\r\n/g, '\n').split('\n');
    let html = '', para = [], list = null;
    const inline = (s) => esc(s).replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;border-radius:8px">').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>').replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank">$1</a>');
    const fp = () => { if (para.length) { html += `<p>${inline(para.join(' '))}</p>`; para = []; } };
    const fl = () => { if (list) { html += `</${list}>`; list = null; } };
    for (const raw of lines) {
      const line = raw.trimEnd(); let m;
      if (!line.trim()) { fp(); fl(); continue; }
      if ((m = line.match(/^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)\s*$/))) { fp(); fl(); html += `<figure style="margin:1em 0"><img src="${esc(m[2])}" alt="${esc(m[1])}" style="max-width:100%;border-radius:8px">${m[3] ? `<figcaption style="font-size:.8rem;color:var(--muted);text-align:center;margin-top:6px">${esc(m[3])}</figcaption>` : ''}</figure>`; }
      else if (/^(-{3,}|\*{3,})$/.test(line.trim())) { fp(); fl(); html += '<hr>'; }
      else if ((m = line.match(/^(#{1,4})\s+(.*)$/))) { fp(); fl(); html += `<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`; }
      else if ((m = line.match(/^[-*]\s+(.*)$/))) { fp(); if (list !== 'ul') { fl(); list = 'ul'; html += '<ul>'; } html += `<li>${inline(m[1])}</li>`; }
      else if ((m = line.match(/^\d+[.)]\s+(.*)$/))) { fp(); if (list !== 'ol') { fl(); list = 'ol'; html += '<ol>'; } html += `<li>${inline(m[1])}</li>`; }
      else if ((m = line.match(/^>\s?(.*)$/))) { fp(); fl(); html += `<blockquote><p>${inline(m[1])}</p></blockquote>`; }
      else { fl(); para.push(line.trim()); }
    }
    fp(); fl();
    return html;
  }
  const fmt = (iso) => { try { return new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }); } catch { return iso; } };

  boot();
})();
