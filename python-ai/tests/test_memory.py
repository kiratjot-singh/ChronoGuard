import unittest
import os
import sys

# Ensure python-ai is in the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.memory.profile_store import InMemoryProfileStore
from app.memory.memory_service import load_memory, save_memory, update_memory


class TestMemorySystem(unittest.TestCase):

    def test_in_memory_store(self):
        store = InMemoryProfileStore()
        profile = store.load_profile("user_1")
        self.assertEqual(profile["average_focus"], 0.0)
        self.assertEqual(profile["observations_count"], 0)

        profile["average_focus"] = 75.0
        store.save_profile("user_1", profile)

        loaded = store.load_profile("user_1")
        self.assertEqual(loaded["average_focus"], 75.0)

    def test_memory_service_update(self):
        user_id = "test_user_unique"
        # Reset memory for test user
        save_memory(user_id, {
            "average_focus": 0.0,
            "average_completion_rate": 0.0,
            "preferred_work_hours": [],
            "recurring_procrastination_patterns": [],
            "observations_count": 0
        })

        # Merge observation 1
        obs1 = {
            "focus_score": 80,
            "completion_rate": 90,
            "preferred_work_hours": ["09:00", "10:00"],
            "procrastination_patterns": ["morning laziness"]
        }
        mem = update_memory(obs1, user_id)
        self.assertEqual(mem["observations_count"], 1)
        self.assertEqual(mem["average_focus"], 80.0)
        self.assertEqual(mem["average_completion_rate"], 90.0)
        self.assertEqual(mem["preferred_work_hours"], ["09:00", "10:00"])
        self.assertEqual(mem["recurring_procrastination_patterns"], ["morning laziness"])

        # Merge observation 2
        obs2 = {
            "focus_score": 90,
            "completion_rate": 80,
            "preferred_work_hours": ["10:00", "11:00"],
            "procrastination_patterns": ["social media distraction"]
        }
        mem = update_memory(obs2, user_id)
        self.assertEqual(mem["observations_count"], 2)
        self.assertEqual(mem["average_focus"], 85.0)  # (80 + 90) / 2
        self.assertEqual(mem["average_completion_rate"], 85.0)  # (90 + 80) / 2
        self.assertEqual(mem["preferred_work_hours"], ["09:00", "10:00", "11:00"])
        self.assertEqual(mem["recurring_procrastination_patterns"], ["morning laziness", "social media distraction"])


if __name__ == "__main__":
    unittest.main()
