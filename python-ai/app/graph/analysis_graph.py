from langgraph.graph import StateGraph, START, END
from app.schemas.state import ChronoState
from app.agents.digital_twin import digital_twin_agent


def build_analysis_graph():
    builder = StateGraph(ChronoState)

    builder.add_node("digital_twin", digital_twin_agent)

    builder.add_edge(START, "digital_twin")
    builder.add_edge("digital_twin", END)

    return builder.compile()


analysis_graph = build_analysis_graph()
