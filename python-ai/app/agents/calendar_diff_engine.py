from app.services.gemini_service import llm
from app.utils.reasoning import add_reasoning
from pydantic import BaseModel, Field
from typing import List, Optional

class DiffItem(BaseModel):
    title: str = Field(description="Title of the event or task")
    task_title: str = Field(description="Duplicate of title for legacy compatibility")
    category: str = Field(description="Must be exactly one of: ADD, MOVE, UPDATE, REMOVE, KEEP, MERGE")
    current_date: str = Field(default="", description="Original date descriptor")
    current_time: str = Field(default="", description="Original start-end time range (e.g. 10:00 AM - 12:00 PM)")
    new_date: str = Field(default="", description="Proposed new date descriptor")
    new_time: str = Field(default="", description="Proposed new start-end time range")
    estimated_duration: str = Field(default="", description="Duration in hours or minutes")
    reason: str = Field(description="Why this change is suggested")
    expected_benefit: str = Field(description="Brief explanation of expected improvements, e.g. Stress: Reduced, Completion: Increased.")
    confidence: int = Field(description="Confidence percentage (0-100)")
    source: str = Field(description="AI Planner, Gmail, Calendar, or User override")
    priority: str = Field(default="medium", description="Priority of the task: high, medium, or low")
    approval_required: str = Field(default="YES", description="Whether user approval is required: YES or NO")

class DiffSummary(BaseModel):
    events_added: int
    events_moved: int
    events_updated: int
    events_removed: int
    events_merged: int
    estimated_completion_improvement: str = Field(description="Completion rate change, e.g. 61% -> 89%")
    total_free_time_preserved: str = Field(description="e.g. 2 Hours")
    conflicts_removed: int
    approval_required: str = Field(description="YES or NO")

class CalendarDiffSchema(BaseModel):
    changes: List[DiffItem] = Field(description="List of classified proposed changes")
    summary: DiffSummary = Field(description="Summary section counts and metrics")
    confidence: int
    reasoning: str

structured_llm = llm.with_structured_output(CalendarDiffSchema)

def calendar_diff_agent(state):
    # Load inputs
    calendar_events = state.get("calendar_events", [])
    tasks = state.get("tasks", [])
    decision = state.get("decision_engine", {})
    approvals = decision.get("approvals", [])
    
    prompt = f"""
You are ChronoGuard's Calendar Diff Engine.
Your job is to compare the User's Current Calendar/Tasks against the Optimized Calendar proposed by the Decision Engine, and generate a classified preview dataset.

Inputs:
- Current Calendar Events: {calendar_events}
- Current Tasks list: {tasks}
- Decision Engine Approvals: {approvals}

Rules:
1. Diff Comparison:
   Compare the current state against proposed approvals and classify EVERY proposed modification. Also include KEEP items for fixed calendar events (like Interviews or Classes) that remain unchanged.
   
2. Classification Categories:
   Classify each modification into EXACTLY one of these categories:
   - ADD: New task focus block to be created.
   - MOVE: Existing calendar event or task focus block shifted to another time.
   - UPDATE: Metadata or details of an existing scheduled item updated.
   - REMOVE: Duplicate event or task focus block to be removed.
   - KEEP: Event remains unchanged (fixed commitments like Interviews or Classes).
   - MERGE: Duplicate commitment from Gmail and Calendar combined.

3. Field Values:
   For every proposed event, populate:
   - title: The name of the event or task.
   - task_title: Identical to title.
   - category: Exactly one of the categories above.
   - current_date and current_time: The current date and start-end time (e.g., '10:00 AM - 12:00 PM') if scheduled, else empty.
   - new_date and new_time: The proposed date and start-end time.
   - estimated_duration: Duration (e.g., '2 Hours' or '30 Minutes').
   - reason: Explain what changed and why.
   - expected_benefit: What improves (e.g. Higher interview readiness).
   - confidence: Integer between 0 and 100.
   - source: e.g. 'Planner', 'Decision Engine', 'Gmail', or 'Calendar'.
   - priority: The priority of the event (high, medium, low).
   - approval_required: 'YES' or 'NO' (e.g., 'YES' for ADD, MOVE, REMOVE, MERGE; 'NO' for KEEP).

4. Generate Summary:
   Generate a summary section counting changes by category, calculating conflicts removed, total free time preserved, and completion rate improvements. Set approval_required to YES if there are any ADD, MOVE, REMOVE, or MERGE changes.
"""

    result = structured_llm.invoke(prompt)

    state["calendar_diff"] = {
        "changes": [c.model_dump() for c in result.changes],
        "summary": result.summary.model_dump()
    }

    add_reasoning(
        state,
        agent="Calendar Diff Engine",
        decision=f"Generated diff containing {len(result.changes)} modifications and summary.",
        confidence=result.confidence,
        reasoning=result.reasoning,
    )

    return state
