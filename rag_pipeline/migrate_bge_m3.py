
import json
from pathlib import Path

import chromadb
from FlagEmbedding import BGEM3FlagModel

PROJECT_ROOT = Path(__file__).resolve().parent.parent
CHUNKS_PATH = PROJECT_ROOT / "data" / "processed" / "chunks.jsonl"
DB_PATH = PROJECT_ROOT / "chroma_db"

COLLECTION_NAME = "health_guidelines_bge_m3"
BATCH_SIZE = 32


def main():
    if not CHUNKS_PATH.exists():
        raise FileNotFoundError(f"Chunks file not found: {CHUNKS_PATH}")

    client = chromadb.PersistentClient(path=str(DB_PATH))
    collection = client.get_or_create_collection(
        name=COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"},
    )

    # Read existing IDs so completed chunks are skipped.
    existing_ids = set()
    for offset in range(0, collection.count(), 1000):
        result = collection.get(
            limit=1000,
            offset=offset,
            include=[],
        )
        existing_ids.update(result["ids"])

    print("Existing BGE-M3 chunks:", len(existing_ids))
    print("Loading BGE-M3 on CPU...")

    model = BGEM3FlagModel(
        "BAAI/bge-m3",
        use_fp16=False,
        device="cpu",
    )

    documents = []
    metadatas = []
    ids = []
    skipped = 0
    processed = 0

    def flush_batch():
        nonlocal documents, metadatas, ids, processed

        if not documents:
            return

        output = model.encode(
            documents,
            batch_size=BATCH_SIZE,
            max_length=8192,
        )
        embeddings = output["dense_vecs"].tolist()

        collection.upsert(
            ids=ids,
            documents=documents,
            metadatas=metadatas,
            embeddings=embeddings,
        )

        processed += len(documents)
        existing_ids.update(ids)

        print(
            f"Newly embedded: {processed} | "
            f"Collection count: {collection.count()}"
        )

        documents, metadatas, ids = [], [], []

    with CHUNKS_PATH.open("r", encoding="utf-8") as file:
        for line in file:
            if not line.strip():
                continue

            row = json.loads(line)
            text = row.get("text", "").strip()
            metadata = row.get("metadata") or {}

            if not text:
                continue

            source_id = str(metadata.get("source_id", "unknown"))
            relative_path = str(metadata.get("relative_path", ""))
            page = str(metadata.get("page_number", "unknown"))
            start_index = str(metadata.get("start_index", 0))
            record_id = f"{source_id}|{relative_path}|{page}|{start_index}"

            if record_id in existing_ids:
                skipped += 1
                continue

            clean_metadata = {}
            for key, value in metadata.items():
                if value is None:
                    continue
                if isinstance(value, (str, int, float, bool)):
                    clean_metadata[key] = value
                else:
                    clean_metadata[key] = str(value)

            documents.append(text)
            metadatas.append(clean_metadata)
            ids.append(record_id)

            if len(documents) >= BATCH_SIZE:
                flush_batch()

    flush_batch()

    print("\nBGE-M3 migration finished.")
    print("Existing chunks skipped:", skipped)
    print("New chunks embedded:", processed)
    print("BGE-M3 collection count:", collection.count())
    print("Existing MiniLM collection was not modified.")


if __name__ == "__main__":
    main()
