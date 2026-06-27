import unittest
import os
import sys

# Ensure python-ai is in the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.events.event_types import EventType
from app.events.dispatcher import EventDispatcher


class TestEventSystem(unittest.TestCase):

    def test_subscribe_dispatch(self):
        dispatcher = EventDispatcher()
        triggered_payloads = []

        def dummy_listener(payload):
            triggered_payloads.append(payload)

        dispatcher.subscribe(EventType.NEW_EMAIL, dummy_listener)
        
        # Test dispatching
        payload = {"user_id": "test_user", "details": "New assignment email"}
        dispatcher.dispatch(EventType.NEW_EMAIL, payload)

        self.assertEqual(len(triggered_payloads), 1)
        self.assertEqual(triggered_payloads[0]["user_id"], "test_user")

    def test_unsubscribe(self):
        dispatcher = EventDispatcher()
        triggered_count = 0

        def dummy_listener(payload):
            nonlocal triggered_count
            triggered_count += 1

        dispatcher.subscribe(EventType.CALENDAR_UPDATED, dummy_listener)
        dispatcher.dispatch(EventType.CALENDAR_UPDATED, {})
        self.assertEqual(triggered_count, 1)

        # Unsubscribe and dispatch again
        dispatcher.unsubscribe(EventType.CALENDAR_UPDATED, dummy_listener)
        dispatcher.dispatch(EventType.CALENDAR_UPDATED, {})
        self.assertEqual(triggered_count, 1)  # Count should still be 1


if __name__ == "__main__":
    unittest.main()
