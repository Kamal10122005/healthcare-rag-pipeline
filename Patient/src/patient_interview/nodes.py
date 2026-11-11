"""Small, deterministic interview nodes for the first prototype.

This module organizes user-provided information. It does not diagnose, assess
medical urgency reliably, or replace the team's dedicated safety component.
"""

from __future__ import annotations

import re
from typing import Any

from pydantic import BaseModel, Field

from .prompts import INTERVIEW_GUIDANCE, QUESTION_BY_FIELD
from .state import PatientState


_GREETINGS = {
    "hi", "hello", "hey", "hiya", "hey there", "hello there", "good morning",
    "good afternoon", "good evening",
}


def _is_greeting_only(text: str) -> bool:
    cleaned = re.sub(r"[^a-z\s]", "", text.lower()).strip()
    return cleaned in _GREETINGS


class ExtractedInterviewDetails(BaseModel):
    """Only explicitly stated facts from the latest user message."""

    duration: str = Field(default="", description="Duration or onset, or empty if not stated")
    severity: str = Field(default="", description="Severity on 1-10 scale, or empty if not stated")
    other_symptoms: list[str] = Field(default_factory=list)
    other_symptoms_answered: bool = False


class FollowupQuestion(BaseModel):
    question: str = Field(description="One concise, non-diagnostic question about the requested field")


class ConversationPlan(BaseModel):
    """The model's judgment about one natural conversational turn."""

    assistant_message: str = Field(description="A warm response with at most one follow-up question")
    interview_complete: bool = Field(description="True when enough context is gathered for RAG")
    missing_information: list[str] = Field(default_factory=list)
    symptoms: list[str] = Field(default_factory=list)
    duration: str = ""
    severity: str = ""
    other_symptoms: list[str] = Field(default_factory=list)
    other_symptoms_answered: bool = False
    conversation_summary: str = ""


def make_detail_extractor(model):
    """Create an LLM node that extracts explicit details; never infer unknowns."""
    structured = model.with_structured_output(ExtractedInterviewDetails)

    def extract(state: PatientState) -> dict[str, Any]:
        last_assistant = next(
            (m.get("content", "") for m in reversed(state.get("messages", [])) if m.get("role") == "assistant"),
            "",
        )
        try:
            result = structured.invoke(
                "Extract only facts explicitly stated in the latest user message. Do not diagnose, "
                "recommend treatment, or fill missing facts by guessing. If the user answered that "
                "they have no other symptoms, set other_symptoms_answered=true and use an empty list.\n"
                f"Previous question: {last_assistant}\nLatest user message: {state.get('latest_input', '')}"
            )
        except Exception:
            # Keep the deterministic extraction if the provider is unavailable.
            return {}
        values = result.model_dump()
        update: dict[str, Any] = {}
        for key in ("duration", "severity"):
            if values.get(key):
                update[key] = values[key]
        if values.get("other_symptoms_answered"):
            update["other_symptoms"] = values.get("other_symptoms", [])
            update["other_symptoms_answered"] = True
        return update

    return extract


def make_question_writer(model):
    """Create a constrained LLM question writer for the next missing field."""
    structured = model.with_structured_output(FollowupQuestion)

    def write_question(state: PatientState) -> dict[str, str]:
        field = (state.get("missing_information") or [""])[0]
        try:
            result = structured.invoke(
                f"{INTERVIEW_GUIDANCE}\n"
                "Write exactly one natural, brief question to collect the specified field. "
                "Acknowledge what the person just shared when it feels natural. Do not sound like a form, "
                "ask multiple questions, suggest treatment, or repeat details already provided. "
                "If the field is original_concern, warmly invite them to describe what is bothering them.\n"
                f"Field to ask about: {field}\n"
                f"Known interview details: {prepare_rag_context(state)['rag_context']}"
            )
            question = result.question.strip()
            return {"next_question": question if question else state.get("next_question", "")}
        except Exception:
            return {"next_question": state.get("next_question", "")}

    return write_question


