from app.services.gemini_service import llm
from app.schemas.simulator_schema import SimulatorSchema
from app.utils.reasoning import add_reasoning

structured_llm = llm.with_structured_output(
    SimulatorSchema
)


def simulator_agent(state):

    prompt = f"""
You are ChronoGuard's Future Simulation Agent.

Your responsibility is to predict possible future outcomes and compare scenarios.

User Profile:
{state["profile"]}

Execution Plan:
{state["plan"]}

Risk Analysis:
{state["risk"]}

Compare three plans:
1. Current Plan (no modifications)
2. AI Optimized Plan (applying suggestions)
3. Aggressive Plan (maximizing tasks completed at the cost of buffer/stress)

For each plan, you must output a structured comparison with the following exact metrics:
- Completion Rate (0-100%)
- Stress Level (0-100%)
- Sleep Hours (hours, e.g. 7.5)
- Confidence (0-100%)
- Time Remaining (hours left for leisure or deep focus)
- description (under 60 words, realistic description of the daily outcome, no fantasy scenarios)

Rules:
- Be realistic and conservative.
- Align metrics with the risk analysis details.
"""

    result = structured_llm.invoke(prompt)

    state["simulation"] = {
        "current_plan": result.current_plan.model_dump(),
        "ai_optimized_plan": result.ai_optimized_plan.model_dump(),
        "aggressive_plan": result.aggressive_plan.model_dump(),
    }

    add_reasoning(
        state,
        agent="Future Simulator",
        decision="Generated three future scenarios",
        confidence=result.confidence,
        reasoning=result.reasoning,
    )

    return state