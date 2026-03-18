"""API routes for the Advisory Board web app."""

import json
import tempfile
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile
from pydantic import BaseModel

from advisory_board import database as db
from advisory_board import ingestion, llm
from .sessions import get_session_db

router = APIRouter()

# Locate wisdom_data.json
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
WISDOM_JSON = PROJECT_ROOT / "wisdom_data.json"


def get_db(request: Request):
    """Get the session's DB connection."""
    session_id = request.state.session_id
    conn = get_session_db(session_id)
    try:
        yield conn
    finally:
        conn.close()


# --- Pydantic models ---


class AdvisorCreate(BaseModel):
    name: str
    description: str = ""


class AskRequest(BaseModel):
    question: str
    advisor_name: str | None = None
    limit: int = 10


class LinkedInRequest(BaseModel):
    topic: str
    advisor_name: str | None = None
    limit: int = 15


class GenerateRequest(BaseModel):
    prompt: str
    advisor_name: str | None = None
    content_type: str = "blog post"
    limit: int = 15


class IngestURLRequest(BaseModel):
    url: str
    advisor_name: str
    title: str | None = None


# --- Advisors ---


@router.get("/advisors")
def list_advisors(conn=Depends(get_db)):
    advisors = db.list_advisors(conn)
    result = []
    for a in advisors:
        sources = db.list_sources(conn, a["id"])
        frameworks = db.list_frameworks(conn, a["id"])
        result.append({
            **a,
            "source_count": len(sources),
            "framework_count": len(frameworks),
        })
    return result


@router.post("/advisors")
def create_advisor(body: AdvisorCreate, conn=Depends(get_db)):
    existing = db.get_advisor(conn, body.name)
    if existing:
        raise HTTPException(400, f"Advisor '{body.name}' already exists")
    advisor_id = db.create_advisor(conn, body.name, body.description)
    return {"id": advisor_id, "name": body.name}


@router.delete("/advisors/{name}")
def delete_advisor(name: str, conn=Depends(get_db)):
    if db.delete_advisor(conn, name):
        return {"deleted": name}
    raise HTTPException(404, f"Advisor '{name}' not found")


# --- Ask ---


@router.post("/ask")
def ask_board(body: AskRequest, conn=Depends(get_db)):
    advisor_id = None
    advisor_name = None
    if body.advisor_name:
        adv = db.get_advisor(conn, body.advisor_name)
        if not adv:
            raise HTTPException(404, f"Advisor '{body.advisor_name}' not found")
        advisor_id = adv["id"]
        advisor_name = adv["name"]

    chunks = db.search_chunks(conn, body.question, advisor_id=advisor_id, limit=body.limit)
    if not chunks:
        return {
            "answer": "No relevant content found in the knowledge base. Try uploading some sources first.",
            "advisors_consulted": [],
            "chunk_count": 0,
        }

    client = llm.get_client()
    answer, advisors = llm.ask_board(client, body.question, chunks, advisor_name=advisor_name)
    return {
        "answer": answer,
        "advisors_consulted": advisors,
        "chunk_count": len(chunks),
    }


# --- LinkedIn ---


@router.post("/linkedin")
def generate_linkedin(body: LinkedInRequest, conn=Depends(get_db)):
    advisor_id = None
    if body.advisor_name:
        adv = db.get_advisor(conn, body.advisor_name)
        if not adv:
            raise HTTPException(404, f"Advisor '{body.advisor_name}' not found")
        advisor_id = adv["id"]

    chunks = db.search_chunks(conn, body.topic, advisor_id=advisor_id, limit=body.limit)
    if not chunks:
        return {
            "post": "No relevant content found. Try uploading some sources first.",
            "advisors_consulted": [],
            "chunk_count": 0,
        }

    client = llm.get_client()
    post, advisors = llm.generate_linkedin(client, body.topic, chunks)
    return {
        "post": post,
        "advisors_consulted": advisors,
        "chunk_count": len(chunks),
    }


