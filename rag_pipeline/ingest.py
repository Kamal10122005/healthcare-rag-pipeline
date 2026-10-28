
import csv
import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import unquote, urlparse

from pypdf import PdfReader
from langchain_text_splitters import RecursiveCharacterTextSplitter


# ---------------------------------------------------------
# PATHS AND SETTINGS
# ---------------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parent.parent
KNOWLEDGE_BASE = PROJECT_ROOT / "data" / "knowledge base"
OUTPUT_DIR = PROJECT_ROOT / "data" / "processed"

CATALOG_PATH = KNOWLEDGE_BASE / "sources.csv"
DOCUMENT_INDEX_PATH = (
    KNOWLEDGE_BASE
    / "WHO_India_Health_Documents"
    / "document_index.csv"
)
MAPPING_PATH = KNOWLEDGE_BASE / "pdf_source_mapping.csv"

CHUNK_SIZE = 2800
CHUNK_OVERLAP = 400

WHO_FOLDER_NAME = "WHO_India_Health_Documents"


# ---------------------------------------------------------
# TEXT SPLITTING
# ---------------------------------------------------------

splitter = RecursiveCharacterTextSplitter(
    chunk_size=CHUNK_SIZE,
    chunk_overlap=CHUNK_OVERLAP,
    separators=["\n\n", "\n", ". ", " ", ""],
    add_start_index=True,
)


# ---------------------------------------------------------
# GENERAL HELPERS
# ---------------------------------------------------------

def clean_text(text):
    """Normalize extracted PDF text without removing its meaning."""
    if not text:
        return ""

    text = text.replace("\x00", " ")
    text = text.replace("\u00a0", " ")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n[ \t]+", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)

    return text.strip()


def normalize_path(value):
    """Normalize Windows and POSIX paths for comparison."""
    if not value:
        return ""

    value = unquote(str(value).strip())
    value = value.replace("\\", "/")
    value = re.sub(r"/+", "/", value)

    return value.rstrip("/").casefold()


def filename_from_url(url):
    if not url:
        return ""

    path = unquote(urlparse(url).path)
    return Path(path).name.casefold()


def stable_id(text):
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:20]


def read_csv(path):
    if not path.exists():
        return []

    with path.open(
        "r", encoding="utf-8-sig", newline=""
    ) as file:
        return list(csv.DictReader(file))


def write_csv(path, rows, fieldnames):
    with path.open(
        "w", encoding="utf-8-sig", newline=""
    ) as file:
        writer = csv.DictWriter(
            file,
            fieldnames=fieldnames,
            extrasaction="ignore",
        )
        writer.writeheader()
        writer.writerows(rows)


# ---------------------------------------------------------
# LOAD SOURCE CATALOG
# ---------------------------------------------------------

def load_source_catalog():
    rows = read_csv(CATALOG_PATH)
    by_filename = {}

    for row in rows:
        filename = filename_from_url(
            row.get("direct_download_url", "")
        )

        if filename:
            by_filename.setdefault(filename, []).append(row)

    return rows, by_filename


# ---------------------------------------------------------
# LOAD WHO DOCUMENT INDEX
# ---------------------------------------------------------

def load_document_index():
    rows = read_csv(DOCUMENT_INDEX_PATH)
    by_filename = {}
    by_relative_path = {}

    for row in rows:
        saved_path = row.get("saved_path", "")
        filename = Path(
            normalize_path(saved_path)
        ).name

        if filename:
            by_filename.setdefault(filename, []).append(row)

        # Keep the portion below the original collection folder.
        normalized = normalize_path(saved_path)
        marker = WHO_FOLDER_NAME.casefold() + "/"

        if marker in normalized:
            relative = normalized.split(marker, 1)[1]
            by_relative_path.setdefault(relative, []).append(row)

    return rows, by_filename, by_relative_path


# ---------------------------------------------------------
# OPTIONAL EXPLICIT PDF MAPPINGS
# ---------------------------------------------------------

