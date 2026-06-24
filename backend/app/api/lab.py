import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from app.api.deps import get_current_user
from app.core.db import async_session_maker
from app.core.plan_limits import check_lab_daily_limit, get_user_plan, upgrade_message
from app.core.rate_limit import limiter
from app.models.user import User
from app.models.lab_history import LabHistory
from app.services.audit import log_action
from app.agents.lab import (
    run_shield_agent, run_psycho_agent, run_persona_agent,
    run_dna_agent, run_simulator_agent, run_cinematic_agent,
    run_reverse_agent, run_hexbreaker_agent, run_trendjack_agent,
    run_blindspot_agent, run_evergreen_agent, run_audiohook_agent,
    run_report_agent,
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


# --- Helpers ---

async def _audit(user_id: int, tool: str, ip: str | None = None):
    async with async_session_maker() as session:
        await log_action(session, user_id, f"lab.{tool}", resource_type="lab_tool", ip_address=ip)


async def _run_tool(tool_name: str, agent_fn, user: User, request: Request, input_data: dict = None):
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
    try:
        result = await agent_fn()
        output_data = result.model_dump()
        
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
        logger.warning("Lab tool %s failed for user %s: %s", tool_name, user.id, e)
        raise HTTPException(status_code=502, detail="AI đang quá tải, vui lòng thử lại sau.")
    except Exception:
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
