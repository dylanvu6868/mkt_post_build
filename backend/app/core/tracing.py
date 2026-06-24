import os
from langfuse.langchain import CallbackHandler

def get_langfuse_handler():
    # Langfuse v4 reads LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY, LANGFUSE_HOST from env automatically
    if os.getenv("LANGFUSE_PUBLIC_KEY") and os.getenv("LANGFUSE_SECRET_KEY"):
        return CallbackHandler(public_key=os.getenv("LANGFUSE_PUBLIC_KEY"))
    return None

langfuse_handler = get_langfuse_handler()
