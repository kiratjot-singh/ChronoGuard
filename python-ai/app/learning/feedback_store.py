import os
import json
import time
from typing import List, Dict, Any

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")

class FeedbackStore:
    """Stores user interaction events locally in JSON files."""

    def __init__(self):
        os.makedirs(DATA_DIR, exist_ok=True)

    def _get_file_path(self, user_id: str) -> str:
        # Clean user_id to prevent path traversal
        clean_user_id = "".join(c for c in user_id if c.isalnum() or c in ("-", "_"))
        return os.path.join(DATA_DIR, f"feedback_log_{clean_user_id}.json")

    def append_event(self, user_id: str, event_type: str, details: Dict[str, Any]) -> None:
        """Appends a new interaction event to the user's feedback log."""
        file_path = self._get_file_path(user_id)
        events = self.load_events(user_id)
        
        new_event = {
            "timestamp": time.time(),
            "event_type": event_type,
            "details": details
        }
        events.append(new_event)
        
        with open(file_path, "w") as f:
            json.dump(events, f, indent=2)

    def load_events(self, user_id: str) -> List[Dict[str, Any]]:
        """Loads all interaction events for a user."""
        file_path = self._get_file_path(user_id)
        if not os.path.exists(file_path):
            return []
        try:
            with open(file_path, "r") as f:
                return json.load(f)
        except Exception:
            return []

feedback_store = FeedbackStore()
