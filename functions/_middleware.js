import { getSession, json } from '../server/lib.js';

/** Security headers on API responses + auth guard for /api/admin/* (except login). */
export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);

  if (url.pathname.startsWith('/api/admin/') && !url.pathname.startsWith('/api/admin/login')) {
    const session = await getSession(request, env);
    if (!session) return json({ ok: false, error: 'Unauthorized' }, 401);
    context.data.session = session;
  }

  if (request.method === 'OPTIONS' && url.pathname.startsWith('/api/')) {
    return new Response(null, { status: 204, headers: { Allow: 'GET, POST, PUT, PATCH, DELETE, OPTIONS' } });
  }

  let res;
  try {
    res = await next();
  } catch (e) {
    if (!url.pathname.startsWith('/api/')) throw e;
    console.error('API error', url.pathname, e);
    const msg = /no such table/i.test(e.message) ? 'Database tables are missing. Run db/schema.sql against the D1 database (see DEPLOY.md).' : e.message || 'Internal error';
    return json({ ok: false, error: msg }, 500);
  }
  if (url.pathname.startsWith('/api/')) {
    const h = new Headers(res.headers);
    h.set('X-Content-Type-Options', 'nosniff');
    h.set('Cache-Control', 'no-store');
    return new Response(res.body, { status: res.status, headers: h });
  }
  return res;
}
