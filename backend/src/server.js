import express from 'express';
import { OpenAI } from 'openai';
import cors from 'cors';
import bodyParser from 'body-parser';

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '25mb' }));
app.use(express.json({ limit: '25mb' }));


const openai = new OpenAI({
  apiKey: 'secret',
});

app.post('/analyze-svg', async (req, res) => {
  const { base64 } = req.body;
  if (!base64) return res.status(400).json({ error: 'Missing base64' });

  const dataUri = base64;
  console.log('Received SVG data URI:', dataUri);

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: dataUri } },
            { type: 'text', text: 'What do you see in this SVG?' },
          ],
        },
      ],
    });

    res.json({ response: completion.choices[0].message.content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'OpenAI API call failed' });
  }
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));
