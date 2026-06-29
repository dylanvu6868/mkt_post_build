"""
DataForSEO async API client service.

Provides methods for keyword research, domain analysis, backlink auditing,
and SERP data retrieval via the DataForSEO REST API.

All methods return a dict with keys: items, metadata, cost.
On failure (missing API key, network error, API error) they return
{'items': [], 'metadata': {...}, 'cost': 0.0, 'error': '...'}.
"""

from __future__ import annotations

import asyncio
import logging
import os
from typing import Any

import httpx

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Defaults
# ---------------------------------------------------------------------------
BASE_URL = "https://api.dataforseo.com"
TIMEOUT_SECONDS = 60
MAX_RETRIES = 2
BACKOFF_BASE = 1.0  # seconds, doubles each retry

VIETNAM_LOCATION_CODE = 2840
# DataForSEO Labs API for Vietnam only supports language_code="en"
# (Vietnamese SERP data is available via keywords, not via language_code="vi")
VIETNAM_LANGUAGE_CODE = "en"

# ---------------------------------------------------------------------------
# Empty result helper
# ---------------------------------------------------------------------------

def _empty_result(error: str, method: str = "") -> dict[str, Any]:
    """Return a consistent empty-result dict when a request cannot proceed."""
    return {
        "items": [],
        "metadata": {"method": method, "status_code": 0},
        "cost": 0.0,
        "error": error,
    }


# ---------------------------------------------------------------------------
# Service class
# ---------------------------------------------------------------------------

