const express = require('express');
const app = express();
app.use(express.json());

const WEBHOOK_URL = process.env.WEBHOOK_URL;

app.get('/', (req, res) => {
  res.send('OK');
});

app.post('/send', async (req, res) => {
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    console.log("Discord response status:", response.status);
    res.sendStatus(response.status);
  } catch (err) {
    console.error("Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => console.log('Proxy running'));
