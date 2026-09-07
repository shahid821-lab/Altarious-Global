import { json, bad, readBody, createSession, clearSessionCookie, getSession, timingSafeEqual } from '../../../server/lib.js';

/** POST /api/admin/login {password} → session cookie. GET → session status. DELETE → logout. */
export async function onRequestPost({ request, env }) {
  if (!env.ADMIN_PASSWORD || !env.SESSION_SECRET) return bad('Admin is not configured: set ADMIN_PASSWORD and SESSION_SECRET.', 503);
  const { password } = await readBody(request);
  if (!password || !timingSafeEqual(String(password), String(env.ADMIN_PASSWORD))) {
    await new Promise((r) => setTimeout(r, 400));
    return bad('Incorrect password.', 401);
  }
  return json({ ok: true, user: 'admin' }, 200, { 'Set-Cookie': await createSession(env, 'admin') });
}

export async function onRequestGet({ request, env }) {
  const s = await getSession(request, env);
  return json({ ok: true, authenticated: !!s, user: s?.u || null, configured: !!(env.ADMIN_PASSWORD && env.SESSION_SECRET), db: !!env.DB, publish: !!env.DEPLOY_HOOK_URL });
}

export const onRequestDelete = () => json({ ok: true }, 200, { 'Set-Cookie': clearSessionCookie() });
