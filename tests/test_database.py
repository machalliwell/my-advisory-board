"""Tests for the database layer."""

import sqlite3
import pytest
from advisory_board.database import (
    init_db,
    create_advisor,
    get_advisor,
    list_advisors,
    delete_advisor,
    add_source,
    list_sources,
    add_chunks,
    search_chunks,
    save_framework,
    list_frameworks,
)


@pytest.fixture
def conn():
    """Create an in-memory database for testing."""
    c = sqlite3.connect(":memory:")
    c.row_factory = sqlite3.Row
    init_db(c)
    return c


def test_create_and_get_advisor(conn):
    aid = create_advisor(conn, "Test Advisor", "A test advisor")
    assert aid is not None
    adv = get_advisor(conn, "Test Advisor")
    assert adv["name"] == "Test Advisor"
    assert adv["description"] == "A test advisor"


def test_list_advisors(conn):
    create_advisor(conn, "Alpha")
    create_advisor(conn, "Beta")
    advisors = list_advisors(conn)
    names = [a["name"] for a in advisors]
    assert "Alpha" in names
    assert "Beta" in names


def test_delete_advisor(conn):
    create_advisor(conn, "ToDelete")
    assert delete_advisor(conn, "ToDelete")
    assert get_advisor(conn, "ToDelete") is None
    assert not delete_advisor(conn, "NonExistent")


def test_sources(conn):
    aid = create_advisor(conn, "Advisor1")
    sid = add_source(conn, aid, "Test Source", "pdf", "/path/to/file.pdf")
    sources = list_sources(conn, aid)
    assert len(sources) == 1
    assert sources[0]["title"] == "Test Source"


def test_chunks_and_fts(conn):
    aid = create_advisor(conn, "Advisor1")
    sid = add_source(conn, aid, "Test Source", "text", None)
    texts = [
        "Machine learning is a subset of artificial intelligence.",
        "Python is a popular programming language for data science.",
        "The stock market experienced significant volatility this quarter.",
    ]
    add_chunks(conn, sid, aid, texts)

    results = search_chunks(conn, "machine learning artificial intelligence", advisor_id=aid)
    assert len(results) > 0
    assert "machine learning" in results[0]["content"].lower()


def test_search_across_advisors(conn):
    aid1 = create_advisor(conn, "Advisor1")
    aid2 = create_advisor(conn, "Advisor2")
    sid1 = add_source(conn, aid1, "Source1", "text", None)
    sid2 = add_source(conn, aid2, "Source2", "text", None)
    add_chunks(conn, sid1, aid1, ["Leadership requires empathy and vision."])
    add_chunks(conn, sid2, aid2, ["Effective leadership starts with listening."])

    results = search_chunks(conn, "leadership")
    assert len(results) == 2

    results = search_chunks(conn, "leadership", advisor_id=aid1)
    assert len(results) == 1


def test_frameworks(conn):
    aid = create_advisor(conn, "Advisor1")
    fid = save_framework(conn, aid, "Test Framework", "A test", "Content here", [1, 2])
    frameworks = list_frameworks(conn, aid)
    assert len(frameworks) == 1
    assert frameworks[0]["name"] == "Test Framework"
