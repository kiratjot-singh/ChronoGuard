import logging
from typing import Dict, Any, Callable, Optional
from app.services.gemini_service import llm
from app.schemas.supervisor_schema import SupervisorSchema
from app.graph.planning_graph import planning_graph
from app.graph.simulation_graph import simulation_graph
from app.graph.analysis_graph import analysis_graph

logger = logging.getLogger(__name__)

# Structured output generator for classifying user queries
structured_llm = llm.with_structured_output(SupervisorSchema)

# Registry of available workflows
WORKFLOW_REGISTRY: Dict[str, Any] = {
    "planning": planning_graph,
    "simulation": simulation_graph,
    "analysis": analysis_graph
}


def register_workflow(name: str, graph: Any) -> None:
    """Register a workflow graph dynamically to the registry."""
    WORKFLOW_REGISTRY[name] = graph
    logger.info(f"Registered workflow: {name}")


def get_workflow(name: str) -> Optional[Any]:
    """Retrieve a registered workflow graph by name."""
    return WORKFLOW_REGISTRY.get(name)


def supervisor_agent(user_query: str) -> SupervisorSchema:
    """Classifies a user query into one of the registered workflows using Gemini."""
    prompt = f"""
    You are ChronoGuard's Supervisor Agent.
    Your job is to understand the user's intent and select the appropriate workflow.

    Available workflows:
    - planning (for setting subtasks, organizing goals, making execution plans)
    - simulation (for evaluating schedules, calculating risks, simulating scenarios, negotiating optimizations)
    - analysis (for digital twin user behavior profiling, focus rates, preferred work hours)

    User Query:
    {user_query}

    Select the best workflow to run.
    """
    try:
        result = structured_llm.invoke(prompt)
        logger.info(f"Supervisor classified query '{user_query}' as: {result.workflow} ({result.reason})")
        return result
    except Exception as e:
        logger.error(f"Error in Supervisor Agent classification: {e}", exc_info=True)
        # Default fallback to planning if classifier fails
        return SupervisorSchema(workflow="planning", reason=f"Classification failed due to error: {e}")


def execute_workflow(workflow_name: str, state: Dict[str, Any]) -> Dict[str, Any]:
    """Executes the registered workflow graph with the provided state."""
    graph = WORKFLOW_REGISTRY.get(workflow_name)
    if not graph:
        raise ValueError(f"Workflow '{workflow_name}' is not registered.")
    
    logger.info(f"Executing workflow '{workflow_name}' graph...")
    return graph.invoke(state)
