"""Hypothesis generation using GLM 5.1."""
from __future__ import annotations

from models import Hypothesis
from llm import chat_json


def generate_hypotheses(profile_text: str) -> list[Hypothesis]:
    """Ask GLM 5.1 to generate testable hypotheses from the data profile."""
    messages = [
        {
            "role": "system",
            "content": (
                "You are a data scientist. Given a dataset profile, generate 5-7 testable statistical hypotheses. "
                "Each hypothesis should:\n"
                "1. Be specific and testable with the available columns\n"
                "2. Specify the statistical test to use (chi_squared, t_test, correlation, or regression)\n"
                "3. Specify which columns/variables are involved\n"
                "4. Be expressed as a clear question\n\n"
                "Return JSON array with objects: {\"text\": \"...\", \"test_type\": \"...\", \"variables\": [\"col1\", \"col2\"]}\n"
                "Only return the JSON array, no other text."
            ),
        },
        {
            "role": "user",
            "content": f"Here is the dataset profile:\n\n{profile_text}\n\nGenerate 5-7 testable hypotheses.",
        },
    ]

    result = chat_json(messages, temperature=0.6)
    hypotheses = []
    items = result if isinstance(result, list) else result.get("hypotheses", result.get("data", []))
    for item in items[:7]:
        h = Hypothesis(
            text=item.get("text", ""),
            test_type=item.get("test_type", "correlation"),
            variables=item.get("variables", []),
            status="pending",
        )
        hypotheses.append(h)
    return hypotheses
