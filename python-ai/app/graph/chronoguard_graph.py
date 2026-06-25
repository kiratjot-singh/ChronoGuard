from langgraph.graph import StateGraph, START, END

from app.schemas.state import ChronoState

from app.agents.digital_twin import digital_twin_agent
from app.agents.planner import planner_agent
from app.agents.risk import risk_agent

from app.router.risk_router import risk_router

builder = StateGraph(ChronoState)

builder.add_node("digital_twin", digital_twin_agent)

builder.add_node("planner", planner_agent)

builder.add_node("risk", risk_agent)


builder.add_edge(START, "digital_twin")

builder.add_edge("digital_twin", "planner")

builder.add_edge("planner", "risk")

builder.add_conditional_edges(
    "risk",
    risk_router,
    {
        "high": "simulator",
        "medium": "simulator",
        "low": END,
    }
)


graph = builder.compile()