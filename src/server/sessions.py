"""Session management: per-visitor SQLite databases."""

import shutil
import time
import uuid
from pathlib import Path

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from advisory_board import database as db

DATA_DIR = Path("/tmp/advisory-board-data/sessions")
TEMPLATE_DB = Path("/tmp/advisory-board-data/template.db")
SESSION_COOKIE = "ab_session"
SESSION_MAX_AGE = 7 * 24 * 3600  # 7 days


def get_data_dir() -> Path:
    """Get the data directory, creating it if needed."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    return DATA_DIR


def get_session_db_path(session_id: str) -> Path:
    """Get the DB path for a session."""
    return get_data_dir() / session_id / "board.db"


def get_session_db(session_id: str):
    """Get or create a DB connection for a session."""
    db_path = get_session_db_path(session_id)
    if not db_path.exists():
        db_path.parent.mkdir(parents=True, exist_ok=True)
        # Copy template DB if available (pre-seeded with wisdom data)
        if TEMPLATE_DB.exists():
            shutil.copy2(TEMPLATE_DB, db_path)
            conn = db.get_connection(db_path)
            return conn
    conn = db.get_connection(db_path)
    db.init_db(conn)
    return conn


def build_template_db(wisdom_json_path: Path) -> None:
    """Pre-build a template DB with wisdom data for fast session creation."""
    import json

    if TEMPLATE_DB.exists():
        return

    TEMPLATE_DB.parent.mkdir(parents=True, exist_ok=True)
    conn = db.get_connection(TEMPLATE_DB)
    db.init_db(conn)

    if not wisdom_json_path.exists():
        conn.close()
        return

    with open(wisdom_json_path) as f:
        data = json.load(f)

    episodes = data.get("ep", data.get("episodes", []))
    wisdom_chunks = data.get("wc", data.get("wisdom_chunks", []))

    # Group chunks by guest
    guest_chunks: dict[str, list[str]] = {}
    for wc in wisdom_chunks:
        guest = wc.get("g", wc.get("guest", "Unknown"))
        text = wc.get("t", wc.get("text", ""))
        if text.strip():
            guest_chunks.setdefault(guest, []).append(text)

    # Create advisors and ingest chunks
    for guest, chunks in guest_chunks.items():
        advisor_id = db.create_advisor(conn, guest)
        # Find matching episode for title
        ep_title = guest
        for ep in episodes:
            if ep.get("g", ep.get("guest", "")) == guest:
                ep_title = ep.get("t", ep.get("title", guest))
                break
        source_id = db.add_source(conn, advisor_id, ep_title, "podcast", "")
        db.add_chunks(conn, source_id, advisor_id, chunks)

    conn.close()


def cleanup_old_sessions(max_age: int = SESSION_MAX_AGE) -> int:
    """Delete sessions older than max_age seconds. Returns count deleted."""
    data_dir = get_data_dir()
    now = time.time()
    deleted = 0
    for session_dir in data_dir.iterdir():
        if session_dir.is_dir():
            db_path = session_dir / "board.db"
            if db_path.exists():
                age = now - db_path.stat().st_mtime
                if age > max_age:
                    shutil.rmtree(session_dir)
                    deleted += 1
    return deleted


class SessionMiddleware(BaseHTTPMiddleware):
    """Middleware that assigns a session cookie to each visitor."""

    async def dispatch(self, request: Request, call_next) -> Response:
        session_id = request.cookies.get(SESSION_COOKIE)
        if not session_id:
            session_id = str(uuid.uuid4())

        # Attach session_id to request state
        request.state.session_id = session_id

        response = await call_next(request)

        # Set cookie on response
        response.set_cookie(
            SESSION_COOKIE,
            session_id,
            max_age=SESSION_MAX_AGE,
            httponly=True,
            samesite="lax",
        )
        return response