def make_conversation_planner(model):
    """Use the chat model to conduct an adaptive, non-checklist interview."""
    structured = model.with_structured_output(ConversationPlan)

    def plan(state: PatientState) -> dict[str, Any]:
        # A greeting is not a health concern; invite the user to start naturally.
        if not _clean(state.get("original_concern")) and _is_greeting_only(state.get("latest_input", "")):
            return {
                "action": "ask",
                "interview_complete": False,
                "missing_information": ["original_concern"],
                "next_question": "Hey, I'm glad you reached out. What's been bothering you?",
                "turn_count": state.get("turn_count", 0),
            }

        history = "\n".join(
            f"{message.get('role', 'user')}: {message.get('content', '')}"
            for message in state.get("messages", [])
        )
        try:
            result = structured.invoke(
                f"{INTERVIEW_GUIDANCE}\n"
                "Conduct a natural, caring conversation, not a questionnaire. Choose the single most "
                "useful next question from the person's actual concern and prior answers. Do not follow "
                "a fixed sequence or ask for every possible detail. Acknowledge what they said, then ask "
                "at most one short, relevant question. If the concern is clear enough for the RAG team to "
                "answer the user's actual question, set interview_complete=true and do not ask for more. "
                "Do not diagnose, give treatment, invent facts, or promise medical certainty. Extract only "
                "facts the user explicitly stated.\n"
                f"User's original concern: {state.get('original_concern', '')}\n"
                f"Conversation so far:\n{history}\n"
                f"Known details: duration={state.get('duration', '')}; severity={state.get('severity', '')}; "
                f"symptoms={state.get('symptoms', [])}; other_symptoms={state.get('other_symptoms', [])}\n"
                "Return a warm next message and dynamic missing-information notes."
            )
        except Exception:
            # Keep the conversation usable if the model is briefly unavailable.
            return {
                "action": "ask",
                "interview_complete": False,
                "missing_information": state.get("missing_information", []),
                "next_question": "I'm listening. Could you tell me a little more about what's going on?",
                "turn_count": state.get("turn_count", 0),
            }

        data = result.model_dump()
        update: dict[str, Any] = {
            "symptoms": data["symptoms"] or state.get("symptoms", []),
            "duration": data["duration"] or state.get("duration", ""),
            "severity": data["severity"] or state.get("severity", ""),
            "other_symptoms": data["other_symptoms"] or state.get("other_symptoms", []),
            "other_symptoms_answered": data["other_symptoms_answered"] or state.get("other_symptoms_answered", False),
            "missing_information": data["missing_information"],
            "conversation_summary": data["conversation_summary"],
            "turn_count": state.get("turn_count", 0),
        }
        complete = data["interview_complete"] or state.get("turn_count", 0) >= 6
        update["interview_complete"] = complete
        update["action"] = "handoff" if complete else "ask"
        update["next_question"] = "" if complete else _one_question(data["assistant_message"])
        if not complete and not update["next_question"]:
            update["next_question"] = "I'm listening. What feels most important for me to understand?"
        return update

    return plan


def _one_question(message: str) -> str:
    """Avoid sending multi-question outputs from the model to the user."""
    cleaned = _clean(message)
    question_marks = [index for index, char in enumerate(cleaned) if char == "?"]
    if len(question_marks) <= 1:
        return cleaned
    return cleaned[: question_marks[0] + 1]


def _clean(value: Any) -> str:
    return value.strip() if isinstance(value, str) else ""


def _append_message(messages: list[dict[str, str]], role: str, content: str) -> list[dict[str, str]]:
    """Return a fresh message list with a non-empty message appended."""
    if not content:
        return list(messages)
    return [*messages, {"role": role, "content": content}]


def process_input(state: PatientState) -> dict[str, Any]:
    """Record the latest user turn and use simple cues to fill known fields."""
    messages = list(state.get("messages", []))
    latest = _clean(state.get("latest_input"))
    original = _clean(state.get("original_concern"))

    if _is_greeting_only(original):
        original = ""
    if not original and latest and not _is_greeting_only(latest):
        original = latest

    # A first invocation may supply the complaint as latest_input only.
    if latest and (not messages or messages[-1].get("content") != latest or messages[-1].get("role") != "user"):
        messages = _append_message(messages, "user", latest)

    symptoms = list(state.get("symptoms", []))
    duration = _clean(state.get("duration"))
    severity = _clean(state.get("severity"))
    other_symptoms = list(state.get("other_symptoms", []))
    other_symptoms_answered = bool(state.get("other_symptoms_answered", False))

    if original and not symptoms:
        symptoms = [original]

    if latest:
        asked_duration = any(
            message.get("role") == "assistant"
            and "when did this start" in _clean(message.get("content", "")).lower()
            for message in messages[:-1]
        )
        duration_match = re.search(
            r"\b(?:for|since|started|began|lasted|lasting)\s+([^,.!?;]+)", latest, re.IGNORECASE
        )
        if duration_match and not duration:
            duration = duration_match.group(1).strip()
        elif asked_duration and not duration:
            duration = latest

        severity_match = re.search(r"\b([1-9]|10)\s*(?:/\s*10)?\b", latest)
        severity_prompted = any(
            marker in _clean(message.get("content", "")).lower()
            for message in messages[:-1]
            if message.get("role") == "assistant"
            for marker in ("severity", "scale of 1", "how severe")
        )
        if severity_match and (severity_prompted or "severity" in latest.lower()):
            severity = severity_match.group(1)

        # Preserve free-text answers to the associated-symptoms question.
        asked_other_symptoms = any(
            message.get("role") == "assistant"
            and "other symptoms" in _clean(message.get("content", "")).lower()
            for message in messages[:-1]
        )
        if asked_other_symptoms:
            normalized = latest.lower()
            if normalized in {"no", "none", "nope", "nothing else", "no other symptoms"}:
                other_symptoms = []
            else:
                other_symptoms = [latest]
            other_symptoms_answered = True

    return {
        "original_concern": original,
        "latest_input": latest,
        "messages": messages,
        "symptoms": symptoms,
        "duration": duration,
        "severity": severity,
        "other_symptoms": other_symptoms,
        "other_symptoms_answered": other_symptoms_answered,
        "turn_count": state.get("turn_count", 0) + (1 if latest else 0),
    }


