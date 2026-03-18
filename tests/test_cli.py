"""Tests for CLI commands (non-API ones)."""

import json
import tempfile
from pathlib import Path
from unittest.mock import patch

from click.testing import CliRunner
from advisory_board.cli import main
from advisory_board import database as db


def _temp_db():
    """Create a temp DB path for isolated tests."""
    tmp = tempfile.mktemp(suffix=".db")
    return Path(tmp)


def test_advisor_add_and_list():
    runner = CliRunner()
    tmp_path = _temp_db()
    with patch.object(db, "DEFAULT_DB_PATH", tmp_path):
        result = runner.invoke(main, ["advisor", "add", "Test Person", "-d", "A test"])
        assert result.exit_code == 0
        assert "Added advisor: Test Person" in result.output

        result = runner.invoke(main, ["advisor", "list"])
        assert "Test Person" in result.output
    tmp_path.unlink(missing_ok=True)


def test_import_wisdom_single_advisor():
    runner = CliRunner()
    with runner.isolated_filesystem():
        # Create a minimal wisdom_data.json
        data = {
            "ep": [
                {"id": "test-guest", "g": "Test Guest", "t": "Test Episode", "d": "2024-01-01", "yt": "", "kw": ["testing"]},
            ],
            "wc": [
                {"e": "test-guest", "g": "Test Guest", "t": "This is key advice about leadership and strategy.", "kw": ["leadership"]},
                {"e": "test-guest", "g": "Test Guest", "t": "The most important framework is prioritization.", "kw": ["framework"]},
            ],
            "tp": {"leadership": ["test-guest"], "strategy": ["test-guest"]},
        }
        with open("test_wisdom.json", "w") as f:
            json.dump(data, f)

        result = runner.invoke(main, ["import-wisdom", "test_wisdom.json", "-a", "Test Board"])
        assert result.exit_code == 0
        assert "2 wisdom chunks" in result.output
        assert "Done!" in result.output


def test_import_wisdom_per_guest():
    runner = CliRunner()
    with runner.isolated_filesystem():
        data = {
            "ep": [
                {"id": "alice", "g": "Alice", "t": "Alice's Episode", "d": "2024-01-01", "yt": "", "kw": []},
                {"id": "bob", "g": "Bob", "t": "Bob's Episode", "d": "2024-01-01", "yt": "", "kw": []},
            ],
            "wc": [
                {"e": "alice", "g": "Alice", "t": "Alice says leadership matters.", "kw": ["leadership"]},
                {"e": "bob", "g": "Bob", "t": "Bob recommends hiring slowly.", "kw": ["hiring"]},
            ],
            "tp": {},
        }
        with open("test_wisdom.json", "w") as f:
            json.dump(data, f)

        result = runner.invoke(main, ["import-wisdom", "test_wisdom.json"])
        assert result.exit_code == 0
        assert "2 advisors" in result.output


def test_topics_command():
    runner = CliRunner()
    with runner.isolated_filesystem():
        data = {
            "ep": [],
            "wc": [],
            "tp": {
                "leadership": ["ep1", "ep2"],
                "hiring": ["ep3"],
                "product strategy": ["ep1", "ep4", "ep5"],
            },
        }
        with open("test_wisdom.json", "w") as f:
            json.dump(data, f)

        result = runner.invoke(main, ["topics", "test_wisdom.json"])
        assert result.exit_code == 0
        assert "3 topics" in result.output
        assert "leadership (2 episodes)" in result.output
        assert "hiring (1 episodes)" in result.output
