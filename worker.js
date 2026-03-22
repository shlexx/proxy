export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'GET') {
      if (url.pathname === '/avatar') {
        const userId = url.searchParams.get('userId');
        const response = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png`);
        const data = await response.json();
        const imageUrl = data?.data?.[0]?.imageUrl || '';
        return new Response(imageUrl);
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