def load_manual_mapping(catalog_rows):
    mapping_rows = read_csv(MAPPING_PATH)
    valid_ids = {
        row.get("id", "").strip()
        for row in catalog_rows
        if row.get("id")
    }

    mappings = {}

    for row in mapping_rows:
        relative_path = normalize_path(
            row.get("relative_path", "")
        )
        source_id = (row.get("source_id") or "").strip()

        if not relative_path or not source_id:
            continue

        if source_id not in valid_ids:
            print(
                "WARNING: Unknown source_id in manual mapping:",
                source_id,
            )
            continue

        mappings[relative_path] = source_id

    return mappings


# ---------------------------------------------------------
# METADATA MATCHING
# ---------------------------------------------------------

def choose_unique(rows, description):
    """Return a row only if the matching records are unambiguous."""
    if not rows:
        return None, "unmapped"

    # Duplicate index rows are acceptable only when their key
    # provenance fields agree.
    signatures = {
        (
            row.get("label", ""),
            row.get("url", ""),
            row.get("source_page", ""),
            row.get("source_title", ""),
        )
        for row in rows
    }

    if len(signatures) > 1:
        return None, "ambiguous_" + description

    return rows[0], description


def find_index_record(pdf_path, relative_path, index_by_filename,
                      index_by_relative_path):
    filename = pdf_path.name.casefold()
    normalized_relative = normalize_path(relative_path)

    # First attempt a path match relative to the WHO collection.
    marker = WHO_FOLDER_NAME.casefold() + "/"
    if marker in normalized_relative:
        relative_inside = normalized_relative.split(marker, 1)[1]
        candidates = index_by_relative_path.get(relative_inside, [])

        if candidates:
            return choose_unique(candidates, "who_index_path_match")

    # Fall back to filename only when it identifies one provenance.
    candidates = index_by_filename.get(filename, [])
    if candidates:
        return choose_unique(candidates, "who_index_filename_match")

    return None, "unmapped"


def find_catalog_record(pdf_path, catalog_by_filename):
    candidates = catalog_by_filename.get(
        pdf_path.name.casefold(), []
    )

    if not candidates:
        return None, "unmapped"

    # Several catalog records with different source identities
    # must not be arbitrarily assigned.
    signatures = {
        (
            row.get("id", ""),
            row.get("title", ""),
            row.get("direct_download_url", ""),
        )
        for row in candidates
    }

    if len(signatures) > 1:
        return None, "ambiguous_catalog_filename_match"

    return candidates[0], "catalog_filename_match"


def get_pdf_metadata(
    pdf_path,
    relative_path,
    catalog_rows,
    catalog_by_filename,
    index_by_filename,
    index_by_relative_path,
    manual_mapping,
):
    relative_key = normalize_path(relative_path)

    # Explicit mapping takes precedence, but its source ID must
    # already exist in the catalog.
    manual_source_id = manual_mapping.get(relative_key)

    if manual_source_id:
        source = next(
            (
                row for row in catalog_rows
                if row.get("id", "").strip() == manual_source_id
            ),
            None,
        )

        if source:
            return {
                "source_id": source["id"],
                "title": source.get("title", ""),
                "organization": source.get("organization", ""),
                "source_url": source.get("landing_page_url", ""),
                "document_url": source.get("direct_download_url", ""),
                "publication_or_version_note": source.get(
                    "publication_or_version_note", ""
                ),
                "mapping_method": "manual_catalog_mapping",
                "review_status": "catalog_metadata_review_needed",
                "topic": source.get("topic_categories", ""),
            }

    # Prefer the richer WHO document index for WHO collection PDFs.
    index_record, index_status = find_index_record(
        pdf_path,
        relative_path,
        index_by_filename,
        index_by_relative_path,
    )

    if index_record:
        return {
            "source_id": "who_doc_" + stable_id(
                index_record.get("url", "")
                + "|"
                + index_record.get("label", "")
            ),
            "title": (
                index_record.get("label", "").strip()
                or index_record.get("source_title", "").strip()
                or pdf_path.stem
            ),
            "organization": "World Health Organization",
            "source_url": index_record.get("source_page", ""),
            "document_url": index_record.get("url", ""),
            "publication_or_version_note": "",
            "mapping_method": index_status,
            "review_status": "verify_document_date_and_version",
            "topic": index_record.get("topic", ""),
        }

    # Next, try the general source catalog.
    source, catalog_status = find_catalog_record(
        pdf_path, catalog_by_filename
    )

    if source:
        return {
            "source_id": source.get("id", ""),
            "title": source.get("title", "") or pdf_path.stem,
            "organization": source.get("organization", ""),
            "source_url": source.get("landing_page_url", ""),
            "document_url": source.get("direct_download_url", ""),
            "publication_or_version_note": source.get(
                "publication_or_version_note", ""
            ),
            "mapping_method": catalog_status,
            "review_status": "catalog_metadata_review_needed",
            "topic": source.get("topic_categories", ""),
        }

    # Do not guess the source organization or URLs.
    return {
        "source_id": "file_" + stable_id(relative_path),
        "title": pdf_path.stem,
        "organization": "",
        "source_url": "",
        "document_url": "",
        "publication_or_version_note": "",
        "mapping_method": "unmapped",
        "review_status": "unmapped_source_review_needed",
        "topic": "",
    }


