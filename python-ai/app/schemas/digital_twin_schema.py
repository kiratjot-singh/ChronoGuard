from pydantic import BaseModel
from typing import List


class DigitalTwinSchema(BaseModel):
    focus_score: int
    procrastination_score: int
    completion_rate: int
    preferred_work_hours: List[str]