from app.services.gemini_service import llm
from app.schemas.planner_schema import PlannerSchema

structured_llm = llm.with_structured_output(
    PlannerSchema
)


def planner_agent(state):

    prompt = f"""
    You are the Planner Agent.

    Break goals into executable subtasks.

    Tasks:

    {state["tasks"]}
    """

    plan = structured_llm.invoke(prompt)

    state["plan"] = plan.model_dump()

    return state