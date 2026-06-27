from pydantic import BaseModel
from typing import List


class PlannerSchema(BaseModel):

    subtasks: List[str]

    confidence: int

    reasoning: str