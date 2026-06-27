from pydantic import BaseModel


class ReasoningStep(BaseModel):
    agent: str

    decision: str

    confidence: int

    reasoning: str