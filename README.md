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

### 4. Use your board

```bash
# Ask your board a question
advisory-board ask "How should I think about building wealth?"

# Ask a specific advisor
advisory-board ask "What makes a great startup idea?" -a "Paul Graham"

# Extract frameworks from an advisor's material
advisory-board extract -a "Naval Ravikant" -n "Wealth Creation" -d "Principles for building wealth"

# Generate content using your board's knowledge
advisory-board generate "Write about the intersection of leverage and specific knowledge" --type "blog post"
```

## Commands

| Command | Description |
|---|---|
| `advisor add <name>` | Add a new advisor to your board |
| `advisor list` | List all advisors with source/framework counts |
| `advisor remove <name>` | Remove an advisor and all their data |
| `ingest <source> -a <advisor>` | Ingest a PDF, URL, or text file |
| `ask <question>` | Ask your entire board (or a specific advisor with `-a`) |
| `extract -a <advisor> -n <name>` | Extract frameworks from an advisor's sources |
| `generate <prompt>` | Generate content using your board's knowledge |
| `sources` | List all ingested sources |
| `frameworks -a <advisor>` | List or view extracted frameworks |

## How It Works

1. **Ingest** — PDFs, URLs, and text files are parsed, chunked, and stored in a local SQLite database with FTS5 full-text search indexing.
2. **Search** — When you ask a question or generate content, relevant chunks are retrieved using full-text search.
3. **Synthesize** — Retrieved chunks are passed as context to Claude, which synthesizes an answer grounded in your advisory board's knowledge.

## Architecture

- **Storage**: SQLite with FTS5 full-text search (zero dependencies, local-first)
- **LLM**: Claude via the Anthropic API
- **CLI**: Click
- **Data**: Stored in `~/.advisory-board/board.db`