# ---------------------------------------------------------
# PDF EXTRACTION AND CHUNKING
# ---------------------------------------------------------

def extract_pdf(pdf_path, metadata, relative_path, ingested_at):
    chunks = []
    reader = PdfReader(str(pdf_path), strict=False)

    pdf_title = ""
    if reader.metadata and reader.metadata.title:
        pdf_title = str(reader.metadata.title).strip()

    # Use a verified index/catalog title when present.
    # If no source match exists, retain the embedded PDF title.
    if metadata["mapping_method"] == "unmapped" and pdf_title:
        metadata["title"] = pdf_title

    for page_number, page in enumerate(reader.pages, start=1):
        raw_text = page.extract_text() or ""
        page_text = clean_text(raw_text)

        if not page_text:
            continue

        section = ""
        for line in page_text.splitlines()[:8]:
            line = line.strip()
            if (
                line
                and len(line) <= 160
                and (
                    line.isupper()
                    or re.match(
                        r"^(chapter|section|appendix)\b",
                        line,
                        flags=re.IGNORECASE,
                    )
                    or re.match(r"^\d+(\.\d+)*[\s.)-]+\S", line)
                )
            ):
                section = line
                break

        documents = splitter.create_documents(
            [page_text],
            metadatas=[{"page_number": page_number}],
        )

        for document in documents:
            text = document.page_content.strip()
            if not text:
                continue

            start_index = document.metadata.get("start_index", 0)

            chunk_id = stable_id(
                f"{relative_path}|{page_number}|{start_index}|{text}"
            )

            chunk_metadata = {
                "source_id": metadata["source_id"],
                "title": metadata["title"],
                "organization": metadata["organization"],
                "source_url": metadata["source_url"],
                "document_url": metadata["document_url"],
                "publication_date": "",
                "version": "",
                "publication_or_version_note": metadata[
                    "publication_or_version_note"
                ],
                "page_number": page_number,
                "section": section,
                "language": "unknown",
                "document_type": "pdf",
                "ingested_at": ingested_at,
                "relative_path": relative_path,
                "mapping_method": metadata["mapping_method"],
                "review_status": metadata["review_status"],
                "topic": metadata["topic"],
                "start_index": start_index,
            }

            chunks.append({
                "id": chunk_id,
                "text": text,
                "metadata": chunk_metadata,
            })

    return chunks, len(reader.pages)


# ---------------------------------------------------------
# MAIN
# ---------------------------------------------------------

