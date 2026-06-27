from app.services.gemini_service import llm
from app.schemas.negotiator_schema import NegotiatorSchema
from app.utils.reasoning import add_reasoning
from app.tools.notification_tool import notification_tool

structured_llm = llm.with_structured_output(
    NegotiatorSchema
)


def negotiator_agent(state):

    prompt = f"""
You are ChronoGuard's Negotiation Agent.

Your goal is to maximize the user's chance of completing every task.

User Profile:
{state["profile"]}

Risk Analysis:
{state["risk"]}

Execution Plan:
{state["plan"]}

Future Simulation:
{state["simulation"]}

Generate practical schedule improvements.

Rules:
- Prioritize high-impact tasks.
- Minimize stress.
- Avoid unnecessary context switching.
- Keep suggestions actionable.
"""

    result = structured_llm.invoke(prompt)

    state["negotiation"] = {
        "changes": result.changes
    }

    # Proactively trigger a notification detailing the optimization suggestions
    if result.changes:
        notification_tool.invoke({
            "action": "send_notification",
            "params": {
                "title": "Schedule Optimized",
                "explanation": f"The AI suggested {len(result.changes)} schedule improvements to increase task success rate.",
                "changes": "; ".join(result.changes),
                "user_id": state.get("user_id", "default_user")
            }
        })

    add_reasoning(
        state,
        agent="Negotiation Agent",
        decision=f"Suggested {len(result.changes)} schedule improvements",
        confidence=result.confidence,
        reasoning=result.reasoning,
    )

    return state