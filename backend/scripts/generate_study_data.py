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
    reference_query: Optional[str] = Field(None, description="Search query to find youtube video")

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
    reference_query: Optional[str]

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
    - `reference_type`: Phân bổ ngẫu nhiên giữa "article" (chiếm 60%), "youtube" (chiếm 20%), "none" (20%). 
    - Nếu là "article": Cung cấp `reference_content` là 1 bài viết Markdown ngắn gọn (khoảng 150-200 từ) phân tích sâu về lý thuyết của câu hỏi đó, sử dụng định dạng in đậm, in nghiêng hợp lý.
    - Nếu là "youtube": CHỈ cung cấp `reference_query` là một từ khóa bằng tiếng Anh thật ngắn gọn để tìm kiếm video bài giảng (vd: "marketing mix 4p explained"). TUYỆT ĐỐI KHÔNG điền `reference_url` (hệ thống sẽ tự động điền).
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

def enrich_questions_with_tavily(questions):
    api_key = os.getenv("TAVILY_API_KEY")
    if not api_key:
        return
        
    try:
        from tavily import TavilyClient
        client = TavilyClient(api_key=api_key)
    except Exception:
        return

    for q in questions:
        if q.reference_type == "youtube" and q.reference_query:
            try:
                print(f"      [Tavily] Tìm video cho query: {q.reference_query}")
                response = client.search(f"site:youtube.com {q.reference_query}", search_depth="basic", max_results=1)
                results = response.get("results", [])
                if results and len(results) > 0:
                    url = results[0]["url"]
                    if "watch?v=" in url:
                        video_id = url.split("watch?v=")[1].split("&")[0]
                        q.reference_url = f"https://www.youtube.com/embed/{video_id}"
                        print(f"      [Tavily] Đã gắn link: {q.reference_url}")
                    else:
                        q.reference_type = "none" # fallback
                else:
                    q.reference_type = "none"
            except Exception as e:
                print(f"      [Tavily] Lỗi search: {e}")
                q.reference_type = "none"

async def generate_batches_for_topic(topic, existing_count, target_count=200):
    remaining = target_count - existing_count
    if remaining <= 0:
        print(f"[{topic.name}] Đã đủ {target_count} câu hỏi (hiện có: {existing_count}). Bỏ qua.")
        return []
        
    print(f"[{topic.name}] Cần sinh thêm {remaining} câu hỏi...")
    new_questions = []
    batch_size = 10
    
    while remaining > 0:
        current_batch = min(batch_size, remaining)
        print(f"[{topic.name}] Đang gọi AI sinh batch {current_batch} câu...")
        batch_q = await generate_questions_for_topic(topic, num_questions=current_batch)
        
        if batch_q:
            enrich_questions_with_tavily(batch_q)
            new_questions.extend(batch_q)
            remaining -= len(batch_q)
            print(f"[{topic.name}] Thành công! Còn lại {remaining} câu cần sinh.")
        else:
            print(f"[{topic.name}] Gọi AI thất bại, sẽ thử lại hoặc dừng. Tạm dừng 5 giây...")
            await asyncio.sleep(5)
            continue
            
        await asyncio.sleep(3) # Tránh Rate Limit
        
    return new_questions

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
        # Count existing
        existing_for_topic = len([q for q in existing_data if q.get("topic_id") == topic.id])
        
        new_q = await generate_batches_for_topic(topic, existing_for_topic, target_count=200)
        
        if new_q:
            for q in new_q:
                # Convert Pydantic object to dict, loại bỏ null values
                q_dict = q.dict(exclude_none=True)
                existing_data.append(q_dict)
            
            # Save after each topic to not lose progress
            with open(DATA_PATH, "w", encoding="utf-8") as f:
                json.dump(existing_data, f, ensure_ascii=False, indent=2)
            print(f"[{topic.name}] Đã lưu database thành công!")
            
    print("=== HOÀN TẤT! Toàn bộ Data đã được lưu vào study_questions.json ===")

if __name__ == "__main__":
    asyncio.run(main())
