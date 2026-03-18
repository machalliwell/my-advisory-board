"""Claude API integration for advisory board features."""

import os

import anthropic
from dotenv import load_dotenv


def get_client() -> anthropic.Anthropic:
    load_dotenv()
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise RuntimeError(
            "ANTHROPIC_API_KEY not set. "
            "Add it to your .env file or set it as an environment variable."
        )
    return anthropic.Anthropic(api_key=api_key)


MODEL = "claude-sonnet-4-20250514"


def ask_board(
    client: anthropic.Anthropic,
    question: str,
    context_chunks: list[dict],
    advisor_name: str | None = None,
) -> str:
    """Ask a question with RAG context from the knowledge base."""
    context_text = "\n\n---\n\n".join(
        f"[Source: {c['source_title']}] (Advisor: {c['advisor_name']})\n{c['content']}"
        for c in context_chunks
    )

    advisor_framing = ""
    if advisor_name:
        advisor_framing = f"You are channeling the perspective of {advisor_name}. "

    system = (
        f"{advisor_framing}"
        "You are an advisory board member providing expert guidance. "
        "Use the provided knowledge base excerpts to inform your answer. "
        "Be specific, actionable, and cite the source material when relevant. "
        "If the provided context doesn't contain enough information to answer, "
        "say so clearly rather than making things up."
    )

    user_msg = f"## Knowledge Base Context\n\n{context_text}\n\n## Question\n\n{question}"

    response = client.messages.create(
        model=MODEL,
        max_tokens=2048,
        system=system,
        messages=[{"role": "user", "content": user_msg}],
    )
    return response.content[0].text


def extract_frameworks(
    client: anthropic.Anthropic,
    chunks: list[str],
    advisor_name: str,
    source_title: str,
) -> str:
    """Extract key frameworks, mental models, and principles from source material."""
    combined = "\n\n---\n\n".join(chunks)

    system = (
        "You are an expert analyst extracting actionable frameworks, mental models, "
        "and key principles from source material. Structure your output as a clear, "
        "well-organized document with named frameworks, each containing: "
        "a brief description, key principles, and when to apply it."
    )

    user_msg = (
        f"Extract the key frameworks, mental models, and actionable principles from "
        f"the following material by {advisor_name} (source: {source_title}).\n\n"
        f"## Source Material\n\n{combined}"
    )

    response = client.messages.create(
        model=MODEL,
        max_tokens=4096,
        system=system,
        messages=[{"role": "user", "content": user_msg}],
    )
    return response.content[0].text


def generate_content(
    client: anthropic.Anthropic,
    prompt: str,
    context_chunks: list[dict],
    content_type: str = "blog post",
) -> str:
    """Generate content using advisory board knowledge."""
    context_text = "\n\n---\n\n".join(
        f"[Source: {c['source_title']}] (Advisor: {c['advisor_name']})\n{c['content']}"
        for c in context_chunks
    )

    system = (
        "You are a skilled writer drawing on an advisory board's collective knowledge. "
        f"Generate a {content_type} based on the user's prompt. "
        "Ground your writing in the provided knowledge base excerpts, "
        "weaving in insights and frameworks naturally. "
        "Make it practical, engaging, and original."
    )

    user_msg = (
        f"## Knowledge Base Context\n\n{context_text}\n\n"
        f"## Writing Prompt\n\n{prompt}"
    )

    response = client.messages.create(
        model=MODEL,
        max_tokens=4096,
        system=system,
        messages=[{"role": "user", "content": user_msg}],
    )
    return response.content[0].text
