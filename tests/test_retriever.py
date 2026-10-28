
from rag_pipeline.retriever import (
    add_documents,
    retrieve_documents,
)


def main():
    documents = [
        "Handwashing with soap and clean water helps reduce the spread of infections.",
        "Adults should discuss recommended vaccinations with a qualified healthcare professional.",
        "Persistent chest pain or severe difficulty breathing may require emergency medical care.",
    ]

    metadatas = [
        {"source": "demo_handwashing.pdf", "page": 1},
        {"source": "demo_vaccination.pdf", "page": 2},
        {"source": "demo_emergency.pdf", "page": 3},
    ]

    ids = [
        "demo_handwashing_1",
        "demo_vaccination_2",
        "demo_emergency_3",
    ]

    add_documents(documents, metadatas, ids)

    query = "What should someone do if they have severe difficulty breathing?"
    results = retrieve_documents(query, top_k=2)

    print("\nQuery:", query)
    print("\nRetrieved results:")

    for result in results:
        print("\nSource:", result["metadata"]["source"])
        print("Page:", result["metadata"]["page"])
        print("Text:", result["text"])
        print("Distance:", round(result["distance"], 4))


if __name__ == "__main__":
    main()
