// Blog Essay Generator — powered by Fanded Philosophy Library
// Generates essays from the ten pillars, rotating through formats and topics

import { PHILOSOPHY_PILLARS, BLOG_VOICE, ESSAY_FORMATS } from './philosophy.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  // Accept optional overrides
  const { pillarId, format, topic } = req.body || {};

  // Pick a pillar (random if not specified)
  const pillar = pillarId
    ? PHILOSOPHY_PILLARS.find(p => p.id === pillarId)
    : PHILOSOPHY_PILLARS[Math.floor(Math.random() * PHILOSOPHY_PILLARS.length)];

  // Pick a format (random if not specified)
  const essayFormat = format || ESSAY_FORMATS[Math.floor(Math.random() * ESSAY_FORMATS.length)];

  // Build the secondary pillar for cross-referencing
  const otherPillars = PHILOSOPHY_PILLARS.filter(p => p.id !== pillar.id);
  const secondaryPillar = otherPillars[Math.floor(Math.random() * otherPillars.length)];

  const prompt = `${BLOG_VOICE}

PRIMARY PILLAR FOR THIS ESSAY:
"${pillar.name}" — ${pillar.core}

SECONDARY PILLAR (reference if it naturally connects):
"${secondaryPillar.name}" — ${secondaryPillar.core}

ALL TEN PILLARS (for context):
${PHILOSOPHY_PILLARS.map(p => `${p.id}. ${p.name}: ${p.core}`).join('\n\n')}

ESSAY FORMAT: ${essayFormat}

${topic ? `SPECIFIC ANGLE OR TOPIC: ${topic}` : 'Choose a specific, timely angle that makes this pillar feel urgent and real. Not abstract philosophy — grounded in something an artist would recognize from their own experience.'}

Return ONLY valid JSON:
{
  "title": "Short, evocative essay title (under 10 words)",
  "subtitle": "One sentence that hooks the reader (under 30 words)",
  "body": "The full essay, 800-1500 words. Plain text with paragraph breaks (use \\n\\n between paragraphs). No markdown headers. No bullet points. No numbered lists.",
  "pillar": "${pillar.name}",
  "pillarId": ${pillar.id},
  "format": "${essayFormat.split(':')[0]}",
  "slug": "url-friendly-slug-from-title",
  "pullQuote": "One powerful sentence from the essay that works as a standalone pull quote"
}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Blog generation error:', response.status, err);
      return res.status(500).json({ error: 'AI error: ' + response.status });
    }

    const data = await response.json();
    const text = data.content[0].text.trim();

    let essay;
    try {
      essay = JSON.parse(text);
    } catch (e) {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) essay = JSON.parse(match[0]);
      else return res.status(500).json({ error: 'Failed to parse essay' });
    }

    essay.generatedAt = new Date().toISOString();
    essay.status = 'draft';

    return res.status(200).json(essay);
  } catch (err) {
    console.error('Blog generation error:', err);
    return res.status(500).json({ error: err.message });
  }
}
