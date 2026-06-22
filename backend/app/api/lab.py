from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.api.deps import get_current_user
from app.models.user import User
from app.agents.lab import (
    run_shield_agent, run_psycho_agent, run_persona_agent,
    run_dna_agent, run_simulator_agent, run_cinematic_agent,
    run_reverse_agent, run_hexbreaker_agent, run_trendjack_agent,
    run_blindspot_agent, run_evergreen_agent, run_audiohook_agent,
)

router = APIRouter(prefix="/api/lab", tags=["lab"])


# --- Request schemas ---

class ShieldRequest(BaseModel):
    content: str

class PsychoRequest(BaseModel):
    content: str
    target_emotion: str

class PersonaRequest(BaseModel):
    content: str
    persona: str

class DNARequest(BaseModel):
    viral_content: str
    user_topic: str

class SimulatorRequest(BaseModel):
    content: str

class CinematicRequest(BaseModel):
    content: str
    style: str = "Cinematic, dark aesthetic, Instagram editorial"

class ReverseRequest(BaseModel):
    content: str

class HexBreakerRequest(BaseModel):
    content: str
    platform: str = "Facebook"

class TrendJackRequest(BaseModel):
    content: str
    current_trends: str

class BlindspotRequest(BaseModel):
    content: str
    target_region: str = "Toàn quốc Việt Nam"

class EvergreenRequest(BaseModel):
    old_content: str
    target_year_context: str = "2025"

class AudioHookRequest(BaseModel):
    content: str
    music_bpm: int = 120


# --- Endpoints ---

@router.post("/shield")
async def shield_endpoint(req: ShieldRequest, current_user: User = Depends(get_current_user)):
    if not req.content.strip():
        raise HTTPException(status_code=400, detail="Content cannot be empty")
    return (await run_shield_agent(req.content)).model_dump()

@router.post("/psycho")
async def psycho_endpoint(req: PsychoRequest, current_user: User = Depends(get_current_user)):
    if not req.content.strip():
        raise HTTPException(status_code=400, detail="Content cannot be empty")
    return (await run_psycho_agent(req.content, req.target_emotion)).model_dump()

@router.post("/persona")
async def persona_endpoint(req: PersonaRequest, current_user: User = Depends(get_current_user)):
    if not req.content.strip():
        raise HTTPException(status_code=400, detail="Content cannot be empty")
    return (await run_persona_agent(req.content, req.persona)).model_dump()

@router.post("/dna")
async def dna_endpoint(req: DNARequest, current_user: User = Depends(get_current_user)):
    if not req.viral_content.strip() or not req.user_topic.strip():
        raise HTTPException(status_code=400, detail="Both viral_content and user_topic are required")
    return (await run_dna_agent(req.viral_content, req.user_topic)).model_dump()

@router.post("/simulator")
async def simulator_endpoint(req: SimulatorRequest, current_user: User = Depends(get_current_user)):
    if not req.content.strip():
        raise HTTPException(status_code=400, detail="Content cannot be empty")
    return (await run_simulator_agent(req.content)).model_dump()

@router.post("/cinematic")
async def cinematic_endpoint(req: CinematicRequest, current_user: User = Depends(get_current_user)):
    if not req.content.strip():
        raise HTTPException(status_code=400, detail="Content cannot be empty")
    return (await run_cinematic_agent(req.content, req.style)).model_dump()

@router.post("/reverse")
async def reverse_endpoint(req: ReverseRequest, current_user: User = Depends(get_current_user)):
    if not req.content.strip():
        raise HTTPException(status_code=400, detail="Content cannot be empty")
    return (await run_reverse_agent(req.content)).model_dump()

@router.post("/hexbreaker")
async def hexbreaker_endpoint(req: HexBreakerRequest, current_user: User = Depends(get_current_user)):
    if not req.content.strip():
        raise HTTPException(status_code=400, detail="Content cannot be empty")
    return (await run_hexbreaker_agent(req.content, req.platform)).model_dump()

@router.post("/trendjack")
async def trendjack_endpoint(req: TrendJackRequest, current_user: User = Depends(get_current_user)):
    if not req.content.strip():
        raise HTTPException(status_code=400, detail="Content cannot be empty")
    return (await run_trendjack_agent(req.content, req.current_trends)).model_dump()

@router.post("/blindspot")
async def blindspot_endpoint(req: BlindspotRequest, current_user: User = Depends(get_current_user)):
    if not req.content.strip():
        raise HTTPException(status_code=400, detail="Content cannot be empty")
    return (await run_blindspot_agent(req.content, req.target_region)).model_dump()

@router.post("/evergreen")
async def evergreen_endpoint(req: EvergreenRequest, current_user: User = Depends(get_current_user)):
    if not req.old_content.strip():
        raise HTTPException(status_code=400, detail="old_content cannot be empty")
    return (await run_evergreen_agent(req.old_content, req.target_year_context)).model_dump()

@router.post("/audiohook")
async def audiohook_endpoint(req: AudioHookRequest, current_user: User = Depends(get_current_user)):
    if not req.content.strip():
        raise HTTPException(status_code=400, detail="Content cannot be empty")
    if not (60 <= req.music_bpm <= 200):
        raise HTTPException(status_code=400, detail="music_bpm must be between 60 and 200")
    return (await run_audiohook_agent(req.content, req.music_bpm)).model_dump()
