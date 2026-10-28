# Integration Guide
## Healthcare: Intelligent Health Literacy Assistant — RAG Pipeline

### 1. Purpose

This guide explains how to integrate the RAG and AI Pipeline with the larger Healthcare: Intelligent Health Literacy Assistant.

The pipeline is responsible for retrieving relevant healthcare passages from the indexed document collection and generating a context-grounded response using a locally running language model.

### 2. Integration Architecture

The main application can call the RAG pipeline through its Python interface.

**Question → RAG pipeline → BGE-M3 query embedding → ChromaDB retrieval → Context construction → Llama 3 via Ollama → Answer and source metadata**

The main application can then display the answer and its associated sources to the user.

### 3. Python Interface

The main entry point is:

```python
from rag_pipeline.pipeline import answer_question
```

Call the function with a healthcare question:

```python
result = answer_question(
    "What blood pressure threshold does WHO recommend for starting medication in adults?"
)
```

The function accepts:

- `question`: a healthcare question as a string.
- `top_k`: the maximum number of retrieved passages to return; defaults to 3.

### 4. Response Format

The function returns a dictionary containing `answer` and `sources`.

Example structure:

```python
{
    "answer": "Generated response based on retrieved context.",
    "sources": [
        {
            "label": "S1",
            "title": "Guideline title",
            "organization": "Publishing organization",
            "page_number": 10,
            "url": "https://example.org/guideline"
        }
    ]
}
```

The values above illustrate the response structure; they are not a guaranteed real response.

The main application should:

- Display the answer returned by the pipeline.
- Present the returned source titles and organizations.
- Display page numbers and source links when available.
- Preserve the source labels associated with the answer.
- Handle an empty source list gracefully.

### 5. Example Integration

```python
from rag_pipeline.pipeline import answer_question

def handle_healthcare_question(question: str) -> dict:
    result = answer_question(question)

    return {
        "answer": result["answer"],
        "sources": result["sources"],
    }
```

This example demonstrates a direct Python integration. It does not create an HTTP API or web endpoint.

### 6. Prerequisites

Before running the pipeline, ensure that:

1. The project's Python virtual environment is activated.
2. The required Python dependencies are installed.
3. The existing ChromaDB database is available at the configured path.
4. The `health_guidelines_bge_m3` collection exists.
5. Ollama is running and the `llama3` model is available.
6. The local environment can load the `BAAI/bge-m3` embedding model.

The current retriever initializes BGE-M3 on the CPU and uses the existing local ChromaDB collection.

### 7. Source and Citation Handling

The pipeline constructs source labels such as `[S1]`, `[S2]`, and `[S3]` from the retrieved passages.

Source metadata is returned separately in the `sources` list. The main application should preserve this mapping when displaying citations.

The existing citation-label evaluation checks whether detected labels correspond to returned source labels. It does not independently validate the factual support for every claim.

### 8. Fallback Behaviour

When no relevant passages survive retrieval, the pipeline returns a fallback response and an empty source list.

The integrating application should display this response rather than inventing sources or presenting unsupported content as if it came from the indexed guidelines.

An empty retrieval result does not guarantee that every unsupported medical question will be detected.

### 9. Safety Considerations

- Treat generated answers as informational support, not medical diagnoses.
- Preserve the medical safety instructions in the configured prompt.
- Do not present the language model as a replacement for a qualified healthcare professional.
- Ensure that urgent or emergency requests receive appropriate safety guidance.
- Do not assume that a valid citation label proves the associated claim is medically correct.
- Apply the main application's authentication, privacy, and data-handling controls where relevant.

### 10. Current Integration Boundary

The current implementation is a Python module exposing `answer_question()`. It does not itself provide a REST API, authentication layer, frontend, or production deployment service.

If the main application uses a separate backend or a different programming language, an API adapter or service boundary will be needed.

### 11. Known Limitations

- Answer completeness may vary with the retrieved passages and model output.
- The retrieval threshold and other retrieval settings have not been established as optimal through comprehensive evaluation.
- Citation-label validation is not full claim-level citation verification.
- Medical accuracy and safety require broader evaluation before production use.

### 12. Handoff Checklist

- [ ] Confirm that the indexed ChromaDB collection is available.
- [ ] Confirm Ollama and Llama 3 are available.
- [ ] Verify that `answer_question()` can be imported by the integrating module.
- [ ] Confirm that answers and source metadata are displayed correctly.
- [ ] Test questions with relevant supporting documents.
- [ ] Test questions for which relevant documents cannot be retrieved.
- [ ] Review medical safety behaviour before deployment.
- [ ] Document any API adapter or application-specific configuration separately.