from app.services.gemini_service import llm
from app.schemas.digital_twin_schema import DigitalTwinSchema


structured_llm = llm.with_structured_output(
    DigitalTwinSchema
)


def digital_twin_agent(state):

    prompt = f"""
    You are the Digital Twin Agent.

    Analyze user productivity behavior.

    Determine:

    - focus score (0-100)
    - procrastination score (0-100)
    - completion rate (0-100)
    - preferred work hours

    User History:

    {state["history"]}
    """

    profile = structured_llm.invoke(prompt)

    state["profile"] = profile.model_dump()

    return state