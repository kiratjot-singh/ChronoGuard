from pydantic import BaseModel


class RiskSchema(BaseModel):
    risk_score: int

    completion_probability: int

    stress_score: int

    requires_simulation: bool

    requires_negotiation: bool

    confidence: int

    reason: str

    at_risk: str

    why: str

    what_happens: str

    how_to_fix: str

    human_summary: str