class DataForSEOService:
    """Async client for the DataForSEO REST API."""

    def __init__(self) -> None:
        self._client: httpx.AsyncClient | None = None

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @staticmethod
    def get_api_key() -> str:
        """Read the base64-encoded API key from the environment."""
        return os.getenv("DATAFORSEO_API_KEY", "")

    async def _get_client(self) -> httpx.AsyncClient:
        """Lazy-init a shared httpx.AsyncClient."""
        if self._client is None or self._client.is_closed:
            api_key = self.get_api_key()
            # DataForSEO API key is already base64-encoded — set header directly
            headers = {"Content-Type": "application/json"}
            if api_key:
                headers["Authorization"] = f"Basic {api_key}"
            self._client = httpx.AsyncClient(
                base_url=BASE_URL,
                headers=headers,
                timeout=httpx.Timeout(TIMEOUT_SECONDS),
            )
        return self._client

    async def close(self) -> None:
        """Close the underlying HTTP client."""
        if self._client and not self._client.is_closed:
            await self._client.aclose()
            self._client = None

    async def _request(
        self,
        method: str,
        path: str,
        payload: list[dict[str, Any]],
        endpoint_label: str = "",
    ) -> dict[str, Any]:
        """
        Send a POST request with retry + exponential backoff on 5xx.

        Returns the parsed response items plus metadata and cost.
        """
        api_key = self.get_api_key()
        if not api_key:
            msg = "DATAFORSEO_API_KEY environment variable is not set"
            logger.warning(msg)
            return _empty_result(msg, method=endpoint_label)

        client = await self._get_client()
        last_exc: Exception | None = None

        for attempt in range(MAX_RETRIES + 1):
            try:
                resp = await client.post(path, json=payload)
            except (httpx.HTTPError, httpx.TimeoutException) as exc:
                last_exc = exc
                logger.warning(
                    "DataForSEO %s attempt %d failed: %s",
                    endpoint_label, attempt + 1, exc,
                )
                if attempt < MAX_RETRIES:
                    await asyncio.sleep(BACKOFF_BASE * (2 ** attempt))
                    continue
                return _empty_result(str(exc), method=endpoint_label)

            # HTTP-level check
            if resp.status_code >= 500:
                last_exc = httpx.HTTPStatusError(
                    f"HTTP {resp.status_code}",
                    request=resp.request,
                    response=resp,
                )
                logger.warning(
                    "DataForSEO %s attempt %d got HTTP %d",
                    endpoint_label, attempt + 1, resp.status_code,
                )
                if attempt < MAX_RETRIES:
                    await asyncio.sleep(BACKOFF_BASE * (2 ** attempt))
                    continue
                return _empty_result(
                    f"HTTP {resp.status_code} after {MAX_RETRIES + 1} attempts",
                    method=endpoint_label,
                )

            # Parse JSON
            try:
                data = resp.json()
            except ValueError as exc:
                return _empty_result(f"Invalid JSON: {exc}", method=endpoint_label)

            # DataForSEO wraps everything in a 'tasks' array
            tasks = data.get("tasks") or []
            if not tasks:
                return _empty_result(
                    f"Empty tasks array (status_code={data.get('status_code')})",
                    method=endpoint_label,
                )

            task = tasks[0]
            task_status = task.get("status_code", 0)

            # API-level error check (top-level status_code)
            top_status = data.get("status_code", 0)
            if top_status != 20000:
                msg = task.get("status_message", f"Top-level status_code={top_status}")
                return {
                    "items": [],
                    "metadata": {
                        "method": endpoint_label,
                        "status_code": top_status,
                        "task_status_code": task_status,
                        "message": msg,
                    },
                    "cost": data.get("cost", 0.0),
                    "error": msg,
                }

            # Task-level error check
            if task_status != 20000:
                msg = task.get("status_message", f"Task status_code={task_status}")
                return {
                    "items": [],
                    "metadata": {
                        "method": endpoint_label,
                        "status_code": top_status,
                        "task_status_code": task_status,
                        "message": msg,
                    },
                    "cost": data.get("cost", 0.0),
                    "error": msg,
                }

            # Success
            items = task.get("result", [])
            return {
                "items": items if isinstance(items, list) else [items],
                "metadata": {
                    "method": endpoint_label,
                    "status_code": top_status,
                    "task_status_code": task_status,
                    "api_version": task.get("api_version"),
                },
                "cost": data.get("cost", 0.0),
            }

        # Should not reach here, but safety net
        return _empty_result(
            str(last_exc) or "Unknown error", method=endpoint_label
        )

    # ==================================================================
    # 1. Keyword Suggestions
    # ==================================================================

    async def keyword_suggestions(
        self,
        keyword: str,
        location_code: int = VIETNAM_LOCATION_CODE,
        language_code: str = VIETNAM_LANGUAGE_CODE,
        limit: int = 50,
        include_serp_info: bool = False,
    ) -> dict[str, Any]:
        """
        Get keyword suggestions for a seed keyword.

        Items contain: keyword, search_volume, cpc, keyword_difficulty,
        competition, trends, etc.
        """
        payload = [
            {
                "keyword": keyword,
                "location_code": location_code,
                "language_code": language_code,
                "limit": limit,
                "include_serp_info": include_serp_info,
            }
        ]
        return await self._request(
            "POST",
            "/v3/dataforseo_labs/google/keyword_suggestions/live",
            payload,
            endpoint_label="keyword_suggestions",
        )

    # ==================================================================
    # 2. Keyword Ideas
    # ==================================================================

    async def keyword_ideas(
        self,
        keywords: list[str],
        location_code: int = VIETNAM_LOCATION_CODE,
        language_code: str = VIETNAM_LANGUAGE_CODE,
        limit: int = 50,
    ) -> dict[str, Any]:
        """
        Generate keyword ideas from a list of seed keywords.

        Items contain: keyword, search_volume, cpc, keyword_difficulty,
        competition, etc.
        """
        payload = [
            {
                "keywords": keywords,
                "location_code": location_code,
                "language_code": language_code,
                "limit": limit,
            }
        ]
        return await self._request(
            "POST",
            "/v3/dataforseo_labs/google/keyword_ideas/live",
            payload,
            endpoint_label="keyword_ideas",
        )

    # ==================================================================
    # 3. Related Keywords
    # ==================================================================

    async def related_keywords(
        self,
        keyword: str,
        location_code: int = VIETNAM_LOCATION_CODE,
        language_code: str = VIETNAM_LANGUAGE_CODE,
        limit: int = 50,
        depth: int = 3,
    ) -> dict[str, Any]:
        """
        Get keywords related to a seed keyword.

        ``depth`` controls how many levels of relations to traverse.
        Items contain: keyword, search_volume, cpc, keyword_difficulty,
        relation_type, etc.
        """
        payload = [
            {
                "keyword": keyword,
                "location_code": location_code,
                "language_code": language_code,
                "limit": limit,
                "depth": depth,
            }
        ]
        return await self._request(
            "POST",
            "/v3/dataforseo_labs/google/related_keywords/live",
            payload,
            endpoint_label="related_keywords",
        )

    # ==================================================================
    # 4. Domain Rank Overview
    # ==================================================================

    async def domain_rank_overview(
        self,
        target: str,
        location_code: int = VIETNAM_LOCATION_CODE,
        language_code: str = VIETNAM_LANGUAGE_CODE,
        limit: int = 1,
    ) -> dict[str, Any]:
        """
        Retrieve rank overview for a domain.

        Items contain: domain_rank, main_page, rank_absolute,
        rank_changes, etc.
        """
        payload = [
            {
                "target": target,
                "location_code": location_code,
                "language_code": language_code,
                "limit": limit,
            }
        ]
        return await self._request(
            "POST",
            "/v3/dataforseo_labs/google/domain_rank_overview/live",
            payload,
            endpoint_label="domain_rank_overview",
        )

    # ==================================================================
    # 5. Ranked Keywords
    # ==================================================================

    async def ranked_keywords(
        self,
        target: str,
        location_code: int = VIETNAM_LOCATION_CODE,
        language_code: str = VIETNAM_LANGUAGE_CODE,
        limit: int = 20,
    ) -> dict[str, Any]:
        """
        Get keywords a domain ranks for organically.

        Items contain: keyword, search_volume, cpc, rank, url, etc.
        """
        payload = [
            {
                "target": target,
                "location_code": location_code,
                "language_code": language_code,
                "limit": limit,
            }
        ]
        return await self._request(
            "POST",
            "/v3/dataforseo_labs/google/ranked_keywords/live",
            payload,
            endpoint_label="ranked_keywords",
        )

    # ==================================================================
    # 6. SERP Competitors
    # ==================================================================

    async def serp_competitors(
        self,
        keywords: list[str],
        location_code: int = VIETNAM_LOCATION_CODE,
        language_code: str = VIETNAM_LANGUAGE_CODE,
        limit: int = 10,
    ) -> dict[str, Any]:
        """
        Identify organic competitors for given keywords.

        Items contain: domain, rank, intersecting_keywords, etc.
        """
        payload = [
            {
                "keywords": keywords,
                "location_code": location_code,
                "language_code": language_code,
                "limit": limit,
            }
        ]
        return await self._request(
            "POST",
            "/v3/dataforseo_labs/google/serp_competitors/live",
            payload,
            endpoint_label="serp_competitors",
        )

    # ==================================================================
    # 7. Backlinks Summary
    # ==================================================================

    async def backlinks_summary(
        self,
        target: str,
        limit: int = 10,
    ) -> dict[str, Any]:
        """
        Get a summary of backlink metrics for a domain.

        Items contain: backlinks, domains, dofollow, etc.
        """
        payload = [
            {
                "target": target,
                "limit": limit,
            }
        ]
        return await self._request(
            "POST",
            "/v3/backlinks/summary/live",
            payload,
            endpoint_label="backlinks_summary",
        )

    # ==================================================================
    # 8. Backlinks
    # ==================================================================

    async def backlinks(
        self,
        target: str,
        limit: int = 20,
    ) -> dict[str, Any]:
        """
        Retrieve individual backlinks for a domain.

        Items contain: url, anchor, domain_from, rank, etc.
        """
        payload = [
            {
                "target": target,
                "limit": limit,
            }
        ]
        return await self._request(
            "POST",
            "/v3/backlinks/backlinks/live",
            payload,
            endpoint_label="backlinks",
        )

    # ==================================================================
    # 9. Referring Domains
    # ==================================================================

    async def referring_domains(
        self,
        target: str,
        limit: int = 20,
    ) -> dict[str, Any]:
        """
        Get referring domains for a target.

        Items contain: domain_from, rank, backlinks_total, etc.
        """
        payload = [
            {
                "target": target,
                "limit": limit,
            }
        ]
        return await self._request(
            "POST",
            "/v3/backlinks/referring_domains/live",
            payload,
            endpoint_label="referring_domains",
        )

    # ==================================================================
    # 10. Google Organic SERP
    # ==================================================================

    async def google_organic_serp(
        self,
        keyword: str,
        location_code: int = VIETNAM_LOCATION_CODE,
        language_code: str = VIETNAM_LANGUAGE_CODE,
        device: str = "desktop",
        os: str = "windows",
        depth: int = 100,
    ) -> dict[str, Any]:
        """
        Fetch organic SERP results for a keyword.

        Items contain: organic (list of SERP result items with url,
        title, rank_absolute, etc.).
        """
        payload = [
            {
                "keyword": keyword,
                "location_code": location_code,
                "language_code": language_code,
                "device": device,
                "os": os,
                "depth": depth,
            }
        ]
        return await self._request(
            "POST",
            "/v3/serp/google/organic/live/advanced",
            payload,
            endpoint_label="google_organic_serp",
        )


