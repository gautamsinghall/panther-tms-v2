"""
Configurable AI Provider Abstraction for Panther AI.
Supports GroqCloud LPU (e.g. qwen/qwen3.8-27b), NVIDIA Hosted API, and Google Gemini
with full streaming, error handling, strict timeouts, and clean error reporting.
"""
import asyncio
import json
import logging
import re
from typing import List, Dict, Any, AsyncGenerator, Optional
import httpx
from app.core.config import settings
from app.modules.ai.schemas import ChatMessage

logger = logging.getLogger("panther_ai.provider")


def _is_valid_key(key: Optional[str]) -> bool:
    """Validates that an API key is non-empty and not a placeholder."""
    return bool(
        key
        and key.strip()
        and not key.startswith("your-")
        and not key.startswith("sk-placeholder")
        and not key.startswith("nvapi-placeholder")
        and not key.startswith("gsk-placeholder")
        and not key.startswith("YOUR_")
    )


def sanitize_ai_response(text: str) -> str:
    """Strips reasoning tokens, thinking blocks (<thought>...</thought>), or artifacts."""
    if not text:
        return text
    cleaned = re.sub(r"<(thought|think|reasoning)>.*?</\1>", "", text, flags=re.DOTALL | re.IGNORECASE)
    cleaned = re.sub(r"<(thought|think|reasoning)>.*", "", cleaned, flags=re.DOTALL | re.IGNORECASE)
    return cleaned.strip()


def is_provider_configured() -> bool:
    """Checks whether a valid AI provider API key is present for the active provider."""
    if settings.active_ai_provider == "groq":
        return _is_valid_key(settings.GROQ_API_KEY)
    elif settings.active_ai_provider == "nvidia":
        return _is_valid_key(settings.NVIDIA_API_KEY)
    return _is_valid_key(settings.OPENAI_API_KEY)


async def _call_groq(
    formatted_messages: List[Dict[str, str]],
    max_tokens: int = 1024,
    temperature: float = 0.3,
    timeout_sec: float = 15.0,
) -> str:
    """Executes high-velocity chat completion against GroqCloud LPU endpoint."""
    url = f"{settings.GROQ_BASE_URL.rstrip('/')}/chat/completions"
    headers = {
        "Authorization": f"Bearer {settings.GROQ_API_KEY.strip()}",
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "PantherAI/1.0",
    }
    payload = {
        "model": settings.GROQ_MODEL,
        "messages": formatted_messages,
        "max_tokens": max_tokens,
        "temperature": temperature,
        "stream": False,
    }

    timeout = httpx.Timeout(timeout_sec, connect=5.0)

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(url, headers=headers, json=payload)
            if response.status_code == 401:
                raise RuntimeError("AI Provider Authentication Failed: Invalid or expired GROQ_API_KEY.")
            if response.status_code == 429:
                raise RuntimeError("AI Provider Quota Exceeded: Groq rate limit or credit allowance exhausted.")
            if response.status_code == 404:
                raise RuntimeError(f"Groq Model '{settings.GROQ_MODEL}' Not Found (404) on this endpoint.")
            if response.status_code >= 400:
                raise RuntimeError(f"Groq API Error ({response.status_code}): {response.text[:200]}")

            data = response.json()
            choices = data.get("choices", [])
            if not choices:
                raise RuntimeError("Groq API returned an empty choices array.")
            raw_content = choices[0].get("message", {}).get("content") or ""
            cleaned = sanitize_ai_response(raw_content)
            if not cleaned:
                finish_reason = choices[0].get("finish_reason")
                raise RuntimeError(f"Groq Model '{settings.GROQ_MODEL}' returned empty text (finish_reason: {finish_reason}).")
            return cleaned

    except (httpx.TimeoutException, TimeoutError) as net_err:
        raise RuntimeError(f"Groq API request timed out after {timeout_sec}s: {net_err}")
    except httpx.ConnectError as net_err:
        raise RuntimeError(f"Unable to connect to Groq API endpoint: {net_err}")
    except Exception as e:
        if isinstance(e, RuntimeError):
            raise
        raise RuntimeError(f"Groq API communication failure: {str(e)}")


