
from pathlib import Path
import chromadb

DB_PATH = Path(__file__).resolve().parent / "chroma_db"
COLLECTION_NAME = "health_guidelines_bge_m3"

client = chromadb.PersistentClient(path=str(DB_PATH))
collection = client.get_collection(name=COLLECTION_NAME)

print("Total indexed chunks:", collection.count())

result = collection.get(
    where={"title": "Pneumonia - NHS"},
    limit=20,
    include=["documents", "metadatas"],
)

documents = result.get("documents") or []
metadatas = result.get("metadatas") or []
ids = result.get("ids") or []

print("NHS chunks found:", len(ids))

for i, (chunk_id, document, metadata) in enumerate(
    zip(ids, documents, metadatas), start=1
):
    metadata = metadata or {}
    print(f"\nResult {i}")
    print("ID:", chunk_id)
    print("Title:", metadata.get("title"))
    print("Page:", metadata.get("page_number"))
    print("Text:", (document or "")[:250])

