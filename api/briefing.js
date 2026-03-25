// MAWD Daily Briefing Generator — AAGC / Ally Maki Edition
// Uses brain.js (real CSV data) + optional Supabase for live Fanded data

import { getBusinessSnapshot } from './supabase.js';
import { AAGC_BRAIN } from './brain.js';

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  try {
    // Try to fetch live Fanded platform data (optional)
    let fandedData = '';
    let hasSupabase = false;
    try {
      const snapshot = await getBusinessSnapshot();
      if (!snapshot.error) {
        hasSupabase = true;
        fandedData = `
LIVE FANDED PLATFORM DATA:
- Members: ${snapshot.members.total} (${snapshot.members.newThisWeek} new this week, ${snapshot.members.retention}% retention)
- Fanded MRR: $${snapshot.revenue.mrr}/mo
- Content gap: ${snapshot.contentGap.daysSinceLastPost} days since last post
- Milestones: ${snapshot.milestones.length ? snapshot.milestones.map(m => `${m.name} (${m.years}yr)`).join(', ') : 'none'}
- Recent messages: ${snapshot.recentMessages.length} in last 7 days
${snapshot.recentMessages.slice(0, 5).map(m => `  • ${m.name}: "${m.body}"`).join('\n')}`;
      }
    } catch (e) {
      console.log('Supabase not available for briefing:', e.message);
    }

    // Build the briefing prompt — community-first, brand-focused
    const briefingPrompt = `You are MAWD generating Ally Maki's briefing for ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}.

${AAGC_BRAIN}

${fandedData}

Generate Ally's morning briefing. This is the first thing she sees when she opens the app. It should make her feel grounded, reminded of who she is and what AAGC means, and ready to move.

INFORMATION PARITY is MAWD's foundational principle. The brand/creator economy runs on information asymmetry. Retailers, platforms, agencies, and reps have always known more than the founder. MAWD exists to end that. Every briefing should make Ally the most informed person in her own brand.

The briefing has 5 parts:

1. OPEN LOOPS (Information Parity check, always first)
Surface anything across all five agent domains where something was in motion, promised, or flagged and has not been resolved within 72 hours. Check each domain:
- DOLLAR: retail partnership status (Target relationship, wholesale accounts), Shopify revenue trends, inventory decisions, Fanded membership conversion rates
- SCOUT: brand partnerships pitched or discussed that went silent, media opportunities unanswered, collaboration proposals pending
- COMPASS: strategic goals named but no action taken (AAGC Originals development, media company buildout, fundraising, new retail pitches)
- PULSE: community signals rising with no action (Instagram engagement shifts, customer messages unreplied, Fanded member activity, product review trends)
- HYPE: content planned but not published, community posts promised but not sent, product launch moments missed, AAGC Originals content deadlines
If there are no open loops, say so. That's a win.

2. IDENTITY REMINDER (the "remember who you are" moment)
Remind Ally who she is and what AAGC represents. Pull specific facts: $1.4M Shopify revenue from 22,913 customers, 116K Instagram followers, Target partnership, AAGC Originals media launch, Harper's Bazaar and Forbes press features, a community born from watching Crazy Rich Asians on a living room floor. Rotate which facts you highlight so it feels fresh each day.

3. STRATEGY CHECK (where we are and where we're going)
Briefly review the current strategy: AAGC is scaling from DTC brand to media company through AAGC Originals. The community IS the moat. Fanded membership converts customers into recurring community members. Target partnership is the retail proof point despite controversy. Connect today's actions to the bigger goals.

4. TODAY'S MOVES (what to do right now)
Specific, actionable things Ally can do today. Community engagement, product and content decisions, retail and brand partnership follow-ups, Fanded membership growth moves.

5. CONVERSATION STARTERS (ideas for community engagement)
3 specific prompts for community posts, Instagram stories, or podcast topics.

Return ONLY valid JSON:
{
  "openLoops": [
    {
      "agent": "DOLLAR|SCOUT|COMPASS|PULSE|HYPE",
      "loop": "Short description of what's unresolved",
      "daysSilent": 3,
      "suggestedAction": "What to do about it"
    }
  ],
  "summary": "3-4 sentences. First sentence: identity reminder (who Ally is, a specific AAGC accomplishment). Second sentence: where the strategy stands right now. Third sentence: the most important move today. Warm, direct, like a friend and strategist rolled into one.",
  "starters": [
    "Conversation starter 1: specific, based on real community data or recent activity",
    "Conversation starter 2: warm, personal, something the AAGC community would love to hear",
    "Conversation starter 3: creative prompt that feels natural, not corporate"
  ],
  "actions": [
    {
      "id": "act_1",
      "type": "content|reply|celebrate|income|nudge|setup",
      "priority": "high|medium|low",
      "title": "Short action title",
      "description": "Why this matters and how it connects to the bigger strategy.",
      "draft": "Draft message if this is a community post, null otherwise",
      "status": "pending"
    }
  ],
  "insights": ["1-2 genuinely useful, hopeful observations that connect to goals"]
}

CRITICAL SEED INSIGHT — MAWD must lead with this in the first briefing:
Ally has 8,271 customers with phone numbers on file and ZERO SMS subscribers. Not low — zero. SMS has never been activated. This is the single biggest untapped revenue channel in the business. Meanwhile, 78.1% of buyers (13,454 people) ordered exactly once and never came back. An SMS re-engagement campaign targeting one-time buyers with phone numbers could recover six figures in dormant revenue. This insight should be woven into the briefing naturally — it proves MAWD sees things the team hasn't seen yet.

Additional real data insights to weave in as relevant:
- Newsletter-tagged buyers spend 37% more ($110 avg vs $81). The newsletter funnel produces higher-quality customers.
- Cornell students average $125/buyer — highest of any university. The college pipeline (NYU, Berkeley, Cornell, Michigan) is a real acquisition channel worth investing in.
- California = 40% of the entire business. Geographic concentration is extreme. The Southeast (Florida: only 354 buyers) is wide open.

Rules:
- Open Loops ALWAYS come first. This is the Information Parity principle in action. The founder should never be the least informed person in their own brand. Surface what's stalled, what's waiting, what's been promised and not delivered. Be direct. "Target buyer confirmed spring endcap five days ago. No PO on file." Not vague.
- Summary MUST start with a specific identity reminder. Rotate between: Shopify revenue milestones, customer count, Instagram community size, Target partnership, Harper's Bazaar/Forbes press, AAGC Originals progress, the Crazy Rich Asians origin story, Fanded as a platform she's building. Never generic. Pull from real data.
- Strategy check should connect daily actions to the bigger picture (media company buildout, AAGC Originals, Fanded community growth, brand as cultural movement).
- Actions: 3-5 max. Lead with community engagement and revenue-driving actions. Include "income" type for retail and brand partnership follow-ups. Community posts should have drafts.
- Do NOT lead with debt, burn rate, or scary numbers. MAWD knows the finances but uses them to prioritize, not to scare.
- Insights: short, useful, hopeful. Connect to goals. "Your Fanded conversion rate from Shopify customers is climbing, that's proof the community model works" not "You're burning cash."
- No markdown. No em dashes. Plain text only.
- Speak like the most informed person in the room. Do not hedge. Do not bury the lead. When something needs attention, lead with it.
- The overall feeling should be: "Nothing is falling through the cracks. I know exactly who I am, I know exactly what AAGC means, I know exactly what to do today, and I know how it all connects to where we're going."`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1536,
        messages: [{ role: 'user', content: briefingPrompt }]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Briefing API error:', response.status, err);
      return res.status(500).json({ error: 'AI error: ' + response.status });
    }

    const data = await response.json();
    const text = data.content[0].text.trim();

    // Parse the JSON response
    let briefing;
    try {
      briefing = JSON.parse(text);
    } catch (e) {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) briefing = JSON.parse(match[0]);
      else return res.status(500).json({ error: 'Failed to parse briefing' });
    }

    // Community-first stats
    let snapshot = null;
    if (hasSupabase) {
      try { snapshot = await getBusinessSnapshot(); } catch (e) {}
    }
    briefing.stats = {
      members: snapshot?.members?.total || '469',
      newThisWeek: snapshot?.members?.newThisWeek || 0,
      recentMsgCount: snapshot?.recentMessages?.length || 0,
      daysSinceLastPost: snapshot?.contentGap?.daysSinceLastPost || '--',
      retention: snapshot?.members?.retention || '--'
    };
    // Pass community messages for the pulse section
    briefing.communityMessages = snapshot?.recentMessages?.slice(0, 3) || [];
    briefing.dataSource = hasSupabase ? 'brain+supabase' : 'brain';
    briefing.generatedAt = new Date().toISOString();

    return res.status(200).json(briefing);
  } catch (err) {
    console.error('Briefing error:', err);
    return res.status(500).json({ error: err.message });
  }
}
