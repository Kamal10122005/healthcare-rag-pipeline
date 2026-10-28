
from rag_pipeline.retriever import retrieve_documents
from rag_pipeline.llm import generate_answer
from rag_pipeline.prompts import build_prompt
from rag_pipeline.citations import build_context, format_sources


def answer_question(question: str, top_k: int = 3) -> dict:
    """
    Retrieve relevant healthcare passages and generate
    an answer grounded in those passages.
    """
    question = question.strip()

    if not question:
        return {
            "answer": "Please enter a healthcare question.",
            "sources": [],
        }

    # 1. Retrieve relevant chunks from ChromaDB
    retrieved_documents = retrieve_documents(
    question,
    top_k=top_k,
    min_chars=150,
)

    if not retrieved_documents:
        return {
            "answer": (
                "I couldn't find relevant information in the available "
                "healthcare documents. Please consult a qualified "
                "healthcare professional for guidance."
            ),
            "sources": [],
        }

    # 2. Build context and format source metadata
    context = build_context(retrieved_documents)
    sources = format_sources(retrieved_documents)

    # 3. Build the grounded medical prompt
    prompt = build_prompt(question, context)

    # 4. Generate the answer using local Llama 3
    answer = generate_answer(prompt)

    return {
        "answer": answer,
        "sources": sources,
    }
