# Evaluation Report
## Healthcare: Intelligent Health Literacy Assistant — RAG Pipeline

### 1. Purpose

This report summarizes the available evaluation results for the RAG pipeline. The evaluation focuses on basic retrieval behaviour, response generation, unsupported-question fallback, citation-label consistency, and source metadata.

The reported results are from the existing evaluation artifacts. They do not represent a comprehensive clinical validation.

### 2. Evaluation Artifacts

| File | Purpose |
|---|---|
| `reports/rag_evaluation_20261028_214004.csv` | Summary of five evaluation cases |
| `reports/rag_evaluation_20261028_214004.json` | Detailed answers, sources, and evaluation results |
| `reports/citation_evaluation.json` | Citation-label checks for Q1 and Q4 |

### 3. Test Coverage

The existing five-question evaluation includes three answerable questions and two questions intended to test unsupported information.

| Test | Scenario | Observed result |
|---|---|---|
| Q1 | WHO blood pressure threshold for starting medication | Three passages retrieved; answer generated |
| Q2 | Pneumonia symptoms | Three passages retrieved; answer generated |
| Q3 | Winning lottery number tomorrow | No passages retrieved; fallback returned |
| Q4 | WHO recommendations for treating hypertension | Three passages retrieved; answer generated |
| Q5 | Treatment for a disease not covered by the documents | No passages retrieved; fallback returned |

### 4. Observed Results

#### 4.1 Retrieval and response generation

The evaluation produced retrieved passages and generated answers for Q1, Q2, and Q4. The pipeline also returned source records for these questions.

This demonstrates basic end-to-end operation for the tested answerable questions. It does not independently prove that every retrieved passage was relevant or that every generated answer was complete and factually correct.

#### 4.2 Unsupported-question fallback

Q3 and Q5 returned zero retrieved passages and zero source records. Both triggered the configured fallback response.

The fallback behaviour passed for these two test cases. Additional testing would be required to determine how consistently the pipeline detects unsupported questions when semantically similar but irrelevant passages are retrieved.

#### 4.3 Citation-label validation

The latest citation evaluation reported a passing citation-label check for Q1 and Q4.

The checker compares citation labels detected in the generated answer against labels available in the returned source list. It checks label consistency, not whether every cited passage directly supports its associated medical claim.

#### 4.4 Source metadata

The five-question evaluation reported complete source metadata for all five cases under the evaluator's structural checks.

For cases with retrieved sources, metadata included document information such as title, organization, page number, and URL where available. For fallback cases, the source list was empty, and the evaluator treated that structure as valid.

### 5. Known Quality Limitations

The latest citation evaluation identified an answer-completeness limitation in Q4.

The question asks broadly about WHO recommendations for treating hypertension in adults, but the generated answer focuses primarily on the lower blood pressure threshold for certain high-risk groups. It does not cover all major recommendations present in the retrieved context.

This indicates that the pipeline can retrieve relevant information and generate a response while still producing an incomplete answer.

Other limitations include:

- Citation-label checks do not validate medical claims.
- Retrieval count alone does not establish passage relevance.
- The current test set is small.
- The evaluation does not establish comprehensive medical accuracy or safety.
- The configured retrieval threshold has not been established as optimal.

### 6. Evaluation Summary

| Evaluation area | Status |
|---|---|
| Basic end-to-end operation | Demonstrated in tested cases |
| Answer generation for tested answerable questions | Passed basic functional checks |
| Fallback for two unsupported questions | Passed |
| Citation-label consistency for Q1 and Q4 | Passed |
| Structural source metadata checks | Passed |
| Complete answers to broad questions | Improvement opportunity |
| Claim-level citation support | Not fully evaluated |
| Comprehensive medical safety validation | Not completed |

### 7. Conclusion

The available results demonstrate that the RAG pipeline performs its core retrieval and answer-generation workflow and can return a fallback when no relevant passages survive retrieval.

The results also identify an answer-completeness limitation and show why structural citation checks should not be interpreted as proof of medical accuracy.

The pipeline is suitable for continued development and integration testing. Its current evaluation should not be presented as clinical validation or as evidence that the system is ready for unsupervised medical use.