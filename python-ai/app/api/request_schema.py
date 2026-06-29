from pydantic import BaseModel
from typing import List, Dict, Optional


class AnalyzeRequest(BaseModel):

    user_id: str

    history: str

    tasks: List[Dict]

    calendar_events: Optional[List[Dict]] = None

    query: Optional[str] = None
    high_priority_keywords: Optional[List[str]] = None
    emails: Optional[List[Dict]] = None