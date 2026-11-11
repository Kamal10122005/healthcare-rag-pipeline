# Frontend Integration Guide

For the backend, RAG, ingestion and data members of the team.

This document describes how the frontend is built, what it expects from the
backend, and which files you may change.

> **Status of every endpoint below: PROPOSED.**
> None of these paths has been verified against a running backend. They are the
> frontend's proposal. If your API differs, change
> `src/services/connected/endpoints.ts` — that is the only file that needs
> editing to re-point the app.

---

## 1. Architecture

```
  UI components (pages/, components/)
          │  render only; no fetch calls, no mock data
          ▼
  State (state/)            AppProvider · useConversation · useServiceQuery
          │  owns loading/error state, abort handling
          ▼
  HealthAssistantService    ◄── the contract (services/contracts.ts)
       ╱         ╲
  DemoService    ConnectedService
  (local)        (HTTP via httpClient → mappers → domain models)
```

Rules that hold throughout:

- **No component calls `fetch`.** All network I/O goes through
  `services/connected/httpClient.ts`.
- **No component imports mock data.** Demo content is reachable only through
  `DemoService`.
- **Everything the UI renders is a domain model** from `src/types/models.ts`,
  carrying an `origin` of `'demo'` or `'live'`.

### Component responsibilities

| Area | Responsibility |
| --- | --- |
| `components/ui/*` | The design system. Presentational only, no service access. |
| `components/shell/*` | Navigation, top bar, connection/mode indicator. |
| `components/assistant/*` | Answer rendering, composer, confidence, safety notices, history rail. |
| `components/evidence/*` | Passage display with highlighting; the citation drawer. |
| `pages/*` | Compose the above and call the service through hooks. |
| `state/AppProvider` | Mode, theme, reading level, the active service instance, backend health polling. |
| `state/useConversation` | Conversation history, asking, failure recovery. |
| `state/useServiceQuery` | Generic async load with abort, error normalisation, refetch. |

---

## 2. The service layer

`src/services/contracts.ts` is the interface both implementations satisfy:

```ts
interface HealthAssistantService {
  readonly mode: ServiceMode;
  checkHealth(signal?): Promise<BackendHealth>;
  askQuestion(request: AskQuestionRequest, signal?): Promise<AskQuestionResponse>;
  listConversations(signal?): Promise<ConversationSummary[]>;
  getConversation(id: string, signal?): Promise<Conversation>;
  deleteConversation(id: string, signal?): Promise<void>;
  listDocuments(query: DocumentQuery, signal?): Promise<DocumentListResponse>;
  getDocument(id: string, signal?): Promise<DocumentRecord>;
  uploadDocument(request: UploadDocumentRequest, signal?): Promise<UploadAccepted>;
  getProcessingStatus(id: string, signal?): Promise<ProcessingStatus>;
  listKnowledgeTopics(signal?): Promise<KnowledgeTopic[]>;
  submitFeedback(submission: FeedbackSubmission, signal?): Promise<void>;
}
```

Adding a capability means: declare it here → implement in **both** services →
use it in the UI. A service that cannot support something must throw a
`ServiceError` of kind `not_supported`. It must never return fabricated data.

### Error handling

Every failure reaching the UI is a `ServiceError` (`services/errors.ts`) with a
`kind`: `network · timeout · http · parse · aborted · not_configured ·
not_supported`. `retryable` decides whether a retry button appears (4xx other
than 408/429 are not retried). `toInfo()` produces the serialisable shape the UI
renders.

---

## 3. Authentication

**The frontend holds no secrets, and there is no setting that lets it.**

Vite inlines every `VITE_*` variable into the JavaScript bundle at build time.
A key configured that way is served to every visitor, readable in DevTools and
in the built asset, and cannot be rotated without a rebuild and redeploy. An
earlier revision of this project exposed a `VITE_API_KEY` that was sent as an
`X-API-Key` header; **it has been removed**, along with the header. Please do
not reintroduce either — a published credential is worse than no credential,
because it looks like access control while providing none.

Two patterns the frontend supports:

