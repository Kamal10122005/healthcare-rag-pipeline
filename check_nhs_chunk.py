
from pathlib import Path
import chromadb

DB_PATH = Path(__file__).resolve().parent / "chroma_db"
COLLECTION_NAME = "health_guidelines_bge_m3"
CHUNK_ID = "73c0cb5dd61cb8f5f3aa"

client = chromadb.PersistentClient(path=str(DB_PATH))
collection = client.get_collection(name=COLLECTION_NAME)

print("Total indexed chunks:", collection.count())

result = collection.get(
    ids=[CHUNK_ID],
    include=["documents", "metadatas"],
)

documents = result.get("documents") or []
metadatas = result.get("metadatas") or []

if not documents:
    print("\nNHS pneumonia chunk NOT FOUND in ChromaDB.")
else:
    print("\nNHS pneumonia chunk FOUND in ChromaDB.")
    print("Title:", metadatas[0].get("title"))
    print("Page:", metadatas[0].get("page_number"))
    print("Text:", documents[0][:700])
