"""
Configurable AI Provider Abstraction for Panther AI.
Uses httpx to connect to OpenAI-compatible Chat Completions endpoints with full streaming and error handling.
"""
import json
import logging
from typing import List, Dict, Any, AsyncGenerator, Optional
import httpx
from app.core.config import settings
from app.modules.ai.schemas import ChatMessage

logger = logging.getLogger("panther_ai.provider")


def is_provider_configured() -> bool:
    """Checks whether a valid AI provider API key is present."""
    api_key = settings.OPENAI_API_KEY
    return bool(api_key and api_key.strip() and not api_key.startswith("your-") and not api_key.startswith("sk-placeholder"))


async def call_llm(
    messages: List[ChatMessage],
    system_prompt: str,
    max_tokens: int = 1000,
    temperature: float = 0.3,
) -> str:
    """
    Executes a chat completion call against the configured OpenAI-compatible endpoint.
    Raises RuntimeError if provider is not configured or if the upstream API fails.
    """
    if not is_provider_configured():
        raise RuntimeError("AI Provider is not configured. Please set OPENAI_API_KEY in the backend environment.")

    formatted_messages = [{"role": "system", "content": system_prompt}]
    for msg in messages:
        if msg.role in ("user", "assistant"):
            formatted_messages.append({"role": msg.role, "content": msg.content})

    headers = {
        "Authorization": f"Bearer {settings.OPENAI_API_KEY.strip()}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": settings.OPENAI_MODEL,
        "messages": formatted_messages,
        "max_tokens": max_tokens,
        "temperature": temperature,
    }

    url = f"{settings.OPENAI_BASE_URL.rstrip('/')}/chat/completions"

    try:
        async with httpx.AsyncClient(timeout=45.0) as client:
            response = await client.post(url, headers=headers, json=payload)
            if response.status_code == 401:
                raise RuntimeError("AI Provider Authentication Failed: Invalid or expired OPENAI_API_KEY.")
            if response.status_code == 429:
                raise RuntimeError("AI Provider Quota Exceeded: Rate limit or credit allowance exhausted.")
            if response.status_code >= 400:
                raise RuntimeError(f"AI Provider error ({response.status_code}): {response.text[:200]}")

            data = response.json()
            choices = data.get("choices", [])
            if not choices:
                raise RuntimeError("AI Provider returned an empty response.")
            return choices[0]["message"]["content"].strip()

    except httpx.TimeoutException:
        raise RuntimeError("AI Provider request timed out. Please try again.")
    except httpx.ConnectError:
        raise RuntimeError("Unable to reach AI Provider endpoint. Please check your internet connection.")
    except Exception as e:
        if isinstance(e, RuntimeError):
            raise
        logger.error(f"Unexpected AI Provider error: {e}")
        raise RuntimeError(f"AI Provider communication failure: {str(e)}")


async def stream_llm(
    messages: List[ChatMessage],
    system_prompt: str,
    max_tokens: int = 1000,
    temperature: float = 0.3,
) -> AsyncGenerator[str, None]:
    """
    Streams tokens from the OpenAI-compatible endpoint via Server-Sent Events (SSE).
    """
    if not is_provider_configured():
        yield "AI Provider is not configured. Please set OPENAI_API_KEY in your backend .env to enable live assistant responses."
        return

    formatted_messages = [{"role": "system", "content": system_prompt}]
    for msg in messages:
        if msg.role in ("user", "assistant"):
            formatted_messages.append({"role": msg.role, "content": msg.content})

    headers = {
        "Authorization": f"Bearer {settings.OPENAI_API_KEY.strip()}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": settings.OPENAI_MODEL,
        "messages": formatted_messages,
        "max_tokens": max_tokens,
        "temperature": temperature,
        "stream": True,
    }

    url = f"{settings.OPENAI_BASE_URL.rstrip('/')}/chat/completions"

    async with httpx.AsyncClient(timeout=60.0) as client:
        async with client.stream("POST", url, headers=headers, json=payload) as response:
            if response.status_code != 200:
                err_text = await response.aread()
                yield f"[Error: AI Provider returned status {response.status_code}: {err_text.decode('utf-8', errors='ignore')[:150]}]"
                return

            async for line in response.aiter_lines():
                if not line or not line.startswith("data: "):
                    continue
                data_str = line[6:].strip()
                if data_str == "[DONE]":
                    break
                try:
                    chunk = json.loads(data_str)
                    delta = chunk.get("choices", [{}])[0].get("delta", {})
                    token = delta.get("content")
                    if token:
                        yield token
                except Exception:
                    continue

