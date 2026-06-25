from typing import TypedDict, List, Dict


class ChronoState(TypedDict):

    history: str

    tasks: List[Dict]

    calendar: List[Dict]

    profile: Dict

    plan: Dict

    risk: Dict

    schedule: Dict

    simulation: Dict

    negotiation: Dict

    reasoning: List[Dict]