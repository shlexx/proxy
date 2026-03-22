export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    async function redisSet(value) {
      await fetch(`${env.UPSTASH_URL}/set/latest/${encodeURIComponent(value)}`, {
        headers: { Authorization: `Bearer ${env.UPSTASH_TOKEN}` }
      });
    }

    async function redisGet() {
      const res = await fetch(`${env.UPSTASH_URL}/getdel/latest`, {
        headers: { Authorization: `Bearer ${env.UPSTASH_TOKEN}` }
      });
      const data = await res.json();
      return data.result;
    }

    async function verifyRequest(req) {
      const signature = req.headers.get('x-signature-ed25519');
      const timestamp = req.headers.get('x-signature-timestamp');
      const body = await req.text();

      if (!signature || !timestamp) return { valid: false, body };

      const key = await crypto.subtle.importKey(
        'raw',
        hexToBuffer(env.PUBLIC_KEY),
        { name: 'NODE-ED25519', namedCurve: 'NODE-ED25519' },
        false,
        ['verify']
      );

      const valid = await crypto.subtle.verify(
        'NODE-ED25519',
        key,
        hexToBuffer(signature),
        new TextEncoder().encode(timestamp + body)
      );

      return { valid, body };
    }

    function hexToBuffer(hex) {
      return new Uint8Array(hex.match(/.{1,2}/g).map(b => parseInt(b, 16)));
    }

    if (request.method === 'GET') {
      if (url.pathname === '/avatar') {
        const userId = url.searchParams.get('userId');
        const response = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png`);
        const data = await response.json();
        const imageUrl = data?.data?.[0]?.imageUrl || '';
        return new Response(imageUrl);
      }

      if (url.pathname === '/poll') {
        const message = await redisGet();
        if (message) return new Response(message);
        return new Response('');
      }

      return new Response('OK');
    }

    if (request.method === 'POST' && url.pathname === '/interaction') {
      const { valid, body } = await verifyRequest(request);
      if (!valid) return new Response('Unauthorized', { status: 401 });

      const interaction = JSON.parse(body);

      if (interaction.type === 1) {
        return new Response(JSON.stringify({ type: 1 }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (interaction.type === 2) {
        const message = interaction.data.options[0].value;
        const username = interaction.member?.user?.username || interaction.user?.username;

        ctx.waitUntil(redisSet(JSON.stringify({ username, message })));

        return new Response(JSON.stringify({
          type: 4,
          data: { content: `✅ Sent to Roblox: ${message}` }
        }), { headers: { 'Content-Type': 'application/json' } });
      }
    }

    if (request.method === 'POST' && url.pathname === '/send') {
      try {
        const body = await request.json();
        const response = await fetch(env.WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        return new Response(null, { status: response.status });
      } catch (err) {
        console.log("Error:", err.message);
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
      }
    }

    return new Response('Not Found', { status: 404 });
  }
};
