import express from 'express';
import { OpenAI } from 'openai';
import { client } from '../datasource.js';
import { requireAuth } from '../middleware/auth.js';

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

router.post('/check-solution-ai', requireAuth, async (req, res) => {
  const { base64, questionId } = req.body;
  if (!base64 || !questionId) {
    return res.status(400).json({ error: 'Missing latex or questionId' });
  }

  try {
    // run extractLatexFromSvg to ensure the LaTeX is valid
    const extractedLatex = await extractLatexFromSvg(base64);
    // Convert questionId to integer
    const questionIdInt = parseInt(questionId, 10);
    if (isNaN(questionIdInt)) {
      return res.status(400).json({ error: 'Invalid questionId' });
    }

    // Validate the extracted LaTeX
    if (!extractedLatex || typeof extractedLatex !== 'string') {
      return res.status(400).json({ error: 'Invalid LaTeX format' });
    }

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

    // 2) ask OpenAI to compare and give feedback
    const aiResp = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `
      You are a patient, expert mathematics tutor. For each problem:
      1. You’ll receive three strings:
        • Question  
        • Your Answer (LaTeX)  
        • Expected Solution (LaTeX)
      2. Compare “Your Answer” vs. “Expected Solution” exactly (character for character, including spaces and formatting).
      3. If they match exactly, reply with:
        ✅ Correct!
        (and nothing else)
      4. If they differ, reply in one single string beginning with:
        ❌ Incorrect:
        Then include:
        1. A brief explanation of why that is correct, referencing your mistakes.
      5. Do not output JSON or any extra fields—just that one string.

      Example:
      Your Answer: \`\\int_0^1 2x\\,dx = [x^2]_0^1 = 1\`  
      Expected Solution: \`\\int_0^1 2x\\,dx = x^2\\big|_0^1 = 1\`  
      Since they match exactly (including delimiters), you’d reply:  
      ✅ Correct!
      `.trim(),
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

router.post('/analyze-svg', requireAuth, async (req, res) => {
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
