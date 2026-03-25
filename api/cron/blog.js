// Blog Generator Cron — handles both morning (7am PST) and evening (5pm PST)
// Pass ?edition=evening for the evening run, defaults to morning
// Generates a new essay from the Fanded Philosophy Library

import { PHILOSOPHY_PILLARS, BLOG_VOICE, ESSAY_FORMATS } from '../philosophy.js';

export default async function handler(req, res) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  const edition = req.query?.edition || 'morning';
  const isEvening = edition === 'evening';

  // Rotate pillar by day of year, offset by 5 for evening to avoid same pillar
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 864e5);
  const pillarOffset = isEvening ? 5 : 0;
  const formatOffset = isEvening ? 3 : 0;

  const pillarIndex = (dayOfYear + pillarOffset) % PHILOSOPHY_PILLARS.length;
  const formatIndex = (dayOfYear + formatOffset) % ESSAY_FORMATS.length;

  const pillar = PHILOSOPHY_PILLARS[pillarIndex];
  const essayFormat = ESSAY_FORMATS[formatIndex];
  const secondaryOffset = isEvening ? 4 : 3;
  const secondaryPillar = PHILOSOPHY_PILLARS[(pillarIndex + secondaryOffset) % PHILOSOPHY_PILLARS.length];

  const eveningNote = isEvening
    ? `\n\nIMPORTANT: This is the EVENING edition. Choose a different angle than what a morning essay might cover. Think end-of-day reflection, a story that lands differently at night, or a forward-looking piece about tomorrow. The reader is winding down but still thinking.`
    : '';

  const prompt = `${BLOG_VOICE}

PRIMARY PILLAR FOR THIS ESSAY:
"${pillar.name}" — ${pillar.core}

SECONDARY PILLAR (reference if it naturally connects):
"${secondaryPillar.name}" — ${secondaryPillar.core}

ALL TEN PILLARS (for context):
${PHILOSOPHY_PILLARS.map(p => `${p.id}. ${p.name}: ${p.core}`).join('\n\n')}

ESSAY FORMAT: ${essayFormat}

TODAY'S DATE: ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
${eveningNote}
Choose a specific, timely angle that makes this pillar feel urgent and real. Not abstract philosophy — grounded in something an artist would recognize from their own experience.

Return ONLY valid JSON:
{
  "title": "Short, evocative essay title (under 10 words)",
  "subtitle": "One sentence that hooks the reader (under 30 words)",
  "body": "The full essay, 800-1500 words. Plain text with paragraph breaks (use \\n\\n between paragraphs). No markdown headers. No bullet points.",
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
      console.error(`Blog ${edition} cron error:`, response.status, err);
      return res.status(500).json({ error: 'AI error' });
    }

    const data = await response.json();
    const text = data.content[0].text.trim();

    let essay;
    try {
      essay = JSON.parse(text);
    } catch (e) {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) essay = JSON.parse(match[0]);
      else return res.status(500).json({ error: 'Parse failed' });
    }

    essay.generatedAt = new Date().toISOString();
    essay.status = 'draft';
    essay.edition = edition;

    console.log(`Blog ${edition} draft generated:`, essay.title, '| Pillar:', essay.pillar);

    return res.status(200).json({
      message: `${edition} draft generated: "${essay.title}"`,
      essay
    });
  } catch (err) {
    console.error(`Blog ${edition} cron error:`, err);
    return res.status(500).json({ error: err.message });
  }
}
