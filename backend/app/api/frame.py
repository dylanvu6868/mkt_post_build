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
from app.llm.factory import get_chat_model_for_tier as get_chat_model
from langchain_core.messages import SystemMessage, HumanMessage

try:
    from google import genai
    from google.genai import types
except ImportError:
    genai = None
    types = None

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/frame", tags=["Frame"])

async def enhance_prompt(original_prompt: str, media_type: str, size: str = None) -> str:
    llm = get_chat_model("fast")
    if media_type == "image":
        orientation_hint = ""
        if size == "1024x1536":
            orientation_hint = "\nLưu ý: Ảnh này có tỷ lệ Dọc (Portrait). Hãy tối ưu mô tả bố cục (composition) cho khung hình dọc."
        elif size == "1536x1024":
            orientation_hint = "\nLưu ý: Ảnh này có tỷ lệ Ngang (Landscape). Hãy tối ưu mô tả bố cục (composition) cho khung hình ngang."
            
        system = f"""Bạn là một chuyên gia viết prompt (Prompt Engineer) cho AI tạo ảnh nghệ thuật.
Nhiệm vụ: Viết lại/Mở rộng yêu cầu của người dùng thành một prompt tạo ảnh (banner quảng cáo, marketing, minh họa) thật chi tiết, chất lượng cao, mô tả rõ ánh sáng, màu sắc, phong cách (style).{orientation_hint}
BẮT BUỘC TRẢ VỀ BẰNG TIẾNG ANH. CHỈ TRẢ VỀ NỘI DUNG PROMPT, KHÔNG GIẢI THÍCH, KHÔNG MARKDOWN."""
    else:
        system = """Bạn là một chuyên gia viết prompt (Prompt Engineer) cho AI tạo video (như Sora).
Nhiệm vụ: Viết lại/Mở rộng yêu cầu của người dùng thành một prompt tạo video quảng cáo hoặc video marketing chất lượng cao, chuẩn điện ảnh (cinematic), mượt mà, mô tả rõ chuyển động camera, ánh sáng, màu sắc.
BẮT BUỘC TRẢ VỀ BẰNG TIẾNG ANH. CHỈ TRẢ VỀ NỘI DUNG PROMPT, KHÔNG GIẢI THÍCH, KHÔNG MARKDOWN."""

    resp = await llm.ainvoke([SystemMessage(content=system), HumanMessage(content=original_prompt)])
    return resp.content.strip()

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
        import re
        size_match = re.search(r'(\d+x\d+)', request.size)
        actual_size = size_match.group(1) if size_match else "1024x1024"

        enhanced_prompt = await enhance_prompt(request.prompt, "image", actual_size)
        
        import httpx
        async with httpx.AsyncClient(timeout=120.0) as client:
            headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
            payload = {
                "prompt": enhanced_prompt,
                "model": request.model,
                "size": actual_size,
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
                input_data={**request.model_dump(), "enhanced_prompt": enhanced_prompt},
                output_data={"b64_json": b64_json[:100] + "..."} # limit storage size for history if needed, but previously full b64 was stored.
            )
            history_entry.output_data = {"b64_json": b64_json}
            session.add(history_entry)
            await session.commit()
            
        return GenerateImageResponse(b64_json=b64_json)
    except Exception as e:
        logger.error(f"Image generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Image generation failed: {str(e)}")

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
