"""CLI interface for the Advisory Board tool."""

import json

import click

from . import database as db
from . import ingestion
from . import llm


def get_db():
    conn = db.get_connection()
    db.init_db(conn)
    return conn


@click.group()
def main():
    """Build your own advisory board from the best minds in your field."""
    pass


# --- Advisor management ---


@main.group()
def advisor():
    """Manage your advisors."""
    pass


@advisor.command("add")
@click.argument("name")
@click.option("--description", "-d", default="", help="Description of this advisor.")
def advisor_add(name, description):
    """Add a new advisor to your board."""
    conn = get_db()
    existing = db.get_advisor(conn, name)
    if existing:
        click.echo(f"Advisor '{name}' already exists.")
        return
    db.create_advisor(conn, name, description)
    click.echo(f"Added advisor: {name}")


@advisor.command("list")
def advisor_list():
    """List all advisors on your board."""
    conn = get_db()
    advisors = db.list_advisors(conn)
    if not advisors:
        click.echo("No advisors yet. Add one with: advisory-board advisor add <name>")
        return
    for a in advisors:
        sources = db.list_sources(conn, a["id"])
        frameworks = db.list_frameworks(conn, a["id"])
        desc = f" - {a['description']}" if a["description"] else ""
        click.echo(
            f"  {a['name']}{desc} "
            f"({len(sources)} sources, {len(frameworks)} frameworks)"
        )


@advisor.command("remove")
@click.argument("name")
@click.confirmation_option(prompt="Are you sure you want to remove this advisor and all their data?")
def advisor_remove(name):
    """Remove an advisor and all associated data."""
    conn = get_db()
    if db.delete_advisor(conn, name):
        click.echo(f"Removed advisor: {name}")
    else:
        click.echo(f"Advisor '{name}' not found.")


# --- Ingest ---


@main.command()
@click.argument("source")
@click.option("--advisor", "-a", required=True, help="Advisor to associate this source with.")
@click.option("--title", "-t", default=None, help="Custom title for the source.")
def ingest(source, advisor, title):
    """Ingest a knowledge source (PDF, URL, or text file)."""
    conn = get_db()
    adv = db.get_advisor(conn, advisor)
    if not adv:
        click.echo(f"Advisor '{advisor}' not found. Add them first with: advisory-board advisor add {advisor}")
        return

    click.echo(f"Ingesting: {source}...")
    try:
        auto_title, source_type, origin, chunks = ingestion.ingest_source(source)
    except FileNotFoundError as e:
        click.echo(f"Error: {e}")
        return
    except Exception as e:
        click.echo(f"Error ingesting source: {e}")
        return

    final_title = title or auto_title
    source_id = db.add_source(conn, adv["id"], final_title, source_type, origin)
    count = db.add_chunks(conn, source_id, adv["id"], chunks)

    # Score and report advice density
    scores = [ingestion.score_advice_density(c) for c in chunks]
    avg_score = sum(scores) / len(scores) if scores else 0
    high_value = sum(1 for s in scores if s >= 5)

    click.echo(f"Ingested '{final_title}' ({source_type}): {count} chunks stored for {advisor}.")
    click.echo(f"  Advice density: avg {avg_score:.1f}/chunk, {high_value} high-value chunks")


# --- Import wisdom data from prototype ---


