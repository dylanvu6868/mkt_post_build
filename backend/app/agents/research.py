from typing import Any

from app.agents.base import generate_structured
from app.schemas.agents import Research

SYSTEM = (
    "You are a market research analyst. Given a product brief and marketing goal, "
    "return structured research: pain points, customer motivations, product "
    "benefits, and a short industry context."
)


async def research(state: dict[str, Any]) -> dict[str, Any]:
    brief = state["brief"]
    if not state.get("provider_available"):
        return {
            "research": Research(
                pain_points=[f"Buyers find it hard to choose the right {brief}."],
                customer_motivations=[
                    "Save time",
                    "Trust the brand",
                    "Get value for money",
                ],
                product_benefits=["High quality", "Easy to use", "Affordable"],
                industry_context=f"Demand for {brief} is growing steadily.",
            ).model_dump()
        }
    user = f"Product/brief: {brief}\nMarketing goal: {state.get('marketing_goal', '')}"
    result = await generate_structured("fast", SYSTEM, user, Research)
    return {"research": result.model_dump()}
