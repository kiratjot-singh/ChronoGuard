from app.services.gemini_service import llm
from app.schemas.digital_twin_schema import DigitalTwinSchema
from app.utils.reasoning import add_reasoning

structured_llm = llm.with_structured_output(
    DigitalTwinSchema
)


def digital_twin_agent(state):

    prompt = f"""
You are ChronoGuard's Digital Twin Agent.

Your responsibility is to build a behavioural profile of the user based on their current history and historical memory statistics.

Historical Memory Profile:
{state.get("memory", {})}

Current User History:
{state["history"]}

Analyze and determine:
1. Focus score (0-100)
2. Procrastination score (0-100)
3. Completion rate (0-100)
4. Preferred work hours
5. Procrastination patterns (e.g. "morning procrastination", "gym avoidance")

Think carefully before answering.
"""

    result = structured_llm.invoke(prompt)

    state["profile"] = {
        "focus_score": result.focus_score,
        "procrastination_score": result.procrastination_score,
        "completion_rate": result.completion_rate,
        "preferred_work_hours": result.preferred_work_hours,
        "procrastination_patterns": result.procrastination_patterns,
    }

    add_reasoning(
        state,
        agent="Digital Twin Agent",
        decision="Generated user behavioural profile",
        confidence=result.confidence,
        reasoning=result.reasoning,
    )

    return state