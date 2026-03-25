// MAWD Evening Nudge Cron
// Runs daily at 6pm CT — checks if Ally posted today, nudges if not
// Gentle, not annoying — only nudges if content gap > 3 days

import { getContentGap, getRecentMessages } from '../supabase.js';

export default async function handler(req, res) {
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.log('Evening nudge triggered (auth:', authHeader ? 'present' : 'none', ')');
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  try {
    const [contentGap, recentMessages] = await Promise.all([
      getContentGap(),
      getRecentMessages(null, 3) // last 3 days of messages
    ]);

    // Only nudge if content gap > 3 days
    if (contentGap.daysSinceLastPost <= 3) {
      return res.status(200).json({
        status: 'skipped',
        reason: 'Posted recently (' + contentGap.daysSinceLastPost + ' days ago)',
        daysSincePost: contentGap.daysSinceLastPost
      });
    }

    // Generate a nudge using Claude
    const nudgePrompt = `You are MAWD, Ally Maki's AI chief of staff. It's evening and Ally hasn't shared with her community in ${contentGap.daysSinceLastPost} days.

Recent community messages (last 3 days): ${recentMessages.length ? recentMessages.slice(0, 3).map(m => '"' + (m.body || '').substring(0, 80) + '"').join(', ') : 'none'}

Write a short, warm nudge (1-2 sentences max). Not guilt-trippy. Think: a friend who knows her community is waiting. If there are recent community messages, reference one as inspiration.

Return JSON: { "nudge": "the nudge text", "suggestion": "optional quick content idea based on community messages, or null" }`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 256,
        messages: [{ role: 'user', content: nudgePrompt }]
      })
    });

    if (!response.ok) {
      return res.status(500).json({ error: 'AI error: ' + response.status });
    }

    const data = await response.json();
    const text = data.content[0].text.trim();

    let nudge;
    try {
      nudge = JSON.parse(text);
    } catch (e) {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) nudge = JSON.parse(match[0]);
      else nudge = { nudge: text, suggestion: null };
    }

    // Send email nudge if Resend is configured
    if (process.env.RESEND_API_KEY) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
          },
          body: JSON.stringify({
            from: 'MAWD <mawd@fanded.com>',
            to: [process.env.ALLY_EMAIL || 'ally@asianamericangirlclub.com'],
            subject: 'Your community is waiting',
            html: `<div style="font-family:-apple-system,sans-serif;max-width:500px;margin:0 auto;padding:20px">
              <div style="background:#12122A;color:#F5F1EA;border-radius:12px;padding:24px">
                <div style="font-size:11px;color:#C9A84C;letter-spacing:1px;margin-bottom:12px">MAWD EVENING NUDGE</div>
                <p style="font-size:16px;line-height:1.55;margin:0 0 12px">${nudge.nudge}</p>
                ${nudge.suggestion ? `<p style="font-size:14px;color:rgba(245,241,234,0.6);margin:0 0 16px"><em>Idea: ${nudge.suggestion}</em></p>` : ''}
                <a href="https://fanded-aagc.vercel.app" style="display:inline-block;padding:10px 24px;background:#3BADE4;color:#fff;text-decoration:none;border-radius:8px;font-size:14px">Share with your community</a>
              </div>
            </div>`
          })
        });
      } catch (emailErr) {
        console.error('Nudge email error:', emailErr.message);
      }
    }

    return res.status(200).json({
      status: 'nudged',
      daysSincePost: contentGap.daysSinceLastPost,
      nudge: nudge,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('Evening nudge error:', err);
    return res.status(500).json({ error: err.message });
  }
}
