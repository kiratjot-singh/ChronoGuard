from app.services.gemini_service import llm
from app.utils.reasoning import add_reasoning
from pydantic import BaseModel, Field
from typing import List, Optional
from app.learning.learning_service import learning_service

class ApprovalItem(BaseModel):
    task_title: str = Field(description="Title of the task to be rescheduled")
    current_time: str = Field(description="Current start time (formatted text)")
    suggested_time: str = Field(description="Suggested start time (formatted text)")
    reason: str = Field(description="Human explanation of why this reschedule is suggested")
    expected_benefit: str = Field(description="Concrete natural language benefit statement (e.g., increases completion chances from moderate to high). Do NOT expose raw metrics like 'risk score 78%'.")
    confidence: int = Field(description="Confidence percentage (0-100)")

class CategorizedTask(BaseModel):
    title: str = Field(description="Title of the task")
    category: str = Field(description="Category: 'Do Now', 'Due Soon', or 'Can Wait'")
    reason: str = Field(description="Attributed reason for priority")
    deadline: str = Field(description="Deadline descriptor")
    estimated_hours: float = Field(description="Estimated duration in decimal hours")
    priority: str = Field(description="Priority: high, medium, low")
    calendar_source: str = Field(description="Origin: Gmail, Google Calendar, or Manual")
    confidence: int = Field(description="Confidence percentage (0-100)")

class DecisionNotification(BaseModel):
    message: str = Field(description="Natural language alert message")
    severity: str = Field(description="Severity: critical, important, information, silent")
    title: str = Field(description="Title of the notification")

class DecisionEngineSchema(BaseModel):
    approvals: List[ApprovalItem] = Field(description="Proposed schedule adaptations for the approval queue.")
    dashboard_tasks: List[CategorizedTask] = Field(description="All tasks categorized. Limit to max 3 'Do Now' and 3 'Due Soon'.")
    notifications: List[DecisionNotification] = Field(description="Actionable notifications with severity classification.")
    one_primary_recommendation: Optional[str] = Field(None, description="The single highest-impact recommendation for the dashboard (>80% confidence).")
    details_recommendations: List[str] = Field(description="Other recommendations of moderate confidence (60-80%) to display in details.")
    already_done_actions: List[str] = Field(description="Proactive actions accomplished in this run (e.g. checked calendar, read emails, deduplicated tasks).")
    learning_insights: List[str] = Field(description="Exactly three user learning insights (e.g., 'You work best after 8 PM').")
    confidence: int
    reasoning: str

structured_llm = llm.with_structured_output(DecisionEngineSchema)

def decision_engine_agent(state):
    # Load all accumulated states
    user_id = state.get("user_id", "default_user")
    profile = state.get("profile", {})
    plan = state.get("plan", {})
    risk = state.get("risk", {})
    simulation = state.get("simulation", {})
    negotiation = state.get("negotiation", {})
    tasks = state.get("tasks", [])
    calendar_events = state.get("calendar_events", [])
    
    # Load learning profile preferences
    learning_profile = state.get("learning_profile", {})

    prompt = f"""
You are ChronoGuard's Decision Engine.
Your job is to read outputs from every upstream agent and decide what the user actually sees, incorporating user preferences and learning patterns.

State Inputs:
- Digital Twin User Profile: {profile}
- Planner micro-tasks: {plan}
- Risk Analysis: {risk}
- Simulation Comparisons: {simulation}
- Negotiated Adjustments: {negotiation}
- Base Tasks list: {tasks}
- Base Calendar Events: {calendar_events}
- Inferred User Preferences: {learning_profile}

Your strict operational rules are:
1. Deduplication & Merging:
   Combine or merge similar recommendations and remove duplicates.
   
2. Confidence & Learning Ranking:
   - Rank recommendations based on deadline urgency, user preferences, and historical success.
   - Adjust confidence values dynamically: if a suggestion aligns with the user's preferred work hours ({learning_profile.get("preferred_work_hours")}), confidence should be boosted!
   - Confidence < 60: Discard/hide completely.
   - Confidence 60-80: Eligible ONLY for Details (details_recommendations). Do NOT show in primary dashboard.
   - Confidence > 80: Eligible for primary dashboard. Select ONLY the single highest-impact recommendation as `one_primary_recommendation`.

3. Task Categorization:
   Distribute all pending tasks into 'Do Now', 'Due Soon', and 'Can Wait' categories.
   - Limit: Output at most 3 'Do Now' and at most 3 'Due Soon'. Everything else belongs in 'Can Wait'.
   - Attribution: Ensure every categorized task retains its origin ('Gmail', 'Google Calendar', or 'Manual'), reason, deadline, estimated_hours, priority, and confidence.

4. Notification Severities:
   Categorize notifications:
   - 'critical': Tasks or events due TODAY (e.g. Interviews, exams, urgent bills).
   - 'important': Overlap conflicts, high workloads, or calendar suggestions.
   - 'information': Better schedule available, new email tasks discovered.
   - 'silent': Internal checks and steps.

5. "Already Done" Proactive Log:
   Formulate a list of proactive checks and tasks ChronoGuard quietly completed in the background (e.g., "Checked Calendar", "Read recent emails", "Deduplicated calendar events", etc.).

6. "Learning About You" Insights:
   - Compile EXACTLY three clear, concise insights about the user's habits (e.g., "You work best after 8 PM.", "Coding tasks finish 28% faster than documentation.", "You usually accept calendar optimizations.").
   - Draw inspiration from the user's history and current learning insights: {learning_profile.get("insights", [])}.

7. HUMAN LANGUAGE ENFORCEMENT (CRITICAL):
   Under no circumstances should any output contain system implementation jargon like 'Risk Score', 'Stress Score', 'Completion Probability', 'Agent', 'Workflow', 'Prompt', 'LLM', 'Graph', 'Node', 'Planner', 'Negotiator', 'Simulator'.
   Instead, convert them to clear, natural assistant statements.
   - Bad: "Risk Score 85%"
   - Good: "You're likely to run out of time tomorrow unless your assignment is moved to tonight."
   
   Ensure all outputs reflect a calm, professional executive assistant.
"""

    result = structured_llm.invoke(prompt)

    # Further dynamically adapt confidence of approvals using learning_service accept/reject history
    adapted_approvals = []
    for a in result.approvals:
        ad_conf = learning_service.adapt_confidence(user_id, a.confidence, a.task_title)
        a_dict = a.model_dump()
        a_dict["confidence"] = ad_conf
        adapted_approvals.append(a_dict)

    # Ensure insights has exactly 3 elements
    final_insights = result.learning_insights
    if not final_insights:
        final_insights = learning_profile.get("insights", [])
    while len(final_insights) < 3:
        final_insights.append("ChronoGuard is learning your weekly schedule preferences.")
    final_insights = final_insights[:3]

    state["decision_engine"] = {
        "approvals": adapted_approvals,
        "dashboard_tasks": [t.model_dump() for t in result.dashboard_tasks],
        "notifications": [n.model_dump() for n in result.notifications],
        "one_primary_recommendation": result.one_primary_recommendation,
        "details_recommendations": result.details_recommendations,
        "already_done_actions": result.already_done_actions,
        "learning_insights": final_insights
    }

    add_reasoning(
        state,
        agent="Decision Engine",
        decision=f"Consolidated and prioritized {len(result.dashboard_tasks)} tasks and {len(result.approvals)} approvals.",
        confidence=result.confidence,
        reasoning=result.reasoning,
    )

    return state
