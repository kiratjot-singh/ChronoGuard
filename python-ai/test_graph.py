from app.graph.chronoguard_graph import build_graph

graph = build_graph()

state = {
    "user_id": "test_user_1",
    "history": """
Completed:
- DSA at night
- Backend project

Missed:
- Morning study
""",
    "memory": {},

    "tasks": [
        {
            "title": "Hackathon",
            "deadline": "Tomorrow",
            "estimated_hours": 8
        },
        {
            "title": "Amazon ML Test",
            "deadline": "Tomorrow",
            "estimated_hours": 5
        }
    ],

    "profile": {},
    "plan": {},
    "risk": {},
    "simulation": {},
    "negotiation": {},
    "reasoning": []
}

result = graph.invoke(state)

from pprint import pprint

pprint(result)