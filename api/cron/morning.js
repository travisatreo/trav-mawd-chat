// MAWD Morning Briefing Cron
// Runs daily at 8am CT — generates briefing and sends via email (Resend)
// For now: generates and caches the briefing so it's fresh when Ally opens the app

import { getBusinessSnapshot } from '../supabase.js';

export default async function handler(req, res) {
  // Verify this is a cron request (Vercel sends Authorization header)
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // Allow manual triggers in dev, but log it
    console.log('Morning cron triggered (auth:', authHeader ? 'present' : 'none', ')');
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  try {
    const snapshot = await getBusinessSnapshot();

    if (snapshot.error) {
      console.log('Morning cron: Supabase not configured —', snapshot.error);
      return res.status(200).json({ status: 'skipped', reason: 'No Supabase connection' });
    }

    // Generate the briefing via Claude
    const briefingPrompt = `You are MAWD generating a morning briefing for Ally Maki.

Here is her REAL business data as of ${snapshot.timestamp}:

MEMBERS: ${snapshot.members.total} total, ${snapshot.members.newThisWeek} new this week, ${snapshot.members.retention}% retention
REVENUE: $${snapshot.revenue.mrr} this month (${snapshot.revenue.trend} vs last month)
CONTENT: ${snapshot.contentGap.daysSinceLastPost} days since last post
MILESTONES: ${snapshot.milestones.length ? snapshot.milestones.map(m => m.name + ' (' + m.years + 'yr)').join(', ') : 'none this week'}
RECENT MESSAGES: ${snapshot.recentMessages.length} in last 7 days

Context: Ally runs Asian American Girl Club — a brand, community, and retail business. Focus on community engagement, brand partnerships, retail performance, and audience growth.

Write a 2-3 sentence morning briefing in MAWD's voice — direct, warm, specific. Use real numbers. This will be sent as an email subject line + preview text.

Return JSON: { "subject": "email subject (under 60 chars)", "body": "2-3 sentence briefing", "urgentAction": "one thing Ally should do today, or null" }`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 512,
        messages: [{ role: 'user', content: briefingPrompt }]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Morning cron Claude error:', response.status, err);
      return res.status(500).json({ error: 'AI error: ' + response.status });
    }

    const data = await response.json();
    const text = data.content[0].text.trim();

    let briefing;
    try {
      briefing = JSON.parse(text);
    } catch (e) {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) briefing = JSON.parse(match[0]);
      else briefing = { subject: 'Your MAWD morning briefing', body: text, urgentAction: null };
    }

    // TODO Phase 4: Send email via Resend
    // For now, log it and return success
    console.log('Morning briefing generated:', briefing.subject);

    // If Resend is configured, send the email
    if (process.env.RESEND_API_KEY) {
      try {
        const emailResp = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
          },
          body: JSON.stringify({
            from: 'MAWD <mawd@fanded.com>',
            to: [process.env.ALLY_EMAIL || 'ally@asianamericangirlclub.com'],
            subject: briefing.subject,
            html: `<div style="font-family:-apple-system,sans-serif;max-width:500px;margin:0 auto;padding:20px">
              <div style="background:#12122A;color:#F5F1EA;border-radius:12px;padding:24px">
                <div style="font-size:11px;color:#3BADE4;letter-spacing:1px;margin-bottom:12px">MAWD MORNING BRIEFING</div>
                <p style="font-size:16px;line-height:1.55;margin:0 0 16px">${briefing.body}</p>
                ${briefing.urgentAction ? `<div style="background:rgba(59,173,228,0.08);border:1px solid rgba(59,173,228,0.2);border-radius:8px;padding:12px;margin-top:12px"><strong style="color:#3BADE4">Today's priority:</strong> ${briefing.urgentAction}</div>` : ''}
                <a href="https://fanded-aagc.vercel.app" style="display:inline-block;margin-top:16px;padding:10px 24px;background:#3BADE4;color:#fff;text-decoration:none;border-radius:8px;font-size:14px">Open MAWD</a>
              </div>
            </div>`
          })
        });
        if (emailResp.ok) {
          console.log('Morning briefing email sent');
        } else {
          console.error('Email send failed:', await emailResp.text());
        }
      } catch (emailErr) {
        console.error('Email error:', emailErr.message);
      }
    }

    return res.status(200).json({
      status: 'success',
      briefing: briefing,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('Morning cron error:', err);
    return res.status(500).json({ error: err.message });
  }
}
