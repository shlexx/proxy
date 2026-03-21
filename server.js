// server.js
const express = require('express');
const app = express();
app.use(express.json());

const WEBHOOK_URL = process.env.WEBHOOK_URL; // store your Discord webhook URL as an env var

app.post('/send', async (req, res) => {
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    res.sendStatus(response.status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => console.log('Proxy running'));
