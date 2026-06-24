import sys
import os
import json
import asyncio
from typing import List, Optional

# Add the 'backend' directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from app.api.study_questions import TOPICS, DATA_PATH
from app.llm.factory import get_chat_model
from app.agents.base import generate_structured
from pydantic import BaseModel, Field

# Thêm Pydantic schemas để Agent trả về cấu trúc chuẩn xác
class Reference(BaseModel):
    reference_type: str = Field(description="Must be 'youtube', 'article' or 'none'. Use 'youtube' if referencing a video, 'article' for a text block.")
    reference_url: Optional[str] = Field(None, description="Youtube embed URL with ?start=xx (e.g. https://www.youtube.com/embed/XXXX?start=120) if type is youtube")
    reference_content: Optional[str] = Field(None, description="Markdown content explaining the concept deeply, used only if type is article")

class QuestionItem(BaseModel):
    id: str = Field(description="Unique ID, e.g. <topic_prefix>_<number>")
    topic_id: str
    question: str
    options: List[str] = Field(description="Exactly 4 options")
    correct_index: int = Field(description="0-based index of the correct option")
    explanation: str = Field(description="Short explanation of why the answer is correct")
    reference_type: str = Field(description="'youtube', 'article' or 'none'")
    reference_url: Optional[str]
    reference_content: Optional[str]

class QuestionsResponse(BaseModel):
    questions: List[QuestionItem]

async def generate_questions_for_topic(topic, num_questions=10):
    print(f"[{topic.name}] Đang gọi AI sinh {num_questions} câu hỏi...")
    
    system_prompt = f"""
    Bạn là một chuyên gia Marketing kỳ cựu và là giáo sư đại học.
    Nhiệm vụ của bạn là tạo ra {num_questions} câu hỏi trắc nghiệm cực kỳ khó, yêu cầu tư duy sâu về chủ đề: {topic.name}.
    
    YÊU CẦU CHO MỖI CÂU HỎI:
    - 4 đáp án (options), chỉ 1 đáp án đúng.
    - `explanation`: Giải thích thật súc tích, dễ hiểu.
    - `reference_type`: Phân bổ ngẫu nhiên giữa "article" (chiếm 80%), "none" (20%). TUYỆT ĐỐI KHÔNG DÙNG "youtube" vì bạn không thể lấy được link thật.
    - Nếu là "article": Cung cấp `reference_content` là 1 bài viết Markdown ngắn gọn (khoảng 150-200 từ) phân tích sâu về lý thuyết của câu hỏi đó, sử dụng định dạng in đậm, in nghiêng hợp lý.
    """
    
    user_prompt = f"Sinh {num_questions} câu hỏi cho chủ đề: {topic.id} - {topic.name}. Đảm bảo ID không bị trùng lặp."
    
    try:
        result = await generate_structured(
            system=system_prompt,
            user=user_prompt,
            schema=QuestionsResponse,
            tier="smart" # Sử dụng mô hình tốt nhất (DeepSeek-Reasoner)
        )
        return result.questions
    except Exception as e:
        print(f"[{topic.name}] Lỗi khi sinh câu hỏi: {e}")
        return []

async def main():
    print("=== BẮT ĐẦU QUÁ TRÌNH AUTO GENERATE DATA CHO VITBA STUDY ===")
    
    # Load existing
    try:
        with open(DATA_PATH, "r", encoding="utf-8") as f:
            existing_data = json.load(f)
    except FileNotFoundError:
        existing_data = []
        
    print(f"Đã load {len(existing_data)} câu hỏi hiện có từ Database.")
    
    for topic in TOPICS:
        # Bạn có thể vòng lặp ở đây để sinh nhiều lần cho mỗi chủ đề, ví dụ 10 lần x 10 câu = 100 câu.
        # Để chạy thử nghiệm, chúng ta sinh 1 lần (5 câu) cho mỗi chủ đề.
        new_q = await generate_questions_for_topic(topic, num_questions=5)
        
        if new_q:
            for q in new_q:
                # Convert Pydantic object to dict, loại bỏ null values
                q_dict = q.dict(exclude_none=True)
                existing_data.append(q_dict)
            print(f"[{topic.name}] Đã thêm {len(new_q)} câu hỏi mới!")
            
            # Save immediately
            with open(DATA_PATH, "w", encoding="utf-8") as f:
                json.dump(existing_data, f, ensure_ascii=False, indent=2)
                
            # Đợi 2 giây tránh Rate Limit
            await asyncio.sleep(2)
            
    print("=== HOÀN TẤT! Toàn bộ Data đã được lưu vào study_questions.json ===")

if __name__ == "__main__":
    asyncio.run(main())
