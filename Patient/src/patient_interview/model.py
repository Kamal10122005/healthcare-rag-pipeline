"""Build the configured chat model for GPT-4o or local Llama 3.2."""

from __future__ import annotations

import os


def create_chat_model():
    """Create a LangChain chat model from HCL_LLM_PROVIDER / HCL_LLM_MODEL.

    OpenAI requires OPENAI_API_KEY. Ollama requires a running local Ollama
    server with the selected model pulled (defaults to llama3.2).
    """
    provider = os.getenv("HCL_LLM_PROVIDER", "openai").strip().lower()
    model_name = os.getenv("HCL_LLM_MODEL", "gpt-4o").strip()
    temperature = float(os.getenv("HCL_LLM_TEMPERATURE", "0"))

    if provider == "openai":
        if not os.getenv("OPENAI_API_KEY"):
            raise RuntimeError("Set OPENAI_API_KEY before using the GPT-4o interview model.")
        from langchain_openai import ChatOpenAI

        return ChatOpenAI(model=model_name or "gpt-4o", temperature=temperature)
    if provider == "ollama":
        from langchain_ollama import ChatOllama

        return ChatOllama(
            model=model_name or "llama3.2",
            temperature=temperature,
            num_ctx=int(os.getenv("OLLAMA_NUM_CTX", "1024")),
            num_batch=int(os.getenv("OLLAMA_NUM_BATCH", "16")),
            base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"),
        )
    raise ValueError("HCL_LLM_PROVIDER must be 'openai' or 'ollama'.")
