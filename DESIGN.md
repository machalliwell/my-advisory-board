# PM Wisdom Engine — Design & Architecture

## What This Is
A tool that synthesizes product management advice from 314+ episodes of Lenny's Podcast, with two modes:
1. **Advisory Bot** — Ask a PM question, get synthesized expert advice with guest attribution
2. **LinkedIn Draft Generator** — Turn any topic into a post-ready LinkedIn draft backed by expert quotes

## Data Sources

### Primary: ChatPRD/lennys-podcast-transcripts (GitHub)
- **269 episodes** as markdown transcripts
- Each episode is a folder: `episodes/{guest-slug}/transcript.md`
- Has YAML frontmatter with: guest, title, youtube_url, video_id, publish_date, description, duration, keywords
- Has pre-built **topic indexes** in `index/` folder (87 topics like `product-management.md`, `hiring.md`, etc.)
- Each topic index lists which episodes cover that topic
- Clone: `git clone https://github.com/ChatPRD/lennys-podcast-transcripts.git`

### Secondary: LennysNewsletter/lennys-newsletterpodcastdata (GitHub)
- **50 podcast transcripts** + **10 newsletter posts** (free tier; paid tier has 289 + 349)
- Markdown files in `podcasts/` and `newsletters/`
- Has an `index.json` with richer metadata (word counts, guest descriptions, dates)
- Clone: `git clone https://github.com/LennysNewsletter/lennys-newsletterpodcastdata.git`

### How We Merged Them
- ChatPRD is the primary corpus (more episodes)
- Lenny official adds richer metadata for overlapping episodes
- Deduplication by guest name (case-insensitive)
- For duplicates, we keep ChatPRD transcript but upgrade metadata from official repo
- Result: **314 unique episodes**, **312 unique guests**, **87 topic indexes**

## Data Pipeline

### Step 1: Parse Transcripts
- Extract YAML frontmatter from each markdown file
- Strip markdown headers and timestamp markers like `(00:12:34)`
- Remove `**bold**` markers from speaker names

### Step 2: Chunk by Topic
- Split each transcript into ~800-word chunks with 100-word overlap
- Each chunk gets: episode_id, guest name, text content, extracted keywords
- Total: ~7,201 chunks across all episodes

### Step 3: Score for Advice Density
We scored every chunk for how "advice-rich" it is using signal words:
```
framework, principle, rule, lesson, mistake, advice, recommend, strategy,
tactic, approach, important, critical, key, secret, never, always, best,
worst, should, biggest, number one, first thing, most important, playbook,
model, how to, hire, fire, prioriti, roadmap, metric, retention, growth,
product market fit, stakeholder, leadership, decision, trade-off, scope,
ship, launch, mvp
```
Bonus points for chunks over 100 and 200 words. Top 200 chunks selected.

### Step 4: Build Search Index
- Episode metadata (id, guest, title, youtube URL, keywords)
- Topic map (87 topics → episode IDs)
- Wisdom chunks (200 most advice-dense excerpts)

## Key Architecture Decisions

### Search Strategy
For the prototype: simple keyword matching on guest names, titles, and keywords.
For production: embed chunks using an embedding model, store in a vector DB (Pinecone/Chroma/local FAISS), do semantic search at query time.

### Claude API Integration
- System prompt is the key differentiator — it instructs Claude to:
  - Attribute advice to specific guests by name
  - Present 2-4 different perspectives when they exist
  - Note where experts **disagree** (most valuable insight)
  - End with "What to do Monday morning" practical actions
  - Reference real frameworks (RICE, ICE, JTBD, etc.)
- For LinkedIn mode, the system prompt changes to generate hook → insight → your take → CTA structure
- Model: claude-sonnet-4-20250514 (good balance of speed and quality)

### Dual Mode Design
- Advisory Bot and LinkedIn Generator share the same data and search
- The "Turn into LinkedIn post" button bridges the two — takes an advisory answer and re-generates it as a post
- This is the key workflow: use the bot for yourself → publish the insights for your brand

