"""FastAPI application for the Advisory Board web UI."""

import os
from contextlib import asynccontextmanager
from pathlib import Path

import uvicorn
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from . import routes
from .sessions import (
    SessionMiddleware,
    build_template_db,
    cleanup_old_sessions,
    get_session_db,
)

load_dotenv()

# Locate wisdom_data.json relative to the project root
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
WISDOM_JSON = PROJECT_ROOT / "wisdom_data.json"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown tasks."""
    # Pre-build template DB from wisdom data
    if WISDOM_JSON.exists():
        build_template_db(WISDOM_JSON)
    # Clean up old sessions
    cleanup_old_sessions()
    yield


app = FastAPI(title="Advisory Board", lifespan=lifespan)

# Session middleware
app.add_middleware(SessionMiddleware)

# CORS for local dev (Vite on :5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db(request: Request):
    """Dependency: get the session's DB connection."""
    session_id = request.state.session_id
    conn = get_session_db(session_id)
    try:
        yield conn
    finally:
        conn.close()


# Register API routes
app.include_router(routes.router, prefix="/api", dependencies=[])

# Serve static frontend (built Vite output)
STATIC_DIR = PROJECT_ROOT / "static"
if STATIC_DIR.exists():
    app.mount("/", StaticFiles(directory=str(STATIC_DIR), html=True), name="static")


def main():
    """Entry point for advisory-board-server command."""
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(
        "server.app:app",
        host="0.0.0.0",
        port=port,
        reload=os.environ.get("DEV", "") == "1",
    )


if __name__ == "__main__":
    main()
