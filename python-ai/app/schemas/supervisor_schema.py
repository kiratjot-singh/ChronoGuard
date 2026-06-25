from pydantic import BaseModel
from typing import Literal


class SupervisorSchema(BaseModel):

    workflow: Literal[
        "planning",
        "simulation",
        "analysis"
    ]

    reason: str