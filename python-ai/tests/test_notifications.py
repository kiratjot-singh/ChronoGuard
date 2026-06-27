import unittest
import os
import sys

# Ensure python-ai is in the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.tools.notification_tool import notification_tool, notification_service


class TestNotificationEngine(unittest.TestCase):

    def test_send_get_notifications(self):
        # Trigger sending notification
        notif = notification_tool.invoke({
            "action": "send_notification",
            "params": {
                "title": "High Risk Detected",
                "explanation": "Multiple high estimated hour tasks are overlapping on tomorrow's calendar.",
                "changes": "Rescheduled meeting review to Friday",
                "user_id": "test_user_3"
            }
        })
        self.assertEqual(notif["title"], "High Risk Detected")
        self.assertEqual(notif["user_id"], "test_user_3")

        # Trigger get_notifications
        notifs = notification_tool.invoke({
            "action": "get_notifications",
            "params": {"user_id": "test_user_3"}
        })
        self.assertEqual(len(notifs), 1)
        self.assertEqual(notifs[0]["title"], "High Risk Detected")


if __name__ == "__main__":
    unittest.main()