1. **httpOnly session cookie (recommended).** The backend authenticates the
   user and sets a `Secure; HttpOnly; SameSite` cookie. Set
   `VITE_API_WITH_CREDENTIALS=true` and the frontend sends
   `credentials: 'include'` on every request. JavaScript never sees the token.
   Requires CORS with `allow_credentials=True` and an explicit origin — the
   wildcard `*` is rejected by browsers alongside credentials.
2. **Server-side proxy / BFF.** The browser calls a same-origin backend that
   attaches the upstream credential server-side. Point `VITE_API_BASE_URL` at
   that proxy. Also removes CORS entirely.

If the RAG service needs an API key of its own (model provider, vector store),
that key belongs in the FastAPI service's environment, never in this one.

---

## 4. Required backend endpoints

Base URL comes from `VITE_API_BASE_URL`. All bodies are JSON unless stated.
`snake_case` is preferred; the mappers also accept `camelCase`.

### `GET /health`

```json
{
  "status": "ok",
  "version": "0.4.1",
  "components": { "retrieval": "ok", "generation": "ok", "vector_store": "ok" }
}
```
Polled every 60s in Connected Mode to drive the connection indicator.
Keep it cheap; the frontend times it out at 8s.

### 🚨 `POST /chat/ask` — the main endpoint

> **The emergency guardrail must run in the backend, before retrieval and
> before generation. This is not negotiable and it cannot be done here.**
>
> The frontend performs **no** emergency screening in Connected Mode. It has no
> classifier, it does not inspect the question, and it cannot refuse one. Demo
> Mode contains a keyword interception purely to demonstrate the *interface*
> state; that code lives in `services/demo/` and is unreachable from the
> connected path by design. **Do not treat the demo behaviour as a safety
> control, and do not assume the UI will catch anything the backend misses.**
>
> Required ordering inside the service:
>
> ```
> question
>    └─► 1. safety / emergency classification     ← FIRST, always
>           ├─ emergency  → return immediately:
>           │                 confidence: "insufficient"
>           │                 citations: []            (nothing retrieved)
>           │                 safety_notices: [{ level: "emergency", ... }]
>           │                 no clinical content in summary/explanation
>           └─ otherwise  → 2. retrieval → 3. generation → 4. grounding check
> ```
>
> Why ordering matters rather than just flagging afterwards: running retrieval
> and generation first means a model has already produced clinical-sounding
> text about a potentially life-threatening presentation, and that text is one
> bug — a dropped flag, a partial render, a logging sink, a cached response —
> away from reaching a user who should be dialling an emergency number. Screen
> first and there is nothing to leak.
>
> An `emergency` notice renders above the answer and suppresses nothing else on
> its own, so the response body must already be free of clinical guidance. The
> frontend will faithfully display whatever you send.

Request:
```json
{
  "question": "What does a blood pressure reading of 150/95 mean?",
  "conversation_id": null,
  "reading_level": "standard"
}
```
`conversation_id` is `null` to start a new thread. `reading_level` is one of
`plain | standard | clinical` and should influence generation.

Response:
```json
{
  "conversation_id": "conv_01H...",
  "message_id": "msg_01H...",
  "answer": {
    "summary": "One or two sentences. Always present.",
    "explanation": ["Paragraph one.", "Paragraph two."],
    "key_points": ["..."],
    "precautions": ["..."],
    "next_steps": ["..."],
    "confidence": "high",
    "confidence_note": null,
    "reading_level": "standard",
    "safety_notices": [
      {
        "id": "notice-1",
        "level": "caution",
        "title": "Seek same-day assessment for very high readings",
        "message": "..."
      }
    ],
    "citations": [
      {
        "id": "cit_1",
        "label": "S1",
        "document_id": "doc_abc",
        "document_title": "Managing Raised Blood Pressure in Adults",
        "source_type": "clinical_guideline",
        "publisher": "...",
        "published_on": "2025-03-18",
        "section": "3.2 Diagnostic thresholds",
        "page": 21,
        "excerpt": "The retrieved chunk text, verbatim.",
        "highlight": "exact substring of excerpt",
        "relevance": 0.94,
        "url": null
      }
    ]
  }
}
```

**Contract notes — please read:**

- `conversation_id` and `message_id` are **required**. Without them the frontend
  cannot thread follow-ups or attach feedback, and it raises a `parse` error.
