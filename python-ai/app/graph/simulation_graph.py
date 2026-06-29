from langgraph.graph import StateGraph, START, END
from app.schemas.state import ChronoState
from app.agents.risk import risk_agent
from app.agents.simulator import simulator_agent
from app.agents.negotiator import negotiator_agent
from app.agents.decision_engine import decision_engine_agent
from app.agents.calendar_diff_engine import calendar_diff_agent
from app.agents.chief_of_staff import chief_of_staff_agent
from app.router.risk_router import risk_router
from app.router.simulator_router import simulator_router


def build_simulation_graph():
    builder = StateGraph(ChronoState)

    builder.add_node("risk", risk_agent)
    builder.add_node("simulator", simulator_agent)
    builder.add_node("negotiator", negotiator_agent)
    builder.add_node("decision_engine", decision_engine_agent)
    builder.add_node("calendar_diff_engine", calendar_diff_agent)
    builder.add_node("chief_of_staff", chief_of_staff_agent)

    builder.add_edge(START, "risk")

    builder.add_conditional_edges(
        "risk",
        risk_router,
        {
            "low": "decision_engine",
            "medium": "simulator",
            "high": "simulator",
        },
    )

    builder.add_conditional_edges(
        "simulator",
        simulator_router,
        {
            "negotiate": "negotiator",
            "finish": "decision_engine",
        },
    )

    builder.add_edge("negotiator", "decision_engine")
    builder.add_edge("decision_engine", "calendar_diff_engine")
    builder.add_edge("calendar_diff_engine", "chief_of_staff")
    builder.add_edge("chief_of_staff", END)

    return builder.compile()


simulation_graph = build_simulation_graph()
