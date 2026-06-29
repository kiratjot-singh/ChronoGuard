import os
import json
from typing import List, Dict, Any
from app.learning.feedback_store import feedback_store
from app.learning.behavior_analyzer import behavior_analyzer

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")

class LearningService:
    """Orchestrates adaptive learning parameters and preference profiles."""

    def _get_profile_path(self, user_id: str) -> str:
        clean_user_id = "".join(c for c in user_id if c.isalnum() or c in ("-", "_"))
        return os.path.join(DATA_DIR, f"learning_profile_{clean_user_id}.json")

    def get_preference_profile(self, user_id: str) -> Dict[str, Any]:
        """Loads or initializes user preference profile."""
        profile_path = self._get_profile_path(user_id)
        if not os.path.exists(profile_path):
            return {
                "preferred_work_hours": ["night"],
                "preferred_study_duration": 2.0,
                "max_continuous_work": 4.0,
                "preferred_break_length": 0.5,
                "preferred_focus_blocks": ["9 PM - 11 PM"],
                "successful_strategies": ["Rescheduling task blocks to late night"],
                "rejected_strategies": [],
                "ai_summary": "Observing patterns. Night work is highly productive.",
                "insights": []
            }
        try:
            with open(profile_path, "r") as f:
                return json.load(f)
        except Exception:
            return {}

    def save_preference_profile(self, user_id: str, profile: Dict[str, Any]) -> None:
        """Saves user preference profile."""
        profile_path = self._get_profile_path(user_id)
        with open(profile_path, "w") as f:
            json.dump(profile, f, indent=2)

    def process_daily_reflection(self, user_id: str, tasks: List[Dict[str, Any]]) -> str:
        """Generates a private reflection summarizing completions and learnings."""
        completed = [t for t in tasks if t.get("status") == "completed"]
        pending = [t for t in tasks if t.get("status") == "pending"]
        
        reflection = f"Daily Reflection for user {user_id}:\n"
        reflection += f"- Completed tasks: {len(completed)}\n"
        reflection += f"- Pending tasks remaining: {len(pending)}\n"
        
        # Simple heuristic learning rules
        learning = "Maintain late evening focus slots."
        if len(pending) > 0:
            learning = "Avoid scheduling complex administrative tasks right after technical coding sprints."
        
        reflection += f"- Learning inferred: {learning}"
        return reflection

    def get_weekly_learning_summary(self, user_id: str) -> str:
        """Generates a weekly learning summary from behavioral profile data."""
        profile = self.get_preference_profile(user_id)
        work_period = "night" if "night" in profile.get("preferred_work_hours", []) else "morning"
        
        summary = (
            f"This week I observed that you resolve technical tasks faster than documentation. "
            f"Your Peak productivity occurred during late {work_period} hours, "
            f"and morning notifications are usually deferred. "
            f"Overall schedule adjustments were approved with high reliability."
        )
        return summary

    def update_profile_from_events(self, user_id: str) -> Dict[str, Any]:
        """Runs the analyzer on user events and updates the saved preference profile."""
        events = feedback_store.load_events(user_id)
        analysis = behavior_analyzer.analyze(events)
        profile = self.get_preference_profile(user_id)

        # 1. Update preferred work hours
        profile["preferred_work_hours"] = [analysis["preferred_work_period"]]

        # 2. Update insights list
        profile["insights"] = analysis["insights"]

        # 3. Update memory strategies
        if analysis["accept_rate"] >= 0.7:
            if "Rescheduling task blocks to late night" not in profile["successful_strategies"]:
                profile["successful_strategies"].append("Rescheduling task blocks to late night")
        else:
            if "Early morning notifications" not in profile["rejected_strategies"]:
                profile["rejected_strategies"].append("Early morning notifications")

        # 4. Update AI Summary
        profile["ai_summary"] = (
            f"User prefers late {analysis['preferred_work_period']} sessions. "
            f"Has completed {analysis['tech_completed']} technical tasks. "
            f"Accept rate is {round(analysis['accept_rate']*100)}%."
        )

        self.save_preference_profile(user_id, profile)
        return profile

    def adapt_confidence(self, user_id: str, base_confidence: int, recommendation_type: str) -> int:
        """Adjusts confidence based on accept/reject history of the action type."""
        events = feedback_store.load_events(user_id)
        if not events:
            return base_confidence

        accepts = 0
        rejects = 0
        for e in events:
            details = e.get("details", {})
            if details.get("recommendation_type") == recommendation_type or recommendation_type in str(details):
                if e["event_type"] in ("Schedule Approved", "Recommendation Accepted"):
                    accepts += 1
                elif e["event_type"] in ("Schedule Rejected", "Recommendation Rejected"):
                    rejects += 1

        delta = (accepts * 5) - (rejects * 10)
        new_conf = max(40, min(100, base_confidence + delta))
        return new_conf

learning_service = LearningService()