# ---------------------------------------------------------------------------
# Vietnamese diacritics enrichment
# ---------------------------------------------------------------------------

_VIET_DIACRITICS: dict[str, str] = {
    "thiet ke": "thiết kế",
    "cong ty": "công ty",
    "dich vu": "dịch vụ",
    "gia re": "giá rẻ",
    "tot nhat": "tốt nhất",
    "ha noi": "hà nội",
    "ho chi minh": "hồ chí minh",
    "da nang": "đà nẵng",
    "sai gon": "sài gòn",
    "mua sam": "mua sắm",
    "truc tuyen": "trực tuyến",
    "ban hang": "bán hàng",
    "kinh doanh": "kinh doanh",
    "quang cao": "quảng cáo",
    "tiep thi": "tiếp thị",
    "noi dung": "nội dung",
    "san pham": "sản phẩm",
    "khach hang": "khách hàng",
    "thuong hieu": "thương hiệu",
    "so sanh": "so sánh",
    "danh gia": "đánh giá",
    "huong dan": "hướng dẫn",
    "lam the nao": "làm thế nào",
    "la gi": "là gì",
    "nhu the nao": "như thế nào",
    "toi uu": "tối ưu",
    "phan mem": "phần mềm",
    "ung dung": "ứng dụng",
    "cong nghe": "công nghệ",
    "dien thoai": "điện thoại",
    "may tinh": "máy tính",
    "bat dong san": "bất động sản",
    "nha dat": "nhà đất",
    "cho thue": "cho thuê",
    "du lich": "du lịch",
    "khach san": "khách sạn",
    "nha hang": "nhà hàng",
    "am thuc": "ẩm thực",
    "mon an": "món ăn",
    "suc khoe": "sức khỏe",
    "giao duc": "giáo dục",
    "dao tao": "đào tạo",
    "tuyen dung": "tuyển dụng",
    "viec lam": "việc làm",
    "ngan hang": "ngân hàng",
    "tai chinh": "tài chính",
    "bao hiem": "bảo hiểm",
    "dau tu": "đầu tư",
    "chung khoan": "chứng khoán",
    "xe may": "xe máy",
    "o to": "ô tô",
    "xe hoi": "xe hơi",
    "thoi trang": "thời trang",
    "quan ao": "quần áo",
    "giay dep": "giày dép",
    "lam dep": "làm đẹp",
    "my pham": "mỹ phẩm",
    "cham soc": "chăm sóc",
    "noi that": "nội thất",
    "xay dung": "xây dựng",
    "sua chua": "sửa chữa",
    "van chuyen": "vận chuyển",
    "giao hang": "giao hàng",
    "mien phi": "miễn phí",
    "khuyen mai": "khuyến mại",
    "giam gia": "giảm giá",
    "uy tin": "uy tín",
    "chat luong": "chất lượng",
    "chuyen nghiep": "chuyên nghiệp",
    "pho bien": "phổ biến",
    "xu huong": "xu hướng",
    "moi nhat": "mới nhất",
    "viet nam": "việt nam",
    "thanh pho": "thành phố",
    "doanh nghiep": "doanh nghiệp",
    "cua hang": "cửa hàng",
    "trang web": "trang web",
    "kiem tien": "kiếm tiền",
    "phat trien": "phát triển",
    "quan ly": "quản lý",
    "he thong": "hệ thống",
    "giai phap": "giải pháp",
    "tu van": "tư vấn",
    "ho tro": "hỗ trợ",
    "lien he": "liên hệ",
    "dang ky": "đăng ký",
    "tai khoan": "tài khoản",
    "bai viet": "bài viết",
    "tin tuc": "tin tức",
    "hinh anh": "hình ảnh",
    "the thao": "thể thao",
    "bong da": "bóng đá",
    "tre em": "trẻ em",
    "gia dinh": "gia đình",
    "doi song": "đời sống",
    "cach": "cách",
    "hoc": "học",
    "tai": "tại",
    "luong": "lương",
    "nam": "năm",
    "toc": "tóc",
}

