from app.services.gemini_service import llm
from app.schemas.risk_schema import RiskSchema

structured_llm = llm.with_structured_output(RiskSchema)


def risk_agent(state):

    prompt = f"""
    You are the Risk Prediction Agent.

    User Profile:

    {state["profile"]}

    Planned Tasks:

    {state["plan"]}

    Original Tasks:

    {state["tasks"]}

    Calculate:

    1. Deadline Risk (0-100)
    2. Completion Probability (0-100)
    3. Stress Score (0-100)

    Explain why.
    """

    risk = structured_llm.invoke(prompt)

    state["risk"] = risk.model_dump()

    return state