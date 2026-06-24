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
        return Langfuse()
    return None

langfuse_client = get_langfuse_client()

if CallbackHandler and os.getenv("LANGFUSE_PUBLIC_KEY") and os.getenv("LANGFUSE_SECRET_KEY"):
    langfuse_handler = CallbackHandler()
else:
    langfuse_handler = None
