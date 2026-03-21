const express = require('express');
const app = express();
app.use(express.json());

const WEBHOOK_URL = process.env.WEBHOOK_URL;
const queue = [];
let processing = false;

async function processQueue() {
    if (processing || queue.length === 0) return;
    processing = true;

    while (queue.length > 0) {
        const { body, res } = queue.shift();

        try {
            const response = await fetch(WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (response.status === 429) {
                const data = await response.json();
                const retryAfter = (data.retry_after || 1) * 1000;
                console.log(`Rate limited, waiting ${retryAfter}ms`);
                await new Promise(r => setTimeout(r, retryAfter));
                // re-queue the message
                queue.unshift({ body, res });
                continue;
            }

            res.sendStatus(response.status);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }

        // small delay between messages to avoid hitting the limit
        await new Promise(r => setTimeout(r, 500));
    }

    processing = false;
}

app.get('/', (req, res) => res.send('OK'));

app.post('/send', async (req, res) => {
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    res.sendStatus(response.status);
  } catch (err) {
    console.error("Error:", err.message); // add this
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => console.log('Proxy running'));
