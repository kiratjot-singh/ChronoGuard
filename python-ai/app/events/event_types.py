from enum import Enum


class EventType(str, Enum):
    NEW_EMAIL = "new_email"
    CALENDAR_UPDATED = "calendar_updated"
    DEADLINE_CHANGED = "deadline_changed"
    TASK_OVERDUE = "task_overdue"
    MEETING_ADDED = "meeting_added"
