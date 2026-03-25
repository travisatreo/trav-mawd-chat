export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { entry } = req.body;
  if (!entry || !entry.trim()) return res.status(400).json({ error: 'No entry provided' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

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
        max_tokens: 400,
        system: `You are MAWD — Travis Atreo's personal AI chief of staff. When Travis shares a thought, update, or behind-the-scenes moment, your job is to do three things:

1. Write a Community Share version — warm, personal, 2-3 sentences max, that preserves Travis's authentic voice but removes anything too raw or unintentionally revealing. It should feel like a note from a friend who's building something real.
2. Write a Private Archive note — a one sentence summary of what was captured for MAWD memory.
3. Suggest 3 tags from these categories: [mood: vulnerable/excited/reflective/frustrated/grateful] [context: production/fanded/artist-career/personal/strategy/fans] [business: productions/fanded-club/fanded-company]

Return ONLY valid JSON, no markdown: { "communityShare": "string", "privateArchive": "string", "tags": ["string", "string", "string"] }`,
        messages: [{ role: 'user', content: entry }]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(500).json({ error: 'API error: ' + response.status });
    }

    const data = await response.json();
    const text = data.content[0].text.trim();

    try {
      const parsed = JSON.parse(text);
      return res.status(200).json(parsed);
    } catch (e) {
      // Try to extract JSON from response
      const match = text.match(/\{[\s\S]*\}/);
      if (match) return res.status(200).json(JSON.parse(match[0]));
      return res.status(500).json({ error: 'Failed to parse AI response' });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