async def _stream_groq(
    formatted_messages: List[Dict[str, str]],
    max_tokens: int = 1024,
    temperature: float = 0.3,
    timeout_sec: float = 15.0,
) -> AsyncGenerator[str, None]:
    """Streams tokens from GroqCloud LPU endpoint via SSE."""
    url = f"{settings.GROQ_BASE_URL.rstrip('/')}/chat/completions"
    headers = {
        "Authorization": f"Bearer {settings.GROQ_API_KEY.strip()}",
        "Content-Type": "application/json",
        "Accept": "text/event-stream",
        "User-Agent": "PantherAI/1.0",
    }
    payload = {
        "model": settings.GROQ_MODEL,
        "messages": formatted_messages,
        "max_tokens": max_tokens,
        "temperature": temperature,
        "stream": True,
    }
    timeout = httpx.Timeout(timeout_sec, connect=5.0)

    async with httpx.AsyncClient(timeout=timeout) as client:
        async with client.stream("POST", url, headers=headers, json=payload) as response:
            if response.status_code != 200:
                err_text = await response.aread()
                raise RuntimeError(f"Groq API returned status {response.status_code}: {err_text.decode('utf-8', errors='ignore')[:150]}")

            in_thought_block = False
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
                    if not token:
                        continue

                    if in_thought_block:
                        if "</thought>" in token.lower():
                            in_thought_block = False
                            token = re.sub(r".*?</thought>", "", token, flags=re.IGNORECASE)
                        elif "</think>" in token.lower():
                            in_thought_block = False
                            token = re.sub(r".*?</think>", "", token, flags=re.IGNORECASE)
                        else:
                            continue

                    if "<thought" in token.lower() or "<think" in token.lower():
                        token = re.sub(r"<(thought|think)>.*?(</\1>|$)", "", token, flags=re.IGNORECASE)
                        if "<thought" in token.lower() or "<think" in token.lower():
                            in_thought_block = True
                            continue

                    if token:
                        yield token
                except Exception:
                    continue


async def _call_nvidia(
    formatted_messages: List[Dict[str, str]],
    max_tokens: int = 1024,
    temperature: float = 0.5,
    timeout_sec: float = 20.0,
) -> str:
    """Executes chat completion against NVIDIA's hosted inference API without retries."""
    url = f"{settings.NVIDIA_BASE_URL.rstrip('/')}/chat/completions"
    headers = {
        "Authorization": f"Bearer {settings.NVIDIA_API_KEY.strip()}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    payload = {
        "model": settings.NVIDIA_MODEL,
        "messages": formatted_messages,
        "max_tokens": max_tokens,
        "temperature": temperature,
        "top_p": 1,
        "frequency_penalty": 0,
        "presence_penalty": 0,
        "seed": 0,
        "stream": False,
    }

    timeout = httpx.Timeout(timeout_sec, connect=10.0)

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(url, headers=headers, json=payload)
            if response.status_code == 401:
                raise RuntimeError("AI Provider Authentication Failed: Invalid or expired NVIDIA_API_KEY.")
            if response.status_code == 429:
                raise RuntimeError("AI Provider Quota Exceeded: NVIDIA rate limit or credit allowance exhausted.")
            if response.status_code == 404:
                raise RuntimeError(f"NVIDIA Model '{settings.NVIDIA_MODEL}' Not Found (404) on this endpoint.")
            if response.status_code >= 400:
                raise RuntimeError(f"NVIDIA API Error ({response.status_code}): {response.text[:200]}")

            data = response.json()
            choices = data.get("choices", [])
            if not choices:
                raise RuntimeError("NVIDIA API returned an empty choices array.")
            raw_content = choices[0].get("message", {}).get("content") or ""
            cleaned = sanitize_ai_response(raw_content)
            if not cleaned:
                finish_reason = choices[0].get("finish_reason")
                raise RuntimeError(f"NVIDIA API model '{settings.NVIDIA_MODEL}' returned empty text (finish_reason: {finish_reason}).")
            return cleaned

    except (httpx.TimeoutException, TimeoutError) as net_err:
        raise RuntimeError(f"NVIDIA API request timed out after {timeout_sec}s: {net_err}")
    except httpx.ConnectError as net_err:
        raise RuntimeError(f"Unable to connect to NVIDIA API endpoint: {net_err}")
    except Exception as e:
        if isinstance(e, RuntimeError):
            raise
        raise RuntimeError(f"NVIDIA API communication failure: {str(e)}")


async def _stream_nvidia(
    formatted_messages: List[Dict[str, str]],
    max_tokens: int = 1024,
    temperature: float = 0.5,
    timeout_sec: float = 20.0,
) -> AsyncGenerator[str, None]:
    """Streams tokens from NVIDIA inference endpoint via SSE."""
    url = f"{settings.NVIDIA_BASE_URL.rstrip('/')}/chat/completions"
    headers = {
        "Authorization": f"Bearer {settings.NVIDIA_API_KEY.strip()}",
        "Content-Type": "application/json",
        "Accept": "text/event-stream",
    }
    payload = {
        "model": settings.NVIDIA_MODEL,
        "messages": formatted_messages,
        "max_tokens": max_tokens,
        "temperature": temperature,
        "top_p": 1,
        "frequency_penalty": 0,
        "presence_penalty": 0,
        "seed": 0,
        "stream": True,
    }
    timeout = httpx.Timeout(timeout_sec, connect=10.0)

    async with httpx.AsyncClient(timeout=timeout) as client:
        async with client.stream("POST", url, headers=headers, json=payload) as response:
            if response.status_code != 200:
                err_text = await response.aread()
                raise RuntimeError(f"NVIDIA API returned status {response.status_code}: {err_text.decode('utf-8', errors='ignore')[:150]}")

            in_thought_block = False
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
                    if not token:
                        continue

                    if in_thought_block:
                        if "</thought>" in token.lower():
                            in_thought_block = False
                            token = re.sub(r".*?</thought>", "", token, flags=re.IGNORECASE)
                        elif "</think>" in token.lower():
                            in_thought_block = False
                            token = re.sub(r".*?</think>", "", token, flags=re.IGNORECASE)
                        else:
                            continue

                    if "<thought" in token.lower() or "<think" in token.lower():
                        token = re.sub(r"<(thought|think)>.*?(</\1>|$)", "", token, flags=re.IGNORECASE)
                        if "<thought" in token.lower() or "<think" in token.lower():
                            in_thought_block = True
                            continue

                    if token:
                        yield token
                except Exception:
                    continue


