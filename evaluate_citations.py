
import json
import re
from pathlib import Path

from rag_pipeline.pipeline import answer_question


PROJECT_ROOT = Path(__file__).resolve().parent

TEST_QUESTIONS = [
    {
        "id": "Q1",
        "question": (
            "What blood pressure threshold does WHO recommend "
            "for starting medication in adults?"
        ),
    },
    {
        "id": "Q4",
        "question": (
            "What does WHO recommend for treating hypertension "
            "in adults?"
        ),
    },
]


def extract_citation_labels(answer: str) -> set[str]:
    """Extract labels such as S1 from bracketed citations."""
    labels = set()

    for match in re.finditer(r"\[([^\]]*)\]", answer):
        labels.update(
            re.findall(r"\bS\d+\b", match.group(1))
        )

    return labels


def main():
    report = []

    for item in TEST_QUESTIONS:
        print("\n" + "=" * 70)
        print(f"{item['id']}: {item['question']}")

        result = answer_question(item["question"], top_k=3)
        answer = result.get("answer", "")
        sources = result.get("sources", [])

        valid_labels = {
            source["label"].strip("[]")
            for source in sources
            if source.get("label")
        }

        cited_labels = extract_citation_labels(answer)
        invalid_labels = cited_labels - valid_labels

        print("\nANSWER:")
        print(answer)

        print("\nCITATION LABEL CHECK:")
        print("Available labels:", sorted(valid_labels))
        print("Detected labels:", sorted(cited_labels))
        print("Invalid labels:", sorted(invalid_labels))

        # An answer with no detected citations should not pass.
        passed = bool(cited_labels) and not invalid_labels

        print(
            "Result:",
            "PASS" if passed else "FAIL",
        )

        print("\nSOURCE MAPPING:")
        for source in sources:
            print(
                f"{source['label']}: "
                f"{source.get('title', 'Unknown')} | "
                f"Page: {source.get('page_number', 'Unknown')}"
            )

        report.append({
            "id": item["id"],
            "question": item["question"],
            "answer": answer,
            "available_labels": sorted(valid_labels),
            "detected_labels": sorted(cited_labels),
            "invalid_labels": sorted(invalid_labels),
            "citation_label_check": "PASS" if passed else "FAIL",
            "sources": sources,
        })

    report_path = (
        PROJECT_ROOT / "reports" / "citation_evaluation.json"
    )
    report_path.parent.mkdir(parents=True, exist_ok=True)

    with open(report_path, "w", encoding="utf-8") as file:
        json.dump(report, file, indent=2, ensure_ascii=False)

    print(f"\nReport saved to: {report_path}")


if __name__ == "__main__":
    main()
