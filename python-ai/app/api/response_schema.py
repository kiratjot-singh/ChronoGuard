from pydantic import BaseModel
from typing import Dict, List


class AnalyzeResponse(BaseModel):

    profile: Dict

    plan: Dict

    risk: Dict

    simulation: Dict

    negotiation: Dict

    reasoning: List[Dict]