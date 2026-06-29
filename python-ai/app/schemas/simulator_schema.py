from pydantic import BaseModel


class ScenarioComparison(BaseModel):
    completion_rate: int # Percentage task completion rate (0-100)
    stress_level: int # Percentage stress score (0-100)
    sleep_hours: float # Sleep hours (e.g. 7.5)
    confidence: int # Percentage confidence (0-100)
    time_remaining_hours: float # Hours remaining for deep work or leisure
    description: str # Concise realistic description (max 60 words)

class SimulatorSchema(BaseModel):
    current_plan: ScenarioComparison
    ai_optimized_plan: ScenarioComparison
    aggressive_plan: ScenarioComparison
    confidence: int
    reasoning: str