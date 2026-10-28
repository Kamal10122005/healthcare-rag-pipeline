
def build_context(retrieved_documents: list[dict]) -> str:
    """Build grounded context with a unique label for each passage."""
    context_parts = []

    for index, item in enumerate(retrieved_documents, start=1):
        metadata = item.get("metadata") or {}
        text = item.get("text", "")

        title = metadata.get("title") or "Unknown document"
        organization = metadata.get("organization") or "Unknown organization"
        page = metadata.get("page_number", "Unknown")
        url = (
            metadata.get("source_url")
            or metadata.get("document_url")
            or ""
        )

        context_parts.append(
            f"[S{index}]\n"
            f"Document: {title}\n"
            f"Organization: {organization}\n"
            f"Page: {page}\n"
            f"URL: {url or 'Not available'}\n"
            f"Content:\n{text}"
        )

    return "\n\n---\n\n".join(context_parts)


def format_sources(retrieved_documents: list[dict]) -> list[dict]:
    """Return one source entry per passage, preserving citation labels."""
    sources = []

    for index, item in enumerate(retrieved_documents, start=1):
        metadata = item.get("metadata") or {}

        sources.append({
            "label": f"S{index}",
            "title": metadata.get("title") or "Unknown document",
            "organization": metadata.get("organization") or "Unknown organization",
            "page_number": metadata.get("page_number"),
            "url": (
                metadata.get("source_url")
                or metadata.get("document_url")
                or None
            ),
        })

    return sources