- `highlight` **must be an exact substring of `excerpt`**, or it is dropped. It
  drives the in-passage highlight.
- `relevance` is normalised `0..1`. The UI shows a band (strong/moderate/weak),
  never the raw number.
- `confidence` is one of `high | moderate | low | insufficient`.
  **`insufficient` is a valid, expected response.** When retrieval returns
  nothing above threshold, return `insufficient` with empty `citations` and a
  `confidence_note` explaining what was missing. Do **not** fall back to the
  model's parametric knowledge — the UI will present an uncited answer as
  unsupported, and that is the behaviour the product promises.
- `safety_notices[].level` is `emergency | caution | info`. An `emergency`
  notice is rendered above the answer; for emergency questions, return the
  notice with no citations and no clinical content.
- Inline markers: if answer text contains `[S1]`, the UI turns it into a chip
  that opens that citation. Markers with no matching citation render as plain
  text. Including them is optional but makes claim→source mapping tighter.
- Empty arrays are fine and render as omitted sections. Do not send placeholder
  strings.

### `GET /chat/conversations`

Array, or `{ "conversations": [...] }`:
```json
[{ "id": "conv_1", "title": "...", "created_at": "...", "updated_at": "...", "message_count": 4 }]
```

### `GET /chat/conversations/{id}`

As above plus `messages`:
```json
{
  "id": "conv_1", "title": "...", "created_at": "...", "updated_at": "...",
  "messages": [
    { "id": "msg_1", "role": "user", "text": "...", "created_at": "..." },
    { "id": "msg_2", "role": "assistant", "created_at": "...", "answer": { /* as above */ } }
  ]
}
```

### `DELETE /chat/conversations/{id}` → `204`

### `GET /documents`

Query params: `search`, `category`, `status`, `sort`. Filtering server-side is
preferred; the frontend does not re-filter what you return.

```json
{
  "documents": [{
    "id": "doc_abc", "title": "...", "publisher": "...",
    "category": "cardiometabolic", "source_type": "clinical_guideline",
    "published_on": "2025-03-18", "added_at": "2026-09-02T09:12:00Z",
    "page_count": 86, "size_bytes": 3412880,
    "status": "indexed", "chunk_count": 412,
    "description": "...", "url": null, "failure_reason": null
  }],
  "total": 1
}
```
`status`: `indexed | processing | queued | failed`. Send `failure_reason` on
failure — the UI displays it on the card.

### `GET /documents/{id}`
Single document, same shape.

### `POST /documents/upload` — `multipart/form-data`

Fields: `file` (PDF), `category`, `publisher`.
Respond `202` with `{ "document_id": "doc_x", "accepted_at": "..." }`.
A missing document id raises a `parse` error — ingestion could not be tracked.

### `GET /documents/{id}/status`

```json
{ "document_id": "doc_x", "stage": "embedding", "progress": 0.62,
  "message": "Generating embeddings for each passage.", "updated_at": "..." }
```
`stage`: `uploaded | extracting | chunking | embedding | indexing | complete | failed`.
Polled every 2.5s while a document preview is open.

### `GET /knowledge/topics`

```json
[{ "id": "topic-bp", "name": "Blood pressure", "category": "cardiometabolic",
   "summary": "...", "questions": ["..."], "document_ids": ["doc_abc"] }]
```
Also powers the assistant's starter questions, so it should reflect what the
corpus actually covers.

### `POST /feedback` → `204`

```json
{ "conversation_id": "conv_1", "message_id": "msg_2",
  "rating": "helpful", "reasons": [], "comment": null }
```
Destination for the PostgreSQL feedback store.

### Error responses

Any non-2xx with `{ "detail": "..." }` or `{ "message": "..." }`. The string is
shown in the expandable technical-detail block, so make it specific —
`"retriever unavailable: chroma connection refused"` is far more useful to a
teammate than `"Internal Server Error"`.

---

## 5. RAG integration points

