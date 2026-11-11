# Intelligent Health Literacy Assistant — Frontend

A production-grade frontend for an evidence-grounded health information assistant.
It answers health questions from a curated document corpus and shows, for every
statement, the passage it came from.

The frontend **runs completely standalone**. Demo Mode needs no backend, no RAG
pipeline, no database and no API key.

---

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173
```

That is the whole setup for Demo Mode. To point it at a real backend:

```bash
cp .env.example .env
# set VITE_APP_MODE=connected and VITE_API_BASE_URL=http://localhost:8000
npm run dev
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with HMR on port 5173 |
| `npm run build` | Typecheck (`tsc -b`) then production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm test` | Run the Vitest suite once |
| `npm run test:watch` | Vitest in watch mode |
| `npm run check:responsive <url>` | Real-browser pass over every route at 1440 / 834 / 390 px: horizontal overflow, console errors, failed requests, screenshots into `screenshots/`. Needs a Chromium (`npx playwright install chromium`, or set `CHROME_PATH`). |

Requires Node 18+ (developed and verified on Node 22).

---

## Stack, and why

| Choice | Reason |
| --- | --- |
| **React 18 + TypeScript** | The brief calls for an interface with live evidence inspection, modal source previews, polling ingestion state and strict demo/connected separation. That is stateful UI work. TypeScript makes the frontend↔backend contract a compiler-checked artifact rather than prose. |
| **Vite** | Fast dev loop, first-class env handling, no config archaeology. |
| **Playwright (dev only)** | Drives the responsive/runtime check above. Not shipped in the bundle. |
| **Tailwind CSS (token-driven)** | All colour lives in CSS custom properties (`src/styles/tokens.css`) and is exposed as semantic utilities (`bg-surface`, `text-ink-muted`). Components never hardcode a colour, so light/dark and any future rebrand are one file. |
| **React Router** | Real URLs per section, so a reviewer can be linked straight to Evidence or Safety. |
| **lucide-react** | One icon family, consistently weighted. |
| **Vitest + Testing Library** | Same transform pipeline as the app; the critical safety rules are enforced by executable tests. |

**On Streamlit.** The project's original intended stack listed Streamlit for the UI.
That was reconsidered deliberately, not for novelty:

- Streamlit re-runs the whole script on every interaction and owns its own widget
  styling. The required interactions here — inline citation chips that open a
  passage drawer, a non-blocking thinking state, polling ingestion progress,
  a design system with a defined token scale — fight that model rather than use it.
- The backend is a **separate FastAPI service**. A Streamlit app would be a second
  Python server in front of it; a static SPA is a build artifact served by any
  web server or CDN and talks to FastAPI directly over HTTP.
- Nothing is lost on the Python side: FastAPI, LangChain/LangGraph, ChromaDB and
  PostgreSQL are untouched by this decision. Only the presentation layer changed.

If the team prefers to keep Streamlit, the contract in
`src/services/contracts.ts` and `FRONTEND_INTEGRATION_GUIDE.md` still describes
exactly what the backend must expose — it is UI-framework independent.

---

## The two modes

### Demo Mode (default)

Serves a local sample corpus. No network request is made at any point.

Every publisher, document and excerpt in the demo corpus is **fictional** —
"Demonstration Guidelines Council", "Sample Public Health Agency" — and every
piece of demo content is visibly marked with a violet **Demo data** badge in the
UI. This is a product requirement, not decoration: a reviewer must never mistake
sample evidence for a real medical citation. The underlying health information is
kept consistent with mainstream public guidance so the demo is not medically
misleading, but it is illustrative text, not a source.

Demo Mode covers: blood pressure, type 2 diabetes / HbA1c, antibiotic
stewardship, paediatric fever, everyday analgesics, sleep. Ask about anything
else and you get the **insufficient evidence** state — which is the point: it
demonstrates the behaviour the real pipeline must have.

### Connected Mode

Talks to the FastAPI backend over HTTP.

**No secrets live here.** Vite inlines every `VITE_*` variable into the bundle,
so there is deliberately no API-key setting: authentication must stay
server-side, via an httpOnly session cookie
(`VITE_API_WITH_CREDENTIALS=true`) or a server-side proxy. See
FRONTEND_INTEGRATION_GUIDE.md § Authentication.

**Emergency screening is the backend's job.** The frontend runs no safety
classifier in Connected Mode and cannot refuse a question; the guardrail must
run before retrieval and generation. The keyword interception in Demo Mode
exists only to demonstrate the interface state and is unreachable from the
connected path.

**The safety rule:** a failed Connected Mode request *never* falls back to demo
content. On failure the app shows the real error (with endpoint, status and
detail), hands your question back to the composer so nothing is retyped, offers
a retry, and marks itself disconnected in the top bar. Live and demonstration
content are never mixed in one view.

This is enforced three ways in `src/test/noFallback.test.ts`:
1. Structurally — the connected service files are asserted to contain no import
   of anything under `services/demo`.
2. Behaviourally — network failures, 5xx responses and malformed payloads are
   asserted to *throw*, never to resolve with content.
3. At the resolver — `createService(mode)` is a pure switch with no error branch.

---

## What the application contains

| Section | Route | Status |
| --- | --- | --- |
| **Assistant** | `/assistant` | Full Q&A: conversation history, follow-ups, new conversation, reading-level control, structured answers, thinking state, copy, save, feedback, error + retry. |
| **Evidence & sources** | `/evidence` | Claims from the answer alongside each retrieved passage, with the supporting sentence highlighted, relevance banding and source metadata. |
| **Document library** | `/library` | Search, category/status filters, document cards, metadata preview, live ingestion progress, PDF upload with validation, empty/error/failed states. |
| **Knowledge workspace** | `/knowledge` | Topics with starter questions that hand off to the assistant, recently explored topics, saved answers (local). |
| **Safety & trust** | `/safety` | Emergency guidance, scope boundaries, the four uncertainty states shown live, known system limitations, data handling per mode. |
| **Settings** | `/settings` | Reading level, theme, local data controls, build info. Auth and notifications are shown as *awaiting backend integration* — not faked. |

### Design decisions worth knowing

- **Answers are structured, not a wall of prose.** Summary, explanation, key
  points, precautions and next steps are distinct sections, each rendered only
  when the generator actually produced content for it.
- **Confidence is three bars, not a percentage.** A number like "87% confident"
  gets read as "87% likely to be correct". Retrieval scores do not mean that.
- **Insufficient evidence is a designed state, not an error.** When nothing is
  retrieved above threshold, the UI says so and explains that nothing was
  generated from outside the corpus.
- **Emergency questions are intercepted before retrieval.** The demo safety layer
  short-circuits and refuses to answer, mirroring the production guardrail.
- **No button does nothing.** Features that depend on unbuilt backend work render
  a distinct *integration required* state rather than a dead control or a fake
  success message. Copy-to-clipboard reports failure honestly if the browser
  blocks it.
- **Teal means provenance.** The accent colour is reserved for evidence and
  citation affordances, so it becomes a learned signal.

---

## Project structure

```
src/
  components/
    assistant/     AnswerCard, Composer, ConfidenceIndicator, SafetyNotices, ConversationRail
    evidence/      SourceExcerpt, EvidenceDrawer
    shell/         AppShell, navigation, ModeIndicator, ProductMark
    ui/            Button, Panel, Field, Modal, Tabs, Toast, Badge, States  ← design system
    ErrorBoundary.tsx
  config/env.ts            all environment access, in one place
  lib/                     cn, format, clipboard, storage, savedAnswers
  pages/                   one file per section
  services/
    contracts.ts           ⚠️ the service interface (shared contract)
    errors.ts              ServiceError + normalisation
    index.ts               createService(mode) — the mode switch
    connected/             httpClient, endpoints, mappers, connectedService
    demo/                  demoService, demoAnswers, demoDocuments, demoConversations
  state/                   AppProvider, useConversation, useServiceQuery, latestAnswer
  styles/                  tokens.css, index.css
  test/                    4 suites, 33 tests
  types/models.ts          ⚠️ domain models (shared contract)
