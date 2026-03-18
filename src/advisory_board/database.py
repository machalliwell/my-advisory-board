"""SQLite database layer with FTS5 full-text search."""

import sqlite3
import json
from pathlib import Path
from datetime import datetime, timezone

DEFAULT_DB_PATH = Path.home() / ".advisory-board" / "board.db"


def get_connection(db_path: Path | None = None) -> sqlite3.Connection:
    db_path = db_path or DEFAULT_DB_PATH
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db(conn: sqlite3.Connection) -> None:
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS advisors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            description TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS sources (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            advisor_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            source_type TEXT NOT NULL,  -- 'pdf', 'url', 'text', 'file'
            origin TEXT,               -- file path or URL
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (advisor_id) REFERENCES advisors(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS chunks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_id INTEGER NOT NULL,
            advisor_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            chunk_index INTEGER NOT NULL,
            metadata TEXT,  -- JSON blob for extra info
            FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE CASCADE,
            FOREIGN KEY (advisor_id) REFERENCES advisors(id) ON DELETE CASCADE
        );

        CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5(
            content,
            content_rowid='id',
            content='chunks'
        );

        -- Triggers to keep FTS in sync
        CREATE TRIGGER IF NOT EXISTS chunks_ai AFTER INSERT ON chunks BEGIN
            INSERT INTO chunks_fts(rowid, content) VALUES (new.id, new.content);
        END;

        CREATE TRIGGER IF NOT EXISTS chunks_ad AFTER DELETE ON chunks BEGIN
            INSERT INTO chunks_fts(chunks_fts, rowid, content) VALUES('delete', old.id, old.content);
        END;

        CREATE TRIGGER IF NOT EXISTS chunks_au AFTER UPDATE ON chunks BEGIN
            INSERT INTO chunks_fts(chunks_fts, rowid, content) VALUES('delete', old.id, old.content);
            INSERT INTO chunks_fts(rowid, content) VALUES (new.id, new.content);
        END;

        CREATE TABLE IF NOT EXISTS frameworks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            advisor_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            content TEXT NOT NULL,
            source_ids TEXT,  -- JSON array of source IDs
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (advisor_id) REFERENCES advisors(id) ON DELETE CASCADE
        );
    """)
    conn.commit()


# --- Advisor CRUD ---

def create_advisor(conn: sqlite3.Connection, name: str, description: str = "") -> int:
    cur = conn.execute(
        "INSERT INTO advisors (name, description) VALUES (?, ?)",
        (name, description),
    )
    conn.commit()
    return cur.lastrowid


def get_advisor(conn: sqlite3.Connection, name: str) -> dict | None:
    row = conn.execute("SELECT * FROM advisors WHERE name = ?", (name,)).fetchone()
    return dict(row) if row else None


def get_advisor_by_id(conn: sqlite3.Connection, advisor_id: int) -> dict | None:
    row = conn.execute("SELECT * FROM advisors WHERE id = ?", (advisor_id,)).fetchone()
    return dict(row) if row else None


def list_advisors(conn: sqlite3.Connection) -> list[dict]:
    rows = conn.execute("SELECT * FROM advisors ORDER BY name").fetchall()
    return [dict(r) for r in rows]


def delete_advisor(conn: sqlite3.Connection, name: str) -> bool:
    cur = conn.execute("DELETE FROM advisors WHERE name = ?", (name,))
    conn.commit()
    return cur.rowcount > 0


# --- Source CRUD ---

def add_source(
    conn: sqlite3.Connection,
    advisor_id: int,
    title: str,
    source_type: str,
    origin: str | None = None,
) -> int:
    cur = conn.execute(
        "INSERT INTO sources (advisor_id, title, source_type, origin) VALUES (?, ?, ?, ?)",
        (advisor_id, title, source_type, origin),
    )
    conn.commit()
    return cur.lastrowid


def list_sources(conn: sqlite3.Connection, advisor_id: int) -> list[dict]:
    rows = conn.execute(
        "SELECT * FROM sources WHERE advisor_id = ? ORDER BY created_at DESC",
        (advisor_id,),
    ).fetchall()
    return [dict(r) for r in rows]


# --- Chunk operations ---

def add_chunks(
    conn: sqlite3.Connection,
    source_id: int,
    advisor_id: int,
    texts: list[str],
    metadata: dict | None = None,
) -> int:
    meta_json = json.dumps(metadata) if metadata else None
    rows = [
        (source_id, advisor_id, text, i, meta_json)
        for i, text in enumerate(texts)
    ]
    conn.executemany(
        "INSERT INTO chunks (source_id, advisor_id, content, chunk_index, metadata) VALUES (?, ?, ?, ?, ?)",
        rows,
    )
    conn.commit()
    return len(rows)


def search_chunks(
    conn: sqlite3.Connection,
    query: str,
    advisor_id: int | None = None,
    limit: int = 10,
) -> list[dict]:
    """Full-text search across chunks, optionally filtered by advisor."""
    if advisor_id is not None:
        rows = conn.execute(
            """
            SELECT c.*, s.title as source_title, a.name as advisor_name,
                   rank
            FROM chunks_fts fts
            JOIN chunks c ON c.id = fts.rowid
            JOIN sources s ON s.id = c.source_id
            JOIN advisors a ON a.id = c.advisor_id
            WHERE chunks_fts MATCH ? AND c.advisor_id = ?
            ORDER BY rank
            LIMIT ?
            """,
            (query, advisor_id, limit),
        ).fetchall()
    else:
        rows = conn.execute(
            """
            SELECT c.*, s.title as source_title, a.name as advisor_name,
                   rank
            FROM chunks_fts fts
            JOIN chunks c ON c.id = fts.rowid
            JOIN sources s ON s.id = c.source_id
            JOIN advisors a ON a.id = c.advisor_id
            WHERE chunks_fts MATCH ?
            ORDER BY rank
            LIMIT ?
            """,
            (query, limit),
        ).fetchall()
    return [dict(r) for r in rows]


# --- Framework operations ---

def save_framework(
    conn: sqlite3.Connection,
    advisor_id: int,
    name: str,
    description: str,
    content: str,
    source_ids: list[int] | None = None,
) -> int:
    cur = conn.execute(
        "INSERT INTO frameworks (advisor_id, name, description, content, source_ids) VALUES (?, ?, ?, ?, ?)",
        (advisor_id, name, description, content, json.dumps(source_ids or [])),
    )
    conn.commit()
    return cur.lastrowid


def list_frameworks(conn: sqlite3.Connection, advisor_id: int) -> list[dict]:
    rows = conn.execute(
        "SELECT * FROM frameworks WHERE advisor_id = ? ORDER BY created_at DESC",
        (advisor_id,),
    ).fetchall()
    return [dict(r) for r in rows]


def get_framework(conn: sqlite3.Connection, framework_id: int) -> dict | None:
    row = conn.execute("SELECT * FROM frameworks WHERE id = ?", (framework_id,)).fetchone()
    return dict(row) if row else None
