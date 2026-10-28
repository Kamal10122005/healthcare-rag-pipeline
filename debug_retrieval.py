from pathlib import Path

import chromadb
from FlagEmbedding import BGEM3FlagModel

DB_PATH = Path(__file__).resolve().parent / "chroma_db"
COLLECTION_NAME = "health_guidelines_bge_m3"

client = chromadb.PersistentClient(path=str(DB_PATH))
collection = client.get_collection(name=COLLECTION_NAME)

model = BGEM3FlagModel(
    "BAAI/bge-m3",
    use_fp16=False,
    device="cpu",
)

queries = [
    "What are the symptoms of pneumonia?",
    "What signs and symptoms indicate pneumonia in adults and children?",
]

for query in queries:
    print("\n" + "=" * 80)
    print("QUESTION:", query)

    encoded = model.encode(
        [query],
        batch_size=1,
        max_length=8192,
    )

    results = collection.query(
        query_embeddings=encoded["dense_vecs"].tolist(),
        n_results=10,
        include=["documents", "metadatas", "distances"],
    )

    documents = (results.get("documents") or [[]])[0]
    metadatas = (results.get("metadatas") or [[]])[0]
    distances = (results.get("distances") or [[]])[0]

    for i, (document, metadata, distance) in enumerate(
        zip(documents, metadatas, distances), start=1
    ):
        metadata = metadata or {}
        print(f"\nResult {i} | Distance: {distance}")
        print("Title:", metadata.get("title"))
        print("Page:", metadata.get("page_number"))
        print("Text:", (document or "")[:600])