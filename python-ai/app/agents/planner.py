from app.services.gemini_service import llm
from app.schemas.planner_schema import PlannerSchema
from app.utils.reasoning import add_reasoning
from app.tools.calendar_tool import calendar_tool

structured_llm = llm.with_structured_output(
    PlannerSchema
)


def planner_agent(state):

    # Fetch real upcoming calendar events using the Calendar Tool
    calendar_events = calendar_tool.invoke({"action": "read_events"})

    prompt = f"""
You are ChronoGuard's Planner Agent.

Your job is to convert high-level goals into clear, executable subtasks. You must keep the user's current Google Calendar availability in mind.

Google Calendar Upcoming Busy Slots:
{calendar_events}

Tasks:
{state["tasks"]}

Rules:
- Break each task into small actionable steps.
- Order them logically.
- Do not create a schedule.
- Return concise subtasks.
"""

    result = structured_llm.invoke(prompt)

    state["plan"] = {
        "subtasks": result.subtasks
    }

    add_reasoning(
        state,
        agent="Planner Agent",
        decision=f"Created {len(result.subtasks)} subtasks",
        confidence=result.confidence,
        reasoning=result.reasoning,
    )

    return state