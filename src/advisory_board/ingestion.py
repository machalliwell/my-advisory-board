"""Content ingestion: PDF, URL, and text file parsing + chunking."""

import re
from pathlib import Path

import requests
from bs4 import BeautifulSoup


def chunk_text(text: str, chunk_size: int = 1500, overlap: int = 200) -> list[str]:
    """Split text into overlapping chunks by paragraph boundaries."""
    paragraphs = re.split(r"\n\s*\n", text.strip())
    chunks = []
    current = ""

    for para in paragraphs:
        para = para.strip()
        if not para:
            continue
        if len(current) + len(para) + 1 > chunk_size and current:
            chunks.append(current.strip())
            # Keep overlap from end of current chunk
            words = current.split()
            overlap_words = []
            char_count = 0
            for w in reversed(words):
                char_count += len(w) + 1
                if char_count > overlap:
                    break
                overlap_words.insert(0, w)
            current = " ".join(overlap_words) + "\n\n" + para if overlap_words else para
        else:
            current = current + "\n\n" + para if current else para

    if current.strip():
        chunks.append(current.strip())

    return chunks


def read_pdf(path: str) -> str:
    """Extract text from a PDF file."""
    from PyPDF2 import PdfReader

    reader = PdfReader(path)
    pages = []
    for page in reader.pages:
        text = page.extract_text()
        if text:
            pages.append(text)
    return "\n\n".join(pages)


def read_url(url: str) -> tuple[str, str]:
    """Fetch and extract main text content from a URL. Returns (title, text)."""
    resp = requests.get(url, timeout=30, headers={"User-Agent": "AdvisoryBoard/0.1"})
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")

    # Remove scripts, styles, nav, footer
    for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
        tag.decompose()

    title = soup.title.string.strip() if soup.title and soup.title.string else url

    # Try to find main content
    main = soup.find("main") or soup.find("article") or soup.find("body")
    text = main.get_text(separator="\n", strip=True) if main else soup.get_text(separator="\n", strip=True)

    return title, text


def read_text_file(path: str) -> str:
    """Read a plain text or markdown file."""
    return Path(path).read_text(encoding="utf-8")


ADVICE_SIGNALS = [
    'framework', 'principle', 'rule', 'lesson', 'mistake', 'advice', 'recommend',
    'strategy', 'tactic', 'approach', 'important', 'critical', 'key', 'secret',
    'never', 'always', 'best', 'worst', 'should', 'biggest', 'number one',
    'first thing', 'most important', 'what i learned', "here's what", 'tip',
    'playbook', 'model', 'how to', 'step', 'process', 'system', 'method',
    'hire', 'fire', 'prioriti', 'roadmap', 'metric', 'okr', 'kpi',
    'retention', 'growth', 'product market fit', 'stakeholder', 'leadership',
    'decision', 'trade-off', 'tradeoff', 'scope', 'ship', 'launch', 'mvp',
]


def score_advice_density(text: str) -> int:
    """Score a chunk for how advice-rich it is, using signal words."""
    text_lower = text.lower()
    score = sum(1 for s in ADVICE_SIGNALS if s in text_lower)
    word_count = len(text.split())
    if word_count > 100:
        score += 2
    if word_count > 200:
        score += 2
    return score


def ingest_source(path_or_url: str) -> tuple[str, str, str, list[str]]:
    """
    Ingest a source and return (title, source_type, origin, chunks).
    Automatically detects PDFs, URLs, and text files.
    """
    if path_or_url.startswith(("http://", "https://")):
        title, text = read_url(path_or_url)
        return title, "url", path_or_url, chunk_text(text)

    path = Path(path_or_url)
    if not path.exists():
        raise FileNotFoundError(f"File not found: {path_or_url}")

    if path.suffix.lower() == ".pdf":
        text = read_pdf(str(path))
        title = path.stem.replace("_", " ").replace("-", " ").title()
        return title, "pdf", str(path.resolve()), chunk_text(text)

    # Default: treat as text
    text = read_text_file(str(path))
    title = path.stem.replace("_", " ").replace("-", " ").title()
    source_type = "text"
    return title, source_type, str(path.resolve()), chunk_text(text)
