
from rag_pipeline.retriever import retrieve_documents

queries = [
    "What blood pressure threshold does WHO recommend for starting medication in adults?",
    "What are the symptoms of pneumonia?",
    "How can antimicrobial resistance be prevented?",
    "What is the winning lottery number for tomorrow?",
]

for query in queries:
    print("\nQUESTION:", query)
    results = retrieve_documents(query, top_k=3)

    for index, result in enumerate(results, start=1):
        metadata = result.get("metadata") or {}
        print(f"\nResult {index}")
        print("Title:", metadata.get("title"))
        print("Page:", metadata.get("page_number"))
        print("Cosine distance:", result.get("distance"))
        print("Text:", (result.get("text") or "")[:250])
