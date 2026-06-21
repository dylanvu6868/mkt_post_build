import logging
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.db import get_session
from app.core.plan_limits import get_user_plan, get_limits
from app.models.image_generation import ImageGeneration
from app.models.user import User
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/images", tags=["images"])


class ImageGenerationRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=1000)
    size: str = Field(default="1024x1024", pattern=r"^(256x256|512x512|1024x1024|1792x1024|1024x1792)$")
    style: Optional[str] = Field(default=None, max_length=100)
    model: str = Field(default="dalle3", pattern=r"^(dalle3|sdxl|flux)$")


class ImageGenerationResponse(BaseModel):
    image_url: str
    revised_prompt: Optional[str] = None


# Daily limits per plan
IMAGE_LIMITS = {
    "free": 0,
    "lite": 0,
    "pro": 10,
    "max": 50,
}


async def check_image_limit(session: AsyncSession, user: User) -> tuple[bool, int, int]:
    """Check if user has reached daily image generation limit.
    Returns (can_generate, used_today, limit)
    """
    plan = get_user_plan(user)
    limit = IMAGE_LIMITS.get(plan, 0)
    
    if limit == 0:
        return False, 0, 0
    
    # Get today's usage
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    result = await session.execute(
        select(func.count(ImageGeneration.id))
        .where(ImageGeneration.user_id == user.id)
        .where(ImageGeneration.created_at >= today_start)
    )
    used_today = result.scalar() or 0
    
    can_generate = used_today < limit
    return can_generate, used_today, limit


@router.post("/generate", response_model=ImageGenerationResponse)
async def generate_image(
    request: ImageGenerationRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Generate image using DALL-E 3 (Pro and Max plans only)."""
    plan = get_user_plan(current_user)
    
    # Check plan limits
    if plan not in ["pro", "max"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Tính năng gen ảnh chỉ có sẵn cho gói Pro và Max. Gói hiện tại: {plan}"
        )
    
    # Check daily limit
    can_generate, used_today, limit = await check_image_limit(session, current_user)
    if not can_generate:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Bạn đã dùng hết {limit} lượt gen ảnh trong ngày. Hãy quay lại vào ngày mai."
        )
    
    # Check API keys based on model
    import os
    
    if request.model == "dalle3":
        openai_key = os.getenv("OPENAI_API_KEY")
        if not openai_key:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="OPENAI_API_KEY chưa được cấu hình"
            )
    elif request.model in ["sdxl", "flux"]:
        replicate_key = os.getenv("REPLICATE_API_TOKEN")
        if not replicate_key:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="REPLICATE_API_TOKEN chưa được cấu hình"
            )
    
    try:
        import httpx
        
        if request.model == "dalle3":
            # DALL-E 3 via OpenAI
            async with httpx.AsyncClient(timeout=60) as client:
                response = await client.post(
                    "https://api.openai.com/v1/images/generations",
                    headers={
                        "Authorization": f"Bearer {os.getenv('OPENAI_API_KEY')}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": "dall-e-3",
                        "prompt": request.prompt,
                        "n": 1,
                        "size": request.size,
                    },
                )
                response.raise_for_status()
                data = response.json()
                image_url = data["data"][0]["url"]
                revised_prompt = data["data"][0].get("revised_prompt")
        
        elif request.model == "sdxl":
            # Stable Diffusion XL via Replicate
            async with httpx.AsyncClient(timeout=120) as client:
                response = await client.post(
                    "https://api.replicate.com/v1/models/stability-ai/sdxl/predictions",
                    headers={
                        "Authorization": f"Bearer {os.getenv('REPLICATE_API_TOKEN')}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "input": {
                            "prompt": request.prompt,
                            "width": int(request.size.split("x")[0]),
                            "height": int(request.size.split("x")[1]),
                        },
                    },
                )
                response.raise_for_status()
                prediction = response.json()
                
                # Poll for result
                import asyncio
                prediction_url = prediction["urls"]["get"]
                for _ in range(30):  # max 30 seconds
                    await asyncio.sleep(1)
                    status_response = await client.get(
                        prediction_url,
                        headers={"Authorization": f"Bearer {os.getenv('REPLICATE_API_TOKEN')}"},
                    )
                    status_data = status_response.json()
                    if status_data["status"] == "succeeded":
                        image_url = status_data["output"][0]
                        revised_prompt = None
                        break
                    elif status_data["status"] == "failed":
                        raise Exception("Prediction failed")
                else:
                    raise Exception("Prediction timeout")
        
        elif request.model == "flux":
            # Flux via Replicate
            async with httpx.AsyncClient(timeout=120) as client:
                response = await client.post(
                    "https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions",
                    headers={
                        "Authorization": f"Bearer {os.getenv('REPLICATE_API_TOKEN')}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "input": {
                            "prompt": request.prompt,
                            "width": int(request.size.split("x")[0]),
                            "height": int(request.size.split("x")[1]),
                        },
                    },
                )
                response.raise_for_status()
                prediction = response.json()
                
                # Poll for result
                import asyncio
                prediction_url = prediction["urls"]["get"]
                for _ in range(30):
                    await asyncio.sleep(1)
                    status_response = await client.get(
                        prediction_url,
                        headers={"Authorization": f"Bearer {os.getenv('REPLICATE_API_TOKEN')}"},
                    )
                    status_data = status_response.json()
                    if status_data["status"] == "succeeded":
                        image_url = status_data["output"][0]
                        revised_prompt = None
                        break
                    elif status_data["status"] == "failed":
                        raise Exception("Prediction failed")
                else:
                    raise Exception("Prediction timeout")
        
        # Save to database
        image_gen = ImageGeneration(
            user_id=current_user.id,
            prompt=request.prompt,
            image_url=image_url,
            size=request.size,
        )
        session.add(image_gen)
        await session.commit()
        
        logger.info(f"Image generated for user {current_user.id}, plan {plan}, model {request.model}")
        
        return ImageGenerationResponse(
            image_url=image_url,
            revised_prompt=revised_prompt
        )
            
    except httpx.HTTPStatusError as e:
        logger.error(f"OpenAI API error: {e.response.status_code} - {e.response.text}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Không thể tạo ảnh. Vui lòng thử lại sau."
        )
    except Exception as e:
        logger.error(f"Image generation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Lỗi khi tạo ảnh"
        )


@router.get("/limits")
async def get_image_limits(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Get current user's image generation limits."""
    plan = get_user_plan(current_user)
    limit = IMAGE_LIMITS.get(plan, 0)
    can_generate, used_today, _ = await check_image_limit(session, current_user)
    
    return {
        "plan": plan,
        "daily_limit": limit,
        "used_today": used_today,
        "remaining": max(0, limit - used_today),
        "can_generate": can_generate,
    }
