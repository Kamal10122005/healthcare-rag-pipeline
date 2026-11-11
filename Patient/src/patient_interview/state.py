"""Typed state shared by the patient interview graph."""

from typing import NotRequired, TypedDict


class Message(TypedDict):
    role: str
    content: str


class PatientState(TypedDict):
    """State for one interview turn and its accumulated conversation."""

    original_concern: str
    latest_input: str
    messages: list[Message]
    symptoms: list[str]
    duration: str
    severity: str
    other_symptoms: list[str]
    other_symptoms_answered: bool
    risk_flags: list[str]
    missing_information: list[str]
    next_question: str
    interview_complete: bool
    action: str
    turn_count: int
    conversation_summary: str
    rag_context: NotRequired[dict[str, object]]
