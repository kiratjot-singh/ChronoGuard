from app.services.gemini_service import llm
from app.schemas.simulator_schema import SimulatorSchema
from app.utils.reasoning import add_reasoning

structured_llm = llm.with_structured_output(
    SimulatorSchema
)


def simulator_agent(state):

    prompt = f"""
You are ChronoGuard's Future Simulation Agent.

Your responsibility is to predict possible future outcomes.

User Profile:
{state["profile"]}

Execution Plan:
{state["plan"]}

Risk Analysis:
{state["risk"]}

Generate three future scenarios.

Future A
Current behaviour.

Future B
Follow the AI recommendations.

Future C
Aggressive optimisation.

Rules:

- Be realistic.
- Keep each future under 80 words.
- Mention consequences.
"""

    result = structured_llm.invoke(prompt)

    state["simulation"] = {
        "future_a": result.future_a,
        "future_b": result.future_b,
        "future_c": result.future_c,
    }

    add_reasoning(
        state,
        agent="Future Simulator",
        decision="Generated three future scenarios",
        confidence=result.confidence,
        reasoning=result.reasoning,
    )

    return state