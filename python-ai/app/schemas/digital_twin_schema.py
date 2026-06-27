from pydantic import BaseModel


class DigitalTwinSchema(BaseModel):

    focus_score: int

    procrastination_score: int

    completion_rate: int

    preferred_work_hours: list[str]

    procrastination_patterns: list[str]

    confidence: int

    reasoning: str