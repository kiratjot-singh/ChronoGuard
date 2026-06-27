from langgraph.graph import StateGraph, START, END

from app.schemas.state import ChronoState

from app.agents.digital_twin import digital_twin_agent
from app.agents.planner import planner_agent
from app.agents.risk import risk_agent
from app.agents.simulator import simulator_agent
from app.agents.negotiator import negotiator_agent

from app.router.risk_router import risk_router
from app.router.simulator_router import simulator_router

def build_graph():
    builder = StateGraph(ChronoState)

    builder.add_node("digital_twin", digital_twin_agent)
    builder.add_node("planner", planner_agent)
    builder.add_node("risk", risk_agent)
    builder.add_node("simulator", simulator_agent)
    builder.add_node("negotiator", negotiator_agent)

    builder.add_edge(START, "digital_twin")
    builder.add_edge("digital_twin", "planner")
    builder.add_edge("planner", "risk")

    builder.add_conditional_edges(
        "risk",
        risk_router,
        {
            "low": END,
            "medium": "simulator",
            "high": "simulator",
        },
    )

    builder.add_conditional_edges(
        "simulator",
        simulator_router,
        {
            "negotiate": "negotiator",
            "finish": END,
        },
    )

    builder.add_edge("negotiator", END)

    return builder.compile()

graph = build_graph()