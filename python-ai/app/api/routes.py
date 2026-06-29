from fastapi import APIRouter

from app.api.request_schema import AnalyzeRequest
from app.agents.supervisor import supervisor_agent, execute_workflow
from app.memory.memory_service import load_memory, update_memory

router = APIRouter()


@router.post("/analyze")
def analyze(request: AnalyzeRequest):

    # Load historical memory statistics for the user
    memory_data = load_memory(request.user_id)
    
    # Load learning preference profile
    from app.learning.learning_service import learning_service
    learning_profile = learning_service.get_preference_profile(request.user_id)

    state = {
        "user_id": request.user_id,
        "history": request.history,
        "tasks": request.tasks,
        "calendar_events": request.calendar_events,
        "emails": request.emails,
        "memory": memory_data,
        "learning_profile": learning_profile,
        "profile": {},
        "plan": {},
        "risk": {},
        "simulation": {},
        "negotiation": {},
        "reasoning": [],
    }

    # Decide which workflow to execute using the Supervisor Agent
    query = request.query or "Analyze history and create planning and simulation scenarios for my tasks"
    decision = supervisor_agent(query)

    from fastapi import HTTPException
    try:
        result = execute_workflow(decision.workflow, state)
    except Exception as e:
        err_msg = str(e)
        if "RESOURCE_EXHAUSTED" in err_msg or "429" in err_msg or "quota" in err_msg.lower():
            raise HTTPException(
                status_code=429, 
                detail="Gemini API rate limit exceeded. Please wait a few seconds and try again."
            )
        raise e

    # Add workflow classification reason to the response for observability
    result["reasoning"].append({
        "agent": "Supervisor Agent",
        "decision": f"Selected workflow: {decision.workflow}",
        "confidence": 100,
        "reasoning": decision.reason
    })

    # Merge the new profile observations back into memory if behavioral profile was updated
    if "profile" in result and result["profile"]:
        update_memory(result["profile"], request.user_id)

    return result


from pydantic import BaseModel
from typing import List, Dict, Optional, Any

class ExtractTasksRequest(BaseModel):
    emails: List[Dict]
    high_priority_keywords: Optional[List[str]] = None
    calendar_events: Optional[List[Dict]] = None

@router.post("/extract_tasks")
def extract_tasks(request: ExtractTasksRequest):
    from app.tools.gmail_tool import gmail_service
    tasks = gmail_service.extract_tasks(
        request.emails, 
        request.high_priority_keywords,
        request.calendar_events
    )
    return {"tasks": tasks}

class FeedbackRequest(BaseModel):
    user_id: str
    event_type: str
    details: Dict[str, Any]

@router.post("/learning/feedback")
def post_feedback(request: FeedbackRequest):
    from app.learning.feedback_store import feedback_store
    from app.learning.learning_service import learning_service
    feedback_store.append_event(request.user_id, request.event_type, request.details)
    profile = learning_service.update_profile_from_events(request.user_id)
    return {"status": "success", "profile": profile}