"""Tests for the ingestion module."""

import pytest
from advisory_board.ingestion import chunk_text, score_advice_density


def test_chunk_text_basic():
    text = "Paragraph one.\n\nParagraph two.\n\nParagraph three."
    chunks = chunk_text(text, chunk_size=50, overlap=10)
    assert len(chunks) >= 1
    assert "Paragraph one" in chunks[0]


def test_chunk_text_long():
    paragraphs = [f"This is paragraph number {i} with some content." for i in range(20)]
    text = "\n\n".join(paragraphs)
    chunks = chunk_text(text, chunk_size=200, overlap=50)
    assert len(chunks) > 1
    # All content should be present across chunks
    full = " ".join(chunks)
    assert "paragraph number 0" in full
    assert "paragraph number 19" in full


def test_chunk_text_empty():
    assert chunk_text("") == []
    assert chunk_text("   \n\n  ") == []


def test_score_advice_density_high():
    text = (
        "The most important framework for prioritization is RICE. "
        "My biggest lesson was that you should always ship the MVP first. "
        "The key principle is to hire for growth and leadership potential. "
        "This strategy and approach helped us avoid the worst mistakes."
    )
    score = score_advice_density(text)
    assert score >= 8  # Many signal words


def test_score_advice_density_low():
    text = "The weather was nice today. We went for a walk in the park."
    score = score_advice_density(text)
    assert score <= 2


def test_score_advice_density_word_count_bonus():
    short = "This is a key framework for leadership."
    long = ("This is a key framework for leadership. " * 30)
    short_score = score_advice_density(short)
    long_score = score_advice_density(long)
    assert long_score > short_score  # Bonus for word count
