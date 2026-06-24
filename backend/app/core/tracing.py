import os
from langfuse import get_client

# Instantiate the Langfuse client based on env variables
def get_langfuse_client():
    if os.getenv("LANGFUSE_PUBLIC_KEY") and os.getenv("LANGFUSE_SECRET_KEY"):
        return get_client()
    return None

langfuse_client = get_langfuse_client()

# Keep a dummy handler for places that might still try to import langfuse_handler 
# to avoid breaking other files temporarily
langfuse_handler = None
