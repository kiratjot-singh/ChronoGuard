import os
import datetime
import logging
from typing import Dict, Any, List, Optional
from langchain_core.tools import tool

logger = logging.getLogger(__name__)

# Scopes required for reading user calendar availability
SCOPES = ['https://www.googleapis.com/auth/calendar.readonly']


class GoogleCalendarService:
    """Service wrapper for interacting with the Google Calendar API."""

    def __init__(self):
        self.creds = None
        self.service = None
        self.credentials_path = 'credentials.json'
        self.token_path = 'token.json'
        self.init_service()

    def init_service(self):
        """Attempts to initialize Google Calendar API client using OAuth."""
        try:
            from google.auth.transport.requests import Request
            from google.oauth2.credentials import Credentials
            from google_auth_oauthlib.flow import InstalledAppFlow
            from googleapiclient.discovery import build

            # Load credentials if token.json exists
            if os.path.exists(self.token_path):
                self.creds = Credentials.from_authorized_user_file(self.token_path, SCOPES)

            # Authenticate if credentials are not valid/present
            if not self.creds or not self.creds.valid:
                if self.creds and self.creds.expired and self.creds.refresh_token:
                    self.creds.refresh(Request())
                else:
                    if os.path.exists(self.credentials_path):
                        flow = InstalledAppFlow.from_client_secrets_file(self.credentials_path, SCOPES)
                        self.creds = flow.run_local_server(port=0)
                        # Store credentials
                        with open(self.token_path, 'w') as token:
                            token.write(self.creds.to_json())
                    else:
                        logger.warning(
                            "Google Calendar: 'credentials.json' not found. "
                            "Using mock data fallback. Place 'credentials.json' in the root directory "
                            "to connect to real Google APIs."
                        )

            if self.creds:
                self.service = build('calendar', 'v3', credentials=self.creds)
                logger.info("Google Calendar Service initialized successfully.")
        except Exception as e:
            logger.error(f"Google Calendar initialization error: {e}. Operating in mock fallback mode.")

    def is_authenticated(self) -> bool:
        return self.service is not None

    def read_upcoming_events(self, max_results: int = 10) -> List[Dict[str, Any]]:
        """Fetch list of upcoming calendar events."""
        if not self.is_authenticated():
            logger.warning("Google Calendar service is not authenticated. Returning empty events.")
            return []

        try:
            now = datetime.datetime.utcnow().isoformat() + 'Z'
            events_result = self.service.events().list(
                calendarId='primary',
                timeMin=now,
                maxResults=max_results,
                singleEvents=True,
                orderBy='startTime'
            ).execute()
            events = events_result.get('items', [])

            formatted_events = []
            for event in events:
                start = event['start'].get('dateTime', event['start'].get('date'))
                end = event['end'].get('dateTime', event['end'].get('date'))
                formatted_events.append({
                    "title": event.get("summary", "No Title"),
                    "start": start,
                    "end": end,
                    "id": event.get("id")
                })
            return formatted_events
        except Exception as e:
            logger.error(f"Error fetching Google Calendar events: {e}")
            raise RuntimeError(f"Google Calendar API execution failed: {e}")

    def detect_free_time(self, work_start_hour: int = 9, work_end_hour: int = 18) -> List[Dict[str, Any]]:
        """Calculate free time slots for the next 24 hours based on busy slots."""
        events = self.read_upcoming_events()
        now = datetime.datetime.now()
        
        # Calculate working window for today and tomorrow
        today_start = now.replace(hour=work_start_hour, minute=0, second=0, microsecond=0)
        today_end = now.replace(hour=work_end_hour, minute=0, second=0, microsecond=0)
        tomorrow_start = today_start + datetime.timedelta(days=1)
        tomorrow_end = today_end + datetime.timedelta(days=1)

        # Parse busy slots
        busy_slots = []
        for event in events:
            try:
                # Remove UTC offset suffix Z or +HH:MM for parsing
                start_str = event["start"].split("+")[0].split("Z")[0]
                end_str = event["end"].split("+")[0].split("Z")[0]
                start_dt = datetime.datetime.fromisoformat(start_str)
                end_dt = datetime.datetime.fromisoformat(end_str)
                busy_slots.append((start_dt, end_dt))
            except Exception:
                continue

        # Helper to compute gaps in a window
        def get_gaps(window_start, window_end, busy):
            # Sort busy intervals and filter overlaps
            relevant_busy = []
            for start, end in busy:
                if start < window_end and end > window_start:
                    s = max(start, window_start)
                    e = min(end, window_end)
                    relevant_busy.append((s, e))
            relevant_busy.sort(key=lambda x: x[0])

            gaps = []
            curr = window_start
            for start, end in relevant_busy:
                if start > curr:
                    gaps.append({"start": curr.isoformat(), "end": start.isoformat()})
                curr = max(curr, end)
            if curr < window_end:
                gaps.append({"start": curr.isoformat(), "end": window_end.isoformat()})
            return gaps

        free_slots = get_gaps(today_start, today_end, busy_slots)
        free_slots.extend(get_gaps(tomorrow_start, tomorrow_end, busy_slots))
        return free_slots

    # Mock fallback removed.


# Instantiated service class
calendar_service = GoogleCalendarService()


@tool
def calendar_tool(action: str, params: Optional[Dict[str, Any]] = None) -> Any:
    """Interact with Google Calendar API to read events, check free slots, and detect conflicts.
    
    Actions:
    - 'read_events': returns upcoming events.
    - 'detect_free_time': returns free time slots.
    """
    if params is None:
        params = {}
    if action == "read_events":
        return calendar_service.read_upcoming_events()
    elif action == "detect_free_time":
        return calendar_service.detect_free_time()
    else:
        raise ValueError(f"Unsupported action: {action}")
