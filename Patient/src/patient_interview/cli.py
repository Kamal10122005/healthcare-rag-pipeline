"""Interactive local terminal runner for the patient interview graph."""

from __future__ import annotations

from .graph import build_graph, continue_interview, start_interview
from .model import create_chat_model


def main() -> None:
    print("HCL Patient Interview - local demo")
    print("Share a sample concern (please avoid real personal or identifying details).\n")

    try:
        app = build_graph(chat_model=create_chat_model())
        concern = input("You: ").strip()
        if not concern:
            print("Please enter a concern to begin.")
            return

        state = start_interview(concern, app=app)
        while True:
            action = state.get("action")
            if action == "escalate":
                print("\nSafety flags for review:", ", ".join(state.get("risk_flags", [])))
                print("The Safety module should handle any user-facing escalation guidance.")
                return

            if action == "handoff":
                print("\nInterview complete. RAG handoff summary:")
                print(state.get("rag_context", {}).get("summary", "No summary available."))
                return

            question = state.get("next_question", "Could you share a little more?")
            answer = input(f"\nAgent: {question}\nYou: ").strip()
            state = continue_interview(state, answer, app=app)
    except KeyboardInterrupt:
        print("\nInterview ended.")
    except Exception as exc:
        print(f"\nCould not run the interview: {exc}")
        print("Check that Ollama is running and that `ollama list` shows llama3.1:latest.")


if __name__ == "__main__":
    main()
