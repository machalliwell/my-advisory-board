"""Tests for the FastAPI server routes."""

import json
import shutil
import tempfile
from pathlib import Path
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from server.app import app
from server.sessions import DATA_DIR, TEMPLATE_DB


@pytest.fixture(autouse=True)
def clean_session_data():
    """Use a temp dir for session data during tests."""
    import server.sessions as sess
    orig_data = sess.DATA_DIR
    orig_template = sess.TEMPLATE_DB
    tmp = Path(tempfile.mkdtemp())
    sess.DATA_DIR = tmp / "sessions"
    sess.TEMPLATE_DB = tmp / "template.db"
    yield
    shutil.rmtree(tmp, ignore_errors=True)
    sess.DATA_DIR = orig_data
    sess.TEMPLATE_DB = orig_template


@pytest.fixture
def client():
    return TestClient(app)


def test_get_stats(client):
    resp = client.get("/api/stats")
    assert resp.status_code == 200
    data = resp.json()
    assert "advisors" in data
    assert "chunks" in data


def test_create_and_list_advisors(client):
    resp = client.post("/api/advisors", json={"name": "Test Person", "description": "A test"})
    assert resp.status_code == 200
    assert resp.json()["name"] == "Test Person"

    resp = client.get("/api/advisors")
    assert resp.status_code == 200
    names = [a["name"] for a in resp.json()]
    assert "Test Person" in names


def test_create_duplicate_advisor(client):
    client.post("/api/advisors", json={"name": "Dupe"})
    resp = client.post("/api/advisors", json={"name": "Dupe"})
    assert resp.status_code == 400


def test_delete_advisor(client):
    client.post("/api/advisors", json={"name": "ToDelete"})
    resp = client.delete("/api/advisors/ToDelete")
    assert resp.status_code == 200
    assert resp.json()["deleted"] == "ToDelete"


def test_delete_nonexistent_advisor(client):
    resp = client.delete("/api/advisors/Nobody")
    assert resp.status_code == 404


def test_ask_no_content(client):
    resp = client.post("/api/ask", json={"question": "What is leadership?"})
    assert resp.status_code == 200
    assert resp.json()["chunk_count"] == 0


def test_topics_endpoint(client):
    resp = client.get("/api/topics")
    assert resp.status_code == 200
    assert "topics" in resp.json()


def test_sources_empty(client):
    resp = client.get("/api/sources")
    assert resp.status_code == 200
    assert resp.json() == []
