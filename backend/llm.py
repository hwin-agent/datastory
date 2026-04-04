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
        if not api_key:
            raise RuntimeError("ZAI_API_KEY environment variable is required")
        _client = OpenAI(
            api_key=api_key,
            base_url="https://open.bigmodel.cn/api/paas/v4",
        )
    return _client


# Model fallback chain: try glm-5.1 first, fall back to glm-5
_MODEL_CHAIN = ["glm-5.1", "glm-5", "glm-4.7"]
_active_model: str | None = None


def _get_model() -> str:
    """Return the active model, probing the chain on first call."""
    global _active_model
    if _active_model:
        return _active_model
    # Probe which model works
    client = get_client()
    for model in _MODEL_CHAIN:
        try:
            resp = client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": "Say OK"}],
                max_tokens=5,
            )
            if resp.choices and resp.choices[0].message.content:
                _active_model = model
                print(f"[LLM] Using model: {model}")
                return model
        except Exception as e:
            print(f"[LLM] Model {model} unavailable: {e}")
            continue
    # Last resort
    _active_model = _MODEL_CHAIN[-1]
    return _active_model


def chat(
    messages: list[dict],
    temperature: float = 0.7,
    max_tokens: int = 4096,
    response_format: dict | None = None,
) -> str:
    """Send a chat completion request to the best available GLM model."""
    client = get_client()
    model = _get_model()
    kwargs: dict = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    if response_format:
        kwargs["response_format"] = response_format
    resp = client.chat.completions.create(**kwargs)
    return resp.choices[0].message.content or ""


def chat_json(messages: list[dict], temperature: float = 0.5, max_tokens: int = 4096, retries: int = 2) -> dict | list:
    """Send a chat request and parse JSON from the response."""
    last_error = None
    for attempt in range(retries + 1):
        try:
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
        except (json.JSONDecodeError, Exception) as e:
            last_error = e
            if attempt < retries:
                continue
    raise ValueError(f"Failed to parse JSON from LLM after {retries + 1} attempts: {last_error}")
