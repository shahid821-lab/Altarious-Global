/* Shared helpers for Cloudflare Pages Functions (edge runtime, Web APIs only). */

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers } });
}
export const bad = (error, status = 400) => json({ ok: false, error }, status);

export async function readBody(request) {
  const ct = request.headers.get('content-type') || '';
  if (ct.includes('application/json')) return await request.json();
  if (ct.includes('form')) {
    const fd = await request.formData();
    const o = {};
    for (const [k, v] of fd.entries()) o[k] = typeof v === 'string' ? v : '';
    return o;
  }
  try { return await request.json(); } catch { return {}; }
}

/* ---- session cookie: base64url(payload).base64url(hmac) ---- */
const COOKIE = 'ag_admin';
const enc = new TextEncoder();

async function hmac(secret, data) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return b64u(new Uint8Array(sig));
}
function b64u(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64uStr(str) { return b64u(enc.encode(str)); }
function unb64uStr(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return decodeURIComponent(escape(atob(s)));
}

export async function createSession(env, user = 'admin', hours = 12) {
  const payload = JSON.stringify({ u: user, exp: Date.now() + hours * 3600e3 });
  const p = b64uStr(payload);
  const token = `${p}.${await hmac(env.SESSION_SECRET, p)}`;
  return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${hours * 3600}`;
}
export const clearSessionCookie = () => `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;

export async function getSession(request, env) {
  if (!env.SESSION_SECRET) return null;
  const cookie = request.headers.get('cookie') || '';
  const m = cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  if (!m) return null;
  const [p, sig] = m[1].split('.');
  if (!p || !sig) return null;
  const expect = await hmac(env.SESSION_SECRET, p);
  if (!timingSafeEqual(expect, sig)) return null;
  try {
    const data = JSON.parse(unb64uStr(p));
    if (!data.exp || data.exp < Date.now()) return null;
    return data;
  } catch { return null; }
}

export function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const ab = enc.encode(a), bb = enc.encode(b);
  if (ab.length !== bb.length) return false;
  let r = 0;
  for (let i = 0; i < ab.length; i++) r |= ab[i] ^ bb[i];
  return r === 0;
}

export function requireDB(env) {
  if (!env.DB) throw new Error('D1 binding "DB" is not configured. See DEPLOY.md.');
  return env.DB;
}

export const slugify = (s) => String(s).toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
export const clip = (s, n) => (s == null ? '' : String(s).trim().slice(0, n));
