import json
from langchain_core.messages import SystemMessage, HumanMessage

from app.graph.state import GraphState
from app.llm.factory import get_chat_model
from app.rag.embeddings import embed_query
from app.rag.qdrant_store import retrieve

MARKETING_PLAN_PROMPT = """Bạn là một Giám đốc Marketing (CMO) dày dặn kinh nghiệm.
Nhiệm vụ của bạn là lập một Kế hoạch Marketing chiến lược dựa trên các tài liệu đã được cung cấp từ Cơ sở tri thức (Knowledge Base) của dự án.

TÀI LIỆU NGỮ CẢNH:
{context}

YÊU CẦU:
1. Phân tích ngữ cảnh và yêu cầu của người dùng để đưa ra bản kế hoạch chi tiết.
2. Bản kế hoạch cần bao gồm các phần chính:
   - Tóm tắt Dự án (Executive Summary)
   - Phân tích SWOT (BẮT BUỘC dùng bảng Markdown 2x2: Strengths | Weaknesses / Opportunities | Threats)
   - Chân dung Khách hàng Mục tiêu (Target Audience) — dùng bảng với các cột: Nhóm | Độ tuổi | Hành vi | Kênh tiếp cận
   - Thông điệp truyền thông chính (Key Message)
   - Phân bổ Kênh truyền thông (Channel Strategy) — BẮT BUỘC dùng bảng với các cột: Kênh | Mục tiêu | Ngân sách (%) | KPI
   - Ngân sách và KPIs dự kiến — BẮT BUỘC dùng bảng với các cột: Hạng mục | Chi phí | KPI | Deadline
   - Timeline triển khai — dùng bảng với các cột: Tuần/Tháng | Hoạt động | Người phụ trách | Output
3. Định dạng bằng Markdown chuẩn. Dùng BẢNG MARKDOWN (| --- | --- |) cho mọi dữ liệu có cấu trúc. Dùng heading (#, ##, ###) cho phân mục.
4. Trả về kết quả dưới dạng JSON với cấu trúc:
{{
    "body": "<Nội dung bản kế hoạch bằng Markdown>"
}}
 
Yêu cầu cụ thể từ người dùng:
{brief}
Mục tiêu: {marketing_goal}
"""

async def marketing_planner_rag(state: GraphState):
    """Generates a marketing plan using RAG."""
    model = get_chat_model("fast")
    
    project_id = state.get("project_id")
    brief = state.get("brief", "")
    goal = state.get("marketing_goal", "")
    
    # Retrieve context from Qdrant if project_id exists
    context = "Không có tài liệu ngữ cảnh nào được tải lên."
    if project_id:
        query = f"{brief} {goal}"
        # Search the knowledge base
        query_vec = embed_query(query)
        search_results = retrieve(project_id, query_vec, top_k=5)
        if search_results:
            context_texts = [f"Tài liệu {i+1}: {text}" for i, text in enumerate(search_results)]
            context = "\n\n".join(context_texts)

    prompt = MARKETING_PLAN_PROMPT.format(context=context, brief=brief, marketing_goal=goal)
    messages = [
        SystemMessage(content=prompt),
        HumanMessage(content="Hãy lập Kế hoạch Marketing ngay bây giờ và trả về JSON hợp lệ."),
    ]
    
    # We enforce JSON mode via model kwargs if supported, or just rely on the prompt.
    # We will just parse the markdown if json parsing fails.
    response = await model.ainvoke(messages)
    
    content = response.content.strip()
    try:
        if content.startswith("```json"):
            content = content[7:]
        if content.endswith("```"):
            content = content[:-3]
        parsed = json.loads(content.strip())
        plan_body = parsed.get("body", response.content)
    except:
        plan_body = response.content

    return {
        "final": {"body": plan_body},
        "formatted_final": {"body": plan_body}
    }