```

---

## Testing

```bash
npm test
```

**Verified on this build: 37 tests across 5 suites, all passing; `tsc -b` clean;
`vite build` succeeds (334 kB JS / 101 kB gzipped); real-Chrome responsive pass
clean across 6 routes × 3 widths.**

| Suite | Covers |
| --- | --- |
| `noFallback.test.ts` | The no-fallback safety rule (structural, behavioural, resolver). |
| `demoService.test.ts` | Demo answering, conversation threading, filters, deletion, emergency interception, insufficient-evidence path, formatting helpers, copy output. |
| `assistantFailure.test.tsx` | Connected Mode failure in the real UI: error shown, input preserved, retry offered, no demo content present. |
| `appSmoke.test.tsx` | Boots the real app and walks every section; answers a question end-to-end and opens a citation. |
| `staleness.test.tsx` | Stale-response races: an answer resolving after a mode switch, conversation-id leakage across modes, and out-of-order conversation loads. Each guard was mutation-checked — disabling it fails the test. |

Browser verification (`npm run check:responsive`) was run against the production
build in Chrome 1440 / 834 / 390 px across all six routes: no horizontal
overflow, no console errors, no page exceptions, content present on every route.
The answer flow, citation drawer, mobile navigation drawer and dark mode were
captured as screenshots and reviewed.

Not covered: cross-browser behaviour (Firefox/Safari/WebKit), real touch input,
screen-reader testing, and visual-regression diffing.

---

## For the backend team

Start with **`FRONTEND_INTEGRATION_GUIDE.md`**. In short:

1. `src/services/contracts.ts` and `src/types/models.ts` are the shared contract.
   Changing them changes the wire format — coordinate first.
2. `src/services/connected/endpoints.ts` holds **proposed** paths. Nothing there
   has been verified against a running backend. Edit that one file to re-point
   the frontend at your real routes.
3. `src/services/connected/mappers.ts` is where wire payloads become domain
   models. It accepts both `snake_case` and `camelCase` and degrades unknown
   values safely — but it never invents content.
4. Never add a demo import to anything under `services/connected/`. A test fails
   if you do, and that test is protecting a patient-safety property.

---

## Honest status

**Switching modes cannot mix sources.** Every in-flight request is aborted and
generation-guarded, so a response started under one service can never render in
a view labelled as the other. Conversation loads are sequence-guarded against
out-of-order arrival.

**Fully working, frontend-side:** all six sections, the complete design system,
light/dark theming, responsive layout down to phone width, keyboard navigation
and focus management, Demo Mode end to end, Connected Mode request/error
handling, upload validation and simulated ingestion progress, local persistence
of conversations, preferences and saved answers.

**Requires the backend:** real retrieval and generation, real citations and
documents, actual PDF ingestion (extraction → chunking → embedding → indexing),
page-level PDF rendering, persistent conversation history across devices,
feedback storage, authentication and user profiles, notifications, and the
Connected Mode data-retention policy stated on the Safety page.

---

Health information, not medical advice. This application does not diagnose,
does not recommend treatment, and does not replace a qualified clinician.
