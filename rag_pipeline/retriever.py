
from pathlib import Path

import chromadb
from FlagEmbedding import BGEM3FlagModel


DB_PATH = Path(__file__).resolve().parent.parent / "chroma_db"
COLLECTION_NAME = "health_guidelines_bge_m3"

# Provisional settings; validate against a broader evaluation set.
MAX_COSINE_DISTANCE = 0.40
CANDIDATE_MULTIPLIER = 10
DEFAULT_MIN_CHARS = 150

embedding_model = BGEM3FlagModel(
    "BAAI/bge-m3",
    use_fp16=False,
    device="cpu",
)

client = chromadb.PersistentClient(path=str(DB_PATH))
collection = client.get_collection(name=COLLECTION_NAME)


def add_documents(documents, metadatas, ids):
    """Embed documents with BGE-M3 and store them in ChromaDB."""
    if not documents:
        return

    output = embedding_model.encode(
        documents,
        batch_size=16,
        max_length=8192,
    )

    embeddings = output["dense_vecs"].tolist()

    collection.upsert(
        ids=ids,
        documents=documents,
        metadatas=metadatas,
        embeddings=embeddings,
    )


def retrieve_documents(
    query: str,
    top_k: int = 3,
    max_distance: float | None = MAX_COSINE_DISTANCE,
    min_chars: int = 0,
):
    """Retrieve BGE-M3 passages with optional length and distance filters."""
    query = query.strip()

    if not query or top_k < 1 or min_chars < 0:
        return []

    total_documents = collection.count()

    if total_documents == 0:
        return []

    output = embedding_model.encode(
        [query],
        batch_size=1,
        max_length=8192,
    )

    query_embedding = output["dense_vecs"].tolist()

    candidate_count = min(
        max(top_k * CANDIDATE_MULTIPLIER, top_k),
        total_documents,
    )

    results = collection.query(
        query_embeddings=query_embedding,
        n_results=candidate_count,
        include=["documents", "metadatas", "distances"],
    )

    documents = (results.get("documents") or [[]])[0]
    metadatas = (results.get("metadatas") or [[]])[0]
    distances = (results.get("distances") or [[]])[0]

    retrieved = []

    for document, metadata, distance in zip(
        documents, metadatas, distances
    ):
        if document is None or distance is None:
            continue

        distance = float(distance)
        text = document.strip()

        if max_distance is not None and distance > max_distance:
            continue

        if len(text) < min_chars:
            continue

        retrieved.append({
            "text": text,
            "metadata": metadata or {},
            "distance": distance,
        })

        if len(retrieved) >= top_k:
            break

    return retrieved
