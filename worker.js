async function verifyDiscordRequest(request, publicKey) {
  const signature = request.headers.get('x-signature-ed25519');
  const timestamp = request.headers.get('x-signature-timestamp');
  const body = await request.text();

  const key = await crypto.subtle.importKey(
    'raw',
    hexToBuffer(publicKey),
    { name: 'NODE-ED25519', namedCurve: 'NODE-ED25519' },
    false,
    ['verify']
  );

  const isValid = await crypto.subtle.verify(
    'NODE-ED25519',
    key,
    hexToBuffer(signature),
    new TextEncoder().encode(timestamp + body)
  );

  return { isValid, body };
}

function hexToBuffer(hex) {
  return new Uint8Array(hex.match(/.{1,2}/g).map(b => parseInt(b, 16)));
}

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

      if (url.pathname === '/register') {
        const response = await fetch(`https://discord.com/api/v10/applications/${env.APPLICATION_ID}/guilds/${env.SERVER_ID}/commands`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bot ${env.BOT_TOKEN}`
          },
          body: JSON.stringify({
            name: 'send',
            description: 'Send a message to Roblox',
            options: [{
              name: 'message',
              description: 'The message to send',
              type: 3,
              required: true
            }]
          })
        });
        const data = await response.json();
        return new Response(JSON.stringify(data), { status: 200 });
      }

      if (url.pathname === '/poll') {
        const message = await env.MESSAGES.get('latest');
        if (message) {
          await env.MESSAGES.delete('latest');
          return new Response(message);
        }
        return new Response('');
      }

      return new Response('OK');
    }

    if (request.method === 'POST' && url.pathname === '/interaction') {
      const { isValid, body } = await verifyDiscordRequest(request, env.PUBLIC_KEY);
      if (!isValid) return new Response('Unauthorized', { status: 401 });

      const interaction = JSON.parse(body);

      if (interaction.type === 1) {
        return new Response(JSON.stringify({ type: 1 }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (interaction.type === 2) {
        const message = interaction.data.options[0].value;
        const username = interaction.member?.user?.username || interaction.user?.username;

        await env.MESSAGES.put('latest', JSON.stringify({ username, message }));

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
