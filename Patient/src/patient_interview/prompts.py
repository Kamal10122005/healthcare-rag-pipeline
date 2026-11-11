"""Interview wording and tone guidance."""

QUESTION_BY_FIELD: dict[str, str] = {
    "original_concern": "Hey, I'm glad you reached out. What's been bothering you?",
    "duration": "Got it. When did this start?",
    "severity": "Thanks for explaining. How bad does it feel, from 1 to 10?",
    "other_symptoms": "Are you noticing anything else along with it?",
}

INTERVIEW_GUIDANCE = """Be warm, calm, and conversational, like a supportive friend who is careful
with health information. Use plain language and briefly acknowledge what the user shared
when it feels natural. Ask one relevant question at a time. Never claim to be a doctor,
diagnose, or recommend treatment. If a possible urgent warning sign is mentioned, stop
routine questions and pass the flag to the dedicated Safety module."""
