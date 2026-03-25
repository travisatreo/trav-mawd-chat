import { getBusinessSnapshot } from './supabase.js';
import { MAWD_SYSTEM_PROMPT } from './brain.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { message, history, sectionContext } = req.body;
  if (!message || !message.trim()) return res.status(400).json({ error: 'No message provided' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  // Build messages array from conversation history
  const messages = [];
  if (history && Array.isArray(history)) {
    for (const msg of history) {
      messages.push({ role: msg.role, content: msg.content });
    }
  }
  messages.push({ role: 'user', content: message });

  // Fetch live Fanded/Supabase data (if configured) to supplement the brain
  let liveDataBlock = '';
  try {
    const snapshot = await getBusinessSnapshot();
    if (!snapshot.error) {
      liveDataBlock = `

LIVE FANDED PLATFORM DATA (as of ${snapshot.timestamp}):
- Fanded Members: ${snapshot.members.total} (${snapshot.members.newThisWeek} new this week, ${snapshot.members.retention}% retention)
- Fanded MRR: $${snapshot.revenue.mrr}/mo this month, $${snapshot.revenue.lastMonth}/mo last month (${snapshot.revenue.trend})
- Content gap: ${snapshot.contentGap.daysSinceLastPost} days since last post
- Milestones: ${snapshot.milestones.length ? snapshot.milestones.map(m => `${m.name} (${m.years}yr anniversary)`).join(', ') : 'none this week'}
- Recent fan messages: ${snapshot.recentMessages.length} in the last 7 days
${snapshot.recentMessages.slice(0, 3).map(m => `  • ${m.name}: "${m.body?.substring(0, 100)}"`).join('\n')}
- Recent posts: ${snapshot.recentPosts.length ? snapshot.recentPosts.map(p => `"${(p.title || p.body || '').substring(0, 60)}" (${p.likes} likes)`).join(', ') : 'none recently'}

This is LIVE data from the Fanded platform database. Use it alongside the brain data.`;
    }
  } catch (e) {
    console.log('Supabase not available for chat context:', e.message);
  }

  const sectionHint = sectionContext ? '\n\n' + sectionContext : '';

  // Email draft format instruction — enables structured email cards in the UI
  const emailInstruction = `

EMAIL DRAFTING RULE (CRITICAL):
When Ally asks you to send an email, write a reminder, draft a message to someone, or follow up with a client — format your response EXACTLY like this:

EMAIL DRAFT:
TO: [recipient email address]
SUBJECT: [subject line]
---
[email body text — write AS Ally, professional but warm, first name basis, short paragraphs, no corporate language, sign off as "Ally" or "A"]

The frontend will parse this format and show a Send Email button. If you don't know the recipient's email, use a placeholder like client@email.com and note that Ally should confirm the address.
Always include the EMAIL DRAFT: header, TO:, SUBJECT:, and --- separator. The body comes after ---.`;

  const systemPrompt = MAWD_SYSTEM_PROMPT + liveDataBlock + emailInstruction + sectionHint;

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
        max_tokens: 600,
        system: systemPrompt,
        messages: messages
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Anthropic API error:', response.status, err);
      return res.status(500).json({ error: 'API error: ' + response.status });
    }

    const data = await response.json();
    const text = data.content[0].text;

    return res.status(200).json({ reply: text });
  } catch (err) {
    console.error('Chat error:', err);
    return res.status(500).json({ error: err.message });
  }
}
