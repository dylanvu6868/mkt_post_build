from langchain_core.tools import tool
from pydantic import BaseModel, Field

@tool
def calculate_marketing_metric(metric: str, spend: float = None, revenue: float = None, customers: int = None, cogs: float = None) -> str:
    """Tính toán các chỉ số marketing chuyên dụng (ROI, ROAS, CAC, LTV).
    Cần cung cấp metric (tên chỉ số: 'roi', 'roas', 'cac', 'ltv') và các tham số tương ứng.
    """
    metric = metric.lower()
    if metric == "roi":
        if spend is None or revenue is None:
            return "Thiếu thông tin chi phí (spend) hoặc doanh thu (revenue) để tính ROI."
        cogs = cogs or 0.0
        profit = revenue - spend - cogs
        roi = (profit / spend) * 100
        return f"ROI (Tỷ suất hoàn vốn) = {roi:.2f}% (Công thức: (Doanh thu - Chi phí - Giá vốn) / Chi phí * 100)"
    elif metric == "roas":
        if spend is None or revenue is None:
            return "Thiếu thông tin chi phí quảng cáo (spend) hoặc doanh thu (revenue) để tính ROAS."
        roas = revenue / spend
        return f"ROAS (Lợi tức trên chi phí quảng cáo) = {roas:.2f}x (Công thức: Doanh thu / Chi phí quảng cáo)"
    elif metric == "cac":
        if spend is None or customers is None:
            return "Thiếu thông tin chi phí (spend) hoặc số khách hàng (customers) để tính CAC."
        cac = spend / customers
        return f"CAC (Chi phí thu hút một khách hàng) = {cac:,.0f} (Công thức: Chi phí Marketing / Số khách hàng mới)"
    elif metric == "ltv":
        if revenue is None or customers is None:
            return "Thiếu doanh thu tổng (revenue) hoặc số khách hàng (customers) để tính LTV trung bình."
        ltv = revenue / customers
        return f"LTV (Giá trị vòng đời khách hàng trung bình) = {ltv:,.0f} (Công thức: Tổng doanh thu / Tổng số khách hàng)"
    
    return f"Metric '{metric}' không được hỗ trợ. Các chỉ số hỗ trợ: roi, roas, cac, ltv."

from langchain_community.tools.tavily_search import TavilySearchResults
import os

def get_search_tool():
    """Returns Tavily search tool if API key is present."""
    if os.getenv("TAVILY_API_KEY"):
        return TavilySearchResults(max_results=3, search_depth="advanced")
    
    @tool
    def fallback_search(query: str) -> str:
        """Công cụ tìm kiếm giả lập (do chưa có TAVILY_API_KEY)."""
        return f"Không thể tìm kiếm '{query}' do hệ thống chưa cấu hình TAVILY_API_KEY."
    
    return fallback_search

def get_marketing_tools():
    return [calculate_marketing_metric, get_search_tool()]
