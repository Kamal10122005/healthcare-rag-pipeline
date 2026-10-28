
import json
from pathlib import Path

from rag_pipeline.retriever import retrieve_documents


PROJECT_ROOT = Path(__file__).resolve().parent
QUESTIONS_PATH = PROJECT_ROOT / "evaluation_questions.json"


def main():
    with open(QUESTIONS_PATH, "r", encoding="utf-8") as file:
        questions = json.load(file)

    for item in questions:
        print("\n" + "=" * 70)
        print(f"{item['id']}: {item['question']}")
        print(f"Expected: {item['expected']}")

        results = retrieve_documents(
            item["question"],
            top_k=3,
        )

        if not results:
            print("Retrieved: NO RESULTS")
            continue

        for rank, result in enumerate(results, start=1):
            metadata = result.get("metadata") or {}

            print(f"\nResult {rank}")
            print(f"Distance: {result['distance']:.4f}")
            print(f"Title: {metadata.get('title', 'Unknown')}")
            print(f"Page: {metadata.get('page_number', 'Unknown')}")
            print(f"Text: {result['text'][:350].replace(chr(10), ' ')}")


if __name__ == "__main__":
    main()
