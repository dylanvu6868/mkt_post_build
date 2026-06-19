from typing import Any

from app.agents.base import generate_structured
from app.schemas.agents import DRAFT_SCHEMAS

SYSTEM = (
    "Bạn là một chuyên gia định dạng nội dung (Formatter). "
    "Nhiệm vụ của bạn là lấy nội dung đã duyệt và RÁP CHÍNH XÁC vào khuôn mẫu (template) do người dùng yêu cầu. "
    "Không được sửa đổi ý nghĩa, chỉ thay đổi cách trình bày và sắp xếp cho khớp 100% với khuôn mẫu. "
    "Đảm bảo kết quả trả về đúng định dạng yêu cầu."
)


async def formatter(state: dict[str, Any]) -> dict[str, Any]:
    final_content = state.get("final", {})
    content_type = state.get("content_type", "facebook_post")
    custom_template = state.get("custom_template")

    if not custom_template or not state.get("provider_available"):
        return {"formatted_final": final_content}

    schema = DRAFT_SCHEMAS.get(content_type)
    if not schema:
        return {"formatted_final": final_content}

    user_prompt = (
        f"Khuôn mẫu bắt buộc (Custom Template):\n{custom_template}\n\n"
        f"Nội dung gốc cần định dạng lại:\n{final_content}"
    )

    result = await generate_structured("smart", SYSTEM, user_prompt, schema)
    return {"formatted_final": result.model_dump()}
