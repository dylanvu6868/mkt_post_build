import os
from langchain_core.tools import tool
from pydantic import BaseModel, Field

# We use the official TavilyClient to expose all its advanced capabilities
try:
    from tavily import TavilyClient
except ImportError:
    TavilyClient = None

def _get_tavily_client():
    api_key = os.getenv("TAVILY_API_KEY")
    if not api_key:
        return None
    if TavilyClient is None:
        return None
    return TavilyClient(api_key=api_key)

@tool
def tavily_search(query: str) -> str:
    """Sử dụng Tavily để tìm kiếm web (Search). 
    Trả về các kết quả tìm kiếm nâng cao cho câu truy vấn.
    """
    client = _get_tavily_client()
    if not client:
        return "Tavily API key is missing or tavily-python is not installed."
    try:
        response = client.search(query)
        return str(response)
    except Exception as e:
        return f"Error during search: {str(e)}"

@tool
def tavily_extract(url: str) -> str:
    """Sử dụng Tavily để trích xuất nội dung từ một URL cụ thể (Extract).
    Rất hữu ích để đọc nội dung bài viết, wikipedia, hoặc tài liệu.
    """
    client = _get_tavily_client()
    if not client:
        return "Tavily API key is missing or tavily-python is not installed."
    try:
        response = client.extract(urls=[url])
        return str(response)
    except Exception as e:
        return f"Error during extract: {str(e)}"

@tool
def tavily_crawl(url: str, instructions: str) -> str:
    """Sử dụng Tavily để cào dữ liệu từ một website (Crawl) dựa trên hướng dẫn.
    Ví dụ instructions: 'Find all pages on the Python SDK'.
    """
    client = _get_tavily_client()
    if not client:
        return "Tavily API key is missing or tavily-python is not installed."
    try:
        response = client.crawl(url, instructions=instructions)
        return str(response)
    except Exception as e:
        return f"Error during crawl: {str(e)}"

@tool
def tavily_map(url: str) -> str:
    """Sử dụng Tavily để lập bản đồ (Map) một website.
    Trả về cấu trúc sitemap hoặc danh sách các trang thuộc domain đó.
    """
    client = _get_tavily_client()
    if not client:
        return "Tavily API key is missing or tavily-python is not installed."
    try:
        # Note: Depending on Tavily SDK version, map might be supported.
        # Fallback to search if map is not natively supported in older SDKs.
        if hasattr(client, 'map'):
            response = client.map(url)
            return str(response)
        else:
            return "map() is not supported in the current version of tavily-python."
    except Exception as e:
        return f"Error during map: {str(e)}"

@tool
def tavily_research(query: str) -> str:
    """Sử dụng Tavily để thực hiện nghiên cứu chuyên sâu (Research).
    Trả về một báo cáo nghiên cứu chi tiết và tổng hợp về chủ đề được cung cấp.
    """
    client = _get_tavily_client()
    if not client:
        return "Tavily API key is missing or tavily-python is not installed."
    try:
        # Note: In older SDKs, research might be an alias or not present.
        # If not present, we will fallback to advanced search.
        if hasattr(client, 'research'):
            response = client.research(query)
            return str(response)
        else:
            response = client.search(query, search_depth="advanced")
            return str(response)
    except Exception as e:
        return f"Error during research: {str(e)}"

def get_tavily_advanced_tools():
    """Returns the list of advanced Tavily tools."""
    return [tavily_search, tavily_extract, tavily_crawl, tavily_map, tavily_research]
