import json
from langchain_core.messages import SystemMessage, HumanMessage

from app.graph.state import GraphState
from app.llm.factory import get_chat_model

LANDING_PAGE_PROMPT = """Bạn là một Frontend Developer chuyên nghiệp có 10 năm kinh nghiệm về UI/UX.
Nhiệm vụ của bạn là lập trình một trang Landing Page hoàn chỉnh (Single Page) dựa trên yêu cầu của người dùng.

YÊU CẦU BẮT BUỘC:
1. Bạn BẮT BUỘC phải sử dụng Tailwind CSS qua CDN (`<script src="https://cdn.tailwindcss.com"></script>`).
2. Giao diện phải đẹp, hiện đại, chuẩn UI/UX, hỗ trợ Responsive (hiển thị tốt trên Mobile và Desktop).
3. Đầy đủ các phần cơ bản của 1 Landing Page: Hero Section, Features/Benefits, Social Proof (Testimonials), và Call to Action (CTA) Form.
4. Trả về DUY NHẤT mã nguồn HTML hoàn chỉnh. KHÔNG được thêm bất kỳ lời giải thích hay định dạng markdown (như ```html) nào trước hoặc sau mã nguồn. Mã nguồn phải bắt đầu bằng `<!DOCTYPE html>`.
5. Sử dụng ảnh placeholder từ `https://via.placeholder.com` hoặc Unsplash Source cho các hình ảnh minh họa.

Thông tin dự án:
{brief}
Mục tiêu: {marketing_goal}
"""

async def landing_page_coder(state: GraphState):
    """Generates a complete HTML Landing Page."""
    model = get_chat_model("reasoning")
    
    brief = state.get("brief", "Không có thông tin chi tiết")
    goal = state.get("marketing_goal", "Tạo chuyển đổi")

    prompt = LANDING_PAGE_PROMPT.format(brief=brief, marketing_goal=goal)
    messages = [
        SystemMessage(content=prompt),
        HumanMessage(content="Hãy viết toàn bộ mã nguồn HTML ngay bây giờ."),
    ]
    
    response = await model.ainvoke(messages)
    
    content = response.content.strip()
    if content.startswith("```html"):
        content = content[7:]
    if content.endswith("```"):
        content = content[:-3]
    content = content.strip()
    
    return {
        "final": {"body": content},
        "formatted_final": {"body": content}
    }
