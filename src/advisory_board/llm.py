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


def _format_context(context_chunks: list[dict]) -> str:
    """Format context chunks with source attribution."""
    return "\n\n---\n\n".join(
        f"[Source: {c['source_title']}] (Advisor: {c['advisor_name']})\n{c['content']}"
        for c in context_chunks
    )


def _unique_advisors(context_chunks: list[dict]) -> list[str]:
    """Extract unique advisor names from context chunks."""
    seen = set()
    names = []
    for c in context_chunks:
        name = c["advisor_name"]
        if name not in seen:
            seen.add(name)
            names.append(name)
    return names


def ask_board(
    client: anthropic.Anthropic,
    question: str,
    context_chunks: list[dict],
    advisor_name: str | None = None,
) -> tuple[str, list[str]]:
    """Ask a question with RAG context. Returns (answer, advisors_consulted)."""
    context_text = _format_context(context_chunks)
    advisors = _unique_advisors(context_chunks)

    guest_context = "\n".join(f"- {name}" for name in advisors)

    if advisor_name:
        system = (
            f"You are channeling the perspective of {advisor_name}, drawing on their "
            f"knowledge and frameworks from the provided source material.\n\n"
            f"When answering:\n"
            f"1. Stay true to {advisor_name}'s known perspectives and frameworks\n"
            f"2. Reference specific concepts from the source material\n"
            f"3. End with a practical 'What to do Monday morning' section with 2-3 concrete actions\n"
            f"4. Keep it conversational but substantive\n\n"
            f"Important: Be specific about what comes from the source material. "
            f"If you're not sure about something, say so rather than fabricating."
        )
    else:
        system = (
            "You are an advisory board that synthesizes expert wisdom from multiple advisors.\n\n"
            "When answering a question:\n"
            "1. Attribute specific advice to specific advisors by name "
            "(e.g., 'According to [Name]...', '[Name] recommends...')\n"
            "2. Present 2-4 different perspectives from different advisors when they exist\n"
            "3. Note where advisors disagree — that's often the most valuable insight\n"
            "4. End with a practical 'What to do Monday morning' section with 2-3 concrete actions\n"
            "5. Keep it conversational but substantive — like advice from a senior colleague\n"
            "6. Reference real frameworks when applicable (RICE, ICE, Jobs-to-be-Done, etc.)\n\n"
            f"Here are the advisors whose insights are relevant to this question:\n{guest_context}\n\n"
            "Important: Be specific about which advisor said what. If you're not sure, "
            "frame it as 'One common perspective from the board...' rather than false attribution."
        )

    user_msg = f"## Knowledge Base Context\n\n{context_text}\n\n## Question\n\n{question}"

    response = client.messages.create(
        model=MODEL,
        max_tokens=2048,
        system=system,
        messages=[{"role": "user", "content": user_msg}],
    )
    return response.content[0].text, advisors


def generate_linkedin(
    client: anthropic.Anthropic,
    topic: str,
    context_chunks: list[dict],
) -> tuple[str, list[str]]:
    """Generate a LinkedIn post draft from advisory board knowledge."""
    context_text = _format_context(context_chunks)
    advisors = _unique_advisors(context_chunks)
    guest_context = "\n".join(f"- {name}" for name in advisors)

    system = (
        "You are a LinkedIn content generator that creates thought-leadership posts "
        "backed by real expert insights from an advisory board.\n\n"
        "Generate a LinkedIn post draft with this structure:\n"
        "1. HOOK (1-2 lines): A provocative opening that stops the scroll. "
        "Use patterns like 'I studied advice from [N] experts and found...' "
        "or a contrarian take.\n"
        "2. INSIGHT (3-5 short paragraphs): The core insight, attributed to specific "
        "advisors. Use names and specific frameworks. Mix agreement and disagreement.\n"
        "3. YOUR TAKE (placeholder): Write '[YOUR TAKE: Add 2-3 sentences about how "
        "this applies to your own experience]'\n"
        "4. CTA: End with a question that invites engagement.\n\n"
        "Format for LinkedIn: short paragraphs, line breaks between each point, "
        "no bullet points, conversational tone. Aim for 150-250 words total.\n\n"
        f"Here are advisors whose insights are relevant:\n{guest_context}\n\n"
        "Important: Attribute insights to real advisors. Be specific."
    )

    user_msg = f"## Knowledge Base Context\n\n{context_text}\n\n## Topic\n\n{topic}"

    response = client.messages.create(
        model=MODEL,
        max_tokens=1500,
        system=system,
        messages=[{"role": "user", "content": user_msg}],
    )
    return response.content[0].text, advisors


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
    context_text = _format_context(context_chunks)

    system = (
        "You are a skilled writer drawing on an advisory board's collective knowledge. "
        f"Generate a {content_type} based on the user's prompt. "
        "Ground your writing in the provided knowledge base excerpts, "
        "weaving in insights and frameworks naturally. "
        "Attribute key ideas to specific advisors by name. "
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
