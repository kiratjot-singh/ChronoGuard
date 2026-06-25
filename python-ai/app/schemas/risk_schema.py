from pydantic import BaseModel


class RiskSchema(BaseModel):
    risk_score: int
    completion_probability: int
    stress_score: int
    reason: str