@main.command("import-wisdom")
@click.argument("json_path", type=click.Path(exists=True))
@click.option("--advisor", "-a", default=None, help="Import all under one advisor name (default: per-guest).")
def import_wisdom(json_path, advisor):
    """Import wisdom_data.json from the PM Wisdom Engine prototype.

    Bulk-loads episodes and wisdom chunks. Use --advisor to group everything
    under a single advisor, or omit to create one advisor per guest.
    """
    conn = get_db()

    with open(json_path) as f:
        data = json.load(f)

    # Detect format: compact (ep/wc/tp) or full (episodes/wisdom_chunks/topics)
    episodes = data.get("ep", data.get("episodes", []))
    wisdom_chunks = data.get("wc", data.get("wisdom_chunks", []))
    topics = data.get("tp", data.get("topics", {}))

    if not episodes and not wisdom_chunks:
        click.echo("No episodes or wisdom chunks found in the file.")
        return

    click.echo(f"Found {len(episodes)} episodes, {len(wisdom_chunks)} wisdom chunks, {len(topics)} topics.")

    # Track advisors created
    advisor_cache = {}

    def get_or_create_advisor(name, desc=""):
        if name in advisor_cache:
            return advisor_cache[name]
        adv = db.get_advisor(conn, name)
        if not adv:
            aid = db.create_advisor(conn, name, desc)
            advisor_cache[name] = aid
        else:
            advisor_cache[name] = adv["id"]
        return advisor_cache[name]

    if advisor:
        # Single advisor mode
        advisor_id = get_or_create_advisor(advisor, f"Imported from {json_path}")
        # Import episodes as sources
        for ep in episodes:
            guest = ep.get("g", ep.get("guest", "Unknown"))
            title = ep.get("t", ep.get("title", guest))
            db.add_source(conn, advisor_id, title, "podcast", ep.get("yt", ep.get("youtube_url", "")))

        # Import wisdom chunks
        if wisdom_chunks:
            source_id = db.add_source(conn, advisor_id, "Wisdom Chunks (top advice)", "wisdom", json_path)
            texts = [c.get("t", c.get("text", "")) for c in wisdom_chunks]
            texts = [t for t in texts if t.strip()]
            db.add_chunks(conn, source_id, advisor_id, texts)
            click.echo(f"Imported {len(texts)} wisdom chunks under '{advisor}'.")
    else:
        # Per-guest mode: create one advisor per unique guest
        guest_chunks = {}
        for wc in wisdom_chunks:
            guest = wc.get("g", wc.get("guest", "Unknown"))
            text = wc.get("t", wc.get("text", ""))
            if text.strip():
                guest_chunks.setdefault(guest, []).append(text)

        for guest, chunks in guest_chunks.items():
            advisor_id = get_or_create_advisor(guest)
            ep_title = guest  # find matching episode title
            for ep in episodes:
                if ep.get("g", ep.get("guest", "")) == guest:
                    ep_title = ep.get("t", ep.get("title", guest))
                    break
            source_id = db.add_source(conn, advisor_id, ep_title, "podcast", "")
            db.add_chunks(conn, source_id, advisor_id, chunks)

        click.echo(f"Imported {len(wisdom_chunks)} chunks across {len(guest_chunks)} advisors.")

    # Store topics as metadata if present
    if topics:
        click.echo(f"  {len(topics)} topic indexes available.")

    click.echo("Done! Try: advisory-board ask 'your question here'")


# --- Ask ---


@main.command()
@click.argument("question")
@click.option("--advisor", "-a", default=None, help="Ask a specific advisor (default: entire board).")
@click.option("--limit", "-n", default=10, help="Number of context chunks to retrieve.")
def ask(question, advisor, limit):
    """Ask your advisory board a question."""
    conn = get_db()

    advisor_id = None
    advisor_name = None
    if advisor:
        adv = db.get_advisor(conn, advisor)
        if not adv:
            click.echo(f"Advisor '{advisor}' not found.")
            return
        advisor_id = adv["id"]
        advisor_name = adv["name"]

    chunks = db.search_chunks(conn, question, advisor_id=advisor_id, limit=limit)
    if not chunks:
        click.echo("No relevant content found in the knowledge base. Ingest some sources first.")
        return

    click.echo(f"Found {len(chunks)} relevant chunks. Consulting {'the board' if not advisor_name else advisor_name}...\n")
    client = llm.get_client()
    answer, advisors_consulted = llm.ask_board(client, question, chunks, advisor_name=advisor_name)
    click.echo(answer)

    # Show sources consulted
    if advisors_consulted:
        click.echo(f"\n--- Sources consulted: {', '.join(advisors_consulted)} ---")


# --- LinkedIn ---


@main.command()
@click.argument("topic")
@click.option("--advisor", "-a", default=None, help="Draw from a specific advisor's knowledge.")
@click.option("--limit", "-n", default=15, help="Number of context chunks to use.")
def linkedin(topic, advisor, limit):
    """Generate a LinkedIn post draft from your advisory board's knowledge."""
    conn = get_db()

    advisor_id = None
    if advisor:
        adv = db.get_advisor(conn, advisor)
        if not adv:
            click.echo(f"Advisor '{advisor}' not found.")
            return
        advisor_id = adv["id"]

    chunks = db.search_chunks(conn, topic, advisor_id=advisor_id, limit=limit)
    if not chunks:
        click.echo("No relevant content found. Ingest some sources first.")
        return

    click.echo(f"Drawing on {len(chunks)} chunks to draft LinkedIn post...\n")
    client = llm.get_client()
    post, advisors_consulted = llm.generate_linkedin(client, topic, chunks)
    click.echo(post)

    if advisors_consulted:
        click.echo(f"\n--- Sources consulted: {', '.join(advisors_consulted)} ---")
    click.echo("\n[Tip: Replace the [YOUR TAKE] placeholder with your personal experience]")


# --- Extract ---


