# Fanded Journal — Integration Spec for app.fanded.com

**Date:** 2026-03-19
**Author:** Travis Atreo + Claude
**Status:** Proposed
**Prototype:** fanded-journal.vercel.app

---

## The Change in One Sentence

Replace the blog-style "Make an update" flow (Title + Body + checkboxes) with the Journal (speak or type → AI processes → letter delivered to fans).

---

## Current State (app.fanded.com)

```
Artist taps "Make an update"
  → Title field (required)
  → Body field (required)
  → Enable likes? (checkbox, default on)
  → Enable comments? (checkbox, default on)
  → Add Attachment
  → Access Level (Public/Members)
  → Preview → Save Draft → Publish

Fan sees:
  → Post with title, body, image
  → Like count + Comment count
  → "PUBLIC" badge
  → "Show more" truncation
```

**Problem:** This is content creation. It's work. It feels like managing a blog. Every field is a decision. The artist has to think about formatting, titles, audience, engagement toggles. That's the exact overhead Fanded exists to eliminate.

---

## Proposed State

```
Artist taps "Share something"
  → Speak (microphone) or Type (keyboard)
  → Raw, unfiltered thoughts — no title, no formatting
  → Hits "Release"
  → Claude processes in ~2 seconds:
      • Fan Share: warm 2-3 sentence letter (delivered to fans)
      • Private Archive: summary for MAWD agent memory
      • Tags: mood + context + era (auto-generated)
  → Artist sees the Fan Share preview
  → It's already sent (or: one-tap confirm if preferred)

Fan sees:
  → Letter card — artist's words in serif type
  → Soft timestamp ("3 days ago")
  → Mood tag (subtle, e.g. "reflective")
  → Bookmark icon (save for later)
  → No likes. No comments. No share buttons.
```

---

## Architecture

### Where It Lives

The Journal replaces the current "New post" page at:
```
/club/{slug}/post/new  →  /club/{slug}/journal
```

It also replaces the "Make an update" button on the club page.

The Journal is NOT a separate section or tab. It IS the way artists communicate. It replaces Updates as the primary content type.

### Data Model

Current post model:
```
Post {
  id
  title        ← REMOVE (AI generates if needed)
  body         ← KEEP (becomes raw_entry)
  club_id
  author_id
  access_level ← KEEP (Public / Members only)
  likes_enabled    ← DEFAULT OFF (artist opts in)
  comments_enabled ← DEFAULT OFF (artist opts in)
  attachments
  created_at
  updated_at
}
```

New journal entry model:
```
JournalEntry {
  id
  club_id
  author_id

  # Input
  raw_entry          # What the artist actually said/typed (never shown to fans)
  input_mode         # "voice" | "text"

  # AI-processed output
  fan_share          # The letter delivered to fans
  private_archive    # Summary for MAWD agent memory
  tags[]             # Auto-generated: mood, context, era

  # Controls
  access_level       # "public" | "members" | "archive_only"
  is_public          # true = goes to fans, false = private archive only

  # Metadata
  created_at
  updated_at
}
```

**Migration path:** Existing Posts continue to work. New entries use JournalEntry. Both render in the fan feed. Over time, Posts become legacy and Journal becomes primary.

### API Endpoint

```
POST /api/journal/process

Request:
{
  "entry": "raw text from artist",
  "club_id": "darrenhayes"
}

Response:
{
  "fanShare": "Something new is brewing...",
  "privateArchive": "Artist shared excitement about upcoming album...",
  "tags": ["excited", "studio", "growth"]
}
```

This calls Claude API (claude-sonnet-4-20250514) server-side. The system prompt is:

```
You are the intelligent layer inside Fanded, a fan club platform built
on intimacy. When an artist shares a raw journal entry or voice memo,
your job is to:

1. Write a Fan Share version — warm, personal, 2-3 sentences max, that
   preserves the artist's authentic voice but removes anything too raw,
   legally sensitive, or unintentionally revealing. Fix grammar and
   speech-to-text errors naturally. It should feel like a personal letter.

2. Write a Private Archive note — one sentence summary for the artist's
   AI agent memory.

3. Suggest 3 tags from: [mood: vulnerable/excited/reflective/frustrated/grateful]
   [context: studio/touring/personal/creative process/business]
   [era: early career/growth/peak/transition]

Return JSON: { "fanShare": "", "privateArchive": "", "tags": [] }
```

