from typing import TypeVar

from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import BaseModel

from app.llm.factory import get_chat_model

T = TypeVar("T", bound=BaseModel)


async def generate_structured(
    tier: str, system: str, user: str, schema: type[T]
) -> T:
    """Call the tier's chat model and coerce the reply into `schema`."""
    from app.core.config import settings
    # Reasoning models do not support function calling / structured output
    if tier == "smart" and settings.llm_provider.lower() == "deepseek" and settings.llm_model_smart == "deepseek-reasoner":
        tier = "fast"
        
    llm = get_chat_model(tier).with_structured_output(schema)
    try:
        return await llm.ainvoke(
            [SystemMessage(content=system), HumanMessage(content=user)]
        )
    except Exception as e:
        import traceback
        print(f"generate_structured failed for {schema.__name__}: {e}")
        traceback.print_exc()
        raise
