import express from 'express';
import { OpenAI } from 'openai';
import { client } from '../datasource.js';

const router = express.Router();

const openai = new OpenAI({
  apiKey: process.env.OPEN_AI_KEY,
});

async function extractLatexFromSvg(base64) {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: [
          'You are an OCR and LaTeX assistant.',
          'Your only job is to extract exactly the characters the user has drawn in the provided image,',
          'then convert that into valid LaTeX syntax.',
          'Output *only* the LaTeX—no SVG, no commentary, no extra formatting.'
        ].join(' ')
      },
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: base64 } },
          {
            type: 'text',
            text: [
              'Please return only the LaTeX you see in this image.',
              'For example, if the user has drawn an integral from –∞ to ∞ of x² dx = 1, output exactly:',
              '',
              '\\int_{-\\infty}^{\\\\infty} x^2 \\,dx = 1',
              '',
              'No code fences. No extra lines. No SVG tags. No explanation.'
            ].join('\n')
          }
        ]
      }
    ]
  });

  return completion.choices[0].message.content.trim();
}

router.post('/check-solution-ai', async (req, res) => {
  const { base64, questionId } = req.body;
  if (!base64 || !questionId) {
    return res.status(400).json({ error: 'Missing latex or questionId' });
  }

  try {
    // run extractLatexFromSvg to ensure the LaTeX is valid
    const extractedLatex = await extractLatexFromSvg(base64);
    console.log('Extracted LaTeX:', extractedLatex);
    // Convert questionId to integer
    const questionIdInt = parseInt(questionId, 10);
    if (isNaN(questionIdInt)) {
      return res.status(400).json({ error: 'Invalid questionId' });
    }

    // Validate the extracted LaTeX
    if (!extractedLatex || typeof extractedLatex !== 'string') {
      return res.status(400).json({ error: 'Invalid LaTeX format' });
    }

    // Log the received data
    console.log('Received data:', { base64: extractedLatex, questionId: questionIdInt });

    // 1) load expected solution from DB
    const { rows } = await client.query(
      'SELECT questions, solutions FROM Questions WHERE id = $1',
      [questionId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Question not found' });
    }
    const questionText = rows[0].questions;
    const expected = rows[0].solutions.toString();

    console.log('Fetched expected solution from DB:', expected);

    // 2) ask OpenAI to compare and give feedback
    const aiResp = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: [
        'You are a patient, expert math tutor.',
        'You will compare your LaTeX answer to the true solution for the given question.',
        'If the two match exactly, reply with "✅ Correct!" and nothing else.',
        'Otherwise, reply with "❌ Incorrect:" followed by:',
        '- A numbered, step-by-step check of your work, calling out each mistake in order.',
        '- The correct final answer.',
        '- A clear explanation of *why* that answer is correct (e.g. “to get 0.05 you must divide…”).',
        'Keep everything in one single string (no JSON, no extra fields).'
          ].join(' ')
        },
        {
          role: 'user',
          content: [
            `Question: ${questionText}`,
            `Your answer: ${extractedLatex}`,
            `Expected solution: ${expected}`
          ].join('\n')
        }
      ]
    });

    const feedback = aiResp.choices[0].message.content.trim();

    // 3) return the feedback
    return res.json({ extractedLatex, expected, feedback });
  } catch (err) {
    console.error('check-solution-ai error:', err);
    return res.status(500).json({ error: 'Evaluation failed' });
  }
});

router.post('/analyze-svg', async (req, res) => {
  const { base64 } = req.body;
  if (!base64) return res.status(400).json({ error: 'Missing base64' });

  console.log('Received SVG data URI:', base64);

  try {
    const latex = await extractLatexFromSvg(base64);

    res.json({ response: latex });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'OpenAI API call failed' });
  }
});

export default router;
