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
        if (message) {
          return new Response(message);
        }
        return new Response('');
      }

      return new Response('OK');
    }

    if (request.method === 'POST' && url.pathname === '/interaction') {
      const body = await request.json();

      if (body.type === 1) {
        return new Response(JSON.stringify({ type: 1 }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (body.type === 2) {
        const message = body.data.options[0].value;
        const username = body.member?.user?.username || body.user?.username;

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
