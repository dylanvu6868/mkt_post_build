from app.services.quickpost_service import (
    extract_quickpost_marker,
    parse_quickpost,
    format_quickpost_text,
)


def test_extract_quickpost_marker_finds_known_type():
    text = "[QUICKPOST:facebook_post]\nHello"
    result = extract_quickpost_marker(text)
    assert result == ("facebook_post", "Hello")


def test_extract_quickpost_marker_returns_none_for_unknown_type():
    text = "[QUICKPOST:seo_blog]\nHello"
    assert extract_quickpost_marker(text) is None


def test_extract_quickpost_marker_returns_none_when_absent():
    assert extract_quickpost_marker("Xin chào, bạn cần giúp gì?") is None


def test_parse_quickpost_facebook_post_extracts_sections():
    raw = (
        "🔥 Bạn có đang gặp vấn đề này?\n\n"
        "Nỗi đau của bạn ở đây.\n\n"
        "✨ Bạn sẽ nhận được:\n\n"
        "✅ Lợi ích 1\n✅ Lợi ích 2\n\n"
        "👇 CTA\n\n"
        "Mua ngay hôm nay!\n\n"
        "#marketing #sale"
    )
    parsed = parse_quickpost("facebook_post", raw)
    assert "Bạn có đang gặp vấn đề" in parsed["hook"]
    assert "Nỗi đau" in parsed["body"]
    assert "Mua ngay" in parsed["cta"]
    assert parsed["hashtags"] == ["#marketing", "#sale"]


def test_parse_quickpost_email_extracts_subject():
    raw = "Tiêu đề: Ưu đãi đặc biệt\n\nXin chào,\n\nĐây là nội dung email."
    parsed = parse_quickpost("email", raw)
    assert parsed["subject"] == "Ưu đãi đặc biệt"
    assert "Xin chào" in parsed["body"]


def test_parse_quickpost_tiktok_script_splits_hook_and_script():
    raw = "Dừng lại! Bạn cần xem cái này.\n\nĐây là nội dung kịch bản chi tiết."
    parsed = parse_quickpost("tiktok_script", raw)
    assert "Dừng lại" in parsed["hook"]
    assert "kịch bản" in parsed["script"]


def test_format_quickpost_text_facebook_post_roundtrips_readable_text():
    parsed = {"hook": "H", "body": "B", "cta": "C", "hashtags": ["#a", "#b"]}
    text = format_quickpost_text("facebook_post", parsed)
    assert "H" in text and "B" in text and "C" in text and "#a #b" in text
