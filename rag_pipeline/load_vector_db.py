
import json
from pathlib import Path

from rag_pipeline.retriever import add_documents, collection


PROJECT_ROOT = Path(__file__).resolve().parent.parent
CHUNKS_PATH = PROJECT_ROOT / "data" / "processed" / "chunks.jsonl"

BATCH_SIZE = 128


def main():
    if not CHUNKS_PATH.exists():
        raise FileNotFoundError(
            f"Chunks file not found: {CHUNKS_PATH}"
        )

    documents = []
    metadatas = []
    ids = []
    total = 0

    # Use deterministic IDs so reloading updates existing records.
    with CHUNKS_PATH.open("r", encoding="utf-8") as file:
        for line_number, line in enumerate(file, start=1):
            if not line.strip():
                continue

            row = json.loads(line)
            text = row.get("text", "").strip()
            metadata = row.get("metadata", {})

            if not text:
                continue

            source_id = str(metadata.get("source_id", "unknown"))
            relative_path = str(metadata.get("relative_path", ""))
            page = str(metadata.get("page_number", "unknown"))
            start_index = str(metadata.get("start_index", 0))

            record_id = (
                f"{source_id}|{relative_path}|{page}|{start_index}"
            )

            # Chroma metadata values must be scalar types.
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
                add_documents(documents, metadatas, ids)
                total += len(documents)
                print(f"Loaded records: {total}")

                documents, metadatas, ids = [], [], []

    if documents:
        add_documents(documents, metadatas, ids)
        total += len(documents)

    print("\nVector database loading finished.")
    print("Records processed:", total)
    print("Records currently in collection:", collection.count())
    print("Database path:", PROJECT_ROOT / "chroma_db")


if __name__ == "__main__":
    main()
