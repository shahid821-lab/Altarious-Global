import { json, bad, readBody, requireDB, clip } from '../../../server/lib.js';

const STATUSES = ['new', 'contacted', 'qualified', 'closed'];
const EXPORT_COLS = [
  'id', 'created_at', 'full_name', 'company', 'email', 'phone',
  'service_interest', 'vertical_interest', 'sub_vertical_interest',
  'vertical', 'sub_vertical', 'product', 'source_page', 'source_url',
  'status', 'notes', 'country', 'ip', 'message',
];

const CRLF = String.fromCharCode(13, 10);
const LF = String.fromCharCode(10);
const CR = String.fromCharCode(13);
const BOM = String.fromCharCode(0xfeff); // makes Excel read the file as UTF-8

function csvCell(val) {
  if (val === null || val === undefined) return '';
  let s = String(val);
  // a leading =, +, - or @ is executed as a formula by spreadsheet apps
  if (['=', '+', '-', '@'].indexOf(s.charAt(0)) > -1) s = "'" + s;
  const needsQuotes = s.indexOf('"') > -1 || s.indexOf(',') > -1 || s.indexOf(';') > -1 || s.indexOf(LF) > -1 || s.indexOf(CR) > -1;
  return needsQuotes ? '"' + s.split('"').join('""') + '"' : s;
}

/**
 * GET /api/admin/inquiries?q=&status=&vertical=&product=&page=&limit=  — list/search/filter
 * GET /api/admin/inquiries?format=csv&…                               — export the current filter
 */
export async function onRequestGet({ request, env }) {
  const db = requireDB(env);
  const u = new URL(request.url);
  const q = clip(u.searchParams.get('q'), 100);
  const status = clip(u.searchParams.get('status'), 20);
  const vertical = clip(u.searchParams.get('vertical'), 80);
  const product = clip(u.searchParams.get('product'), 80);
  const id = u.searchParams.get('id');
  const limit = Math.min(500, Math.max(1, Number(u.searchParams.get('limit') || 25)));
  const page = Math.max(1, Number(u.searchParams.get('page') || 1));

  if (id) {
    const row = await db.prepare('SELECT * FROM inquiries WHERE id = ?').bind(Number(id)).first();
    return row ? json({ ok: true, inquiry: row }) : bad('Not found', 404);
  }

  const where = [];
  const args = [];
  if (q) { where.push('(full_name LIKE ? OR company LIKE ? OR email LIKE ? OR phone LIKE ? OR message LIKE ? OR source_page LIKE ?)'); for (let i = 0; i < 6; i++) args.push(`%${q}%`); }
  if (status && STATUSES.includes(status)) { where.push('status = ?'); args.push(status); }
  if (vertical) { where.push('(vertical = ? OR vertical_interest = ?)'); args.push(vertical, vertical); }
  if (product) { where.push('product = ?'); args.push(product); }
  const sql = where.length ? ' WHERE ' + where.join(' AND ') : '';

  /* --- CSV export: opens directly in Excel, Numbers and Google Sheets --- */
  if (u.searchParams.get('format') === 'csv') {
    const all = (await db.prepare(`SELECT * FROM inquiries${sql} ORDER BY created_at DESC LIMIT 5000`).bind(...args).all()).results;
    const csv = [EXPORT_COLS.join(','), ...all.map((r) => EXPORT_COLS.map((c) => csvCell(r[c])).join(','))].join(CRLF);
    const stamp = new Date().toISOString().slice(0, 10);
    return new Response(BOM + csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="altarious-inquiries-${stamp}.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  }

  const total = (await db.prepare(`SELECT COUNT(*) AS n FROM inquiries${sql}`).bind(...args).first())?.n || 0;
  const rows = (await db.prepare(`SELECT id, created_at, full_name, company, email, phone, service_interest, vertical_interest, sub_vertical_interest, source_page, source_url, vertical, sub_vertical, product, status, country FROM inquiries${sql} ORDER BY created_at DESC LIMIT ? OFFSET ?`).bind(...args, limit, (page - 1) * limit).all()).results;
  const counts = (await db.prepare('SELECT status, COUNT(*) AS n FROM inquiries GROUP BY status').all()).results;
  return json({ ok: true, total, page, limit, inquiries: rows, counts: Object.fromEntries(counts.map((c) => [c.status, c.n])) });
}

/** PATCH /api/admin/inquiries {id, status?, notes?} */
export async function onRequestPatch({ request, env }) {
  const db = requireDB(env);
  const body = await readBody(request);
  const id = Number(body.id);
  if (!id) return bad('id required');
  const sets = [];
  const args = [];
  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status)) return bad('Invalid status');
    sets.push('status = ?'); args.push(body.status);
  }
  if (body.notes !== undefined) { sets.push('notes = ?'); args.push(clip(body.notes, 5000)); }
  if (!sets.length) return bad('Nothing to update');
  sets.push("updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')");
  await db.prepare(`UPDATE inquiries SET ${sets.join(', ')} WHERE id = ?`).bind(...args, id).run();
  const row = await db.prepare('SELECT * FROM inquiries WHERE id = ?').bind(id).first();
  return json({ ok: true, inquiry: row });
}

/** DELETE /api/admin/inquiries?id= */
export async function onRequestDelete({ request, env }) {
  const db = requireDB(env);
  const id = Number(new URL(request.url).searchParams.get('id'));
  if (!id) return bad('id required');
  await db.prepare('DELETE FROM inquiries WHERE id = ?').bind(id).run();
  return json({ ok: true });
}