### MAWD Integration

Every `private_archive` entry feeds into the artist's MAWD agent context. Over time, MAWD accumulates:

- Creative state tracking (studio sessions, album cycles)
- Emotional patterns (burnout signals, creative peaks)
- Fan engagement context (what resonates, what doesn't)
- Career narrative (for strategy recommendations)

This is the data flywheel: **Journal → MAWD → better advice → artist stays creating → more Journal entries.**

---

## UX Flow (Artist)

### Mobile (primary)

```
┌─────────────────────┐
│  [fanded]     [≡]   │
│                      │
│  Darren Hayes        │
│  @darrenhayes        │
│                      │
│ ┌──────────────────┐ │
│ │ ✍️ Type │ 🎙 Speak │ │
│ └──────────────────┘ │
│                      │
│ ┌──────────────────┐ │
│ │                  │ │
│ │ What's on your   │ │
│ │ mind?            │ │
│ │                  │ │
│ │                  │ │
│ └──────────────────┘ │
│                      │
│ 🔵 Share with fans   │
│              [Release]│
│                      │
└─────────────────────┘
         ↓ (after Release)
┌─────────────────────┐
│                      │
│  ● Fan Share         │
│  "Something new is   │
│   brewing..."        │
│                      │
│  ● Private Archive   │
│  "Shared excitement  │
│   about new album"   │
│                      │
│  reflective · studio │
│  · growth            │
│                      │
│         [Done ✓]     │
└─────────────────────┘
```

### Voice Flow (the killer feature)

```
1. Artist opens app
2. Taps 🎙 Speak
3. Talks for 10-60 seconds (Web Speech API transcribes live)
4. Taps Stop
5. Sees their raw words in the text area
6. Taps Release (doesn't need to edit — Claude fixes it)
7. Done. Letter sent. Total time: under 90 seconds.
```

### Privacy Controls

```
┌──────────────────────────────┐
│ Access Level                  │
│                               │
│  ● Share with fans            │
│    → Fan Share goes to feed   │
│    → Private Archive to MAWD  │
│                               │
│  ○ Archive only               │
│    → Nothing goes to fans     │
│    → Everything goes to MAWD  │
│    → Artist journal/diary     │
│                               │
│  ○ Members only               │
│    → Only paid members see it │
│    → Private Archive to MAWD  │
└──────────────────────────────┘
```

---

## UX Flow (Fan)

### The Feed — Letters, Not Posts

```
┌─────────────────────┐
│  Darren Hayes        │
│  You're on the inside│
│                      │
│ ┌──────────────────┐ │
│ │ 3 days ago        │ │
│ │ reflective        │ │
│ │                   │ │
│ │ Something new is  │ │
│ │ brewing. Can't    │ │
│ │ share the details │ │
│ │ yet, but this     │ │
│ │ chapter feels     │ │
│ │ different — in    │ │
│ │ the best way.     │ │
│ │                ☆  │ │
│ └──────────────────┘ │
│                      │
│ ┌──────────────────┐ │
│ │ 1 week ago        │ │
│ │ grateful          │ │
│ │                   │ │
│ │ I was listening   │ │
│ │ back to something │ │
│ │ I wrote four years│ │
│ │ ago and it still  │ │
│ │ surprises me...   │ │
│ │                ☆  │ │
│ └──────────────────┘ │
│                      │
│  [Clubs]  [Settings] │
└─────────────────────┘
```

**What's different from current:**
- No title — just the words
- No like count — just a bookmark
- No comment section — default off
- No "PUBLIC" badge — everything inside a club is for members
- Serif typography — feels like a letter, not a post
- Mood tags — subtle, adds personality without effort
- Generous whitespace — calm, not a feed to scroll

### Empty State

When an artist hasn't shared yet:

```
┌─────────────────────┐
│                      │
│                      │
│  Something's coming. │
│                      │
│  Artists share when  │
│  it's real, not when │
│  it's scheduled.     │
│                      │
│                      │
└─────────────────────┘
```

---

## What Gets Removed / Changed

| Current | Change |
|---------|--------|
| "Make an update" button | → "Share something" |
| Title field (required) | → Removed. AI generates if needed. |
| Body field | → Replaced by journal textarea + speak |
| Enable likes (default on) | → Default OFF. Artist opts in per entry. |
| Enable comments (default on) | → Default OFF. Artist opts in per entry. |
| Post with social metrics | → Letter card with bookmark only |
| "PUBLIC" badge on posts | → Removed. Access level is implicit. |
| Like count visible to fans | → Hidden by default |
| Comment thread | → Available only when artist enables it |

---

## What Stays the Same

- Club structure (clubs as organizing unit)
- Club discovery page (All Clubs / Clubs You Manage)
- Quick Actions (Invite / Customize / Manage)
- Events tab (events are a natural fan club feature)
- Manage tab (members list, analytics)
- Settings (profile, notifications, billing)
- Wallet passes
- Attachments (photos, videos can still be added to entries)
- Access levels (Public / Members only)
- Bottom nav (Clubs / Settings)

---

## Implementation Phases

### Phase 1: Journal Input (replaces "Make an update")
- New `/club/{slug}/journal` page
- Speak + Type input modes
- Claude API processing endpoint
- Fan Share / Private Archive / Tags display
- Privacy toggle (share with fans / archive only)
- Ships alongside existing Post system — artists choose which to use
- **Effort:** 1 week human / ~2 hours CC

### Phase 2: Fan View (letter cards)
- New card component for journal entries in the fan feed
- Serif typography, timestamps, mood tags, bookmark
- No likes/comments by default
- Renders alongside existing Posts in the feed
- **Effort:** 1 week human / ~2 hours CC

### Phase 3: Voice-First
- Web Speech API integration (already built in prototype)
- Mobile-optimized speak flow
- One-tap speak → release flow
- **Effort:** 2 days human / ~30 min CC

### Phase 4: MAWD Integration
- Private Archive entries feed into MAWD agent context
- MAWD can reference journal history when giving career advice
- Pattern detection (burnout signals, creative peaks)
- **Effort:** 1 week human / ~3 hours CC

### Phase 5: Deprecate Posts
- "Make an update" becomes "Share something" everywhere
- Old Posts rendered in new letter card format
- Post creation flow removed
- Journal becomes the only way to share
- **Effort:** 3 days human / ~1 hour CC

---

## The Emotional Difference

**Current flow (artist perspective):**
> "I need to make an update for my fans. What should the title be? What should I write? Should I enable comments? How long should it be? Let me draft this..."
> → 20 minutes of content creation anxiety
> → Maybe they don't post at all

**Journal flow (artist perspective):**
> "I just got offstage and I feel incredible."
> → Taps Speak, talks for 30 seconds
> → Taps Release
> → Done. Letter sent. Fans feel closer. MAWD gets smarter.
> → 90 seconds total

**Current flow (fan perspective):**
> Opens app → sees a post with title, body, 2 likes, 0 comments
> → Feels like reading a blog
> → Taps like out of obligation

**Journal flow (fan perspective):**
> Gets a notification: "New letter from Darren"
> → Opens app → reads 3 warm sentences in beautiful serif type
> → Feels like receiving a personal note
> → Bookmarks it
> → Thinks: "This is worth $5/month"

---

## Success Metrics

| Metric | Current Baseline | Target |
|--------|-----------------|--------|
| Artist posts per week | ~0.5 (most clubs are quiet) | 3+ |
| Time to create a post | ~15 min | <90 seconds |
| Fan open rate on updates | Unknown | 60%+ |
| Fan retention (month 2) | Unknown | 80%+ |
| "Archive only" usage | N/A | 30% (artists journaling privately = MAWD data) |

The #1 metric: **Do artists share more often?** If the Journal reduces friction enough that artists share 5x more frequently, everything else follows — fan engagement, retention, revenue, MAWD intelligence.

---

## Technical Notes

- **Speech-to-text:** Web Speech API (browser-native, no cost, works on iOS Safari + Chrome)
- **AI processing:** Claude claude-sonnet-4-20250514 via server-side API call (~$0.003 per entry)
- **Latency:** ~2 seconds for AI processing (acceptable — feels like "thinking")
- **Fallback:** If API fails, raw entry is saved and AI processing retries later
- **Privacy:** Raw entries never leave the server. Fan Share is the only thing shown to fans.
- **Prototype:** Working at fanded-journal.vercel.app — hand an artist your phone and watch them use it
