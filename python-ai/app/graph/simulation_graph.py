from langgraph.graph import StateGraph, START, END
from app.schemas.state import ChronoState
from app.agents.risk import risk_agent
from app.agents.simulator import simulator_agent
from app.agents.negotiator import negotiator_agent
from app.router.risk_router import risk_router
from app.router.simulator_router import simulator_router


def build_simulation_graph():
    builder = StateGraph(ChronoState)

    builder.add_node("risk", risk_agent)
    builder.add_node("simulator", simulator_agent)
    builder.add_node("negotiator", negotiator_agent)

    builder.add_edge(START, "risk")

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


simulation_graph = build_simulation_graph()