# --- Generate ---


@router.post("/generate")
def generate_content(body: GenerateRequest, conn=Depends(get_db)):
    advisor_id = None
    if body.advisor_name:
        adv = db.get_advisor(conn, body.advisor_name)
        if not adv:
            raise HTTPException(404, f"Advisor '{body.advisor_name}' not found")
        advisor_id = adv["id"]

    chunks = db.search_chunks(conn, body.prompt, advisor_id=advisor_id, limit=body.limit)
    if not chunks:
        return {"content": "No relevant content found.", "chunk_count": 0}

    client = llm.get_client()
    result = llm.generate_content(client, body.prompt, chunks, content_type=body.content_type)
    return {"content": result, "chunk_count": len(chunks)}


# --- Ingest ---


@router.post("/ingest/file")
async def ingest_file(
    file: UploadFile,
    advisor_name: str,
    title: str | None = None,
    conn=Depends(get_db),
):
    adv = db.get_advisor(conn, advisor_name)
    if not adv:
        raise HTTPException(404, f"Advisor '{advisor_name}' not found")

    # Save uploaded file to temp location
    suffix = Path(file.filename).suffix if file.filename else ".txt"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        auto_title, source_type, origin, chunks = ingestion.ingest_source(tmp_path)
        final_title = title or (file.filename if file.filename else auto_title)
        source_id = db.add_source(conn, adv["id"], final_title, source_type, origin)
        count = db.add_chunks(conn, source_id, adv["id"], chunks)

        scores = [ingestion.score_advice_density(c) for c in chunks]
        avg_score = sum(scores) / len(scores) if scores else 0

        return {
            "title": final_title,
            "chunks": count,
            "source_type": source_type,
            "advice_density_avg": round(avg_score, 1),
        }
    finally:
        Path(tmp_path).unlink(missing_ok=True)


@router.post("/ingest/url")
def ingest_url(body: IngestURLRequest, conn=Depends(get_db)):
    adv = db.get_advisor(conn, body.advisor_name)
    if not adv:
        raise HTTPException(404, f"Advisor '{body.advisor_name}' not found")

    auto_title, source_type, origin, chunks = ingestion.ingest_source(body.url)
    final_title = body.title or auto_title
    source_id = db.add_source(conn, adv["id"], final_title, source_type, origin)
    count = db.add_chunks(conn, source_id, adv["id"], chunks)
    return {"title": final_title, "chunks": count, "source_type": source_type}


# --- Sources & Frameworks ---


@router.get("/sources")
def list_sources(advisor_name: str | None = None, conn=Depends(get_db)):
    if advisor_name:
        adv = db.get_advisor(conn, advisor_name)
        if not adv:
            raise HTTPException(404, f"Advisor '{advisor_name}' not found")
        return db.list_sources(conn, adv["id"])

    rows = conn.execute(
        "SELECT s.*, a.name as advisor_name FROM sources s "
        "JOIN advisors a ON a.id = s.advisor_id ORDER BY s.created_at DESC"
    ).fetchall()
    return [dict(r) for r in rows]


@router.get("/topics")
def list_topics():
    if not WISDOM_JSON.exists():
        return {"topics": {}}
    with open(WISDOM_JSON) as f:
        data = json.load(f)
    return {"topics": data.get("tp", data.get("topics", {}))}


# --- Stats ---


@router.get("/stats")
def get_stats(conn=Depends(get_db)):
    advisors = db.list_advisors(conn)
    total_sources = 0
    total_chunks = 0
    for a in advisors:
        total_sources += len(db.list_sources(conn, a["id"]))
    row = conn.execute("SELECT COUNT(*) as cnt FROM chunks").fetchone()
    total_chunks = row["cnt"] if row else 0
    return {
        "advisors": len(advisors),
        "sources": total_sources,
        "chunks": total_chunks,
    }
