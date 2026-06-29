const axios = require('axios');
const Connection = require('../models/Connection');
const logger = console;

/**
 * Automatically refreshes the OAuth access token if expired.
 */
const refreshAccessToken = async (connection) => {
  if (connection.expiryDate && Date.now() < connection.expiryDate) {
    return connection.accessToken;
  }

  if (!connection.refreshToken) {
    throw new Error("No refresh token available to refresh Google session.");
  }

  try {
    const response = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: connection.refreshToken,
      grant_type: 'refresh_token'
    });

    const { access_token, expires_in } = response.data;
    connection.accessToken = access_token;
    connection.expiryDate = Date.now() + (expires_in * 1000);
    await connection.save();

    logger.info("Successfully refreshed Google OAuth access token.");
    return access_token;
  } catch (error) {
    const errMsg = error.response?.data?.error_description || error.message;
    logger.error(`Failed to refresh Google access token: ${errMsg}`);
    throw new Error(`Google authentication expired. Please reconnect in Settings.`);
  }
};

/**
 * Service to fetch user's Google Calendar busy slots.
 */
exports.getCalendarEvents = async (userId) => {
  const connection = await Connection.findOne({ user: userId });
  if (!connection) {
    logger.info(`Google Calendar is not connected for user ${userId}. Returning empty events.`);
    return [];
  }

  const token = await refreshAccessToken(connection);

  try {
    const now = new Date().toISOString();
    const response = await axios.get('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        timeMin: now,
        maxResults: 10,
        singleEvents: true,
        orderBy: 'startTime'
      }
    });

    const items = response.data.items || [];
    return items.map(item => ({
      title: item.summary || "No Title",
      start: item.start.dateTime || item.start.date,
      end: item.end.dateTime || item.end.date,
      id: item.id
    }));
  } catch (error) {
    const errMsg = error.response?.data?.error?.message || error.message;
    throw new Error(`Google Calendar API Error: ${errMsg}`);
  }
};

/**
 * Service to fetch user's Gmail emails/tasks.
 */
exports.getGmailTasks = async (userId, calendarEvents = []) => {
  const connection = await Connection.findOne({ user: userId });
  if (!connection) {
    logger.info(`Gmail is not connected for user ${userId}. Returning empty tasks.`);
    return [];
  }

  const token = await refreshAccessToken(connection);

  try {
    // 1. Fetch recent unread emails from the inbox
    const listResponse = await axios.get('https://gmail.googleapis.com/gmail/v1/users/me/messages', {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        maxResults: 20,
        q: 'is:inbox'
      }
    });

    const messages = listResponse.data.messages || [];
    const rawEmails = [];

    for (const msg of messages) {
      const msgResponse = await axios.get(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const headers = msgResponse.data.payload.headers || [];
      const subject = headers.find(h => h.name.toLowerCase() === 'subject')?.value || 'No Subject';
      const sender = headers.find(h => h.name.toLowerCase() === 'from')?.value || 'Unknown Sender';

      let body = '';
      const payload = msgResponse.data.payload;
      if (payload.parts) {
        const part = payload.parts.find(p => p.mimeType === 'text/plain');
        if (part && part.body && part.body.data) {
          body = Buffer.from(part.body.data, 'base64').toString('utf-8');
        }
      } else if (payload.body && payload.body.data) {
        body = Buffer.from(payload.body.data, 'base64').toString('utf-8');
      }

      rawEmails.push({ subject, sender, body });
    }

    if (rawEmails.length === 0) {
      return [];
    }

    // 2. Send raw emails to the Python AI service to extract tasks
    const User = require('../models/User');
    const user = await User.findById(userId);
    const highPriorityKeywords = user?.highPriorityKeywords || ['interview', 'internship', 'test', 'deadline', 'exam'];

    const pythonAiUrl = process.env.PYTHON_AI_URL || 'http://127.0.0.1:8000';
    const extractUrl = `${pythonAiUrl.replace('/analyze', '')}/extract_tasks`;

    logger.info(`Sending ${rawEmails.length} emails to Python service for task extraction...`);
    const extractResponse = await axios.post(extractUrl, { 
      emails: rawEmails,
      high_priority_keywords: highPriorityKeywords,
      calendar_events: calendarEvents
    });

    return extractResponse.data.tasks || [];
  } catch (error) {
    const errMsg = error.response?.data?.error?.message || error.message;
    throw new Error(`Gmail API Error: ${errMsg}`);
  }
};

/**
 * Create a new event on primary Google Calendar.
 */
exports.createCalendarEvent = async (userId, eventDetails) => {
  const connection = await Connection.findOne({ user: userId });
  if (!connection) {
    throw new Error("Google Calendar is not connected.");
  }

  const token = await refreshAccessToken(connection);

  try {
    const response = await axios.post(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      eventDetails,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    const errMsg = error.response?.data?.error?.message || error.message;
    throw new Error(`Google Calendar Event Creation Failed: ${errMsg}`);
  }
};

/**
 * Fetch recent raw email headers and snippets for deep AI analysis.
 */
exports.getRecentEmails = async (userId) => {
  const connection = await Connection.findOne({ user: userId });
  if (!connection) {
    logger.info(`Gmail is not connected for user ${userId}. Returning empty emails.`);
    return [];
  }

  const token = await refreshAccessToken(connection);

  try {
    const listResponse = await axios.get('https://gmail.googleapis.com/gmail/v1/users/me/messages', {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        maxResults: 15,
        q: 'is:inbox'
      }
    });

    const messages = listResponse.data.messages || [];
    const rawEmails = [];

    for (const msg of messages) {
      const msgResponse = await axios.get(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const headers = msgResponse.data.payload.headers || [];
      const subject = headers.find(h => h.name.toLowerCase() === 'subject')?.value || 'No Subject';
      const sender = headers.find(h => h.name.toLowerCase() === 'from')?.value || 'Unknown Sender';
      const snippet = msgResponse.data.snippet || '';

      rawEmails.push({ subject, sender, body: snippet });
    }

    return rawEmails;
  } catch (error) {
    logger.error(`Error retrieving raw emails for analysis: ${error.message}`);
    return [];
  }
};
