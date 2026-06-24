import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from openai import OpenAI
import logging
import base64
from typing import Optional

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
    model: str = "gpt-image-2"
    size: str = "1024x1024"

class GenerateImageResponse(BaseModel):
    b64_json: str

@router.post("/generate", response_model=GenerateImageResponse)
async def generate_image(request: GenerateImageRequest):
    api_key = os.getenv("ZENMUX_API_KEY")
    if not api_key:
        logger.error("Missing ZENMUX_API_KEY")
        raise HTTPException(status_code=500, detail="Missing ZENMUX_API_KEY environment variable")

    try:
        client = OpenAI(
            base_url="https://zenmux.ai/api/v1",
            api_key=api_key,
        )

        response = client.images.generate(
            model=request.model,
            prompt=request.prompt,
            n=1,
            size=request.size,
        )

        b64_json = response.data[0].b64_json
        if not b64_json:
            raise Exception("No b64_json returned from ZenMux API")
            
        return GenerateImageResponse(b64_json=b64_json)
    except Exception as e:
        logger.error(f"Image generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Image generation failed: {str(e)}")

class GenerateVideoRequest(BaseModel):
    prompt: str
    model: str = "google/veo-3.1-generate-001"
    aspectRatio: str = "16:9"

class GenerateVideoResponse(BaseModel):
    operation_name: str

class VideoStatusResponse(BaseModel):
    status: str
    b64_video: Optional[str] = None

@router.post("/video/generate", response_model=GenerateVideoResponse)
async def generate_video(request: GenerateVideoRequest):
    if not genai:
        raise HTTPException(status_code=500, detail="google-genai SDK is not installed")
        
    api_key = os.getenv("ZENMUX_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Missing ZENMUX_API_KEY environment variable")

    try:
        client = genai.Client(
            api_key=api_key,
            vertexai=True,
            http_options=types.HttpOptions(
                api_version="v1",
                base_url="https://zenmux.ai/api/vertex-ai"
            )
        )

        operation = client.models.generate_videos(
            model=request.model,
            prompt=request.prompt,
            config=types.GenerateVideosConfig(
                aspectRatio=request.aspectRatio,
            )
        )

        return GenerateVideoResponse(operation_name=operation.name)
    except Exception as e:
        logger.error(f"Video generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Video generation failed: {str(e)}")

@router.get("/video/status/{operation_name}", response_model=VideoStatusResponse)
async def check_video_status(operation_name: str):
    if not genai:
        raise HTTPException(status_code=500, detail="google-genai SDK is not installed")

    api_key = os.getenv("ZENMUX_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Missing ZENMUX_API_KEY")

    try:
        client = genai.Client(
            api_key=api_key,
            vertexai=True,
            http_options=types.HttpOptions(
                api_version="v1",
                base_url="https://zenmux.ai/api/vertex-ai"
            )
        )

        operation = client.operations.get(operation_name)

        if not operation.done:
            return VideoStatusResponse(status="processing")

        if operation.error:
            raise Exception(str(operation.error))

        if not operation.response or not operation.response.generated_videos:
            raise Exception("No video generated")

        video = operation.response.generated_videos[0]
        # video is typically a types.GeneratedVideo containing video_bytes or uri
        if hasattr(video, 'video_bytes') and video.video_bytes:
            b64_video = base64.b64encode(video.video_bytes).decode('utf-8')
        elif hasattr(video, 'video_uri') and video.video_uri:
            # If it returns a URI instead of bytes, we just return the URI
            return VideoStatusResponse(status="completed", b64_video=video.video_uri)
        elif hasattr(video, 'bytes') and video.bytes:
            b64_video = base64.b64encode(video.bytes).decode('utf-8')
        else:
            raise Exception("Unable to extract video data from response")

        return VideoStatusResponse(status="completed", b64_video=b64_video)
    except Exception as e:
        logger.error(f"Video status check error: {e}")
        raise HTTPException(status_code=500, detail=f"Check status failed: {str(e)}")
