
from rag_pipeline.pipeline import answer_question

question = "What blood pressure threshold does WHO recommend for starting medication in adults?"

result = answer_question(question)

print("\nANSWER:\n")
print(result["answer"])

print("\nSOURCES:\n")
for source in result["sources"]:
    print(f'[{source["label"]}] {source["title"]}')
    print(f'Organization: {source["organization"]}')
    print(f'Page: {source["page_number"]}')
    print(f'URL: {source["url"]}')
    print("-" * 50)
