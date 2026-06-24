import os
from langfuse.langchain import CallbackHandler
from app.core.config import settings

def get_langfuse_handler():
    # Only initialize if keys are present
    if os.getenv("LANGFUSE_PUBLIC_KEY") and os.getenv("LANGFUSE_SECRET_KEY"):
        return CallbackHandler(
            public_key=os.getenv("LANGFUSE_PUBLIC_KEY"),
            secret_key=os.getenv("LANGFUSE_SECRET_KEY"),
            host=os.getenv("LANGFUSE_HOST", "https://cloud.langfuse.com")
        )
    return None

langfuse_handler = get_langfuse_handler()