| Pipeline stage | Surfaces as | Notes |
| --- | --- | --- |
| Safety guardrail | `safety_notices`, `confidence: "insufficient"` | **Must** run before retrieval and generation — see the boxed note on `POST /chat/ask`. The frontend performs no screening in Connected Mode. |
| Retrieval | `citations[]` with `relevance` | Already reranked and ordered; the frontend does not reorder. |
| Chunking | `excerpt`, `section`, `page` | Keep chunks quotable. A chunk that is half a sentence displays badly. |
| Generation | `summary`, `explanation`, `key_points`, `precautions`, `next_steps` | Ask the model for these fields explicitly rather than splitting prose afterwards. |
| Grounding check | `confidence`, `confidence_note` | If a claim has no support, lower confidence and say what is missing. |
| Ingestion | `/documents/*` + status stages | Report real stage and progress; the UI polls it. |
| Tracing (LangSmith) | — | Add a trace/request id to the response and we will surface it in the technical-detail block. |

---

## 6. Demo vs Connected

| | Demo | Connected |
| --- | --- | --- |
| Source | local sample corpus | your backend |
| Network | none | HTTP |
| `origin` on all data | `'demo'` | `'live'` |
| UI marker | violet **Demo data** badge everywhere | none |
| On failure | n/a | real error + preserved input + retry |

Mode is chosen by `VITE_APP_MODE`, overridable by the user (unless
`VITE_ALLOW_MODE_SWITCH=false`) and persisted in `localStorage`.

**🔒 The invariant:** Connected Mode never falls back to demo content, and the
two are never mixed in one view. Switching modes aborts every in-flight request,
clears the active conversation, and discards any response that arrives
afterwards — a request started under one service can never write into a view
labelled as the other. Conversation selection is likewise sequence-guarded, so
a slow earlier load cannot overwrite a newer one. `src/test/noFallback.test.ts` and
`src/test/assistantFailure.test.tsx` enforce this; if you break it, CI tells you.

---

## 7. Which files to touch

### ✅ Yours to edit freely

| File | Why |
| --- | --- |
| `src/services/connected/endpoints.ts` | Re-point paths at your real API. Start here. |
| `src/services/connected/mappers.ts` | Adjust field names if your payloads differ. |
| `.env` | Your local configuration (never committed). |

### ⚠️ Coordinate before changing

| File | Why |
| --- | --- |
| `src/types/models.ts` | The domain contract — a change ripples through every screen. |
| `src/services/contracts.ts` | The service interface; both implementations must stay in sync. |
| `src/services/index.ts` | The mode switch. Adding a branch here is how the safety rule gets broken. |
| `src/services/connected/httpClient.ts` | Timeouts, abort handling, error translation. |
| `src/services/errors.ts` | Error taxonomy the whole UI renders against. |
| `src/test/noFallback.test.ts` | Protects a patient-safety property. Do not weaken it to make a change pass. |

### 🚫 Do not do

- Do not add any import of `services/demo` (or `demoAnswers` / `demoDocuments` /
  `DemoService`) to anything under `services/connected/`. A test fails if you do.
- Do not return demo content from a catch block anywhere.
- Do not invent citations, publishers or dates to fill a response. Empty is
  correct and the UI handles it well.
- Do not fake success for operations that did not happen.

---

## 8. Local development against a running backend

```bash
cp .env.example .env
# VITE_APP_MODE=connected
# VITE_API_BASE_URL=http://localhost:8000
npm run dev
```

CORS: the simplest path is enabling CORS in FastAPI for `http://localhost:5173`.
With cookie auth (`VITE_API_WITH_CREDENTIALS=true`) you need
`allow_credentials=True` and that explicit origin; `allow_origins=["*"]` will be
rejected by the browser when credentials are included.
Alternatively route through the Vite dev proxy:

```bash
VITE_USE_DEV_PROXY=true
VITE_DEV_PROXY_TARGET=http://localhost:8000
VITE_API_BASE_URL=/api
```

Check the connection pill in the top bar: **Connected** means `/health`
answered; **Disconnected** opens a panel with the endpoint, status and error
detail.

### Verifying an endpoint from the frontend side

1. Point `endpoints.ts` at your route.
2. Switch to Connected Mode and exercise the screen.
3. On failure, open **Technical detail** in the error block — it shows endpoint,
   status and the backend's `detail` string.
4. `src/services/connected/mappers.ts` is the place to add tolerance for a field
   name that differs from this document.
