from app.services.gemini_service import llm
from app.schemas.risk_schema import RiskSchema
from app.utils.reasoning import add_reasoning

structured_llm = llm.with_structured_output(RiskSchema)


def risk_agent(state):

    prompt = f"""
You are ChronoGuard's Risk Prediction Agent.

Your responsibility is to evaluate whether the user's current plan is safe.

User Profile:
{state["profile"]}

Planned Tasks:
{state["plan"]}

Original Tasks:
{state["tasks"]}

Analyze and return:

1. risk_score (0-100) - Internal metric representing overall completion risk.
2. completion_probability (0-100) - Internal metric.
3. stress_score (0-100) - Internal metric.
4. requires_simulation (True if future simulation would help)
5. requires_negotiation (True if schedule changes are necessary)
6. confidence (0-100)
7. reason - Internal engineering explanation.
8. at_risk - Answer clearly: What task or deadline is at risk? (Do NOT mention metrics or scores).
9. why - Answer clearly: Why is it at risk? Reference real calendar and task data.
10. what_happens - Answer clearly: What happens if nothing changes?
11. how_to_fix - Answer clearly: How can it be fixed?
12. human_summary - A simplified, consolidated summary text (e.g. "You're likely to miss your Hackathon documentation because your evening is already occupied by interview preparation. Moving documentation to tonight removes the conflict."). Make it feel human, calm, and simple.

Be conservative.

If the schedule looks risky,
enable simulation.

If the current schedule is unlikely to succeed,
enable negotiation.
"""

    result = structured_llm.invoke(prompt)

    state["risk"] = {
        "risk_score": result.risk_score,
        "completion_probability": result.completion_probability,
        "stress_score": result.stress_score,
        "requires_simulation": result.requires_simulation,
        "requires_negotiation": result.requires_negotiation,
        "at_risk": result.at_risk,
        "why": result.why,
        "what_happens": result.what_happens,
        "how_to_fix": result.how_to_fix,
        "human_summary": result.human_summary,
    }

    add_reasoning(
        state,
        agent="Risk Agent",
        decision=f"Calculated Risk Score = {result.risk_score}",
        confidence=result.confidence,
        reasoning=result.reason,
    )

    return state