async def _call_openai(
    formatted_messages: List[Dict[str, str]],
    max_tokens: int = 1000,
    temperature: float = 0.3,
) -> str:
    """Executes chat completion against OpenAI / Google Gemini endpoint."""
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
            raw_content = choices[0].get("message", {}).get("content") or ""
            return sanitize_ai_response(raw_content)

    except httpx.TimeoutException:
        raise RuntimeError("AI Provider request timed out. Please try again.")
    except httpx.ConnectError:
        raise RuntimeError("Unable to reach AI Provider endpoint. Please check your internet connection.")
    except Exception as e:
        if isinstance(e, RuntimeError):
            raise
        logger.error(f"Unexpected AI Provider error: {e}")
        raise RuntimeError(f"AI Provider communication failure: {str(e)}")


async def _stream_openai(
    formatted_messages: List[Dict[str, str]],
    max_tokens: int = 1000,
    temperature: float = 0.3,
) -> AsyncGenerator[str, None]:
    """Streams tokens from OpenAI / Gemini endpoint via SSE."""
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


async def call_llm(
    messages: List[ChatMessage],
    system_prompt: str,
    max_tokens: int = 1024,
    temperature: float = 0.3,
) -> str:
    """
    Executes a chat completion call against the active provider (Groq, NVIDIA, or Gemini).
    Does not automatically retry against Gemini if Gemini quota is exhausted.
    """
    if not is_provider_configured():
        prov = settings.active_ai_provider
        key_name = "GROQ_API_KEY" if prov == "groq" else ("NVIDIA_API_KEY" if prov == "nvidia" else "OPENAI_API_KEY")
        raise RuntimeError(f"AI Provider is not configured. Please set {key_name} in the backend environment.")

    formatted_messages = [{"role": "system", "content": system_prompt}]
    for msg in messages:
        if msg.role in ("user", "assistant"):
            formatted_messages.append({"role": msg.role, "content": msg.content})

    if settings.active_ai_provider == "groq":
        return await _call_groq(formatted_messages, max_tokens=max_tokens, temperature=temperature, timeout_sec=15.0)
    elif settings.active_ai_provider == "nvidia":
        return await _call_nvidia(formatted_messages, max_tokens=max_tokens, temperature=temperature, timeout_sec=20.0)
    else:
        return await _call_openai(formatted_messages, max_tokens=max_tokens, temperature=temperature)


async def stream_llm(
    messages: List[ChatMessage],
    system_prompt: str,
    max_tokens: int = 1024,
    temperature: float = 0.3,
) -> AsyncGenerator[str, None]:
    """
    Streams tokens from the active endpoint via Server-Sent Events (SSE).
    """
    if not is_provider_configured():
        prov = settings.active_ai_provider
        key_name = "GROQ_API_KEY" if prov == "groq" else ("NVIDIA_API_KEY" if prov == "nvidia" else "OPENAI_API_KEY")
        yield f"AI Provider is not configured. Please set {key_name} in your backend .env to enable live assistant responses."
        return

    formatted_messages = [{"role": "system", "content": system_prompt}]
    for msg in messages:
        if msg.role in ("user", "assistant"):
            formatted_messages.append({"role": msg.role, "content": msg.content})

    if settings.active_ai_provider == "groq":
        has_yielded = False
        try:
            async for token in _stream_groq(formatted_messages, max_tokens=max_tokens, temperature=temperature, timeout_sec=15.0):
                has_yielded = True
                yield token
        except Exception as e:
            logger.warning(f"Groq streaming failed: {e}")
            if not has_yielded:
                yield f"[Error: Groq AI Provider streaming failed: {str(e)[:150]}]"
    elif settings.active_ai_provider == "nvidia":
        has_yielded = False
        try:
            async for token in _stream_nvidia(formatted_messages, max_tokens=max_tokens, temperature=temperature, timeout_sec=20.0):
                has_yielded = True
                yield token
        except Exception as e:
            logger.warning(f"NVIDIA streaming failed: {e}")
            if not has_yielded:
                yield f"[Error: NVIDIA AI Provider streaming failed: {str(e)[:150]}]"
    else:
        async for token in _stream_openai(formatted_messages, max_tokens=max_tokens, temperature=temperature):
            yield token
