# from app.agents.digital_twin import digital_twin_agent

# state = {
#     "history": """
#     Completed:
#     - DSA practice at night
#     - Backend project work

#     Missed:
#     - Morning study sessions
#     - Morning gym
#     """,

#     "tasks": [],

#     "profile": {},
#     "plan": {},
#     "risk": {},
#     "simulation": {},
#     "negotiation": {}
# }

# # result = digital_twin_agent(state)

# # print(result["profile"])

# from app.agents.planner import planner_agent

# state = {
#     "history": "",
#     "tasks": [
#         {
#             "title": "Hackathon Project",
#             "deadline": "Tomorrow"
#         }
#     ],
#     "profile": {},
#     "plan": {},
#     "risk": {},
#     "simulation": {},
#     "negotiation": {}
# }

# result = planner_agent(state)

# print(result["plan"])

from app.graph.chronoguard_graph import graph


state = {
    "history": """
Completed:
- Backend project at night
- DSA practice

Missed:
- Morning study
- Morning gym
""",

    "tasks": [
        {
            "title": "Hackathon Submission",
            "deadline": "Tomorrow",
            "estimated_hours": 10
        }
    ],

    "profile": {},
    "plan": {},
    "risk": {},
    "simulation": {},
    "negotiation": {}
}

result = graph.invoke(state)

print(result)