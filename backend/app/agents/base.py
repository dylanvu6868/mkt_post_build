import json
import re
from typing import TypeVar

from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import BaseModel

from app.llm.factory import get_chat_model

T = TypeVar("T", bound=BaseModel)


def _extract_json(text: str) -> dict | None:
    text = re.sub(r"```(?:json)?\s*", "", text).replace("```", "")
    m = re.search(r"arguments:\s*(\{.*)", text, re.DOTALL)
    if m:
        text = m.group(1)
    start = text.find("{")
    if start == -1:
        return None
    depth, end = 0, start
    for i in range(start, len(text)):
        if text[i] == "{":
            depth += 1
        elif text[i] == "}":
            depth -= 1
            if depth == 0:
                end = i + 1
                break
    try:
        return json.loads(text[start:end])
    except json.JSONDecodeError:
        return None


async def generate_structured(
    tier: str, system: str, user: str, schema: type[T]
) -> T:
    from app.core.config import settings
    if tier == "smart" and settings.llm_provider.lower() == "deepseek" and settings.llm_model_smart == "deepseek-reasoner":
        tier = "fast"

    llm = get_chat_model(tier)
    messages = [SystemMessage(content=system), HumanMessage(content=user)]

    try:
        return await llm.with_structured_output(schema).ainvoke(messages)
    except Exception:
        pass

    json_hint = (
        f"\n\nIMPORTANT: Return your answer as a single JSON object matching this schema — "
        f"no markdown fences, no function calls, just raw JSON:\n"
        f"{json.dumps(schema.model_json_schema(), ensure_ascii=False)}"
    )
    messages_fb = [
        SystemMessage(content=system + json_hint),
        HumanMessage(content=user),
    ]
    try:
        raw = await llm.ainvoke(messages_fb)
        text = raw.content if hasattr(raw, "content") else str(raw)
        data = _extract_json(text)
        if data:
            return schema.model_validate(data)
    except Exception as e:
        print(f"generate_structured fallback failed for {schema.__name__}: {e}")

    raise ValueError(f"Could not parse {schema.__name__} from LLM response")
