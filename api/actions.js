// MAWD Action Executor
// Handles approve/dismiss for briefing actions — creates real posts, replies, etc.

import { supabaseQuery, CLUB_ID } from './supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { actionId, decision, actionType, draft, title, description, to, subject, body, replyTo } = req.body;
  if (!actionId) return res.status(400).json({ error: 'No actionId provided' });

  try {
    if (decision === 'dismiss') {
      return res.status(200).json({ status: 'dismissed', actionId });
    }

    if (decision !== 'approve') {
      return res.status(400).json({ error: 'Invalid decision' });
    }

    // Route by action type
    switch (actionType) {
      case 'content': {
        // Create a post in the Fanded club
        if (!draft || !CLUB_ID) {
          return res.status(200).json({ status: 'approved', actionId, result: 'No draft or club ID. Action logged.' });
        }

        const post = await supabaseQuery('fanded_posts', {
          method: 'POST',
          body: {
            club_id: CLUB_ID,
            title: title || '',
            body: draft,
            access_level: 'ALL_FREE_AND_PAID',
            attachment_type: 'NONE',
            is_draft: false,
            is_hidden: false,
            is_pinned: false,
            is_deleted: false,
            enable_comments: true,
            enable_likes: true,
            post_paywall_enabled: false,
            post_paywall_bypass_code_enabled: false,
            likes: 0,
            comments: 0
          }
        });

        return res.status(200).json({
          status: 'executed',
          actionId,
          result: 'Post published to your Fanded club',
          postId: post?.[0]?.id
        });
      }

      case 'reply': {
        // Reply to a fan message (create a post reply)
        // For now, create a new post addressing the fan since we may not have the original post_id
        if (!draft || !CLUB_ID) {
          return res.status(200).json({ status: 'approved', actionId, result: 'No draft or club ID. Action logged.' });
        }

        const replyPost = await supabaseQuery('fanded_posts', {
          method: 'POST',
          body: {
            club_id: CLUB_ID,
            title: title || '',
            body: draft,
            access_level: 'ALL_FREE_AND_PAID',
            attachment_type: 'NONE',
            is_draft: false,
            is_hidden: false,
            is_pinned: false,
            is_deleted: false,
            enable_comments: true,
            enable_likes: true,
            post_paywall_enabled: false,
            post_paywall_bypass_code_enabled: false,
            likes: 0,
            comments: 0
          }
        });

        return res.status(200).json({
          status: 'executed',
          actionId,
          result: 'Reply posted to your Fanded club',
          postId: replyPost?.[0]?.id
        });
      }

      case 'celebrate': {
        // Celebration post (milestone, anniversary)
        if (!draft || !CLUB_ID) {
          return res.status(200).json({ status: 'approved', actionId, result: 'No draft or club ID. Action logged.' });
        }

        const celebPost = await supabaseQuery('fanded_posts', {
          method: 'POST',
          body: {
            club_id: CLUB_ID,
            title: title || '',
            body: draft,
            access_level: 'ALL_FREE_AND_PAID',
            attachment_type: 'NONE',
            is_draft: false,
            is_hidden: false,
            is_pinned: false,
            is_deleted: false,
            enable_comments: true,
            enable_likes: true,
            post_paywall_enabled: false,
            post_paywall_bypass_code_enabled: false,
            likes: 0,
            comments: 0
          }
        });

        return res.status(200).json({
          status: 'executed',
          actionId,
          result: 'Celebration post published',
          postId: celebPost?.[0]?.id
        });
      }

      case 'email': {
        // Send email via Resend
        if (!process.env.RESEND_API_KEY) {
          return res.status(200).json({ status: 'error', actionId, message: 'Email not configured. Set RESEND_API_KEY in Vercel env vars.' });
        }
        if (!to || !subject || !body) {
          return res.status(400).json({ status: 'error', actionId, message: 'Missing to, subject, or body.' });
        }

        const emailResp = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
          },
          body: JSON.stringify({
            from: 'MAWD <mawd@asianamericangirlclub.com>',
            to: [to],
            reply_to: replyTo || process.env.ALLY_EMAIL || 'ally@asianamericangirlclub.com',
            subject: subject,
            html: `<div style="font-family:-apple-system,sans-serif;font-size:15px;line-height:1.6;color:#222;max-width:600px">${body.replace(/\n/g, '<br>')}</div>`
          })
        });

        if (!emailResp.ok) {
          const errText = await emailResp.text();
          console.error('Resend error:', errText);
          return res.status(200).json({ status: 'error', actionId, message: 'Email send failed: ' + errText });
        }

        const emailResult = await emailResp.json();
        return res.status(200).json({
          status: 'sent',
          actionId,
          to,
          subject,
          resendId: emailResult.id,
          result: 'Email sent to ' + to
        });
      }

      case 'nudge':
      case 'setup':
      default: {
        // Advisory actions (rate sheet, strategy) just get acknowledged
        return res.status(200).json({
          status: 'acknowledged',
          actionId,
          result: 'Noted. No external action needed.'
        });
      }
    }
  } catch (err) {
    console.error('Action error:', err);
    return res.status(500).json({ error: err.message });
  }
}
