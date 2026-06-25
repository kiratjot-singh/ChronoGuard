from app.services.gemini_service import llm
from app.schemas.simulator_schema import SimulatorSchema

structured_llm = llm.with_structured_output(
    SimulatorSchema
)


def simulator_agent(state):

    prompt = f"""
    You are the Future Simulator Agent.

    User Profile

    {state["profile"]}

    Tasks

    {state["tasks"]}

    Risk

    {state["risk"]}

    Simulate three futures.

    Future A

    Current behavior

    Future B

    AI optimized

    Future C

    Aggressive optimization
    """

    simulation = structured_llm.invoke(prompt)

    state["simulation"] = simulation.model_dump()

    return state