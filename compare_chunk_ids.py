
import json
from pathlib import Path
import chromadb

ROOT = Path(__file__).resolve().parent
CHUNKS_FILE = ROOT / "data" / "processed" / "chunks.jsonl"
DB_PATH = ROOT / "chroma_db"

client = chromadb.PersistentClient(path=str(DB_PATH))
collection = client.get_collection(
    name="health_guidelines_bge_m3"
)

with CHUNKS_FILE.open("r", encoding="utf-8") as f:
    first_chunk = json.loads(next(line for line in f if line.strip()))

processed_id = first_chunk["id"]

result = collection.get(
    limit=5,
    include=["metadatas"],
)

print("Processed sample ID:", repr(processed_id))
print("Processed ID type:", type(processed_id).__name__)

print("\nChromaDB sample IDs:")
for chunk_id in result["ids"]:
    print(repr(chunk_id), type(chunk_id).__name__)

print("\nDoes ChromaDB contain the sample ID?")
check = collection.get(ids=[processed_id])
print("Found:", len(check["ids"]) > 0)
