from langgraph.graph import StateGraph, START, END
from app.schemas.state import ChronoState
from app.agents.planner import planner_agent


def build_planning_graph():
    builder = StateGraph(ChronoState)

    builder.add_node("planner", planner_agent)

    builder.add_edge(START, "planner")
    builder.add_edge("planner", END)

    return builder.compile()


planning_graph = build_planning_graph()