def safety_check(state: PatientState) -> dict[str, Any]:
    """Flag a small set of explicit emergency phrases for Safety review.

    This intentionally conservative phrase check is only a prototype signal;
    downstream safety handling must be supplied by the Safety module.
    """
    # Review only what the user said. Scanning assistant questions can create
    # false flags when the assistant asks about a symptom.
    text = " ".join((state.get("original_concern", ""), state.get("latest_input", ""))).lower()
    cues = {
        "trouble breathing": ("trouble breathing", "can't breathe", "cannot breathe", "difficulty breathing"),
        "chest pain": ("chest pain", "pain in my chest", "chest pressure"),
        "loss of consciousness": ("passed out", "lost consciousness", "unconscious"),
        "possible stroke signs": ("face drooping", "slurred speech", "sudden weakness on one side"),
        "severe bleeding": ("won't stop bleeding", "cannot stop bleeding", "severe bleeding"),
        "self-harm risk": ("kill myself", "suicide", "hurt myself", "end my life"),
    }
    def mentioned_without_negation(phrase: str) -> bool:
        for match in re.finditer(re.escape(phrase), text):
            prefix = text[max(0, match.start() - 24) : match.start()]
            if not re.search(r"\b(?:no|not|never|without|don't|do not|isn't|wasn't)\s+(?:\w+\s+){0,2}$", prefix):
                return True
        return False

    flags = sorted(
        {
            label
            for label, phrases in cues.items()
            if any(mentioned_without_negation(phrase) for phrase in phrases)
        }
    )
    return {"risk_flags": flags}


def identify_missing_info(state: PatientState) -> dict[str, Any]:
    missing: list[str] = []
    if not _clean(state.get("original_concern")):
        missing.append("original_concern")
    if not _clean(state.get("duration")):
        missing.append("duration")
    if not _clean(state.get("severity")):
        missing.append("severity")
    if not state.get("other_symptoms_answered", False):
        missing.append("other_symptoms")
    # Empty list is a valid answer when the user explicitly reports no other symptoms.
    return {"missing_information": missing}


def decide_next_action(state: PatientState) -> dict[str, Any]:
    if state.get("risk_flags"):
        return {"action": "escalate", "interview_complete": False, "next_question": ""}
    missing = state.get("missing_information", [])
    if missing:
        if not _clean(state.get("latest_input")):
            return {
                "action": "ask",
                "interview_complete": False,
                "next_question": "I didn’t catch that. Could you share a little more?",
            }
        field = missing[0]
        return {
            "action": "ask",
            "interview_complete": False,
            "next_question": QUESTION_BY_FIELD.get(field, "Could you share a little more about your concern?"),
        }
    return {"action": "handoff", "interview_complete": True, "next_question": ""}


def prepare_rag_context(state: PatientState) -> dict[str, Any]:
    """Build a stable, plain-data payload for Person 1's RAG module."""
    context: dict[str, Any] = {
        "original_concern": state.get("original_concern", ""),
        "symptoms": list(state.get("symptoms", [])),
        "duration": state.get("duration", ""),
        "severity": state.get("severity", ""),
        "other_symptoms": list(state.get("other_symptoms", [])),
        "other_symptoms_answered": bool(state.get("other_symptoms_answered", False)),
        "conversation": list(state.get("messages", [])),
        "risk_flags": list(state.get("risk_flags", [])),
        "user_question": state.get("original_concern", ""),
        "conversation_summary": state.get("conversation_summary", ""),
    }
    summary_parts = [context["conversation_summary"]] if context["conversation_summary"] else []
    if not summary_parts and context["original_concern"]:
        summary_parts.append(f"Concern: {context['original_concern']}")
    if context["duration"]:
        summary_parts.append(f"Duration: {context['duration']}")
    if context["severity"]:
        summary_parts.append(f"Severity: {context['severity']}/10")
    if context["other_symptoms"]:
        summary_parts.append(f"Other symptoms: {'; '.join(context['other_symptoms'])}")
    elif context["other_symptoms_answered"]:
        summary_parts.append("Other symptoms: none reported")
    context["summary"] = ". ".join(summary_parts)
    return {"rag_context": context}


def record_assistant_question(state: PatientState) -> dict[str, Any]:
    question = _clean(state.get("next_question"))
    messages = list(state.get("messages", []))
    if question and (not messages or messages[-1].get("content") != question or messages[-1].get("role") != "assistant"):
        messages = _append_message(messages, "assistant", question)
    return {"messages": messages}
