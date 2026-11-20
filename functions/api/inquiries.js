import { json, bad, readBody, requireDB, clip } from '../../server/lib.js';

const REQUIRED = ['full_name', 'company', 'email', 'phone', 'service_interest', 'vertical_interest', 'message'];

/** POST /api/inquiries — public inquiry form. Validates, spam-checks, stores in D1, notifies. */
export async function onRequestPost({ request, env, waitUntil }) {
  let body;
  try { body = await readBody(request); } catch { return bad('Invalid request body.'); }

  /* --- spam protection layer 1: honeypot + timing --- */
  if (body.website) return json({ ok: true, message: 'Thank you. Your inquiry has been received.' }); // silently drop bots
  const started = Number(body.started_at || 0);
  if (started && Date.now() - started < 2500) return bad('Please take a moment to review your message before submitting.');

  /* --- validation --- */
  const missing = REQUIRED.filter((k) => !clip(body[k], 5000));
  if (missing.length) return bad(`Missing required fields: ${missing.join(', ')}.`);
  const email = clip(body.email, 200);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return bad('Please enter a valid business email address.');
  const phone = clip(body.phone, 40);
  if (phone.replace(/\D/g, '').length < 7) return bad('Please enter a valid phone number.');
  const message = clip(body.message, 4000);
  if (/https?:\/\/\S+/gi.test(message) && (message.match(/https?:\/\//gi) || []).length > 2) return bad('Please remove links from your message.');

  /* --- spam protection layer 2: Cloudflare Turnstile (when configured) --- */
  if (env.TURNSTILE_SECRET_KEY) {
    const token = body['cf-turnstile-response'];
    if (!token) return bad('Please complete the verification challenge.');
    const verify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: env.TURNSTILE_SECRET_KEY, response: token, remoteip: request.headers.get('CF-Connecting-IP') }),
    }).then((r) => r.json()).catch(() => ({ success: false }));
    if (!verify.success) return bad('Verification failed. Please try again.');
  }

  /* --- store --- */
  const row = {
    full_name: clip(body.full_name, 120),
    company: clip(body.company, 160),
    email,
    phone,
    service_interest: clip(body.service_interest, 120),
    vertical_interest: clip(body.vertical_interest, 120),
    sub_vertical_interest: clip(body.sub_vertical_interest, 120) || null,
    message,
    source_page: clip(body.source_page, 200) || null,
    source_url: clip(body.source_url, 500) || null,
    page_title: clip(body.page_title, 300) || null,
    vertical: clip(body.vertical, 80) || null,
    sub_vertical: clip(body.sub_vertical, 80) || null,
    product: clip(body.product, 80) || null,
    ip: request.headers.get('CF-Connecting-IP') || null,
    user_agent: clip(request.headers.get('User-Agent'), 300) || null,
    country: request.headers.get('CF-IPCountry') || null,
  };

  let id = null;
  try {
    const db = requireDB(env);
    /* rate limit: max 5 submissions per IP per hour */
    if (row.ip) {
      const recent = await db.prepare("SELECT COUNT(*) AS n FROM inquiries WHERE ip = ? AND created_at > strftime('%Y-%m-%dT%H:%M:%fZ','now','-1 hour')").bind(row.ip).first();
      if (recent && recent.n >= 5) return bad('Too many submissions. Please try again later.', 429);
    }
    const cols = Object.keys(row);
    const res = await db
      .prepare(`INSERT INTO inquiries (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`)
      .bind(...cols.map((c) => row[c]))
      .run();
    id = res.meta?.last_row_id ?? null;
  } catch (e) {
    console.error('inquiry store failed', e);
    return bad('We could not save your inquiry right now. Please email us directly.', 500);
  }

  /* --- notify (non-blocking) --- */
  waitUntil(notify(env, { id, ...row }).catch((e) => console.error('notify failed', e)));

  return json({ ok: true, id, message: 'Thank you. Your inquiry has been received and our team will be in touch shortly.' });
}

export const onRequestGet = () => json({ ok: false, error: 'Method not allowed' }, 405);

async function notify(env, r) {
  const subject = `New inquiry #${r.id ?? ''}: ${r.company} — ${r.service_interest} / ${r.vertical_interest}`;
  const lines = [
    `Name: ${r.full_name}`, `Company: ${r.company}`, `Email: ${r.email}`, `Phone: ${r.phone}`,
    `Service: ${r.service_interest}`, `Vertical: ${r.vertical_interest}`, `Sub-vertical: ${r.sub_vertical_interest || '-'}`,
    `Source page: ${r.source_page || '-'} (${r.source_url || '-'})`,
    `Tagged: ${r.vertical || '-'} → ${r.sub_vertical || '-'} → ${r.product || '-'}`,
    `Country/IP: ${r.country || '-'} / ${r.ip || '-'}`, '', 'Message:', r.message,
  ];
  const text = lines.join('\n');
  const tasks = [];
  const to = (env.NOTIFY_EMAIL_TO || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (env.BREVO_API_KEY && to.length) {
    const sender = parseSender(env.NOTIFY_EMAIL_FROM, 'Altarious Global', 'shahidkhan@altariousglobal.com');
    /* internal notification — Reply goes straight to the prospect */
    tasks.push(brevoSend(env, { sender, to: to.map((email) => ({ email })), replyTo: { email: r.email, name: r.full_name }, subject, textContent: text, tags: ['inquiry'] }));
    /* acknowledgement to the prospect — Reply comes back to our inbox */
    if (env.INQUIRY_AUTOREPLY !== 'off') {
      const first = String(r.full_name || '').trim().split(/\s+/)[0] || 'there';
      const ack = [
        `Hi ${first},`, '',
        `Thank you for contacting Altarious Global. We have received your inquiry about ${r.service_interest} for ${r.vertical_interest}, and a member of our team will respond within one business day.`, '',
        'If you would like to add detail in the meantime — target geographies, volume goals or timing — simply reply to this email.', '',
        'Kind regards,', `${sender.name}`, 'Altarious Global', env.CONTACT_PHONE || '', 'https://altariousglobal.com',
      ].filter((l, i, a) => l !== '' || a[i - 1] !== '').join('\n');
      tasks.push(brevoSend(env, { sender, to: [{ email: r.email, name: r.full_name }], replyTo: { email: sender.email, name: sender.name }, subject: 'We received your inquiry — Altarious Global', textContent: ack, tags: ['inquiry-ack'] }));
    }
  } else if (env.RESEND_API_KEY && env.NOTIFY_EMAIL_TO) {
    tasks.push(fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: env.NOTIFY_EMAIL_FROM || 'Altarious Global <onboarding@resend.dev>', to: env.NOTIFY_EMAIL_TO.split(',').map((s) => s.trim()), subject, text, reply_to: r.email }),
    }));
  }
  if (env.NOTIFY_WEBHOOK_URL) {
    tasks.push(fetch(env.NOTIFY_WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: `*${subject}*\n${text}`, content: `**${subject}**\n${text}`, inquiry: r }) }));
  }
  await Promise.all(tasks);
}

/** "Name <email>" → {name, email}; falls back to defaults. */
function parseSender(raw, defName, defEmail) {
  const m = String(raw || '').match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  if (m) return { name: m[1] || defName, email: m[2].trim() };
  if (raw && raw.includes('@')) return { name: defName, email: raw.trim() };
  return { name: defName, email: defEmail };
}

/** Brevo transactional email API (sender domain is authenticated in Brevo). */
async function brevoSend(env, payload) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': env.BREVO_API_KEY, 'Content-Type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Brevo ${res.status}: ${(await res.text()).slice(0, 300)}`);
}
