
import json
import re
import sqlite3
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parent.parent
CHUNKS_PATH = PROJECT_ROOT / "data" / "processed" / "chunks.jsonl"
INDEX_PATH = PROJECT_ROOT / "keyword_index.sqlite3"


def build_index(force_rebuild: bool = False):
    """Build a reusable SQLite full-text index from existing chunks."""

    if not CHUNKS_PATH.exists():
        raise FileNotFoundError(f"Chunks file not found: {CHUNKS_PATH}")

    if INDEX_PATH.exists() and not force_rebuild:
        with sqlite3.connect(INDEX_PATH) as connection:
            exists = connection.execute(
                "SELECT 1 FROM sqlite_master "
                "WHERE type='table' AND name='chunks_fts'"
            ).fetchone()

            if exists:
                return

    if INDEX_PATH.exists():
        INDEX_PATH.unlink()

    with sqlite3.connect(INDEX_PATH) as connection:
        connection.execute(
            """
            CREATE VIRTUAL TABLE chunks_fts USING fts5(
                chunk_id UNINDEXED,
                text,
                title,
                topic,
                tokenize='unicode61'
            )
            """
        )

        batch = []

        with CHUNKS_PATH.open(encoding="utf-8") as file:
            for line in file:
                chunk = json.loads(line)
                metadata = chunk.get("metadata") or {}

                batch.append(
                    (
                        chunk.get("id", ""),
                        chunk.get("text", ""),
                        metadata.get("title", ""),
                        metadata.get("topic", ""),
                    )
                )

                if len(batch) >= 500:
                    connection.executemany(
                        """
                        INSERT INTO chunks_fts
                        (chunk_id, text, title, topic)
                        VALUES (?, ?, ?, ?)
                        """,
                        batch,
                    )
                    batch.clear()

        if batch:
            connection.executemany(
                """
                INSERT INTO chunks_fts
                (chunk_id, text, title, topic)
                VALUES (?, ?, ?, ?)
                """,
                batch,
            )

        connection.commit()


def keyword_search(query: str, top_k: int = 10) -> list[dict]:
    """Search existing chunks using SQLite full-text search."""

    stop_words = {
        "what", "are", "the", "is", "a", "an", "of",
        "for", "in", "on", "to", "does", "do", "and",
        "how", "can", "with", "recommend", "about",
    }

    query_terms = [
        term
        for term in re.findall(r"[A-Za-z0-9]+", query.lower())
        if term not in stop_words
    ]

    if not query_terms or top_k < 1:
        return []

    fts_query = " AND ".join(
    '"' + term.replace('"', '""') + '"'
    for term in query_terms
)

    build_index()

    with sqlite3.connect(INDEX_PATH) as connection:
        rows = connection.execute(
            """
            SELECT chunk_id, text, title, topic, bm25(chunks_fts)
            FROM chunks_fts
            WHERE chunks_fts MATCH ?
            ORDER BY bm25(chunks_fts)
            LIMIT ?
            """,
            (fts_query, top_k),
        ).fetchall()

    return [
        {
            "id": row[0],
            "text": row[1],
            "title": row[2],
            "topic": row[3],
            "keyword_score": row[4],
        }
        for row in rows
    ]
