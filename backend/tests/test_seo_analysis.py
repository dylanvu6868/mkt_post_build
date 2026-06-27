"""Tests for the Vitba SEO Analysis agent and endpoint."""

from unittest.mock import patch, AsyncMock, MagicMock

import pytest

from app.agents.lab import run_seo_analysis_agent, SeoAnalysisRequest, SEO_ANALYSIS_SYSTEM


def test_seo_analysis_request_schema():
    req = SeoAnalysisRequest(
        domain="vitba.ai",
        industry="AI Marketing",
        keywords=["marketing AI", "SEO automation"],
        competitors=["canva.com", "copy.ai"],
    )
    assert req.domain == "vitba.ai"
    assert len(req.keywords) == 2
    assert req.target_region == "Việt Nam"


def test_seo_analysis_request_minimal():
    req = SeoAnalysisRequest(domain="example.com")
    assert req.domain == "example.com"
    assert req.keywords == []
    assert req.competitors == []


def test_seo_analysis_system_prompt_has_5_sections():
    assert "Competitive SEO Analysis" in SEO_ANALYSIS_SYSTEM
    assert "Keyword Gap Analysis" in SEO_ANALYSIS_SYSTEM
    assert "Content Analysis" in SEO_ANALYSIS_SYSTEM
    assert "Backlink Analysis" in SEO_ANALYSIS_SYSTEM
    assert "Technical SEO Analysis" in SEO_ANALYSIS_SYSTEM


def test_seo_analysis_system_prompt_has_report_format():
    assert "Báo Cáo Vitba SEO Analysis" in SEO_ANALYSIS_SYSTEM
    assert "Roadmap SEO 30–60–90" in SEO_ANALYSIS_SYSTEM
    assert "Tóm tắt nhanh" in SEO_ANALYSIS_SYSTEM


def test_seo_analysis_system_prompt_has_priority_levels():
    assert "Critical" in SEO_ANALYSIS_SYSTEM
    assert "High" in SEO_ANALYSIS_SYSTEM
    assert "Medium" in SEO_ANALYSIS_SYSTEM
    assert "Low" in SEO_ANALYSIS_SYSTEM


def test_seo_analysis_system_prompt_keyword_groups():
    assert "Missing Keywords" in SEO_ANALYSIS_SYSTEM
    assert "Untapped Keywords" in SEO_ANALYSIS_SYSTEM
    assert "Weak Keywords" in SEO_ANALYSIS_SYSTEM


@patch("app.agents.lab.get_chat_model")
async def test_run_seo_analysis_agent_calls_llm(mock_get_model):
    mock_llm = MagicMock()
    mock_resp = MagicMock()
    mock_resp.content = "# Báo Cáo Vitba SEO Analysis\n## 1. Tóm tắt nhanh\n..."
    mock_llm.ainvoke = AsyncMock(return_value=mock_resp)
    mock_get_model.return_value = mock_llm

    req = SeoAnalysisRequest(domain="vitba.ai", industry="SaaS")
    report = await run_seo_analysis_agent(req)

    assert "Báo Cáo" in report
    mock_llm.ainvoke.assert_called_once()
    args = mock_llm.ainvoke.call_args[0][0]
    assert len(args) == 2
    assert "vitba.ai" in args[1].content


@patch("app.agents.lab.get_chat_model")
async def test_run_seo_analysis_agent_includes_keywords_in_prompt(mock_get_model):
    mock_llm = MagicMock()
    mock_resp = MagicMock()
    mock_resp.content = "Report"
    mock_llm.ainvoke = AsyncMock(return_value=mock_resp)
    mock_get_model.return_value = mock_llm

    req = SeoAnalysisRequest(
        domain="vitba.ai",
        keywords=["marketing AI", "tạo nội dung"],
        competitors=["canva.com"],
    )
    await run_seo_analysis_agent(req)

    user_msg = mock_llm.ainvoke.call_args[0][0][1].content
    assert "marketing AI" in user_msg
    assert "tạo nội dung" in user_msg
    assert "canva.com" in user_msg


@patch("app.agents.lab.get_chat_model")
async def test_run_seo_analysis_agent_uses_smart_tier(mock_get_model):
    mock_llm = MagicMock()
    mock_resp = MagicMock()
    mock_resp.content = "Report"
    mock_llm.ainvoke = AsyncMock(return_value=mock_resp)
    mock_get_model.return_value = mock_llm

    req = SeoAnalysisRequest(domain="test.com")
    await run_seo_analysis_agent(req)

    call_args = mock_get_model.call_args
    assert call_args[0][0] == "smart"
    assert call_args[1]["max_tokens"] == 8192
