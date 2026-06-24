from fastapi import APIRouter, HTTPException
import json
import os
from typing import List
from pydantic import BaseModel

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

@router.get("/questions/{topic_id}")
async def get_questions_by_topic(topic_id: str):
    questions = load_questions()
    topic_questions = [q for q in questions if q.get("topic_id") == topic_id]
    if not topic_questions:
        raise HTTPException(status_code=404, detail="Topic not found or has no questions")
    return topic_questions
