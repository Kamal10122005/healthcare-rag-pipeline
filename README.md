# Healthcare: Intelligent Health Literacy Assistant
## RAG and AI Pipeline

### 1. Project Overview

The RAG and AI Pipeline is a retrieval-augmented generation component developed for the Healthcare: Intelligent Health Literacy Assistant. It answers healthcare-related questions using information retrieved from an indexed collection of healthcare guidelines and documents.

Instead of relying entirely on the language model's internal knowledge, the pipeline retrieves relevant passages from the local document collection and supplies them as context to a locally running Llama 3 model.

The system is designed to support source-grounded responses, source metadata, and a fallback response when relevant information cannot be retrieved.

### 2. Objectives

- Process healthcare documents and prepare them for retrieval.
- Generate document embeddings using BGE-M3.
- Store and retrieve document passages using ChromaDB.
- Generate answers using a locally running Llama 3 model through Ollama.
- Associate retrieved passages with source labels and metadata.
- Avoid generating an answer when the retriever returns no relevant passages.
- Support evaluation of retrieval, citations, and unsupported questions.

### 3. Technology Stack

| Component | Technology |
|---|---|
| Programming language | Python |
| Embedding model | BAAI/bge-m3 |
| Vector database | ChromaDB |
| Language model | Llama 3 |
| Local model runtime | Ollama |
| LLM integration | LangChain Ollama |
| Document processing | Python-based ingestion pipeline |
| Evaluation | Custom Python scripts |

### 4. System Architecture

The pipeline follows these steps:

1. **Document ingestion:** Healthcare documents are processed into text chunks and associated metadata.
2. **Embedding generation:** BGE-M3 converts text passages into dense vector representations.
3. **Vector storage:** ChromaDB stores the indexed passages, embeddings, and metadata.
4. **Query embedding:** The user's question is encoded using BGE-M3.
5. **Semantic retrieval:** ChromaDB retrieves candidate passages, which are filtered by distance and minimum text length.
6. **Context construction:** Retrieved passages are formatted with source labels, document titles, organizations, page numbers, and URLs when available.
7. **Answer generation:** The context and question are passed to Llama 3 through Ollama.
8. **Source output:** The pipeline returns the generated answer and structured source metadata.
9. **Fallback handling:** If no passages survive retrieval, the pipeline returns a message explaining that relevant information was not found.

### 5. Main Modules

- `rag_pipeline/ingest.py` — Processes source documents for indexing.
- `rag_pipeline/load_vector_db.py` — Supports loading documents into the vector database.
- `rag_pipeline/migrate_bge_m3.py` — Supports the BGE-M3 migration workflow.
- `rag_pipeline/retriever.py` — Initializes BGE-M3 and ChromaDB and performs semantic retrieval.
- `rag_pipeline/citations.py` — Builds context with source labels and formats source metadata.
- `rag_pipeline/prompts.py` — Defines the prompt used for grounded answer generation.
- `rag_pipeline/llm.py` — Connects to Llama 3 through Ollama.
- `rag_pipeline/pipeline.py` — Coordinates retrieval, context construction, answer generation, and fallback handling.
- `evaluate_retrieval.py` — Evaluates retrieval behaviour.
- `evaluate_citations.py` — Checks whether detected citation labels match the labels available in the returned source list.

### 6. Current Configuration

The retriever uses the following settings:

- Embedding model: `BAAI/bge-m3`
- Embedding device: CPU
- Vector database directory: `chroma_db`
- Collection: `health_guidelines_bge_m3`
- Default number of returned passages: 3
- Candidate multiplier: 10
- Maximum cosine distance: 0.40
- Minimum retrieved text length used by the main pipeline: 150 characters
- Llama 3 temperature: 0.2

The distance threshold and retrieval settings are configuration choices that should be validated against a broader evaluation set before being treated as optimal.

### 7. Installation and Setup

#### Prerequisites

- Python environment with the project's required Python packages.
- Ollama installed and running.
- The Llama 3 model available through Ollama.
- The existing ChromaDB index and processed healthcare documents.

#### Setup

1. Activate the project's virtual environment.
2. Install the project's dependencies from `requirements.txt` after it has been populated and verified.
3. Ensure Ollama is running and the configured Llama 3 model is available.
4. Ensure the `chroma_db` directory contains the expected collection.
5. Run the pipeline test scripts or evaluation scripts from the project root.

Example PowerShell commands:

```powershell
.\.venv\Scripts\Activate.ps1
ollama list
python .\evaluate_citations.py
```

The evaluation command is a diagnostic test; it is not the user-facing application interface.

### 8. Pipeline Usage

The primary Python entry point is `answer_question` in `rag_pipeline.pipeline`.

Example:

```python
from rag_pipeline.pipeline import answer_question

result = answer_question(
    "What blood pressure threshold does WHO recommend for starting medication in adults?"
)

print(result["answer"])
print(result["sources"])
```

The function returns a dictionary containing:

- `answer`: generated response or fallback message.
- `sources`: list of source records containing labels, titles, organizations, page numbers, and URLs where available.

The current implementation is a Python pipeline component. A web interface or API layer must call this function if required by the larger application.

### 9. Evaluation and Current Status

The project includes scripts for retrieval evaluation and citation-label checking. Previously recorded tests demonstrated that:

- Relevant WHO hypertension passages could be retrieved.
- NHS pneumonia source metadata could be returned.
- Unsupported questions could trigger the fallback when no relevant passages were retrieved.
- Citation-label checks passed for the tested hypertension questions.

These tests establish basic pipeline functionality, not comprehensive clinical accuracy.

The current citation checker verifies citation-label consistency. It does not independently establish that every medical claim is supported by the cited passage. Broad questions can also produce incomplete answers.

### 10. Limitations and Safety

- Answers depend on the quality and coverage of the indexed documents.
- A fallback occurs when retrieval returns no passages; this does not guarantee that every unsupported question will be detected.
- Citation-label validation is not equivalent to claim-level factual verification.
- Medical accuracy, completeness, and safety require broader testing.
- The pipeline is an informational support component and is not a substitute for a qualified healthcare professional.
- The generated response must not be treated as a medical diagnosis.

### 11. Future Enhancements

- Expand the evaluation set with answerable and unanswerable healthcare questions.
- Evaluate retrieval relevance and answer completeness.
- Validate individual claims against their cited passages.
- Test medical safety scenarios, including emergencies and medication-related requests.
- Improve integration with the main healthcare assistant.
- Complete dependency management and reproducible setup documentation.

### 12. Conclusion

The RAG and AI Pipeline provides the core retrieval and grounded answer-generation functionality for the Healthcare: Intelligent Health Literacy Assistant. It combines BGE-M3 embeddings, ChromaDB semantic retrieval, source-aware context construction, and local Llama 3 generation. Further evaluation and integration work will help establish its reliability in the larger application.