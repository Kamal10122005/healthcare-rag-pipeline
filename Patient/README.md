# Patient Interview Agent — Person 2

LangGraph module for interviewing a user, collecting explicit details, checking for risk flags, and preparing a structured handoff to the RAG module. It does not diagnose or provide treatment recommendations.

## Stack used by this module

- LangGraph for state and conditional routing
- LangChain chat model interface, configured for GPT-4o or Llama 3 via Ollama
- LangSmith tracing when enabled by environment configuration
- Structured Python payloads for the RAG, Safety, and FastAPI interfaces

ChromaDB, BGE-M3, Unstructured.io, Streamlit, FastAPI, and PostgreSQL belong to the other team modules. This package accepts a LangGraph checkpointer and a Safety checker so the Backend/Safety owners can supply their approved integrations.

## Setup

From the project folder in PowerShell:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m pip install -e .
Copy-Item .env.example .env
```

Edit `.env` and set `OPENAI_API_KEY` for GPT-4o, or set `HCL_LLM_PROVIDER=ollama` and `HCL_LLM_MODEL=llama3.2` for a local Ollama model. For Ollama, install/run Ollama and pull the model separately. Keep `.env` private; it is excluded from Git.

## Use in the backend

```python
from patient_interview import build_graph, continue_interview, create_chat_model, start_interview

model = create_chat_model()
agent = build_graph(chat_model=model)

state = start_interview("I've had a headache since yesterday", app=agent)
print(state["next_question"])

state = continue_interview(state, "5", app=agent)
print(state["next_question"])

state = continue_interview(state, "No other symptoms", app=agent)
if state["interview_complete"]:
    rag_payload = state["rag_context"]
```

## Try the interactive local demo

With Ollama running and `llama3.1:latest` downloaded, start the chat from the project folder:

```powershell
.\.venv\Scripts\python.exe -m patient_interview
```

Enter a sample concern, answer each question, and the demo will print the RAG handoff summary. Use fictional details while trying it.

For persistent LangGraph sessions, pass the Backend's checkpointer to `build_graph(...)` and use a unique `thread_id` for each session when calling `start_interview` and `continue_interview`. The Backend should choose and manage PostgreSQL checkpoint storage; an in-memory checkpointer is suitable only for local development.

## Workflow and state

The graph records the user's concern and conversation, extracts only explicitly stated details, checks risk signals, and uses the model to choose whether one natural follow-up is useful or whether the context is ready for RAG. It does not follow a fixed question sequence or require every detail. It tracks symptoms, duration/onset, severity, other symptoms (including an explicit “none” answer), risk flags, dynamically missing details, action, next message, and completion status.

`action` is `ask`, `escalate`, or `handoff`. A custom Safety checker can be passed to `build_graph(chat_model=..., safety_checker=...)`; it must return `{"risk_flags": [...]}`. The built-in phrase check is a fallback signal only. Person 4's approved safety component must own final risk interpretation and escalation wording before user-facing deployment.

The chat model is only used to extract facts from the latest turn and phrase the next interview question. It must not diagnose, give treatment, or fill in unknown facts. If a model call fails, the graph falls back to deterministic questions and extraction.

## Team integration boundary

The RAG handoff is a plain dictionary in `state["rag_context"]`, with concern, symptoms, duration, severity, other symptoms, conversation, risk flags, question, and summary. Confirm exact field names with Persons 1, 4, and 5 before final integration. Avoid sending real patient information to external model or tracing services until the team's privacy and data-handling requirements are approved.
