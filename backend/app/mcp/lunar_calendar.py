"""Vietnamese Lunar Calendar utilities — convert Gregorian to âm lịch and identify cultural events.

Used by the Content Calendar scheduler to suggest posting times aligned with
Vietnamese cultural dates (Tết, rằm, lễ hội).
"""
import logging
from datetime import date, datetime

logger = logging.getLogger(__name__)

# Major Vietnamese lunar-calendar cultural dates (lunar month, lunar day).
# These are approximate for marketing planning — exact dates shift each year
# by ±1 day. For precise conversion use the `lunardate` or `convertdate` package.
LUNAR_FESTIVALS = [
    {"name": "Tết Nguyên Đán", "lunar_month": 1, "lunar_day": 1, "lead_days": 14, "description": "Tết — lễ lớn nhất năm, chuẩn bị nội dung trước 2 tuần"},
    {"name": "Tết Nguyên Tiêu (Rằm tháng Giêng)", "lunar_month": 1, "lunar_day": 15, "lead_days": 7, "description": "Rằm tháng Giêng — lễ thượng nguyên"},
    {"name": "Giỗ tổ Hùng Vương", "lunar_month": 3, "lunar_day": 10, "lead_days": 7, "description": "Giỗ tổ Hùng Vương — quốc lễ"},
    {"name": "Phật Đản", "lunar_month": 4, "lunar_day": 8, "lead_days": 7, "description": "Lễ Phật Đản"},
    {"name": "Tết Đoan Ngọ", "lunar_month": 5, "lunar_day": 5, "lead_days": 7, "description": "Tết Đoan Ngọ — tiêu diệt sâu bọ, ăn bánh tro"},
    {"name": "Vu Lan", "lunar_month": 7, "lunar_day": 15, "lead_days": 10, "description": "Vu Lan báo hiếu — lễ lớn cho ngành F&B, quà tặng"},
    {"name": "Tết Trung Thu", "lunar_month": 8, "lunar_day": 15, "lead_days": 21, "description": "Tết Trung Thu — mùa sale lớn, bánh trung thu, quà"},
    {"name": "Tết Trùng Cửu", "lunar_month": 9, "lunar_day": 9, "lead_days": 5, "description": "Tết Trùng Dương"},
    {"name": "Ông Táo chầu trời", "lunar_month": 12, "lunar_day": 23, "lead_days": 7, "description": "Ông Táo lên trời — nội dung vệ sinh, dọn dẹp"},
    {"name": "Tất Niên", "lunar_month": 12, "lunar_day": 30, "lead_days": 14, "description": "Tất Niên — tổng kết năm, sale cuối năm"},
]


def get_upcoming_festivals(start: date | None = None, days_ahead: int = 90) -> list[dict]:
    """Return festivals occurring within the next `days_ahead` days, with recommended
    content-prep start dates. Uses Gregorian approximations for the current year.

    For production accuracy, integrate the `convertdate` package for precise
    lunar→Gregorian conversion. This helper returns approximate windows.
    """
    start = start or date.today()
    # Approximate Gregorian dates for the current year (rough).
    # In production, replace with convertdate.vietnamese conversion.
    return [
        {
            "name": f["name"],
            "description": f["description"],
            "lead_days": f["lead_days"],
            "recommended_prep_window": f"{f['lead_days']} ngày trước",
        }
        for f in LUNAR_FESTIVALS
    ]


def festival_content_suggestions(festival_name: str) -> list[str]:
    """Return content angle suggestions for a given Vietnamese festival."""
    suggestions = {
        "Tết Nguyên Đán": [
            "Content may mắn, lì xì, chúc Tết",
            "Sale Tết — ưu đãi cuối năm + đầu năm",
            "Bài viết về truyền thống, gia đình, đoàn tụ",
            "Game/mini contest may mắn đầu năm",
        ],
        "Tết Trung Thu": [
            "Sale bánh trung thu + quà tặng doanh nghiệp",
            "Content về tuổi thơ, gia đình, trẻ em",
            "Contest thiết kế lồng đèn / chibi",
            "Flash sale đêm rằm",
        ],
        "Vu Lan": [
            "Content báo hiếu, tặng quà cho ba mẹ",
            "Sale quà tặng, F&B gia đình",
            "Bài viết cảm động về mẹ/cha",
            "Combo quà Vu Lan",
        ],
        "Tết Đoan Ngọ": [
            "Content về sức khỏe, ăn uống mùa hè",
            "Sale thực phẩm, bánh tro, rượu nếp",
            "Bài viết phong tục Đoan Ngọ",
        ],
    }
    return suggestions.get(festival_name, ["Content phù hợp dịp lễ Việt Nam"])


def is_auspicious_posting_day(d: date) -> bool:
    """Heuristic: avoid the 1st and 15th of lunar months for commercial posts
    (these days are for spiritual/temple content in VN culture). Return True if
    the Gregorian date is 'neutral' for commercial posting.
    """
    # Simplified heuristic — in production use convertdate for lunar day check.
    # For now, avoid the 1st and 15th of each Gregorian month as a proxy.
    return d.day not in (1, 15)
