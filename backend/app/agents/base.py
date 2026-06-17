from typing import TypeVar

from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import BaseModel

from app.llm.factory import get_chat_model

T = TypeVar("T", bound=BaseModel)


async def generate_structured(
    tier: str, system: str, user: str, schema: type[T]
) -> T:
    """Call the tier's chat model and coerce the reply into `schema`."""
    llm = get_chat_model(tier).with_structured_output(schema)
    return await llm.ainvoke(
        [SystemMessage(content=system), HumanMessage(content=user)]
    )
