import unittest
import os
import sys

# Ensure python-ai is in the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.agents.supervisor import supervisor_agent, execute_workflow, WORKFLOW_REGISTRY


class TestSupervisor(unittest.TestCase):

    def test_workflow_registry(self):
        self.assertIn("planning", WORKFLOW_REGISTRY)
        self.assertIn("simulation", WORKFLOW_REGISTRY)
        self.assertIn("analysis", WORKFLOW_REGISTRY)

    def test_supervisor_classification_planning(self):
        # We query the supervisor with a planning-specific instruction
        result = supervisor_agent("Can you help me plan subtasks for my upcoming hackathon?")
        self.assertEqual(result.workflow, "planning")

    def test_supervisor_classification_simulation(self):
        # We query the supervisor with a risk/simulation-specific instruction
        result = supervisor_agent("Simulate risks and check schedules for my deadline tomorrow.")
        self.assertEqual(result.workflow, "simulation")

    def test_supervisor_classification_analysis(self):
        # We query the supervisor with a behavioral/profiling-specific instruction
        result = supervisor_agent("Analyze my focus rates and behavior patterns based on history.")
        self.assertEqual(result.workflow, "analysis")


if __name__ == "__main__":
    unittest.main()
