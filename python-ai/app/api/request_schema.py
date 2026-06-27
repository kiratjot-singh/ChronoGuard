from pydantic import BaseModel
from typing import List, Dict, Optional


class AnalyzeRequest(BaseModel):

    user_id: str

    history: str

    tasks: List[Dict]

    query: Optional[str] = None