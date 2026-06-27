from pydantic import BaseModel


class SimulatorSchema(BaseModel):

    future_a: str

    future_b: str

    future_c: str

    confidence: int

    reasoning: str