import asyncio
import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from urllib.parse import urlparse
from pydantic import BaseModel, Field, field_validator

from app.api.deps import get_current_user
from app.core.db import async_session_maker
from app.core.plan_limits import check_lab_daily_limit, get_user_plan, upgrade_message
from app.core.rate_limit import limiter
from app.core.tracing import trace_request
from app.models.user import User
from app.models.lab_history import LabHistory
from app.services.audit import log_action
from app.services.dataforseo import DataForSEOService, enrich_keywords_vietnamese
from app.agents.lab import (
    run_shield_agent, run_psycho_agent, run_persona_agent,
    run_dna_agent, run_simulator_agent, run_cinematic_agent,
    run_reverse_agent, run_hexbreaker_agent, run_trendjack_agent,
    run_blindspot_agent, run_evergreen_agent, run_audiohook_agent,
    run_report_agent,
    run_hook_agent, run_abtest_agent, run_competitor_spy_agent,
    run_repurposer_agent, run_influencer_agent, run_hashtag_agent,
    run_dialect_adapter_agent, publish_to_zalo_oa,
    run_seo_analysis_agent, SeoAnalysisRequest,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/lab", tags=["lab"])

MAX_CONTENT = 5000


# --- Request schemas ---

class ShieldRequest(BaseModel):
    content: str = Field(..., max_length=MAX_CONTENT)

class PsychoRequest(BaseModel):
    content: str = Field(..., max_length=MAX_CONTENT)
    target_emotion: str = Field(..., max_length=100)

class PersonaRequest(BaseModel):
    content: str = Field(..., max_length=MAX_CONTENT)
    persona: str = Field(..., max_length=100)

class DNARequest(BaseModel):
    viral_content: str = Field(..., max_length=MAX_CONTENT)
    user_topic: str = Field(..., max_length=MAX_CONTENT)

class SimulatorRequest(BaseModel):
    content: str = Field(..., max_length=MAX_CONTENT)

class CinematicRequest(BaseModel):
    content: str = Field(..., max_length=MAX_CONTENT)
    style: str = Field("Cinematic, dark aesthetic, Instagram editorial", max_length=200)

class ReverseRequest(BaseModel):
    content: str = Field(..., max_length=MAX_CONTENT)

class HexBreakerRequest(BaseModel):
    content: str = Field(..., max_length=MAX_CONTENT)
    platform: str = Field("Facebook", max_length=50)

class TrendJackRequest(BaseModel):
    content: str = Field(..., max_length=MAX_CONTENT)
    current_trends: str = Field(..., max_length=MAX_CONTENT)

class BlindspotRequest(BaseModel):
    content: str = Field(..., max_length=MAX_CONTENT)
    target_region: str = Field("Toàn quốc Việt Nam", max_length=100)

class EvergreenRequest(BaseModel):
    old_content: str = Field(..., max_length=MAX_CONTENT)
    target_year_context: str = Field("2025", max_length=200)

class AudioHookRequest(BaseModel):
    content: str = Field(..., max_length=MAX_CONTENT)
    music_bpm: int = Field(120, ge=60, le=200)

class ReportRequest(BaseModel):
    name: str = Field("", max_length=200)
    industry: str = Field("", max_length=200)
    product: str = Field("", max_length=1000)
    business_model: str = Field("", max_length=200)
    target_market: str = Field("", max_length=500)
    target_customer: str = Field("", max_length=1000)
    price: str = Field("", max_length=200)
    stage: str = Field("", max_length=200)
    goal_3m: str = Field("", max_length=1000)
    goal_6m: str = Field("", max_length=1000)
    goal_12m: str = Field("", max_length=1000)
    budget: str = Field("", max_length=200)
    resources: str = Field("", max_length=1000)
    competitors: str = Field("", max_length=1000)
    strengths: str = Field("", max_length=1000)
    weaknesses: str = Field("", max_length=1000)


# --- New Lab Tools (Phase 2 expansion) ---

class HookRequest(BaseModel):
    content: str = Field(..., max_length=MAX_CONTENT)
    goal: str = Field("Tăng engagement", max_length=200)

class ABTestRequest(BaseModel):
    variant_a: str = Field(..., max_length=MAX_CONTENT)
    variant_b: str = Field(..., max_length=MAX_CONTENT)
    platform: str = Field("Facebook", max_length=50)

class CompetitorSpyRequest(BaseModel):
    competitor_info: str = Field(..., max_length=MAX_CONTENT)
    niche: str = Field(..., max_length=200)

class RepurposerRequest(BaseModel):
    source_content: str = Field(..., max_length=MAX_CONTENT)
    target_formats: str = Field("Facebook Post, TikTok Script, Email, Instagram Caption", max_length=500)

class InfluencerRequest(BaseModel):
    niche: str = Field(..., max_length=200)
    budget: str = Field("5-20 triệu VND", max_length=200)
    platform: str = Field("TikTok", max_length=50)

class HashtagRequest(BaseModel):
    niche: str = Field(..., max_length=200)
    platform: str = Field("Facebook", max_length=50)
    region: str = Field("Việt Nam", max_length=100)


# --- Vietnam Pack ---

class DialectRequest(BaseModel):
    content: str = Field(..., max_length=MAX_CONTENT)

class ZaloPublishRequest(BaseModel):
    access_token: str = Field(..., max_length=1000)
    content: str = Field(..., max_length=MAX_CONTENT)
    image_url: str | None = Field(None, max_length=2000)


# --- DataForSEO Lab Tool Request Schemas ---

def _clean_domain(v: str) -> str:
    """Strip protocol, fragments, query params — return bare domain + path."""
    v = v.split("#")[0].split("?")[0].strip()
    if v.startswith(("http://", "https://")):
        parsed = urlparse(v)
        v = parsed.netloc + parsed.path
    return v.rstrip("/")[:200]

class KeywordResearchRequest(BaseModel):
    keyword: str = Field(..., max_length=500)
    location_code: int = Field(2840, description="DataForSEO location code (2840 = Vietnam)")

    @field_validator("keyword", mode="before")
    @classmethod
    def clean_keyword(cls, v: str) -> str:
        return v.split("#")[0].split("?")[0].strip()[:500]

class RankTrackerRequest(BaseModel):
    domain: str = Field(..., max_length=500)
    location_code: int = Field(2840, description="DataForSEO location code (2840 = Vietnam)")

    @field_validator("domain", mode="before")
    @classmethod
    def clean_domain(cls, v: str) -> str:
        return _clean_domain(v)

class BacklinksRequest(BaseModel):
    domain: str = Field(..., max_length=500)

    @field_validator("domain", mode="before")
    @classmethod
    def clean_domain(cls, v: str) -> str:
        return _clean_domain(v)

class SerpSpyRequest(BaseModel):
    keyword: str = Field(..., max_length=500)
    location_code: int = Field(2840, description="DataForSEO location code (2840 = Vietnam)")

    @field_validator("keyword", mode="before")
    @classmethod
    def clean_keyword(cls, v: str) -> str:
        return v.split("#")[0].split("?")[0].strip()[:500]


# --- Helpers ---

async def _audit(user_id: int, tool: str, ip: str | None = None):
    async with async_session_maker() as session:
        await log_action(session, user_id, f"lab.{tool}", resource_type="lab_tool", ip_address=ip)


async def _run_tool(tool_name: str, agent_fn, user: User, request: Request, input_data: dict = None):
    import time as _time
    from app.services.ai_logger import log_ai_call
    from app.core.config import settings

    plan = get_user_plan(user)
    async with async_session_maker() as session:
        allowed, used, limit = await check_lab_daily_limit(session, user)
    if not allowed:
        if limit == 0:
            raise HTTPException(status_code=403, detail=upgrade_message("Vitba Lab"))
        raise HTTPException(
            status_code=429,
            detail=f"Bạn đã dùng hết {limit} lượt Lab hôm nay ({used}/{limit}). "
            + upgrade_message("thêm lượt sử dụng Lab"),
        )
    await _audit(user.id, tool_name, request.client.host if request.client else None)
    _t0 = _time.perf_counter()
    try:
        with trace_request(
            f"lab.{tool_name}",
            user_id=user.id,
            metadata={"tool": tool_name, "plan": plan, "input": input_data},
        ):
            result = await agent_fn()
        _latency = int((_time.perf_counter() - _t0) * 1000)
        output_data = result.model_dump() if hasattr(result, "model_dump") else result
        await log_ai_call(
            call_type="lab", tool_name=tool_name, endpoint=f"/api/lab/{tool_name}",
            model=settings.llm_model_smart, provider=settings.llm_provider,
            latency_ms=_latency, user_id=user.id, status="success",
            input_preview=str(input_data)[:500] if input_data else None,
            output_preview=str(output_data)[:500],
        )

        # Save to lab_history
        if input_data is not None:
            async with async_session_maker() as session:
                history_entry = LabHistory(
                    user_id=user.id,
                    tool_name=tool_name,
                    input_data=input_data,
                    output_data=output_data
                )
                session.add(history_entry)
                await session.commit()

        return output_data
    except ValueError as e:
        _latency = int((_time.perf_counter() - _t0) * 1000)
        await log_ai_call(
            call_type="lab", tool_name=tool_name, endpoint=f"/api/lab/{tool_name}",
            latency_ms=_latency, user_id=user.id, status="error", error_message=str(e),
        )
        logger.warning("Lab tool %s failed for user %s: %s", tool_name, user.id, e)
        raise HTTPException(status_code=502, detail="AI đang quá tải, vui lòng thử lại sau.")
    except Exception as e:
        _latency = int((_time.perf_counter() - _t0) * 1000)
        await log_ai_call(
            call_type="lab", tool_name=tool_name, endpoint=f"/api/lab/{tool_name}",
            latency_ms=_latency, user_id=user.id, status="error", error_message=str(e),
        )
        logger.exception("Lab tool %s unexpected error for user %s", tool_name, user.id)
        raise HTTPException(status_code=500, detail="Có lỗi xảy ra khi xử lý yêu cầu.")


from sqlalchemy import select
from typing import Optional
import uuid

# --- Endpoints ---

@router.get("/history")
async def get_lab_history(
    tool_name: Optional[str] = None,
    current_user: User = Depends(get_current_user),
):
    async with async_session_maker() as session:
        stmt = select(LabHistory).where(LabHistory.user_id == current_user.id)
        if tool_name:
            stmt = stmt.where(LabHistory.tool_name == tool_name)
        stmt = stmt.order_by(LabHistory.created_at.desc())

        result = await session.execute(stmt)
        histories = result.scalars().all()

        return [
            {
                "id": str(h.id),
                "tool_name": h.tool_name,
                "input_data": h.input_data,
                "output_data": h.output_data,
                "created_at": h.created_at.isoformat()
            }
            for h in histories
        ]

@router.delete("/history/{history_id}")
async def delete_lab_history(
    history_id: str,
    current_user: User = Depends(get_current_user),
):
    async with async_session_maker() as session:
        try:
            h_uuid = uuid.UUID(history_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid history ID")

        stmt = select(LabHistory).where(
            LabHistory.id == h_uuid,
            LabHistory.user_id == current_user.id
        )
        result = await session.execute(stmt)
        history = result.scalars().first()

        if not history:
            raise HTTPException(status_code=404, detail="History not found")

        await session.delete(history)
        await session.commit()
        return {"status": "success"}

@router.post("/shield")
@limiter.limit("5/minute")
async def shield_endpoint(request: Request, req: ShieldRequest, current_user: User = Depends(get_current_user)):
    return await _run_tool("shield", lambda: run_shield_agent(req.content), current_user, request, input_data=req.model_dump())

@router.post("/psycho")
@limiter.limit("5/minute")
async def psycho_endpoint(request: Request, req: PsychoRequest, current_user: User = Depends(get_current_user)):
    return await _run_tool("psycho", lambda: run_psycho_agent(req.content, req.target_emotion), current_user, request, input_data=req.model_dump())

@router.post("/persona")
@limiter.limit("5/minute")
async def persona_endpoint(request: Request, req: PersonaRequest, current_user: User = Depends(get_current_user)):
    return await _run_tool("persona", lambda: run_persona_agent(req.content, req.persona), current_user, request, input_data=req.model_dump())

@router.post("/dna")
@limiter.limit("5/minute")
async def dna_endpoint(request: Request, req: DNARequest, current_user: User = Depends(get_current_user)):
    return await _run_tool("dna", lambda: run_dna_agent(req.viral_content, req.user_topic), current_user, request, input_data=req.model_dump())

@router.post("/simulator")
@limiter.limit("5/minute")
async def simulator_endpoint(request: Request, req: SimulatorRequest, current_user: User = Depends(get_current_user)):
    return await _run_tool("simulator", lambda: run_simulator_agent(req.content), current_user, request, input_data=req.model_dump())

@router.post("/cinematic")
@limiter.limit("5/minute")
async def cinematic_endpoint(request: Request, req: CinematicRequest, current_user: User = Depends(get_current_user)):
    return await _run_tool("cinematic", lambda: run_cinematic_agent(req.content, req.style), current_user, request, input_data=req.model_dump())

@router.post("/reverse")
@limiter.limit("5/minute")
async def reverse_endpoint(request: Request, req: ReverseRequest, current_user: User = Depends(get_current_user)):
    return await _run_tool("reverse", lambda: run_reverse_agent(req.content), current_user, request, input_data=req.model_dump())

@router.post("/hexbreaker")
@limiter.limit("5/minute")
async def hexbreaker_endpoint(request: Request, req: HexBreakerRequest, current_user: User = Depends(get_current_user)):
    return await _run_tool("hexbreaker", lambda: run_hexbreaker_agent(req.content, req.platform), current_user, request, input_data=req.model_dump())

@router.post("/trendjack")
@limiter.limit("5/minute")
async def trendjack_endpoint(request: Request, req: TrendJackRequest, current_user: User = Depends(get_current_user)):
    return await _run_tool("trendjack", lambda: run_trendjack_agent(req.content, req.current_trends), current_user, request, input_data=req.model_dump())

@router.post("/blindspot")
@limiter.limit("5/minute")
async def blindspot_endpoint(request: Request, req: BlindspotRequest, current_user: User = Depends(get_current_user)):
    return await _run_tool("blindspot", lambda: run_blindspot_agent(req.content, req.target_region), current_user, request, input_data=req.model_dump())

@router.post("/evergreen")
@limiter.limit("5/minute")
async def evergreen_endpoint(request: Request, req: EvergreenRequest, current_user: User = Depends(get_current_user)):
    return await _run_tool("evergreen", lambda: run_evergreen_agent(req.old_content, req.target_year_context), current_user, request, input_data=req.model_dump())

@router.post("/audiohook")
@limiter.limit("5/minute")
async def audiohook_endpoint(request: Request, req: AudioHookRequest, current_user: User = Depends(get_current_user)):
    return await _run_tool("audiohook", lambda: run_audiohook_agent(req.content, req.music_bpm), current_user, request, input_data=req.model_dump())

@router.post("/report")
@limiter.limit("2/minute")
async def report_endpoint(request: Request, req: ReportRequest, current_user: User = Depends(get_current_user)):
    return await _run_tool("report", lambda: run_report_agent(req.model_dump()), current_user, request, input_data=req.model_dump())


# --- New Lab Tool endpoints ---

@router.post("/hook")
@limiter.limit("5/minute")
async def hook_endpoint(request: Request, req: HookRequest, current_user: User = Depends(get_current_user)):
    return await _run_tool("hook", lambda: run_hook_agent(req.content, req.goal), current_user, request, input_data=req.model_dump())

@router.post("/abtest")
@limiter.limit("5/minute")
async def abtest_endpoint(request: Request, req: ABTestRequest, current_user: User = Depends(get_current_user)):
    return await _run_tool("abtest", lambda: run_abtest_agent(req.variant_a, req.variant_b, req.platform), current_user, request, input_data=req.model_dump())

@router.post("/competitor-spy")
@limiter.limit("3/minute")
async def competitor_spy_endpoint(request: Request, req: CompetitorSpyRequest, current_user: User = Depends(get_current_user)):
    return await _run_tool("competitor_spy", lambda: run_competitor_spy_agent(req.competitor_info, req.niche), current_user, request, input_data=req.model_dump())

@router.post("/repurposer")
@limiter.limit("5/minute")
async def repurposer_endpoint(request: Request, req: RepurposerRequest, current_user: User = Depends(get_current_user)):
    return await _run_tool("repurposer", lambda: run_repurposer_agent(req.source_content, req.target_formats), current_user, request, input_data=req.model_dump())

@router.post("/influencer")
@limiter.limit("3/minute")
async def influencer_endpoint(request: Request, req: InfluencerRequest, current_user: User = Depends(get_current_user)):
    return await _run_tool("influencer", lambda: run_influencer_agent(req.niche, req.budget, req.platform), current_user, request, input_data=req.model_dump())

@router.post("/hashtag")
@limiter.limit("5/minute")
async def hashtag_endpoint(request: Request, req: HashtagRequest, current_user: User = Depends(get_current_user)):
    return await _run_tool("hashtag", lambda: run_hashtag_agent(req.niche, req.platform, req.region), current_user, request, input_data=req.model_dump())


# --- Vietnam Pack endpoints ---

@router.post("/dialect")
@limiter.limit("5/minute")
async def dialect_endpoint(request: Request, req: DialectRequest, current_user: User = Depends(get_current_user)):
    return await _run_tool("dialect", lambda: run_dialect_adapter_agent(req.content), current_user, request, input_data=req.model_dump())

@router.post("/zalo-publish")
@limiter.limit("3/minute")
async def zalo_publish_endpoint(request: Request, req: ZaloPublishRequest, current_user: User = Depends(get_current_user)):
    """Publish to Zalo OA — no daily lab limit, just rate limit."""
    await _audit(current_user.id, "zalo_publish", request.client.host if request.client else None)
    result = await publish_to_zalo_oa(req.access_token, req.content, req.image_url)
    return result.model_dump()

@router.get("/lunar-festivals")
async def lunar_festivals_endpoint(current_user: User = Depends(get_current_user)):
    """Return upcoming Vietnamese lunar-calendar festivals + content suggestions."""
    from app.mcp.lunar_calendar import get_upcoming_festivals, festival_content_suggestions
    festivals = get_upcoming_festivals()
    for f in festivals:
        f["content_suggestions"] = festival_content_suggestions(f["name"])
    return {"festivals": festivals}


# --- SEO Analysis endpoint ---

@router.post("/seo-analysis")
@limiter.limit("3/minute")
async def seo_analysis_endpoint(request: Request, req: SeoAnalysisRequest, current_user: User = Depends(get_current_user)):
    """Run full SEO analysis report — returns markdown text."""
    await _audit(current_user.id, "seo_analysis", request.client.host if request.client else None)
    try:
        report = await run_seo_analysis_agent(req)
        # Save to lab_history
        async with async_session_maker() as session:
            entry = LabHistory(
                user_id=current_user.id,
                tool_name="seo_analysis",
                input_data=req.model_dump(),
                output_data={"report": report},
            )
            session.add(entry)
            await session.commit()
        return {"report": report}
    except ValueError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except Exception:
        logger.exception("SEO analysis failed for user %s", current_user.id)
        raise HTTPException(status_code=500, detail="Có lỗi xảy ra khi phân tích SEO.")


# --- DataForSEO Lab Tool Endpoints ---

def _check_dataforseo():
    """Raise 503 if DataForSEO API key is not configured."""
    if not DataForSEOService.get_api_key():
        raise HTTPException(
            status_code=503,
            detail="DataForSEO chưa được cấu hình. Vui lòng cung cấp API key DATAFORSEO_API_KEY.",
        )


@router.post("/keyword-research")
@limiter.limit("3/minute")
async def keyword_research_endpoint(
    request: Request,
    req: KeywordResearchRequest,
    current_user: User = Depends(get_current_user),
):
    """Research keywords via DataForSEO — suggestions, ideas, related keywords."""
    _check_dataforseo()

    async def _run():
        d4s = DataForSEOService()
        overview, ideas, related = await asyncio.gather(
            d4s.keyword_suggestions(req.keyword, req.location_code),
            d4s.keyword_ideas(keywords=[req.keyword], location_code=req.location_code),
            d4s.related_keywords(req.keyword, req.location_code),
        )
        return {
            "overview": enrich_keywords_vietnamese(overview),
            "ideas": enrich_keywords_vietnamese(ideas),
            "related": enrich_keywords_vietnamese(related),
        }

    return await _run_tool(
        "keyword_research",
        _run,
        current_user,
        request,
        input_data=req.model_dump(),
    )


@router.post("/rank-tracker")
@limiter.limit("3/minute")
async def rank_tracker_endpoint(
    request: Request,
    req: RankTrackerRequest,
    current_user: User = Depends(get_current_user),
):
    """Track domain authority & ranked keywords via DataForSEO."""
    _check_dataforseo()

    async def _run():
        d4s = DataForSEOService()
        rank_overview, ranked_kws = await asyncio.gather(
            d4s.domain_rank_overview(target=req.domain, location_code=req.location_code),
            d4s.ranked_keywords(target=req.domain, location_code=req.location_code),
        )
        return {
            "rank_overview": rank_overview,
            "ranked_keywords": enrich_keywords_vietnamese(ranked_kws),
        }

    return await _run_tool(
        "rank_tracker",
        _run,
        current_user,
        request,
        input_data=req.model_dump(),
    )


@router.post("/backlinks")
@limiter.limit("3/minute")
async def backlinks_endpoint(
    request: Request,
    req: BacklinksRequest,
    current_user: User = Depends(get_current_user),
):
    """Analyze backlinks, referring domains, and link quality via DataForSEO."""
    _check_dataforseo()

    async def _run():
        d4s = DataForSEOService()
        summary, ref_domains, bklinks = await asyncio.gather(
            d4s.backlinks_summary(target=req.domain),
            d4s.referring_domains(target=req.domain),
            d4s.backlinks(target=req.domain),
        )
        return {"summary": summary, "referring_domains": ref_domains, "backlinks": bklinks}

    return await _run_tool(
        "backlinks",
        _run,
        current_user,
        request,
        input_data=req.model_dump(),
    )


@router.post("/serp-spy")
@limiter.limit("3/minute")
async def serp_spy_endpoint(
    request: Request,
    req: SerpSpyRequest,
    current_user: User = Depends(get_current_user),
):
    """Spy on SERP results and competitors for a keyword via DataForSEO."""
    _check_dataforseo()

    async def _run():
        d4s = DataForSEOService()
        serp_results, competitors = await asyncio.gather(
            d4s.google_organic_serp(req.keyword, req.location_code),
            d4s.serp_competitors(keywords=[req.keyword], location_code=req.location_code),
        )
        return {
            "serp_results": enrich_keywords_vietnamese(serp_results),
            "competitors": enrich_keywords_vietnamese(competitors),
        }

    return await _run_tool(
        "serp_spy",
        _run,
        current_user,
        request,
        input_data=req.model_dump(),
    )
