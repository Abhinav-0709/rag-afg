import pytest
from unittest.mock import patch, MagicMock, AsyncMock
import httpx

from app.config import settings
from app.services.ai_providers import (
    LocalAcademicLLMProvider,
    GeminiLLMProvider,
    GroqLLMProvider,
    NemotronLLMProvider,
    OpenAILLMProvider,
    get_llm_provider,
)


@pytest.mark.asyncio
async def test_groq_llm_provider_fallback_when_no_key():
    provider = GroqLLMProvider(api_key="")
    # Should fallback to LocalAcademicLLMProvider without network call
    prompt = "=== RETRIEVED ACADEMIC CONTEXT ===\n[Source: Test Doc, Page: 1]\nPhotosynthesis converts light into chemical energy.\n=== END CONTEXT ===\nQuestion: What is photosynthesis?\nFormat: detailed"
    system_prompt = "You are an academic assistant."
    answer = await provider.generate_answer(prompt, system_prompt)
    assert "Photosynthesis converts light into chemical energy" in answer


@pytest.mark.asyncio
async def test_groq_llm_provider_mock_response():
    provider = GroqLLMProvider(api_key="mock_groq_key", model="llama-3.3-70b-versatile")
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "choices": [
            {
                "message": {
                    "role": "assistant",
                    "content": "Photosynthesis is the biological process of turning light into energy.",
                }
            }
        ]
    }

    with patch("httpx.AsyncClient.post", AsyncMock(return_value=mock_response)):
        answer = await provider.generate_answer("What is photosynthesis?", "Academic system prompt")
        assert answer == "Photosynthesis is the biological process of turning light into energy."


@pytest.mark.asyncio
async def test_nemotron_llm_provider_fallback_when_no_key():
    provider = NemotronLLMProvider(api_key="")
    prompt = "=== RETRIEVED ACADEMIC CONTEXT ===\nNO_CONTEXT_FOUND\n=== END CONTEXT ==="
    answer = await provider.generate_answer(prompt, "System prompt")
    assert "do not contain sufficient information" in answer


@pytest.mark.asyncio
async def test_nemotron_llm_provider_mock_response():
    provider = NemotronLLMProvider(api_key="mock_nvidia_key", model="nvidia/llama-3.1-nemotron-70b-instruct")
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "choices": [
            {
                "message": {
                    "role": "assistant",
                    "content": "Nemotron academic reasoning output.",
                }
            }
        ]
    }

    with patch("httpx.AsyncClient.post", AsyncMock(return_value=mock_response)):
        answer = await provider.generate_answer("Question", "System prompt")
        assert answer == "Nemotron academic reasoning output."


def test_get_llm_provider_factory():
    # Test fallback
    with patch.object(settings, "AI_PROVIDER", "fallback"):
        provider = get_llm_provider()
        assert isinstance(provider, LocalAcademicLLMProvider)

    # Test Gemini
    with patch.object(settings, "AI_PROVIDER", "gemini"), patch.object(settings, "GEMINI_API_KEY", "mock_key"):
        provider = get_llm_provider()
        assert isinstance(provider, GeminiLLMProvider)

    # Test Groq
    with patch.object(settings, "AI_PROVIDER", "groq"), patch.object(settings, "GROQ_API_KEY", "mock_key"):
        provider = get_llm_provider()
        assert isinstance(provider, GroqLLMProvider)

    # Test Nemotron
    with patch.object(settings, "AI_PROVIDER", "nemotron"), patch.object(settings, "NVIDIA_API_KEY", "mock_key"):
        provider = get_llm_provider()
        assert isinstance(provider, NemotronLLMProvider)
