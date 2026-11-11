"""LangGraph workflow for one turn of the patient interview."""

from __future__ import annotations

from typing import Any

from langgraph.graph import END, START, StateGraph

from .nodes import (
    decide_next_action,
    identify_missing_info,
    make_conversation_planner,
    make_question_writer,
    prepare_rag_context,
    process_input,
    record_assistant_question,
    safety_check,
)
from .state import PatientState


def _route_after_safety(state: PatientState) -> str:
    return "escalate" if state.get("risk_flags") else "continue"


def _route_after_decision(state: PatientState) -> str:
    action = state.get("action")
    if action == "ask":
        return "ask"
    if action == "handoff":
        return "handoff"
    return "end"


def _identity(state: PatientState) -> dict[str, Any]:
    return {}


def build_graph(chat_model=None, checkpointer=None, safety_checker=None):
    """Compile the workflow, optionally using a LangChain chat model/checkpointer."""
    builder = StateGraph(PatientState)
    builder.add_node("process_input", process_input)
    # The conversational planner extracts user-stated details as part of its
    # structured turn, so avoid an extra model call here.
    builder.add_node("extract_details", _identity)
    if safety_checker is None:
        safety_node = safety_check
    else:
        def safety_node(state):
            result = safety_checker(state)
            if not isinstance(result, dict) or "risk_flags" not in result:
                raise ValueError("safety_checker must return a dict containing risk_flags")
            return {"risk_flags": list(result["risk_flags"])}

    builder.add_node("safety_check", safety_node)
    builder.add_node("identify_missing_info", identify_missing_info)
    builder.add_node("decide_next_action", decide_next_action)
    builder.add_node("record_question", record_assistant_question)
    builder.add_node("prepare_rag_context", prepare_rag_context)
    builder.add_node("escalate", _identity)
    builder.add_node("write_question", make_question_writer(chat_model) if chat_model else _identity)
    if chat_model:
        builder.add_node("plan_conversation", make_conversation_planner(chat_model))

    builder.add_edge(START, "process_input")
    builder.add_edge("process_input", "extract_details")
    builder.add_edge("extract_details", "safety_check")
    safety_routes = {"escalate": "escalate", "continue": "plan_conversation" if chat_model else "identify_missing_info"}
    builder.add_conditional_edges("safety_check", _route_after_safety, safety_routes)
    builder.add_edge("escalate", END)
    if chat_model:
        builder.add_conditional_edges(
            "plan_conversation",
            _route_after_decision,
            {"ask": "record_question", "handoff": "prepare_rag_context", "end": END},
        )
    else:
        builder.add_edge("identify_missing_info", "decide_next_action")
        builder.add_conditional_edges(
            "decide_next_action",
            _route_after_decision,
            {"ask": "write_question", "handoff": "prepare_rag_context", "end": END},
        )
        builder.add_edge("write_question", "record_question")
    builder.add_edge("record_question", END)
    builder.add_edge("prepare_rag_context", END)
    return builder.compile(checkpointer=checkpointer)


graph = build_graph()


def new_patient_state(concern: str = "") -> PatientState:
    """Create a complete initial state for a new interview."""
    return {
        "original_concern": concern.strip(),
        "latest_input": concern.strip(),
        "messages": [],
        "symptoms": [],
        "duration": "",
        "severity": "",
        "other_symptoms": [],
        "other_symptoms_answered": False,
        "risk_flags": [],
        "missing_information": [],
        "next_question": "",
        "interview_complete": False,
        "action": "",
        "turn_count": 0,
        "conversation_summary": "",
    }


def start_interview(concern: str, app=None, thread_id: str | None = None) -> PatientState:
    """Process the initial concern and return the next question or flag."""
    runnable = app or graph
    config = {"configurable": {"thread_id": thread_id}} if thread_id else None
    return runnable.invoke(new_patient_state(concern), config=config)


def continue_interview(state: PatientState, answer: str, app=None, thread_id: str | None = None) -> PatientState:
    """Process one answer using the prior returned state."""
    updated = dict(state)
    updated["latest_input"] = answer.strip()
    updated["risk_flags"] = []
    runnable = app or graph
    config = {"configurable": {"thread_id": thread_id}} if thread_id else None
    return runnable.invoke(updated, config=config)  # type: ignore[arg-type]
