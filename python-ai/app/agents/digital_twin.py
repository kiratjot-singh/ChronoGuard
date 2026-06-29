from app.services.gemini_service import llm
from app.schemas.digital_twin_schema import DigitalTwinSchema
from app.utils.reasoning import add_reasoning

structured_llm = llm.with_structured_output(
    DigitalTwinSchema
)


def digital_twin_agent(state):

    prompt = f"""
You are ChronoGuard's Digital Twin Agent.

Your responsibility is to build a behavioural profile of the user based on their current history, historical memory statistics, and recent inbox emails.

Historical Memory Profile:
{state.get("memory", {})}

Current User History:
{state["history"]}

Recent User Inbox Emails:
{state.get("emails", [])}

Analyze and determine:
1. Focus score (0-100)
2. Procrastination score (0-100)
3. Completion rate (0-100)
4. Preferred work hours
5. Procrastination patterns (e.g. "morning procrastination", "gym avoidance")
6. Loss prevention advice: Read the recent user emails deeply. Identify critical professional, financial, or personal risks (such as unpaid invoices, security warnings, critical interview requests, exam test links, or expiring authorizations) that if missed or delayed would result in a significant loss or negative outcome for the user. Summarize these important points clearly and provide specific feedbacks and actionable advice to mitigate these risks.

Think carefully before answering.
"""

    result = structured_llm.invoke(prompt)

    state["profile"] = {
        "focus_score": result.focus_score,
        "procrastination_score": result.procrastination_score,
        "completion_rate": result.completion_rate,
        "preferred_work_hours": result.preferred_work_hours,
        "procrastination_patterns": result.procrastination_patterns,
        "loss_prevention_advice": result.loss_prevention_advice,
    }

    add_reasoning(
        state,
        agent="Digital Twin Agent",
        decision="Generated user behavioural profile",
        confidence=result.confidence,
        reasoning=result.reasoning,
    )

    return state