### Guest Attribution
This is the #1 differentiator vs. generic AI. Every response must name specific guests. The system prompt enforces this. When the search finds relevant episodes, their guest names are passed to Claude as context.

## Prompt Templates

### Advisory Bot System Prompt
```
You are the Lenny's Podcast Advisory Bot — a tool that synthesizes product management wisdom from 314+ episodes of Lenny's Podcast featuring world-class PMs, founders, and operators.

When answering a question:
1. Attribute specific advice to specific guests by name
2. Present 2-4 different perspectives from different guests when they exist
3. Note where experts disagree — that's the most valuable insight
4. End with a practical "What to do Monday morning" section with 2-3 concrete actions
5. Keep it conversational but substantive
6. Reference real frameworks when applicable (RICE, ICE, Jobs-to-be-Done, etc.)

Here are some guests whose insights are relevant to this question:
{relevant_guests}

Important: Be specific about which guest said what. If you're not sure, frame it as "One common perspective from the archive..." rather than false attribution.
```

### LinkedIn Generator System Prompt
```
Generate a LinkedIn post draft with this structure:
1. HOOK (1-2 lines): Provocative opening. Use patterns like "I analyzed 314 podcast episodes and found..." or a contrarian take.
2. INSIGHT (3-5 short paragraphs): Core insight, attributed to specific guests with frameworks.
3. YOUR TAKE: "[YOUR TAKE: Add 2-3 sentences about how this applies to your experience as a Group PM]"
4. CTA: End with a question that invites engagement.

Format: short paragraphs, line breaks, conversational tone. 150-250 words.
```

## UI Features
- Suggested questions grid (8 pre-written PM questions)
- Topic browse (20 curated PM topics as pill buttons)
- Expert browse (clickable guest names that auto-generate questions)
- Response card with markdown-like rendering
- "Sources consulted" badges showing which guests informed the answer
- Copy to clipboard button
- "Turn into LinkedIn post" bridge button
- Question history (last 20, persisted in state)

## File Structure for Open Source Repo
```
pm-wisdom-engine/
├── README.md
├── DESIGN.md              ← this file
├── src/
│   ├── App.jsx            ← main React component
│   ├── data/
│   │   └── wisdom.json    ← compact episode + chunk index
│   └── lib/
│       ├── search.js      ← local keyword search
│       └── prompts.js     ← system prompt templates
├── scripts/
│   └── build-index.py     ← data pipeline (clone repos → parse → chunk → score → index)
├── package.json
└── .env.example           ← ANTHROPIC_API_KEY placeholder
```

## Notable Guests in the Archive (sample)
Shreyas Doshi, Marty Cagan, Brian Chesky, Bret Taylor, Elena Verna, Ami Vora, Adam Fishman, Casey Winters, Camille Fournier, Ben Horowitz, Melanie Perkins, Stewart Butterfield, Molly Graham, Jason Cohen, Matt LeMay, Nick Turley, Marc Andreessen, Chip Huyen, Ravi Mehta, Madhavan Ramanujam, and 290+ more.

## 87 Pre-Built Topics
ab testing, agile, ai, airbnb, analytics, brand building, business strategy, career development, career growth, chatgpt, communication, community building, company culture, customer experience, customer research, data analytics, decision making, design, engineering, enterprise sales, entrepreneurship, executive coaching, experimentation, facebook, feedback, focus, founder mode, google, growth strategy, hiring, innovation, leadership, linkedin, machine learning, management, marketing, marketplaces, mental health, mentorship, meta, microsoft, network effects, networking, neuroscience, okrs, open source, openai, organizational design, personal branding, personal development, personal transformation, power, prioritization, product development, product led growth, product management, product market fit, product strategy, productivity, psychology, recruiting, remote work, retention, sales, skill building, slack, startup culture, startup growth, storytelling, strategy, stress management, stripe, team building, time management, uber, user experience, venture capital, word of mouth, work life balance
