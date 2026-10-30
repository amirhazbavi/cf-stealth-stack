export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method !== 'GET' && request.method !== 'POST') {
      return new Response('method', { status: 405 });
    }

    let body;
    if (request.method === 'POST') {
      body = await request.arrayBuffer();
    } else {
      const dns = url.searchParams.get('dns');
      if (!dns) return new Response('missing dns', { status: 400 });
      body = b64urlToArrayBuffer(dns);
    }

    const upstreams = (env.UPSTREAMS ||
      'https://cloudflare-dns.com/dns-query,https://dns.google/dns-query'
    ).split(',');

    for (const u of upstreams) {
      try {
        const r = await fetch(u, {
          method: 'POST',
          headers: {
            'content-type': 'application/dns-message',
            'accept': 'application/dns-message'
          },
          body
        });
        if (r.ok) {
          return new Response(await r.arrayBuffer(), {
            headers: {
              'content-type': 'application/dns-message',
              'cache-control': 'max-age=60',
              'access-control-allow-origin': '*'
            }
          });
        }
      } catch {}
    }
    return new Response('upstream-fail', { status: 502 });
  }
};

function b64urlToArrayBuffer(s) {
  const pad = 4 - (s.length % 4);
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') +
    (pad < 4 ? '='.repeat(pad) : '');
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}
