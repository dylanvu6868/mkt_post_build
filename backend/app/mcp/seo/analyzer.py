import re
from collections import Counter

from bs4 import BeautifulSoup


def analyze_html(html: str, url: str | None = None) -> dict:
    soup = BeautifulSoup(html, "html.parser")
    issues: list[dict] = []
    suggestions: list[str] = []
    score = 100

    title_tag = soup.find("title")
    title_text = title_tag.get_text(strip=True) if title_tag else ""
    title_len = len(title_text)
    title_info = {"exists": bool(title_text), "length": title_len, "text": title_text}
    if not title_text:
        issues.append({"severity": "critical", "message": "Missing <title> tag"})
        suggestions.append("Add a descriptive <title> tag (50-60 characters)")
        score -= 20
    elif title_len < 30 or title_len > 70:
        issues.append({"severity": "warning", "message": f"Title length ({title_len}) outside optimal range (50-60)"})
        score -= 5

    meta_desc = soup.find("meta", attrs={"name": "description"})
    desc_content = meta_desc.get("content", "") if meta_desc else ""
    desc_len = len(desc_content)
    desc_info = {"exists": bool(desc_content), "length": desc_len}
    if not desc_content:
        issues.append({"severity": "critical", "message": "Missing meta description"})
        suggestions.append("Add a meta description (150-160 characters)")
        score -= 15
    elif desc_len < 120 or desc_len > 170:
        issues.append({"severity": "warning", "message": f"Meta description length ({desc_len}) outside optimal range (150-160)"})
        score -= 5

    headings: dict[str, int] = {}
    for level in range(1, 4):
        tag = f"h{level}"
        headings[f"{tag}_count"] = len(soup.find_all(tag))
    if headings["h1_count"] == 0:
        issues.append({"severity": "critical", "message": "Missing H1 heading"})
        score -= 15
    elif headings["h1_count"] > 1:
        issues.append({"severity": "warning", "message": f"Multiple H1 tags ({headings['h1_count']})"})
        score -= 5

    images = soup.find_all("img")
    images_without_alt = [img for img in images if not img.get("alt")]
    img_info = {"total": len(images), "missing_alt": len(images_without_alt)}
    if images_without_alt:
        issues.append({"severity": "warning", "message": f"{len(images_without_alt)} image(s) missing alt text"})
        score -= 3 * len(images_without_alt)

    body_text = soup.get_text(separator=" ", strip=True)
    word_count = len(body_text.split())
    if word_count < 300:
        issues.append({"severity": "warning", "message": f"Low word count ({word_count}). Aim for 300+"})
        score -= 10

    links = soup.find_all("a", href=True)
    internal = [a for a in links if a["href"].startswith("/") or a["href"].startswith("#")]
    external = [a for a in links if a["href"].startswith("http")]
    link_info = {"internal": len(internal), "external": len(external), "total": len(links)}

    sentences = [s.strip() for s in re.split(r"[.!?]+", body_text) if len(s.strip()) > 5]
    avg_sentence_len = sum(len(s.split()) for s in sentences) / max(len(sentences), 1)
    if avg_sentence_len > 25:
        issues.append({"severity": "info", "message": f"Average sentence length ({avg_sentence_len:.0f} words) is high. Consider shorter sentences."})
        score -= 3

    score = max(0, min(100, score))

    return {
        "score": score,
        "url": url,
        "title": title_info,
        "meta_description": desc_info,
        "headings": headings,
        "images": img_info,
        "word_count": word_count,
        "links": link_info,
        "readability": {"avg_sentence_length": round(avg_sentence_len, 1)},
        "issues": issues,
        "suggestions": suggestions,
    }


def extract_keywords(text: str, top_n: int = 20) -> list[dict]:
    words = re.findall(r"\b[a-zA-ZÀ-ỹ]{3,}\b", text.lower())
    counts = Counter(words)
    total = len(words)
    result = []
    for word, count in counts.most_common(top_n):
        result.append({
            "keyword": word,
            "count": count,
            "density": round(count / total * 100, 2) if total else 0,
        })
    return result
