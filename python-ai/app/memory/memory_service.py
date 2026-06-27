from typing import Dict, Any, Optional, List
import logging
from app.memory.profile_store import profile_store

logger = logging.getLogger(__name__)


def load_memory(user_id: str) -> Dict[str, Any]:
    """Loads long-term memory statistics for a user."""
    return profile_store.load_profile(user_id)


def save_memory(user_id: str, memory_data: Dict[str, Any]) -> None:
    """Saves memory statistics for a user."""
    profile_store.save_profile(user_id, memory_data)


def update_memory(profile: Dict[str, Any], user_id: Optional[str] = None) -> Dict[str, Any]:
    """Merges new profile observations into the user's historical memory.

    Calculates running averages for focus and completion rates and aggregates lists
    of preferred work hours and procrastination patterns.
    """
    if not user_id:
        user_id = profile.get("user_id", "default_user")

    memory = load_memory(user_id)
    count = memory.get("observations_count", 0)

    # 1. Update average focus score
    focus_score = profile.get("focus_score")
    if focus_score is not None:
        old_focus = memory.get("average_focus", 0.0)
        memory["average_focus"] = round((old_focus * count + focus_score) / (count + 1), 2)

    # 2. Update average completion rate
    completion_rate = profile.get("completion_rate")
    if completion_rate is not None:
        old_completion = memory.get("average_completion_rate", 0.0)
        memory["average_completion_rate"] = round((old_completion * count + completion_rate) / (count + 1), 2)

    # 3. Aggregate unique preferred work hours
    new_hours = profile.get("preferred_work_hours", [])
    if isinstance(new_hours, list):
        current_hours = set(memory.get("preferred_work_hours", []))
        current_hours.update(new_hours)
        memory["preferred_work_hours"] = sorted(list(current_hours))

    # 4. Aggregate unique procrastination patterns
    new_patterns = profile.get("procrastination_patterns", [])
    if isinstance(new_patterns, list):
        current_patterns = set(memory.get("recurring_procrastination_patterns", []))
        current_patterns.update(new_patterns)
        memory["recurring_procrastination_patterns"] = sorted(list(current_patterns))

    # 5. Increment observations count
    memory["observations_count"] = count + 1

    save_memory(user_id, memory)
    logger.info(f"Updated memory profile for user {user_id}: {memory}")
    return memory
