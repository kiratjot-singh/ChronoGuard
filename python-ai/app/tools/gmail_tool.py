import os
import logging
import base64
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from langchain_core.tools import tool
from app.services.gemini_service import llm

logger = logging.getLogger(__name__)

# Scopes required for reading Gmail messages
SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']


class EmailTask(BaseModel):
    """Pydantic model representing a task extracted from an email."""
    title: str = Field(description="Actionable title of the task representing the email requirements")
    deadline: str = Field(description="Extracted deadline (e.g. 'Tomorrow', 'June 28th', or date string)")
    estimated_hours: int = Field(default=2, description="Estimated hours to complete the task")


class ExtractedTasks(BaseModel):
    """Container for email task extraction."""
    tasks: List[EmailTask]


class GoogleGmailService:
    """Service wrapper for interacting with the Gmail API."""

    def __init__(self):
        self.creds = None
        self.service = None
        self.credentials_path = 'credentials.json'
        self.token_path = 'token.json'
        self.init_service()

    def init_service(self):
        """Attempts to initialize Google Gmail API client using OAuth."""
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
                            "Google Gmail: 'credentials.json' not found. "
                            "Using mock data fallback. Place 'credentials.json' in the root directory "
                            "to connect to real Google APIs."
                        )

            if self.creds:
                self.service = build('gmail', 'v1', credentials=self.creds)
                logger.info("Google Gmail Service initialized successfully.")
        except Exception as e:
            logger.error(f"Google Gmail initialization error: {e}. Operating in mock fallback mode.")

    def is_authenticated(self) -> bool:
        return self.service is not None

    def read_inbox(self, max_results: int = 5) -> List[Dict[str, str]]:
        """Fetch list of recent emails from the inbox."""
        if not self.is_authenticated():
            logger.warning("Google Gmail service is not authenticated. Returning empty inbox.")
            return []

        try:
            results = self.service.users().messages().list(userId='me', maxResults=max_results, q='is:inbox').execute()
            messages = results.get('messages', [])

            emails = []
            for msg in messages:
                msg_id = msg['id']
                message = self.service.users().messages().get(userId='me', id=msg_id, format='full').execute()
                
                # Retrieve headers
                headers = message.get('payload', {}).get('headers', [])
                subject = next((h['value'] for h in headers if h['name'].lower() == 'subject'), 'No Subject')
                sender = next((h['value'] for h in headers if h['name'].lower() == 'from'), 'Unknown Sender')

                # Extract body
                body = ""
                payload = message.get('payload', {})
                if 'parts' in payload:
                    for part in payload['parts']:
                        if part.get('mimeType') == 'text/plain':
                            data = part.get('body', {}).get('data', '')
                            body = base64.urlsafe_b64decode(data).decode('utf-8', errors='ignore')
                            break
                else:
                    data = payload.get('body', {}).get('data', '')
                    if data:
                        body = base64.urlsafe_b64decode(data).decode('utf-8', errors='ignore')

                emails.append({
                    "subject": subject,
                    "sender": sender,
                    "body": body
                })
            return emails
        except Exception as e:
            logger.error(f"Error fetching Gmail messages: {e}")
            raise RuntimeError(f"Gmail API execution failed: {e}")

    def extract_tasks(self, emails: List[Dict[str, str]]) -> List[Dict[str, Any]]:
        """Extracts task deadlines dynamically from a list of provided emails using Gemini."""
        discovered = []
        structured_extractor = llm.with_structured_output(ExtractedTasks)

        for email in emails:
            prompt = f"""
            Analyze the following email and extract any assignments, interviews, meetings, or bill reminders that require tasks to be completed.

            Email Subject: {email['subject']}
            Email Sender: {email['sender']}
            Email Body:
            {email['body']}

            Extract tasks with an actionable title, deadline description, and estimated hours to complete.
            """
            try:
                result = structured_extractor.invoke(prompt)
                for task in result.tasks:
                    discovered.append(task.model_dump())
            except Exception as e:
                logger.error(f"Failed to extract tasks using Gemini for subject '{email['subject']}': {e}")
                
        return discovered

    def discover_tasks(self) -> List[Dict[str, Any]]:
        """Reads recent emails and extracts task deadlines dynamically using Gemini."""
        emails = self.read_inbox()
        return self.extract_tasks(emails)


# Instantiated service class
gmail_service = GoogleGmailService()


@tool
def gmail_tool(action: str, params: Optional[Dict[str, Any]] = None) -> Any:
    """Interact with Google Gmail API to fetch inbox emails and dynamically discover tasks/deadlines.
    
    Actions:
    - 'read_inbox': returns raw emails.
    - 'discover_tasks': returns list of tasks extracted using Gemini.
    """
    if params is None:
        params = {}
    if action == "read_inbox":
        return gmail_service.read_inbox()
    elif action == "discover_tasks":
        return gmail_service.discover_tasks()
    else:
        raise ValueError(f"Unsupported action: {action}")
