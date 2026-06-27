from typing import Literal


def simulator_router(state) -> Literal["finish", "negotiate"]:

    if state["risk"]["requires_negotiation"]:
        return "negotiate"

    return "finish"