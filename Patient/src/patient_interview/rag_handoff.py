"""Public helper for constructing the interview-to-RAG payload."""

from typing import Any

from .nodes import prepare_rag_context
from .state import PatientState


def make_rag_context(state: PatientState) -> dict[str, Any]:
    """Return normalized context ready to pass to the RAG module."""
    return prepare_rag_context(state)["rag_context"]
