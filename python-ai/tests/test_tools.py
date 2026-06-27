import unittest
import os
import sys

# Ensure python-ai is in the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.tools.calendar_tool import calendar_tool, calendar_service
from app.tools.gmail_tool import gmail_tool, gmail_service


class TestGoogleTools(unittest.TestCase):

    def test_calendar_tool_read_events(self):
        # Trigger read_events action
        events = calendar_tool.invoke({"action": "read_events"})
        self.assertIsInstance(events, list)
        if len(events) > 0:
            self.assertIn("title", events[0])
            self.assertIn("start", events[0])
            self.assertIn("end", events[0])

    def test_calendar_tool_detect_free_time(self):
        # Trigger detect_free_time action
        slots = calendar_tool.invoke({"action": "detect_free_time"})
        self.assertIsInstance(slots, list)
        if len(slots) > 0:
            self.assertIn("start", slots[0])
            self.assertIn("end", slots[0])

    def test_gmail_tool_read_inbox(self):
        # Trigger read_inbox action
        emails = gmail_tool.invoke({"action": "read_inbox"})
        self.assertIsInstance(emails, list)
        if len(emails) > 0:
            self.assertIn("subject", emails[0])
            self.assertIn("sender", emails[0])
            self.assertIn("body", emails[0])

    def test_gmail_tool_discover_tasks(self):
        # Trigger discover_tasks action (uses LLM under the hood)
        tasks = gmail_tool.invoke({"action": "discover_tasks"})
        self.assertIsInstance(tasks, list)
        # Even if mock data is used, Gemini should run and extract structured tasks from mock emails
        if len(tasks) > 0:
            self.assertIn("title", tasks[0])
            self.assertIn("deadline", tasks[0])
            self.assertIn("estimated_hours", tasks[0])


if __name__ == "__main__":
    unittest.main()
