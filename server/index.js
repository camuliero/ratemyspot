const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors({
  origin: 'https://ratemyspot.vercel.app'
}));
app.use(express.json());
app.get('/test', (req, res) => {
  res.json({ keyExists: !!process.env.ANTHROPIC_API_KEY, keyLength: process.env.ANTHROPIC_API_KEY?.length });
});
app.post('/api/summarize', async (req, res) => {
  const { reviews, apartmentName } = req.body;

  try {
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: `Here are Google reviews for an apartment complex called "${apartmentName}". Give me a concise Pros and Cons summary based on what residents are saying. Format it exactly like this:
            
PROS:
- [pro 1]
- [pro 2]
- [pro 3]

CONS:
- [con 1]
- [con 2]
- [con 3]

Reviews:
${reviews}`
          }
        ]
      },
      {
        headers: {
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        }
      }
    );

    res.json({ summary: response.data.content[0].text });
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to get summary' });
  }
});

app.listen(3001, () => {
  console.log('Server running on port 3001');
});