"""GLM 5.1 client wrapper using OpenAI-compatible API."""
from __future__ import annotations

import json
import os
import re
from openai import OpenAI

_client: OpenAI | None = None


def get_client() -> OpenAI:
    global _client
    if _client is None:
        api_key = os.environ.get("ZAI_API_KEY", "")
        _client = OpenAI(
            api_key=api_key,
            base_url="https://open.bigmodel.cn/api/paas/v4",
        )
    return _client


def chat(
    messages: list[dict],
    temperature: float = 0.7,
    max_tokens: int = 4096,
    response_format: dict | None = None,
) -> str:
    """Send a chat completion request to GLM 5.1."""
    client = get_client()
    kwargs: dict = {
        "model": "glm-4-plus",
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    if response_format:
        kwargs["response_format"] = response_format
    resp = client.chat.completions.create(**kwargs)
    return resp.choices[0].message.content or ""


def chat_json(messages: list[dict], temperature: float = 0.5, max_tokens: int = 4096) -> dict | list:
    """Send a chat request and parse JSON from the response."""
    raw = chat(messages, temperature=temperature, max_tokens=max_tokens)
    # Try to extract JSON from markdown code blocks
    json_match = re.search(r"```(?:json)?\s*([\s\S]*?)```", raw)
    if json_match:
        raw = json_match.group(1).strip()
    # Also try to find JSON array or object
    raw = raw.strip()
    if not raw.startswith(("{", "[")):
        # Try to find first { or [
        for i, c in enumerate(raw):
            if c in ("{", "["):
                raw = raw[i:]
                break
    return json.loads(raw)
