"""Tests for the ingestion module."""

import pytest
from advisory_board.ingestion import chunk_text


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
