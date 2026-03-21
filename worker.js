export default {
  async fetch(request, env) {
    if (request.method === 'GET') {
      return new Response('OK');
    }

    if (request.method === 'POST' && new URL(request.url).pathname === '/send') {
      try {
        const body = await request.json();

        const response = await fetch(env.WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });

        return new Response(null, { status: response.status });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
      }
    }

    return new Response('Not Found', { status: 404 });
  }
};
