
from rag_pipeline.llm import generate_answer

answer = generate_answer(
    "Explain high blood pressure in simple language."
)

print("\nLlama 3 response:\n")
print(answer)
