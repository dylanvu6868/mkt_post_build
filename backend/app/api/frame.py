import os
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from pydantic import BaseModel
from openai import OpenAI
import logging
import base64
from typing import Optional

from app.api.deps import get_current_user
from app.models.user import User
from app.core.db import async_session_maker
from app.models.lab_history import LabHistory
from app.core.config import settings

try:
    from google import genai
    from google.genai import types
except ImportError:
    genai = None
    types = None

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/frame", tags=["Frame"])

class GenerateImageRequest(BaseModel):
    prompt: str
    model: str = "bee/gpt-image-2"
    size: str = "1024x1024"

class GenerateImageResponse(BaseModel):
    b64_json: str

@router.post("/generate", response_model=GenerateImageResponse)
async def generate_image(request: GenerateImageRequest, current_user: User = Depends(get_current_user)):
    api_key = settings.beeknoee_api_key
    if not api_key:
        logger.error("Missing beeknoee_api_key")
        raise HTTPException(status_code=500, detail="Missing Beeknoee API key")

    try:
        import httpx
        async with httpx.AsyncClient(timeout=120.0) as client:
            headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
            payload = {
                "prompt": request.prompt,
                "model": request.model,
                "size": request.size,
                "n": 1
            }
            resp = await client.post("https://platform.beeknoee.com/api/v1/image/generations", headers=headers, json=payload)
            if resp.status_code != 200:
                raise Exception(f"API Error {resp.status_code}: {resp.text}")
            
            data = resp.json()
            # Try to get b64_json or url
            if "data" in data and len(data["data"]) > 0:
                item = data["data"][0]
                if "b64_json" in item and item["b64_json"]:
                    b64_json = item["b64_json"]
                elif "url" in item and item["url"]:
                    # fetch the url and convert to b64
                    img_resp = await client.get(item["url"])
                    b64_json = base64.b64encode(img_resp.content).decode('utf-8')
                else:
                    b64_json = data.get("b64_json", "")
            else:
                b64_json = data.get("b64_json") or data.get("url", "")
                
            if not b64_json:
                raise Exception("No image data returned from API")
            
        async with async_session_maker() as session:
            history_entry = LabHistory(
                user_id=current_user.id,
                tool_name="frame_image",
                input_data=request.model_dump(),
                output_data={"b64_json": b64_json[:100] + "..."} # limit storage size for history if needed, but previously full b64 was stored.
            )
            history_entry.output_data = {"b64_json": b64_json}
            session.add(history_entry)
            await session.commit()
            
        return GenerateImageResponse(b64_json=b64_json)
    except Exception as e:
        logger.error(f"Image generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Image generation failed: {str(e)}")

class GenerateVideoRequest(BaseModel):
    prompt: str
    model: str = "sora-2"
    aspectRatio: str = "16:9"

class GenerateVideoResponse(BaseModel):
    operation_name: str

class VideoStatusResponse(BaseModel):
    status: str
    b64_video: Optional[str] = None

@router.post("/video/generate", response_model=GenerateVideoResponse)
async def generate_video(request: GenerateVideoRequest, current_user: User = Depends(get_current_user)):
    api_key = settings.beeknoee_api_key
    if not api_key:
        raise HTTPException(status_code=500, detail="Missing beeknoee_api_key")

    try:
        import httpx
        async with httpx.AsyncClient(timeout=120.0) as client:
            headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
            payload = {
                "prompt": request.prompt,
                "model": request.model
            }
            resp = await client.post("https://platform.beeknoee.com/api/v1/video/generations", headers=headers, json=payload)
            if resp.status_code != 200:
                raise Exception(f"API Error {resp.status_code}: {resp.text}")
            
            data = resp.json()
            operation_name = data.get("id") or data.get("operation_name")
            if not operation_name:
                raise Exception("No id returned in response")

        return GenerateVideoResponse(operation_name=operation_name)
    except Exception as e:
        logger.error(f"Video generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Video generation failed: {str(e)}")

