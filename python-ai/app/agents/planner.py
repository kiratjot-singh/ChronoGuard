from app.services.gemini_service import llm
from app.schemas.planner_schema import PlannerSchema
from app.utils.reasoning import add_reasoning
from app.tools.calendar_tool import calendar_tool

structured_llm = llm.with_structured_output(
    PlannerSchema
)


def planner_agent(state):

    # Fetch real upcoming calendar events using the Calendar Tool if not provided in request state
    calendar_events = state.get("calendar_events")
    if calendar_events is None:
        calendar_events = calendar_tool.invoke({"action": "read_events"})

    learning_profile = state.get("learning_profile", {})

    prompt = f"""
You are ChronoGuard's Planner Agent.

Your job is to convert high-level goals into clear, executable subtasks, incorporating user behavioral preferences.

Google Calendar Upcoming Busy Slots:
{calendar_events}

Tasks:
{state["tasks"]}

User Learning Profile & Preferences:
- Preferred focus periods: {learning_profile.get("preferred_work_hours", ["night"])}
- Preferred focus blocks: {learning_profile.get("preferred_focus_blocks", [])}
- Max continuous focus block: {learning_profile.get("max_continuous_work", 4.0)} hours

Rules:
- Break each task into small actionable steps.
- Order them logically.
- Recommend target start windows aligned with their preferred work hours (e.g., if night is preferred, suggest late evening slots like 9 PM instead of morning 8 AM).
- Do not create a rigid hourly calendar schedule, but note focus slot recommendations.
- Return concise subtasks.
"""

    result = structured_llm.invoke(prompt)

    state["plan"] = {
        "subtasks": result.subtasks,
        "preferred_focus_blocks": learning_profile.get("preferred_focus_blocks", [])
    }

    add_reasoning(
        state,
        agent="Planner Agent",
        decision=f"Created {len(result.subtasks)} subtasks",
        confidence=result.confidence,
        reasoning=result.reasoning,
    )

    return state