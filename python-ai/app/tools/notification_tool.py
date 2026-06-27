import time
import logging
from typing import Dict, Any, List, Optional
from langchain_core.tools import tool

logger = logging.getLogger(__name__)


class NotificationTool:
    """Actionable Notification Engine for ChronoGuard AI."""

    def __init__(self):
        self._notifications: List[Dict[str, Any]] = []

    def execute(self, action: str, params: Optional[Dict[str, Any]] = None) -> Any:
        """Standard execution gateway for LangChain tools."""
        if params is None:
            params = {}
        if action == "send_notification":
            return self.send_notification(
                title=params.get("title", "Alert"),
                explanation=params.get("explanation", ""),
                changes=params.get("changes", ""),
                user_id=params.get("user_id", "default_user")
            )
        elif action == "get_notifications":
            return self.get_notifications(user_id=params.get("user_id", "default_user"))
        else:
            raise ValueError(f"Unsupported action: {action}")

    def send_notification(self, title: str, explanation: str, changes: str, user_id: str) -> Dict[str, Any]:
        """Creates, logs, and stores a new notification explaining what, why, and what changed."""
        notification = {
            "title": title,
            "explanation": explanation,
            "changes": changes,
            "user_id": user_id,
            "timestamp": time.time()
        }
        self._notifications.append(notification)
        logger.info(
            f"NOTIFICATION TRIGGERED [{title}] for user {user_id}.\n"
            f"Explanation: {explanation}\n"
            f"Changes: {changes}"
        )
        return notification

    def get_notifications(self, user_id: str) -> List[Dict[str, Any]]:
        """Retrieve stored notifications for a user."""
        return [n for n in self._notifications if n["user_id"] == user_id]


# Singleton tool coordinator
notification_service = NotificationTool()


@tool
def notification_tool(action: str, params: Optional[Dict[str, Any]] = None) -> Any:
    """Tool to generate and read intelligent actionable notifications explaining calendar optimizations.
    
    Actions:
    - 'send_notification': creates and logs a notification.
    - 'get_notifications': returns user notifications list.
    """
    return notification_service.execute(action, params)
