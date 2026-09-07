/** Public image delivery for CMS-uploaded media: GET /media/<id>  (cached at the edge, immutable). */
export async function onRequestGet({ params, env, request }) {
  if (!env.DB) return new Response('Not configured', { status: 503 });
  const id = String(params.id || '').split('.')[0];
  if (!/^[a-z0-9]{6,40}$/i.test(id)) return new Response('Not found', { status: 404 });

  const cache = caches.default;
  const cacheKey = new Request(new URL(request.url).toString(), request);
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  const row = await env.DB.prepare('SELECT mime, data, bytes FROM media WHERE id = ?').bind(id).first();
  if (!row) return new Response('Not found', { status: 404 });

  const bin = atob(row.data);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);

  const res = new Response(buf, {
    headers: {
      'Content-Type': row.mime,
      'Content-Length': String(buf.length),
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      ETag: `"${id}"`,
    },
  });
  await cache.put(cacheKey, res.clone());
  return res;
}
