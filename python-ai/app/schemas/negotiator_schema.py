from pydantic import BaseModel
from typing import List


class NegotiatorSchema(BaseModel):

    changes: list[str]

    confidence: int

    reasoning: str