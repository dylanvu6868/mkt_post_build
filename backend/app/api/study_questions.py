from fastapi import APIRouter, HTTPException, Depends
import json
import os
from typing import List
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.db import get_session
from app.models.user import User
from app.models.study_bookmark import StudyBookmark
from app.models.study_progress import StudyProgress
from app.api.deps import get_current_user

router = APIRouter()

DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "study_questions.json")

class Topic(BaseModel):
    id: str
    name: str
    description: str
    total_questions: int

TOPICS = [
    Topic(id="marketing_basics", name="Marketing Cơ Bản", description="Nền tảng Marketing cốt lõi", total_questions=5),
    Topic(id="consumer_behavior", name="Consumer Behavior", description="Hành vi và Insight khách hàng", total_questions=5),
    Topic(id="branding", name="Branding & Positioning", description="Chiến lược Định vị thương hiệu", total_questions=5),
    Topic(id="digital_marketing", name="Digital Marketing", description="Tổng quan về Digital", total_questions=5),
    Topic(id="content_marketing", name="Content Marketing", description="Sáng tạo nội dung & Copywriting", total_questions=5),
    Topic(id="performance_ads", name="Performance & Ads", description="Quảng cáo trả phí & Tối ưu", total_questions=5),
    Topic(id="seo_sem", name="SEO & SEM", description="Tối ưu công cụ tìm kiếm", total_questions=5),
    Topic(id="social_media", name="Social Media", description="Mạng xã hội & Viral", total_questions=5),
    Topic(id="email_crm", name="Email & CRM", description="Chăm sóc và Quản trị KH", total_questions=5),
    Topic(id="analytics_growth", name="Analytics & Growth", description="Tăng trưởng và Phân tích", total_questions=5),
]

def load_questions():
    try:
        with open(DATA_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading questions: {e}")
        return []

@router.get("/topics", response_model=List[Topic])
async def get_topics():
    # We could dynamically count total_questions from the JSON here if we want
    questions = load_questions()
    topic_counts = {}
    for q in questions:
        topic_counts[q["topic_id"]] = topic_counts.get(q["topic_id"], 0) + 1
        
    for topic in TOPICS:
        if topic.id in topic_counts:
            topic.total_questions = topic_counts[topic.id]
            
    return TOPICS

@router.get("/bookmarks")
async def get_bookmarks(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    query = select(StudyBookmark.question_id).where(StudyBookmark.user_id == current_user.id)
    result = await session.execute(query)
    bookmarked_ids = result.scalars().all()
    return {"bookmarks": bookmarked_ids}

@router.post("/bookmarks/{question_id}")
async def toggle_bookmark(
    question_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    query = select(StudyBookmark).where(
        StudyBookmark.user_id == current_user.id,
        StudyBookmark.question_id == question_id
    )
    result = await session.execute(query)
    bookmark = result.scalar_one_or_none()
    
    if bookmark:
        await session.delete(bookmark)
        await session.commit()
        return {"status": "removed", "question_id": question_id}
    else:
        new_bookmark = StudyBookmark(
            user_id=current_user.id,
            question_id=question_id
        )
        session.add(new_bookmark)
        await session.commit()
        return {"status": "added", "question_id": question_id}

@router.get("/questions/{topic_id}")
async def get_questions_by_topic(topic_id: str):
    questions = load_questions()
    topic_questions = [q for q in questions if q.get("topic_id") == topic_id]
    if not topic_questions:
        raise HTTPException(status_code=404, detail="Topic not found or has no questions")
    return topic_questions

@router.get("/progress")
async def get_study_progress(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    query = select(StudyProgress).where(StudyProgress.user_id == current_user.id)
    result = await session.execute(query)
    progress_list = result.scalars().all()
    
    return {p.topic_id: p.progress_data for p in progress_list}

class ProgressUpdateReq(BaseModel):
    topic_id: str
    progress_data: dict

@router.post("/progress")
async def update_study_progress(
    req: ProgressUpdateReq,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    query = select(StudyProgress).where(
        StudyProgress.user_id == current_user.id,
        StudyProgress.topic_id == req.topic_id
    )
    result = await session.execute(query)
    progress = result.scalar_one_or_none()
    
    if progress:
        progress.progress_data = req.progress_data
    else:
        progress = StudyProgress(
            user_id=current_user.id,
            topic_id=req.topic_id,
            progress_data=req.progress_data
        )
        session.add(progress)
        
    await session.commit()
    return {"status": "success", "topic_id": req.topic_id}
