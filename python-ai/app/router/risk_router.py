from typing import Literal


def risk_router(state) -> Literal["low", "medium"]:

    if state["risk"]["requires_simulation"]:
        return "medium"

    return "low"