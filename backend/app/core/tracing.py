import os
from dotenv import load_dotenv

load_dotenv() # Ensure .env is loaded into os.environ

try:
    from langfuse import Langfuse
    from langfuse.callback import CallbackHandler
except ImportError:
    Langfuse = None
    CallbackHandler = None

# Instantiate the Langfuse client based on env variables
def get_langfuse_client():
    if Langfuse and os.getenv("LANGFUSE_PUBLIC_KEY") and os.getenv("LANGFUSE_SECRET_KEY"):
        host = os.getenv("LANGFUSE_HOST", os.getenv("LANGFUSE_BASE_URL", "https://cloud.langfuse.com"))
        return Langfuse(host=host)
    return None

langfuse_client = get_langfuse_client()

if CallbackHandler and os.getenv("LANGFUSE_PUBLIC_KEY") and os.getenv("LANGFUSE_SECRET_KEY"):
    host = os.getenv("LANGFUSE_HOST", os.getenv("LANGFUSE_BASE_URL", "https://cloud.langfuse.com"))
    langfuse_handler = CallbackHandler(host=host)
else:
    langfuse_handler = None
