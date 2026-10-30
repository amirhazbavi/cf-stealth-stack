import { connect } from 'cloudflare:sockets';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/' || url.pathname === '/health') {
      return new Response('ok', { status: 200 });
    }

    if (url.pathname === `/sub/${env.UUID}`) {
      return handleSubscription(request, env);
    }

    if (request.headers.get('Upgrade') === 'websocket') {
      return handleWebSocket(request, env);
    }

    return new Response('Not Found', { status: 404 });
  }
};

async function handleWebSocket(request, env) {
  const uuid = (env.UUID || '').toLowerCase();
  if (!uuid) return new Response('UUID not configured', { status: 500 });

  const [client, server] = Object.values(new WebSocketPair());
  server.accept();

  let remote = null;
  let writer = null;
  let headerParsed = false;

  server.addEventListener('message', async (event) => {
    try {
      const data = new Uint8Array(event.data);

      if (!headerParsed) {
        const version = data[0];
        if (version !== 0) return server.close(1002, 'bad version');

        const parsed = bytesToUuid(data.subarray(1, 17));
        if (parsed !== uuid) return server.close(1008, 'bad uuid');

        const optLen = data[17];
        const cmd = data[18 + optLen];
        if (cmd !== 1) return server.close(1003, 'tcp only');

        let offset = 19 + optLen;
        const port = (data[offset] << 8) | data[offset + 1];
        offset += 2;

        const addrType = data[offset++];
        let host = '';
        if (addrType === 1) {
          host = `${data[offset]}.${data[offset + 1]}.${data[offset + 2]}.${data[offset + 3]}`;
          offset += 4;
        } else if (addrType === 3) {
          const len = data[offset++];
          host = new TextDecoder().decode(data.subarray(offset, offset + len));
          offset += len;
        } else if (addrType === 4) {
          const parts = [];
          for (let i = 0; i < 16; i += 2) {
            parts.push(((data[offset + i] << 8) | data[offset + i + 1]).toString(16));
          }
          host = parts.join(':');
          offset += 16;
        } else {
          return server.close(1002, 'bad addr');
        }

        server.send(new Uint8Array([version, 0]));

        remote = connect({ hostname: host, port });
        writer = remote.writable.getWriter();

        (async () => {
          try {
            const reader = remote.readable.getReader();
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              server.send(value);
            }
            server.close();
          } catch (e) {
            try { server.close(1011, String(e)); } catch {}
          }
        })();

        headerParsed = true;

        if (offset < data.length) {
          await writer.write(data.subarray(offset));
        }
        return;
      }

      if (writer) await writer.write(data);
    } catch (e) {
      try { server.close(1011, 'handler: ' + e.message); } catch {}
    }
  });

  server.addEventListener('close', () => {
    try { remote?.close(); } catch {}
  });

  return new Response(null, { status: 101, webSocket: client });
}

async function handleSubscription(request, env) {
  const host = new URL(request.url).hostname;
  const region = (env.REGION || 'JP').toUpperCase();
  const tag = region === 'RU' ? 'RU-Moscow' : 'JP-Tokyo';
  const vlessUrl =
    `vless://${env.UUID}@${host}:443` +
    `?encryption=none&security=tls&sni=${host}&fp=chrome` +
    `&type=ws&host=${host}&path=%2F%3Fed%3D2048` +
    `#${encodeURIComponent('cf-' + tag)}`;

  return new Response(vlessUrl + '\n', {
    headers: { 'content-type': 'text/plain; charset=utf-8' }
  });
}

function bytesToUuid(b) {
  const hex = Array.from(b).map(x => x.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}