@main.command()
@click.option("--advisor", "-a", required=True, help="Advisor to extract frameworks from.")
@click.option("--name", "-n", required=True, help="Name for the extracted framework.")
@click.option("--description", "-d", default="", help="Brief description of the framework.")
def extract(advisor, name, description):
    """Extract frameworks and mental models from an advisor's sources."""
    conn = get_db()
    adv = db.get_advisor(conn, advisor)
    if not adv:
        click.echo(f"Advisor '{advisor}' not found.")
        return

    sources = db.list_sources(conn, adv["id"])
    if not sources:
        click.echo(f"No sources found for {advisor}. Ingest some first.")
        return

    # Gather all chunks for this advisor
    all_chunks = []
    for s in sources:
        rows = conn.execute(
            "SELECT content FROM chunks WHERE source_id = ? ORDER BY chunk_index",
            (s["id"],),
        ).fetchall()
        all_chunks.extend(r["content"] for r in rows)

    if not all_chunks:
        click.echo("No content chunks found.")
        return

    # Limit to first ~50 chunks to stay within context limits
    selected = all_chunks[:50]
    click.echo(f"Analyzing {len(selected)} chunks from {len(sources)} sources...")

    client = llm.get_client()
    result = llm.extract_frameworks(client, selected, adv["name"], f"{len(sources)} sources")
    source_ids = [s["id"] for s in sources]
    db.save_framework(conn, adv["id"], name, description, result, source_ids)
    click.echo(f"\nFramework '{name}' extracted and saved.\n")
    click.echo(result)


# --- Generate ---


@main.command()
@click.argument("prompt")
@click.option("--advisor", "-a", default=None, help="Draw from a specific advisor's knowledge.")
@click.option("--type", "content_type", default="blog post", help="Type of content to generate.")
@click.option("--limit", "-n", default=15, help="Number of context chunks to use.")
def generate(prompt, advisor, content_type, limit):
    """Generate content using your advisory board's knowledge."""
    conn = get_db()

    advisor_id = None
    if advisor:
        adv = db.get_advisor(conn, advisor)
        if not adv:
            click.echo(f"Advisor '{advisor}' not found.")
            return
        advisor_id = adv["id"]

    # Use the prompt as a search query to find relevant chunks
    chunks = db.search_chunks(conn, prompt, advisor_id=advisor_id, limit=limit)
    if not chunks:
        click.echo("No relevant content found. Ingest some sources first.")
        return

    click.echo(f"Drawing on {len(chunks)} relevant chunks to generate {content_type}...\n")
    client = llm.get_client()
    result = llm.generate_content(client, prompt, chunks, content_type=content_type)
    click.echo(result)


# --- Topics ---


@main.command()
@click.argument("json_path", type=click.Path(exists=True))
def topics(json_path):
    """Browse available topics from a wisdom_data.json file."""
    with open(json_path) as f:
        data = json.load(f)

    topic_map = data.get("tp", data.get("topics", {}))
    if not topic_map:
        click.echo("No topics found in this file.")
        return

    click.echo(f"\n{len(topic_map)} topics available:\n")
    for topic in sorted(topic_map.keys()):
        ep_count = len(topic_map[topic])
        click.echo(f"  {topic} ({ep_count} episodes)")

    click.echo(f"\nTip: Use these topics with 'advisory-board ask' or 'advisory-board linkedin'")


# --- List sources/frameworks ---


@main.command("sources")
@click.option("--advisor", "-a", default=None, help="Filter by advisor.")
def list_sources(advisor):
    """List all ingested sources."""
    conn = get_db()

    if advisor:
        adv = db.get_advisor(conn, advisor)
        if not adv:
            click.echo(f"Advisor '{advisor}' not found.")
            return
        sources = db.list_sources(conn, adv["id"])
    else:
        sources = conn.execute(
            "SELECT s.*, a.name as advisor_name FROM sources s JOIN advisors a ON a.id = s.advisor_id ORDER BY s.created_at DESC"
        ).fetchall()
        sources = [dict(r) for r in sources]

    if not sources:
        click.echo("No sources ingested yet.")
        return

    for s in sources:
        adv_label = s.get("advisor_name", advisor or "")
        click.echo(f"  [{s['source_type']}] {s['title']} (advisor: {adv_label}, added: {s['created_at']})")


@main.command("frameworks")
@click.option("--advisor", "-a", required=True, help="Advisor to list frameworks for.")
@click.option("--show", "-s", default=None, type=int, help="Show full content of framework by ID.")
def list_frameworks(advisor, show):
    """List or view extracted frameworks."""
    conn = get_db()
    adv = db.get_advisor(conn, advisor)
    if not adv:
        click.echo(f"Advisor '{advisor}' not found.")
        return

    if show is not None:
        fw = db.get_framework(conn, show)
        if not fw or fw["advisor_id"] != adv["id"]:
            click.echo("Framework not found for this advisor.")
            return
        click.echo(f"\n## {fw['name']}\n")
        if fw["description"]:
            click.echo(f"{fw['description']}\n")
        click.echo(fw["content"])
        return

    frameworks = db.list_frameworks(conn, adv["id"])
    if not frameworks:
        click.echo(f"No frameworks for {advisor}. Extract some with: advisory-board extract -a {advisor} -n <name>")
        return

    for fw in frameworks:
        desc = f" - {fw['description']}" if fw["description"] else ""
        click.echo(f"  [{fw['id']}] {fw['name']}{desc} (created: {fw['created_at']})")


if __name__ == "__main__":
    main()