@router.get("/video/status/{operation_name}", response_model=VideoStatusResponse)
async def check_video_status(operation_name: str, current_user: User = Depends(get_current_user)):
    api_key = settings.beeknoee_api_key
    if not api_key:
        raise HTTPException(status_code=500, detail="Missing beeknoee_api_key")

    try:
        import httpx
        async with httpx.AsyncClient(timeout=120.0) as client:
            headers = {"Authorization": f"Bearer {api_key}"}
            resp = await client.get(f"https://platform.beeknoee.com/api/v1/video/generations/{operation_name}", headers=headers)
            if resp.status_code != 200:
                raise Exception(f"API Error {resp.status_code}: {resp.text}")
            
            data = resp.json()
            status = data.get("status", "processing").lower()
            
            if status in ["completed", "success", "done", "succeeded"]:
                status = "completed"
                # download video
                dl_resp = await client.get(f"https://platform.beeknoee.com/api/v1/video/generations/{operation_name}/download", headers=headers)
                if dl_resp.status_code == 200:
                    b64_video = base64.b64encode(dl_resp.content).decode('utf-8')
                else:
                    # fallback to checking if there is a URL in data
                    video_url = data.get("url") or data.get("video_uri")
                    if video_url:
                        dl_resp = await client.get(video_url)
                        if dl_resp.status_code == 200:
                            b64_video = base64.b64encode(dl_resp.content).decode('utf-8')
                        else:
                            b64_video = video_url
                    else:
                        raise Exception("Download failed and no url provided")

                from sqlalchemy import select
                async with async_session_maker() as session:
                    stmt = select(LabHistory).where(
                        LabHistory.user_id == current_user.id,
                        LabHistory.tool_name == "frame_video"
                    )
                    result = await session.execute(stmt)
                    histories = result.scalars().all()
                    exists = any(h.input_data.get("operation_name") == operation_name for h in histories if h.input_data)
                    
                    if not exists:
                        history_entry = LabHistory(
                            user_id=current_user.id,
                            tool_name="frame_video",
                            input_data={"operation_name": operation_name},
                            output_data={"b64_video": b64_video[:100] + "..."} # limit history blob size
                        )
                        history_entry.output_data = {"b64_video": b64_video}
                        session.add(history_entry)
                        await session.commit()

                return VideoStatusResponse(status="completed", b64_video=b64_video)
            
            if status in ["failed", "error"]:
                raise Exception(f"Video generation failed: {data.get('error')}")

            return VideoStatusResponse(status="processing")

    except Exception as e:
        logger.error(f"Video status check error: {e}")
        raise HTTPException(status_code=500, detail=f"Check status failed: {str(e)}")

class InvoiceExtractResponse(BaseModel):
    status: str
    result: dict | None = None
    confidence: float | None = None
    processing_ms: int | None = None

@router.post("/extract/invoice", response_model=InvoiceExtractResponse)
async def extract_invoice(
    file: UploadFile = File(...),
    language: str = Form("vi"),
    current_user: User = Depends(get_current_user)
):
    api_key = settings.beeknoee_api_key
    if not api_key:
        raise HTTPException(status_code=500, detail="Missing beeknoee_api_key")

    try:
        import httpx
        async with httpx.AsyncClient(timeout=60.0) as client:
            file_bytes = await file.read()
            files = {"file": (file.filename, file_bytes, file.content_type)}
            data = {"language": language}
            headers = {"Authorization": f"Bearer {api_key}"}
            
            resp = await client.post(
                "https://platform.beeknoee.com/v1/extract/invoice",
                headers=headers,
                data=data,
                files=files
            )
            
            if resp.status_code != 200:
                logger.error(f"Invoice extract failed: {resp.text}")
                raise Exception(f"API Error {resp.status_code}")
                
            resp_data = resp.json()
            
            # Optionally log to LabHistory
            async with async_session_maker() as session:
                history_entry = LabHistory(
                    user_id=current_user.id,
                    tool_name="invoice_extract",
                    input_data={"filename": file.filename, "language": language},
                    output_data=resp_data
                )
                session.add(history_entry)
                await session.commit()
                
            return InvoiceExtractResponse(**resp_data)
    except Exception as e:
        logger.error(f"Invoice extraction error: {e}")
        raise HTTPException(status_code=500, detail=f"Extraction failed: {str(e)}")
