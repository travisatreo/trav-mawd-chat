# SESSION HANDOFF — Fanded Journal / MAWD

**Last updated:** 2026-03-22
**Live at:** https://fanded-journal.vercel.app
**Blog at:** https://fanded-journal.vercel.app/blog/
**Repo:** https://github.com/travisatreo/fanded-journal
**Latest commit:** 4ceb45e (Information Parity as foundational operating principle)

---

## What This Is

MAWD (My AI Workforce Department) is Travis Atreo's AI chief of staff. It lives inside the Fanded Journal app as one tab. The app is a Vercel serverless project: `public/index.html` as the frontend, `api/*.js` as serverless functions. No build step. Claude claude-sonnet-4-20250514 powers the AI via direct API calls.

## Architecture

```
public/index.html                    → Full frontend (single file, ~2500 lines)
public/blog/index.html               → Blog index page (essay listing)
public/blog/information-parity.html  → First essay: Information Parity
api/brain.js                         → TRAVIS_BRAIN data + MAWD_SYSTEM_PROMPT (Information Parity + 5 agents)
api/chat.js                          → Chat endpoint (injects live Supabase data into system prompt)
api/briefing.js                      → Morning briefing generator (Open Loops, identity, strategy, actions, starters)
api/actions.js                       → Action executor (approve → creates real Supabase posts)
api/supabase.js                      → Shared Supabase client (PostgREST, not JS SDK)
api/cron/morning.js                  → 8am CT daily briefing (Vercel cron, 0 13 * * * UTC)
api/cron/nudge.js                    → 6pm CT content gap nudge (Vercel cron, 0 23 * * * UTC)
bridge-server.js                     → Mobile vibe-coding bridge (Bun, port 3456, local only)
```

## Foundational Philosophy: Information Parity

The entertainment industry runs on information asymmetry. MAWD exists to end it. This is not a feature. It is the operating principle that governs how MAWD thinks, speaks, and prioritizes.

Five specialist agents enforce Information Parity across domains:
- **DOLLAR** — Financial Intelligence (flags money discussed but not moved)
- **SCOUT** — Opportunity Tracking (flags opportunities that went silent)
- **COMPASS** — Strategic Accountability (flags goals named but no action taken)
- **PULSE** — Audience Intelligence (flags rising signals nobody's acting on)
- **HYPE** — Promotional Follow-Through (flags content planned but not published)

**Open Loops** surface anything stalled for 72+ hours (configurable threshold). Always the first section of every morning briefing.

## Supabase

- **Project:** jlwidechsxtgxmttypzs
- **Tables:** All prefixed `fanded_` (fanded_posts, fanded_clubs, fanded_members, etc.)
- **Club ID:** Set in Vercel env var `FANDED_CLUB_ID`
- **Auth:** Service role key in Vercel env var `SUPABASE_SERVICE_ROLE_KEY`

## Vercel Environment Variables

- `ANTHROPIC_API_KEY` — Claude API key
- `SUPABASE_URL` — https://jlwidechsxtgxmttypzs.supabase.co
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role (secret)
- `FANDED_CLUB_ID` — Travis's club ID in fanded_clubs table

## What MAWD Knows (trained on)

- Full identity, career history, 306M streams, Taylor Swift co-sign
- Production clients: Franco Enverga ($1K/song, up to 6 songs), Eliane Cha ($1K/song, 8+ songs), Jules Aurora (April), Darren Hayes (band)
- Financial reality: ~$300-450/mo organic income, ~$9-10K/mo burn, ~3 months runway
- Debts: SBA $80K, IRS $13K, 6 months mortgage owed to Ally ~$20K, Capital One (old)
- Accounts: BofA business 3160, BofA personal 7149, Amex Business Platinum, Amex Personal Platinum, Amex Delta, Raymond James Roth IRA ($25,904)
- Calendar: Both travis@travisatreo.com and travis@fanded.com Google Calendars
- Platform data: Spotify, YouTube, Soundrop, Fanded Club, Patreon (168 free, $0 MRR)
- Deadlines: EIDL payment starts Apr 9 ($400/mo), taxes due Apr 18, Portland gig Apr 15-16

## Design Decisions (Critical)

1. **Information Parity is the foundational principle.** Every response, briefing, and insight should close the information gap.
2. **Lead with fans, not finances.** Travis gets paralyzed by scary numbers. Lead with fan engagement and earning actions.
3. **Morning briefing: Open Loops first, then identity reminder, strategy, moves, starters.**
4. **Concepts over exact numbers.** Don't show specific bank balances or debt amounts unless Travis asks.
5. **Music career is leverage for Fanded fundraising.** Fanded is the generational wealth play.
6. **Fanded is building the first agentic AI team for talent.**
7. **Voice rules:** 1-2 sentences default, 3 max. No markdown headers. No em dashes. Warm and hopeful.
8. **Fan relationships = controllable income.** Frame everything around what Travis can control.
9. **Speak like the most informed person in the room.** Do not hedge. Do not bury the lead.
10. **Blog essays build SEO and establish Fanded's thought leadership.** Daily/regular publishing from Travis's philosophy.

## What's Working

- Chat with MAWD (live, uses real Supabase data)
- Morning briefing (Open Loops, identity, strategy, actions, starters)
- Approve buttons route by action type and create real posts in fanded_posts table
- Blog system with first essay (Information Parity, redesigned in Fanded brand)
- Cron jobs configured (morning 8am CT, nudge 6pm CT)

## What Needs Attention

1. **Approve buttons may not be working on prod.** Travis reported "nothing happened." Check env vars and network tab.
2. **Blog API + Supabase table.** Currently static HTML. Need `fanded_blog_posts` table and API endpoint for dynamic essays.
3. **Daily blog agent.** Cron or MAWD action that drafts essays from Travis's philosophy library. Needs philosophy input from Travis.
4. **Twilio SMS notifications to fans.** Not built yet. Needs fan phone numbers, Twilio account, api/notify.js endpoint.
5. **Fan-facing post page.** When fans get a text, where do they land?
6. **PDF generation.** Was requested but not built yet.
7. **Mobile vibe-coder bridge.** bridge-server.js exists on port 3456. Needs Tailscale or local IP access from phone.
8. **Remaining data:** Patreon screenshots, Virgin Ingrooves spreadsheets, Twitch analytics.
9. **Pending migrations:** 0117/0118, voice-notes Supabase bucket.
10. **Rotate exposed Anthropic API key** (flagged in prior session).

## Immediate Next Steps

1. Debug Approve buttons on prod (check env vars, test endpoint directly)
2. Build blog API + Supabase table for dynamic essay publishing
3. Add "Draft Blog" as MAWD action type in briefings
4. Set up daily blog agent with Travis's philosophy input
5. Build Twilio SMS notification flow
6. Build fan-facing post page
7. Schedule Eliane Cha session this week
8. Get Franco's song 2 on the calendar

## File Locations

- **Project root:** /Users/travis/Documents/Fanded M1/fanded-journal/
- **MAWD brain/data:** api/brain.js
- **Financial statements:** /Users/travis/Documents/Fanded M1/MAWD Files/
- **Bank statements:** subfolders BOFA/2025, AMEX Business Platinum, AMEX Personal Platinum, AMEX Delta
- **Memory files:** /Users/travis/.claude/projects/-Users-travis-Documents-Fanded-M1/memory/
- **Blog essays:** public/blog/