def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    chunks_path = OUTPUT_DIR / "chunks.jsonl"
    report_path = OUTPUT_DIR / "ingestion_report.csv"

    catalog_rows, catalog_by_filename = load_source_catalog()
    _, index_by_filename, index_by_relative_path = (
        load_document_index()
    )
    manual_mapping = load_manual_mapping(catalog_rows)

    pdf_files = sorted(KNOWLEDGE_BASE.rglob("*.pdf"))

    all_chunks = []
    report_rows = []
    ingested_at = datetime.now(timezone.utc).isoformat()

    print("Knowledge base:", KNOWLEDGE_BASE)
    print("PDF files found:", len(pdf_files))
    print("WHO index filename keys:", len(index_by_filename))
    print("Manual mappings:", len(manual_mapping))
    print()

    for number, pdf_path in enumerate(pdf_files, start=1):
        relative_path = pdf_path.relative_to(
            KNOWLEDGE_BASE
        ).as_posix()

        print(f"[{number}/{len(pdf_files)}] {relative_path}")

        metadata = get_pdf_metadata(
            pdf_path=pdf_path,
            relative_path=relative_path,
            catalog_rows=catalog_rows,
            catalog_by_filename=catalog_by_filename,
            index_by_filename=index_by_filename,
            index_by_relative_path=index_by_relative_path,
            manual_mapping=manual_mapping,
        )

        try:
            chunks, page_count = extract_pdf(
                pdf_path,
                metadata,
                relative_path,
                ingested_at,
            )

            if not chunks:
                status = "no_extractable_text"
            elif metadata["mapping_method"].startswith("ambiguous"):
                status = metadata["mapping_method"]
            elif metadata["mapping_method"] == "unmapped":
                status = "ok_unmapped_source"
            else:
                status = "ok_mapped"

            all_chunks.extend(chunks)

            report_rows.append({
                "relative_path": relative_path,
                "status": status,
                "mapping_method": metadata["mapping_method"],
                "review_status": metadata["review_status"],
                "source_id": metadata["source_id"],
                "title": metadata["title"],
                "organization": metadata["organization"],
                "source_url": metadata["source_url"],
                "document_url": metadata["document_url"],
                "page_count": page_count,
                "chunk_count": len(chunks),
                "error": "",
            })

        except Exception as exc:
            report_rows.append({
                "relative_path": relative_path,
                "status": "error",
                "mapping_method": metadata["mapping_method"],
                "review_status": metadata["review_status"],
                "source_id": metadata["source_id"],
                "title": metadata["title"],
                "organization": metadata["organization"],
                "source_url": metadata["source_url"],
                "document_url": metadata["document_url"],
                "page_count": "",
                "chunk_count": 0,
                "error": str(exc),
            })

    # Write complete JSONL output.
    with chunks_path.open("w", encoding="utf-8") as file:
        for chunk in all_chunks:
            file.write(
                json.dumps(chunk, ensure_ascii=False) + "\n"
            )

    report_fields = [
        "relative_path",
        "status",
        "mapping_method",
        "review_status",
        "source_id",
        "title",
        "organization",
        "source_url",
        "document_url",
        "page_count",
        "chunk_count",
        "error",
    ]
    write_csv(report_path, report_rows, report_fields)

    print("\n" + "=" * 60)
    print("INGESTION COMPLETE")
    print("=" * 60)
    print("PDF files:", len(pdf_files))
    print("Chunks:", len(all_chunks))
    print("Output:", chunks_path)
    print("Report:", report_path)

    counts = {}
    for row in report_rows:
        counts[row["status"]] = counts.get(row["status"], 0) + 1

    print("\nStatus summary:")
    for status, count in sorted(counts.items()):
        print(f"  {status}: {count}")

    print("\nReview statuses:")
    review_counts = {}
    for row in report_rows:
        review = row["review_status"]
        review_counts[review] = review_counts.get(review, 0) + 1

    for review, count in sorted(review_counts.items()):
        print(f"  {review}: {count}")


if __name__ == "__main__":
    main()
