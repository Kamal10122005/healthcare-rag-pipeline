from pathlib import Path

import chromadb

DB_PATH = Path(__file__).resolve().parent / "chroma_db"
COLLECTION_NAME = "health_guidelines_bge_m3"

client = chromadb.PersistentClient(path=str(DB_PATH))
collection = client.get_collection(name=COLLECTION_NAME)

print("Total indexed chunks:", collection.count())

results = collection.get(
    where_document={"$contains": "pneumonia"},
    limit=10,
    include=["documents", "metadatas"],
)

documents = results.get("documents") or []
metadatas = results.get("metadatas") or []

print("\nPneumonia keyword matches:", len(documents))

for i, (document, metadata) in enumerate(
    zip(documents, metadatas), start=1
):
    metadata = metadata or {}
    print(f"\nResult {i}")
    print("Title:", metadata.get("title"))
    print("Page:", metadata.get("page_number"))
    print("Text:", (document or "")[:400])