_sorted_viet_keys: list[str] | None = None


def _get_sorted_keys() -> list[str]:
    global _sorted_viet_keys
    if _sorted_viet_keys is None:
        _sorted_viet_keys = sorted(_VIET_DIACRITICS.keys(), key=len, reverse=True)
    return _sorted_viet_keys


def add_vietnamese_diacritics(keyword: str) -> str:
    """Best-effort conversion of non-diacritics Vietnamese to diacritics."""
    if not keyword:
        return keyword
    result = keyword.lower()
    for key in _get_sorted_keys():
        if key in result:
            result = result.replace(key, _VIET_DIACRITICS[key])
    return result


def enrich_keywords_vietnamese(data: dict) -> dict:
    """Walk a DataForSEO result dict, adding 'keyword_vi' next to 'keyword'."""
    if not isinstance(data, dict):
        return data
    items = data.get("items", [])
    if not isinstance(items, list):
        return data
    for item in items:
        if not isinstance(item, dict):
            continue
        inner_items = item.get("items", [])
        if isinstance(inner_items, list):
            for inner in inner_items:
                if isinstance(inner, dict) and "keyword" in inner:
                    inner["keyword_vi"] = add_vietnamese_diacritics(inner["keyword"])
                kd = inner.get("keyword_data") if isinstance(inner, dict) else None
                if isinstance(kd, dict) and "keyword" in kd:
                    kd["keyword_vi"] = add_vietnamese_diacritics(kd["keyword"])
        if "keyword" in item:
            item["keyword_vi"] = add_vietnamese_diacritics(item["keyword"])
        kd = item.get("keyword_data")
        if isinstance(kd, dict) and "keyword" in kd:
            kd["keyword_vi"] = add_vietnamese_diacritics(kd["keyword"])
        seed = item.get("seed_keyword")
        if isinstance(seed, str):
            item["seed_keyword_vi"] = add_vietnamese_diacritics(seed)
    return data


# ---------------------------------------------------------------------------
# Module-level singleton for convenience
# ---------------------------------------------------------------------------
dataforseo_service = DataForSEOService()
