import logging
from typing import Dict, Any, List, Callable
from app.events.event_types import EventType

logger = logging.getLogger(__name__)


class EventDispatcher:
    """Central event dispatcher implementing the Observer pattern.

    Allows subscribing listeners to specific event types and dispatching payloads.
    """

    def __init__(self):
        self._listeners: Dict[EventType, List[Callable[[Dict[str, Any]], None]]] = {}

    def subscribe(self, event_type: EventType, listener: Callable[[Dict[str, Any]], None]) -> None:
        """Subscribe a listener callable to an event type."""
        if event_type not in self._listeners:
            self._listeners[event_type] = []
        if listener not in self._listeners[event_type]:
            self._listeners[event_type].append(listener)
            logger.info(f"Subscribed listener to event: {event_type.value}")

    def unsubscribe(self, event_type: EventType, listener: Callable[[Dict[str, Any]], None]) -> None:
        """Unsubscribe a listener callable from an event type."""
        if event_type in self._listeners and listener in self._listeners[event_type]:
            self._listeners[event_type].remove(listener)
            logger.info(f"Unsubscribed listener from event: {event_type.value}")

    def dispatch(self, event_type: EventType, payload: Dict[str, Any]) -> None:
        """Dispatch payload to all subscribed listeners for the event type."""
        logger.info(f"Dispatching event '{event_type.value}' with payload: {payload}")
        if event_type in self._listeners:
            for listener in self._listeners[event_type]:
                try:
                    listener(payload)
                except Exception as e:
                    logger.error(f"Error executing listener for event '{event_type.value}': {e}", exc_info=True)


# Singleton dispatcher instance
event_dispatcher = EventDispatcher()


# --- Default System Event Handlers to Automate Workflows ---

def handle_new_email(payload: Dict[str, Any]) -> None:
    """When a new email is received, automatically discover tasks and run the planning workflow."""
    from app.tools.gmail_tool import gmail_tool
    from app.agents.supervisor import execute_workflow
    from app.memory.memory_service import load_memory

    user_id = payload.get("user_id", "default_user")
    logger.info(f"Proactive Trigger: Discovering tasks for {user_id} due to new email.")

    # Discover tasks using Gmail tool
    tasks = gmail_tool.invoke({"action": "discover_tasks"})
    if tasks:
        logger.info(f"Proactive Trigger: Discovered {len(tasks)} tasks from email. Running planning workflow.")
        state = {
            "user_id": user_id,
            "history": f"Proactively discovered tasks from email payload. Event details: {payload.get('details', '')}",
            "tasks": tasks,
            "memory": load_memory(user_id),
            "profile": {},
            "plan": {},
            "risk": {},
            "simulation": {},
            "negotiation": {},
            "reasoning": [],
        }
        execute_workflow("planning", state)


def handle_schedule_trigger(payload: Dict[str, Any]) -> None:
    """When a calendar, deadline, or task state changes, automatically re-run the simulation workflow."""
    from app.agents.supervisor import execute_workflow
    from app.memory.memory_service import load_memory

    user_id = payload.get("user_id", "default_user")
    logger.info(f"Proactive Trigger: Re-evaluating schedule for {user_id} due to event: {payload.get('event_name')}.")

    state = {
        "user_id": user_id,
        "history": f"Event update: {payload.get('details', '')}",
        "tasks": payload.get("tasks", []),
        "memory": load_memory(user_id),
        "profile": {},
        "plan": payload.get("plan", {}),
        "risk": {},
        "simulation": {},
        "negotiation": {},
        "reasoning": [],
    }
    execute_workflow("simulation", state)


# Register default system behaviors
event_dispatcher.subscribe(EventType.NEW_EMAIL, handle_new_email)
event_dispatcher.subscribe(EventType.CALENDAR_UPDATED, handle_schedule_trigger)
event_dispatcher.subscribe(EventType.MEETING_ADDED, handle_schedule_trigger)
event_dispatcher.subscribe(EventType.DEADLINE_CHANGED, handle_schedule_trigger)
event_dispatcher.subscribe(EventType.TASK_OVERDUE, handle_schedule_trigger)
