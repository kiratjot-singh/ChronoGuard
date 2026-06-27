from typing import TypedDict, List, Dict


class ChronoState(TypedDict):

    user_id: str

    history: str

    tasks: list

    memory: dict

    profile: dict

    plan: dict

    risk: dict

    simulation: dict

    negotiation: dict

    reasoning: list