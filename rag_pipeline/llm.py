
from langchain_ollama import ChatOllama

# Connect to Llama 3 running through Ollama
llm = ChatOllama(
    model="llama3",
    temperature=0.2,
)

def generate_answer(prompt: str) -> str:
    response = llm.invoke(prompt)
    return response.content
