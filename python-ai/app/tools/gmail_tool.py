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


class EmailClassification(BaseModel):
    """Pydantic model representing classification of a Gmail email."""
    subject: str = Field(description="Subject of the email")
    sender: str = Field(description="Sender of the email")
    category: str = Field(description="Classification category: Critical Deadline, Assignment, Meeting, Interview, Bill, Travel, Reminder, Informational, Promotion, Spam, Ignore")
    explanation: str = Field(description="Brief explanation of why it fits this category")


class EmailTask(BaseModel):
    """Pydantic model representing a task extracted from an email."""
    title: str = Field(description="Actionable title of the task representing the email requirements")
    reason: str = Field(description="A clear and specific explanation of why this task was created from the email content")
    deadline: str = Field(description="Extracted deadline description (e.g. 'Tomorrow', 'June 28th', 'July 4th')")
    specific_date: Optional[str] = Field(None, description="The concrete target date of the task in YYYY-MM-DD format if mentioned or implied. Estimate if possible, otherwise null.")
    preferred_start_time: Optional[str] = Field(None, description="The specific hour or time range mentioned in the email (e.g. '14:00', '14:00 - 18:00', '15:30'). Leave empty if not specified.")
    estimated_hours: float = Field(description="Estimated hours to complete the task. Use your AI intelligence to estimate a realistic decimal hour duration (e.g. 0.25, 1.5, 3.0) based on complexity.")
    priority: str = Field(default="medium", description="Priority level: 'high', 'medium', or 'low'.")
    calendar_source: str = Field(default="Gmail", description="The source system, always 'Gmail'.")
    confidence: int = Field(description="Confidence percentage (0-100) representing how certain you are about the extracted task details.")


class ExtractedTasks(BaseModel):
    """Container for email task extraction."""
    classifications: List[EmailClassification] = Field(description="Detailed classification classification entries for every email.")
    tasks: List[EmailTask] = Field(description="Extracted actionable tasks representing only the top 3-4 highest-priority ranked emails that belong to allowed categories, and are not calendar duplicates.")


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

    def extract_tasks(self, emails: List[Dict[str, str]], high_priority_keywords: Optional[List[str]] = None, calendar_events: Optional[List[Dict[str, Any]]] = None) -> List[Dict[str, Any]]:
        """Classifies, filters, and extracts tasks from Gmail emails, performing calendar duplicate checks."""
        if not emails:
            return []

        import datetime
        now = datetime.datetime.now()
        now_str = now.strftime("%A, %B %d, %Y (%I:%M %p)")
        today_str = now.strftime("%Y-%m-%d")
        tomorrow_str = (now + datetime.timedelta(days=1)).strftime("%Y-%m-%d")

        discovered = []
        structured_extractor = llm.with_structured_output(ExtractedTasks)

        # Format all emails into a single payload prompt
        emails_text = ""
        for idx, email in enumerate(emails):
            emails_text += f"""
--- Email #{idx + 1} ---
Subject: {email['subject']}
Sender: {email['sender']}
Body:
{email['body']}
------------------------
"""

        priority_rule = "All interviews, internships, tests, and tasks with specific deadline requirements must be classified as 'high' priority."
        if high_priority_keywords:
            priority_rule = f"Any tasks containing or related to: {', '.join(high_priority_keywords)} must be classified as 'high' priority. Reserve 'medium' and 'low' for other items."

        calendar_context = "None"
        if calendar_events:
            calendar_context = "\n".join([f"- Title: {e.get('title')}, Start: {e.get('start')}" for e in calendar_events])

        prompt = f"""
You are ChronoGuard's Executive Assistant & Email Task Extractor.
Analyze the following list of recent emails (maximum 20) and extract ONLY the most critical, high-impact commitments.

Current System Date/Time Context: {now_str}
Use this context to resolve relative dates (e.g. 'today' is {today_str}, 'tomorrow' is {tomorrow_str}) when outputing specific_date in YYYY-MM-DD.

Google Calendar Events (for duplicate checking):
{calendar_context}

Recent Emails:
{emails_text}

Rules:
1. Classification:
   Classify each email into one of these categories: Critical Deadline, Assignment, Meeting, Interview, Bill, Travel, Reminder, Informational, Promotion, Spam, Ignore.
   Immediately discard (categorize but do NOT create tasks for): Promotion, Spam, Informational, Ignore.

2. Prioritization & Selection:
   Rank the remaining emails using: Deadline urgency, Career impact, Academic impact, Financial impact, Calendar conflicts, and User importance.
   Output ONLY the top 3-4 emails (never show more than four). If only one important email exists, display only one. Do not invent work.

3. Task Category Constraint:
   Only create tasks if they are classified as: Assignment, Interview, Meeting, Bill, Critical Deadline.

4. Duplicate Detection:
   Cross-reference with existing Google Calendar events. If the email contains a commitment (e.g., 'Interview Tomorrow' or 'Meeting at 2pm') that matches an existing event already in the Calendar, do NOT create a task to avoid duplicating work.

5. Task Fields:
   Every task must contain:
   - title: Actionable title
   - reason: A clear and specific explanation of why this task is created from the email content.
   - deadline: E.g., 'Tomorrow', 'June 28th', or 'Immediately'.
   - specific_date: Parse the concrete calendar target date in YYYY-MM-DD format.
   - preferred_start_time: Any specific time window or hours mentioned.
   - estimated_hours: Realistically estimated decimal hour duration (e.g. 0.25, 0.5, 1.5, 3.0) required to complete the task based on complexity.
   - priority level: 'high', 'medium', or 'low'. ({priority_rule})
   - calendar_source: Always 'Gmail'.
   - confidence: Integer percentage (0-100) representing how certain you are about the details.
"""
        try:
            result = structured_extractor.invoke(prompt)
            for task in result.tasks:
                discovered.append(task.model_dump())
        except Exception as e:
            logger.error(f"Failed to extract tasks from emails using Gemini: {e}")
            
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
