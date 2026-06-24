import json
import os
import requests
import re

DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "app", "data", "study_questions.json")
TAVILY_API_KEY = "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"

def search_youtube(query):
    url = "https://api.tavily.com/search"
    payload = {
        "api_key": TAVILY_API_KEY,
        "query": f"site:youtube.com {query}",
        "search_depth": "basic",
        "max_results": 2
    }
    try:
        response = requests.post(url, json=payload)
        data = response.json()
        if "results" in data:
            for res in data["results"]:
                match = re.search(r"watch\?v=([a-zA-Z0-9_-]{11})", res["url"])
                if match:
                    return match.group(1)
    except Exception as e:
        print(f"Lỗi tìm kiếm: {e}")
    return None

def main():
    print("Bắt đầu tự động tìm kiếm link YouTube thật...")
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        questions = json.load(f)
        
    updated = False
    for q in questions:
        # Giữ nguyên câu mkt_basic_01 vì nó đã đúng
        if q.get("id") == "mkt_basic_01":
            continue
            
        if q.get("reference_type") == "youtube":
            print(f"Tìm video cho: {q['question']}")
            vid = search_youtube(q["question"])
            if vid:
                q["reference_url"] = f"https://www.youtube.com/embed/{vid}"
                print(f" -> Đã tìm thấy: {vid}")
                updated = True
            else:
                # Nếu không tìm thấy, chuyển sang none để khỏi lỗi
                q["reference_type"] = "none"
                q["reference_url"] = None
                print(" -> Không tìm thấy video hợp lệ, chuyển thành 'none'")
                updated = True

    if updated:
        with open(DATA_PATH, "w", encoding="utf-8") as f:
            json.dump(questions, f, ensure_ascii=False, indent=2)
        print("Đã lưu toàn bộ link thật vào file!")

if __name__ == "__main__":
    main()
