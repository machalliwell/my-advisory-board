# My Advisory Board

Build your own advisory board from the best minds in your field. Ingest any knowledge source (books, articles, podcasts, PDFs), extract frameworks, generate content, and ask questions across everything you've ever learned.

## Quick Start

### 1. Install

```bash
pip install -e .
```

### 2. Set up your API key

Copy the example env file and add your [Anthropic API key](https://console.anthropic.com/):

```bash
cp .env.example .env
# Edit .env and add your key
```

Or export it directly:

```bash
export ANTHROPIC_API_KEY=your-key-here
```

### 3. Build your board

```bash
# Add an advisor
advisory-board advisor add "Naval Ravikant" -d "Angel investor, philosopher"

# Ingest their content
advisory-board ingest almanack-of-naval.pdf -a "Naval Ravikant"
advisory-board ingest https://nav.al/specific-knowledge -a "Naval Ravikant"

# Add another advisor
advisory-board advisor add "Paul Graham" -d "Essayist, YC founder"
advisory-board ingest http://paulgraham.com/ds.html -a "Paul Graham"
```

### Quick Start with Podcast Data

If you have `wisdom_data.json` from the PM Wisdom Engine prototype:

```bash
# Import all 314 episodes, creating one advisor per guest
advisory-board import-wisdom wisdom_data.json

# Or group everything under one advisor
advisory-board import-wisdom wisdom_data.json -a "Lenny's Podcast"

# Browse available topics
advisory-board topics wisdom_data.json
```

### 4. Use your board

```bash
# Ask your board a question (multi-perspective, with attribution)
advisory-board ask "How should I think about building wealth?"

# Ask a specific advisor
advisory-board ask "What makes a great startup idea?" -a "Paul Graham"

# Generate a LinkedIn post draft
advisory-board linkedin "prioritization frameworks for PMs"

# Extract frameworks from an advisor's material
advisory-board extract -a "Naval Ravikant" -n "Wealth Creation" -d "Principles for building wealth"

# Generate other content types
advisory-board generate "Write about the intersection of leverage and specific knowledge" --type "blog post"
```

## Commands

| Command | Description |
|---|---|
| `advisor add <name>` | Add a new advisor to your board |
| `advisor list` | List all advisors with source/framework counts |
| `advisor remove <name>` | Remove an advisor and all their data |
| `ingest <source> -a <advisor>` | Ingest a PDF, URL, or text file |
| `import-wisdom <json>` | Bulk-import from wisdom_data.json (per-guest or single advisor) |
| `ask <question>` | Ask your entire board (or a specific advisor with `-a`) |
| `linkedin <topic>` | Generate a LinkedIn post draft with hook/insight/CTA structure |
| `extract -a <advisor> -n <name>` | Extract frameworks from an advisor's sources |
| `generate <prompt>` | Generate content using your board's knowledge |
| `topics <json>` | Browse topic indexes from a wisdom data file |
| `sources` | List all ingested sources |
| `frameworks -a <advisor>` | List or view extracted frameworks |

## How It Works

1. **Ingest** — PDFs, URLs, text files, and podcast data are parsed, chunked, scored for advice density, and stored in a local SQLite database with FTS5 full-text search indexing.
2. **Search** — When you ask a question or generate content, relevant chunks are retrieved using full-text search, ranked by relevance.
3. **Synthesize** — Retrieved chunks are passed as context to Claude, which synthesizes an answer with:
   - **Guest attribution** — Every insight attributed to specific advisors by name
   - **Multi-perspective** — 2-4 different viewpoints, including where advisors disagree
   - **Actionable output** — "What to do Monday morning" practical actions
   - **Framework references** — Real frameworks (RICE, ICE, JTBD, etc.) when applicable

## Prompt Architecture

The system uses specialized prompt templates adapted from the PM Wisdom Engine prototype:

- **Advisory prompt** — Enforces attribution, multi-perspective synthesis, disagreement surfacing, and practical actions
- **LinkedIn prompt** — Hook/insight/your-take/CTA structure, optimized for 150-250 word posts
- **Extract prompt** — Pulls named frameworks with descriptions, principles, and application guidance
- **Generate prompt** — Grounds content in source material with natural attribution

## Architecture

- **Storage**: SQLite with FTS5 full-text search (zero dependencies, local-first)
- **Scoring**: Advice density scoring ranks chunks by actionable content
- **LLM**: Claude via the Anthropic API
- **CLI**: Click
- **Data**: Stored in `~/.advisory-board/board.db`
