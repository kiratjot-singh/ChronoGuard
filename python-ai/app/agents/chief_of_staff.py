from app.services.gemini_service import llm
from app.utils.reasoning import add_reasoning
from pydantic import BaseModel, Field

class ChiefOfStaffSchema(BaseModel):
    executive_brief: str = Field(description="The final compiled Executive Brief under 120 words.")
    confidence: int
    reasoning: str

structured_llm = llm.with_structured_output(ChiefOfStaffSchema)

def chief_of_staff_agent(state):
    # Load state details
    profile = state.get("profile", {})
    plan = state.get("plan", {})
    risk = state.get("risk", {})
    simulation = state.get("simulation", {})
    negotiation = state.get("negotiation", {})
    decision = state.get("decision_engine", {})
    tasks = state.get("tasks", [])
    learning_profile = state.get("learning_profile", {})

    prompt = f"""
You are ChronoGuard's Chief of Staff. You are the ONLY personality the user interacts with.
Your job is to read outputs from all agents and compile ONE final unified Executive Brief.

Input state:
- Digital Twin User profile: {profile}
- Planner: {plan}
- Risk Analysis: {risk}
- Simulator: {simulation}
- Negotiator: {negotiation}
- Decision Engine state: {decision}
- Base Tasks list: {tasks}
- Inferred User Preferences and Habits: {learning_profile}

Write the brief answering these four questions:
1. What is today's most important task?
2. Am I likely to miss anything?
3. What did ChronoGuard already do?
4. Do I need to approve anything?

Writing Style & Personalization rules:
- Keep it STRICTLY under 120 words.
- Use natural, professional, calm, and friendly language.
- Speak directly as a human executive assistant (e.g. "I found a scheduling conflict...").
- Do NOT expose any internal implementation details (scores, probabilities, agent names, LLM, workflow).
- Start exactly with "Good Morning."
- **ADAPTIVE PERSONALIZATION (CRITICAL)**: Instead of generic advice, customize statements based on the user's preferences. For example: "I've scheduled your study blocks for 9 PM because you consistently perform well during late evening sessions." Reference their habits (e.g., preference for night focus blocks) naturally.
"""

    result = structured_llm.invoke(prompt)

    state["executive_brief"] = result.executive_brief
    state["chief_of_staff"] = {
        "executive_brief": result.executive_brief
    }

    add_reasoning(
        state,
        agent="Chief of Staff",
        decision="Compiled final adaptive executive brief for dashboard.",
        confidence=result.confidence,
        reasoning=result.reasoning,
    )

    return state
