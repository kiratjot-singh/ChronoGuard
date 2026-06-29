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

    executive_brief: str

    decision_engine: dict

    chief_of_staff: dict

    learning_profile: dict

    calendar_diff: dict