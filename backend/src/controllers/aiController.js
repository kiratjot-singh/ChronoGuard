const axios = require('axios');
const Task = require('../models/Task');
const googleService = require('../services/googleService');

/**
 * Helper functions for semantic task deduplication.
 */
const cleanTaskTitle = (s) => {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length >= 2 && !['and', 'for', 'the', 'with', 'this', 'from', 'your', 'of', 'in', 'at', 'on', 'to'].includes(w));
};

const wordMatch = (a, b) => {
  if (a === b) return true;
  if (a.length >= 3 && b.length >= 3) {
    if (a.startsWith(b) || b.startsWith(a) || a.endsWith(b) || b.endsWith(a)) return true;
  }
  return false;
};

function isSemanticDuplicate(title1, title2) {
  if (!title1 || !title2) return false;
  
  const w1 = cleanTaskTitle(title1);
  const w2 = cleanTaskTitle(title2);
  if (w1.length === 0 || w2.length === 0) return false;

  const s1 = new Set(w1);
  const s2 = new Set(w2);
  
  let intersect = 0;
  const matchedInS2 = new Set();
  
  for (const word1 of s1) {
    for (const word2 of s2) {
      if (!matchedInS2.has(word2) && wordMatch(word1, word2)) {
        intersect++;
        matchedInS2.add(word2);
        break;
      }
    }
  }

  const unionSize = s1.size + s2.size - intersect;
  const similarity = intersect / unionSize;
  const overlapRatio = intersect / Math.min(s1.size, s2.size);

  return similarity >= 0.55 || overlapRatio >= 0.8;
}

/**
 * Helper to parse a time range string (e.g. "14:30 - 15:30" or "2:30 PM - 3:30 PM") and return start/end Date objects
 */
const parseTimeRange = (timeStr, baseDate) => {
  if (typeof timeStr !== 'string') return null;
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(pm|am)?\s*-\s*(\d{1,2}):(\d{2})\s*(pm|am)?/i);
  if (!match) return null;

  let sh = parseInt(match[1]);
  const sm = parseInt(match[2]);
  const sAmPm = match[3] ? match[3].toLowerCase() : null;
  let eh = parseInt(match[4]);
  const em = parseInt(match[5]);
  const eAmPm = match[6] ? match[6].toLowerCase() : null;

  // Convert to 24-hour format if PM is present
  if (sAmPm === 'pm' && sh < 12) sh += 12;
  if (sAmPm === 'am' && sh === 12) sh = 0;
  if (eAmPm === 'pm' && eh < 12) eh += 12;
  if (eAmPm === 'am' && eh === 12) eh = 0;

  // If no explicit AM/PM for start, but end is PM, adjust start too (e.g. 2:30 - 3:30 PM)
  if (!sAmPm && eAmPm === 'pm' && sh < 12 && eh >= 12) {
    sh += 12;
  }

  const start = new Date(baseDate);
  start.setHours(sh, sm, 0, 0);
  const end = new Date(baseDate);
  end.setHours(eh, em, 0, 0);

  return { start, end };
};

/**
 * Helper to find a task by exact or semantic match in pending tasks
 */
const findTaskByTitleMatch = async (userId, searchTitle) => {
  if (!searchTitle) return null;
  const pendingTasks = await Task.find({ user: userId, status: 'pending' });
  const candidates = [];
  const sTitle = searchTitle.toLowerCase().trim();

  for (const task of pendingTasks) {
    const tTitle = task.title.toLowerCase().trim();
    if (tTitle.includes(sTitle) || sTitle.includes(tTitle) || isSemanticDuplicate(task.title, searchTitle)) {
      candidates.push(task);
    }
  }

  if (candidates.length > 0) {
    const exact = candidates.find(t => t.title.toLowerCase().trim() === sTitle);
    if (exact) return exact;

    candidates.sort((a, b) => {
      const diffA = Math.abs(a.title.length - searchTitle.length);
      const diffB = Math.abs(b.title.length - searchTitle.length);
      return diffA - diffB;
    });

    return candidates[0];
  }

  return null;
};


/**
 * Controller to compile user details and invoke the Python FastAPI AI Agent pipeline.
 */
exports.analyzeWorkload = async (req, res) => {
  try {
    const userId = req.user.id;

    // Deduplicate any existing tasks in the database to clean up prior duplicate insertions (preserving completed status)
    try {
      const allTasks = await Task.find({ user: userId });
      for (let i = 0; i < allTasks.length; i++) {
        for (let j = i + 1; j < allTasks.length; j++) {
          const t1 = allTasks[i];
          const t2 = allTasks[j];
          if (t1 && t2 && isSemanticDuplicate(t1.title, t2.title)) {
            // Keep completed tasks, delete pending duplicates
            if (t1.status === 'completed' && t2.status === 'pending') {
              await Task.deleteOne({ _id: t2._id });
              allTasks[j] = null;
            } else if (t2.status === 'completed' && t1.status === 'pending') {
              await Task.deleteOne({ _id: t1._id });
              allTasks[i] = null;
              break;
            } else if (t1.status === 'pending' && t2.status === 'pending') {
              await Task.deleteOne({ _id: t2._id });
              allTasks[j] = null;
            }
          }
        }
      }
    } catch (cleanupErr) {
      console.error("Error during task deduplication cleanup:", cleanupErr.message);
    }

    // Load active cache of remaining database tasks
    let dbTasks = await Task.find({ user: userId });

    // 1. Fetch Google Calendar events first
    const calendarEvents = await googleService.getCalendarEvents(userId);

    // 2. Fetch Gmail tasks and insert high priority tasks into MongoDB
    const gmailTasks = await googleService.getGmailTasks(userId, calendarEvents);
    if (gmailTasks && gmailTasks.length > 0) {
      // Auto-filter only HIGH priority tasks from emails and slice to a maximum of 4 tasks to prevent spamming
      const highPriorityGmailTasks = gmailTasks
        .filter(gt => gt.priority && gt.priority.toLowerCase() === 'high')
        .slice(0, 4);

      for (const gt of highPriorityGmailTasks) {
        const titleTrimmed = gt.title.trim();
        
        // Determine specific date/time scheduling slots from Gmail AI extraction
        let scheduledStart = null;
        let scheduledEnd = null;

        if (gt.specific_date) {
          try {
            const dateParts = gt.specific_date.split('-');
            const year = parseInt(dateParts[0]);
            const month = parseInt(dateParts[1]) - 1; // 0-indexed
            const day = parseInt(dateParts[2]);

            let startHour = 9;
            let startMin = 0;

            if (gt.preferred_start_time) {
              const timeStr = gt.preferred_start_time.toLowerCase();
              // Check 24 hour range first (e.g. 14:00 - 18:00 or 14:00)
              const match24 = timeStr.match(/(\d{1,2}):(\d{2})/);
              if (match24) {
                startHour = parseInt(match24[1]);
                startMin = parseInt(match24[2]);
              } else {
                // Check 12 hour range (e.g. 2pm to 6pm or 2pm)
                const match12 = timeStr.match(/(\d{1,2})\s*(pm|am)/);
                if (match12) {
                  startHour = parseInt(match12[1]);
                  if (match12[2] === 'pm' && startHour < 12) startHour += 12;
                  if (match12[2] === 'am' && startHour === 12) startHour = 0;
                }
              }
            }

            scheduledStart = new Date(year, month, day, startHour, startMin, 0, 0);
            
            const duration = gt.estimated_hours || 1;
            scheduledEnd = new Date(scheduledStart);
            scheduledEnd.setHours(scheduledEnd.getHours() + Math.ceil(duration));
            if (duration % 1 !== 0) {
              scheduledEnd.setMinutes(scheduledEnd.getMinutes() + Math.round((duration % 1) * 60));
            }
          } catch (parseErr) {
            console.error("Failed to parse email preferred start times:", parseErr.message);
          }
        }

        // Semantic check for existing task title
        const existingTask = dbTasks.find(t => isSemanticDuplicate(t.title, titleTrimmed));

        if (existingTask) {
          // If task exists but schedule is unassigned or needs updating, set the correct timing in-place
          if (scheduledStart) {
            existingTask.specificDate = gt.specific_date;
            existingTask.preferredStartTime = gt.preferred_start_time;
            existingTask.scheduledStart = scheduledStart;
            existingTask.scheduledEnd = scheduledEnd;
            existingTask.reason = gt.reason || existingTask.reason;
            existingTask.calendarSource = "Gmail";
            existingTask.confidence = gt.confidence || existingTask.confidence;
            await existingTask.save();
          }
        } else {
          const newTask = await Task.create({
            user: userId,
            title: titleTrimmed,
            deadline: gt.deadline || 'Not specified',
            priority: 'high',
            estimated_hours: gt.estimated_hours || 2,
            status: 'pending',
            specificDate: gt.specific_date,
            preferredStartTime: gt.preferred_start_time,
            scheduledStart,
            scheduledEnd,
            reason: gt.reason || "Actionable item detected in email",
            calendarSource: "Gmail",
            confidence: gt.confidence || 90
          });
          dbTasks.push(newTask);
        }
      }
    }

    // 3. Fetch Google Calendar events and auto-select high priority meetings/events as Tasks
    if (calendarEvents && calendarEvents.length > 0) {
      const highPriorityKeywords = ['interview', 'internship', 'exam', 'test', 'important', 'client', 'review', 'urgently', 'presentation', 'deadline'];
      for (const event of calendarEvents) {
        if (event.title && event.title.startsWith("ChronoGuard:")) continue;
        const titleLower = event.title.toLowerCase();
        const isHighPriority = highPriorityKeywords.some(keyword => titleLower.includes(keyword));

        if (isHighPriority) {
          const titleTrimmed = `Calendar: ${event.title.trim()}`;
          
          // Semantic check for existing task title
          const existingTask = dbTasks.find(t => isSemanticDuplicate(t.title, titleTrimmed));

          if (!existingTask) {
            let deadlineText = 'Not specified';
            if (event.start) {
              try {
                deadlineText = new Date(event.start).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
              } catch (e) {
                deadlineText = event.start;
              }
            }
            let estimatedHours = 1;
            if (event.start && event.end) {
              try {
                const diffMs = new Date(event.end) - new Date(event.start);
                estimatedHours = Math.round((diffMs / 3600000) * 100) / 100 || 1;
              } catch (e) {
                console.error("Error parsing event duration", e);
              }
            }

            await Task.create({
              user: userId,
              title: titleTrimmed,
              deadline: deadlineText,
              priority: 'high',
              estimated_hours: estimatedHours,
              status: 'pending',
              reason: "Imported high-priority calendar commitment",
              calendarSource: "Google Calendar",
              confidence: 100
            });
          }
        }
      }
    }

    // 4. Fetch all user tasks from MongoDB (including the new Gmail/Calendar tasks)
    dbTasks = await Task.find({ user: userId });
    const completedTasks = dbTasks.filter(t => t.status === 'completed');
    const pendingTasks = dbTasks.filter(t => t.status === 'pending');

    const formattedTasks = pendingTasks.map(t => ({
      title: t.title,
      deadline: t.deadline,
      estimated_hours: t.estimated_hours || 2
    }));

    const history = `
Completed:
${completedTasks.map(t => `- ${t.title}`).join('\n') || '- None'}

Missed/Pending:
${pendingTasks.map(t => `- ${t.title} (due: ${t.deadline})`).join('\n') || '- None'}
`.trim();

    // Fetch user profile for custom priority keywords
    const User = require('../models/User');
    const userProfile = await User.findById(userId);
    const highPriorityKeywords = userProfile?.highPriorityKeywords || ['interview', 'internship', 'test', 'deadline', 'exam'];

    // Fetch recent inbox emails for deep loss prevention intelligence analysis
    const emails = await googleService.getRecentEmails(userId);

    // 4. Dispatch payload to Python FastAPI AI service
    const pythonAiUrl = process.env.PYTHON_AI_URL || 'http://127.0.0.1:8000/analyze';
    const payload = {
      user_id: userId.toString(),
      history,
      tasks: formattedTasks,
      calendar_events: calendarEvents.filter(e => e.title && !e.title.startsWith("ChronoGuard:")),
      high_priority_keywords: highPriorityKeywords,
      emails: emails,
      query: req.body.query || "Analyze my schedule, check calendar availability, calculate risk scores, and negotiate schedule improvements."
    };

    console.log(`Sending payload to Python AI Service: ${JSON.stringify(payload)}`);
    const aiResponse = await axios.post(pythonAiUrl, payload);
    const result = aiResponse.data;

    // 4b. Parse Decision Engine outputs and save as database notifications & approvals
    try {
      const Notification = require('../models/Notification');
      const Approval = require('../models/Approval');

      if (result.decision_engine) {
        // Save Notifications
        if (Array.isArray(result.decision_engine.notifications)) {
          for (const notif of result.decision_engine.notifications) {
            const existingNotif = await Notification.findOne({ user: userId, message: notif.message });
            if (!existingNotif) {
              await Notification.create({
                user: userId,
                title: notif.title || 'Assistant Alert',
                message: notif.message,
                type: 'general',
                severity: notif.severity || 'information'
              });
            }
          }
        }

        // Save Approvals
        if (Array.isArray(result.decision_engine.approvals)) {
          for (const appItem of result.decision_engine.approvals) {
            const existingApp = await Approval.findOne({
              user: userId,
              taskTitle: appItem.task_title,
              suggestedTime: appItem.suggested_time,
              status: 'pending'
            });
            if (!existingApp) {
              await Approval.create({
                user: userId,
                taskTitle: appItem.task_title,
                currentTime: appItem.current_time,
                suggestedTime: appItem.suggested_time,
                reason: appItem.reason,
                expectedBenefit: appItem.expected_benefit,
                confidence: appItem.confidence,
                status: 'pending'
              });
            }
          }
        }
      }
    } catch (notifErr) {
      console.error(`Failed to parse Decision Engine outputs: ${notifErr.message}`);
    }

    // Persist AI profile observations and learning insights into MongoDB User Memory
    try {
      const Memory = require('../models/Memory');
      let memory = await Memory.findOne({ user: userId });
      if (!memory) {
        memory = new Memory({ user: userId });
      }

      if (result.profile) {
        const count = memory.observationsCount || 0;

        if (result.profile.focus_score !== undefined) {
          memory.averageFocus = Math.round(((memory.averageFocus * count) + result.profile.focus_score) / (count + 1));
        }

        if (Array.isArray(result.profile.preferred_work_hours)) {
          const hoursSet = new Set(memory.preferredWorkHours || []);
          result.profile.preferred_work_hours.forEach(h => hoursSet.add(h));
          memory.preferredWorkHours = Array.from(hoursSet).sort();
        }

        if (Array.isArray(result.profile.procrastination_patterns)) {
          const patternsSet = new Set(memory.recurringProcrastinationPatterns || []);
          result.profile.procrastination_patterns.forEach(p => patternsSet.add(p));
          memory.recurringProcrastinationPatterns = Array.from(patternsSet).sort();
        }

        if (result.profile.loss_prevention_advice !== undefined) {
          memory.lossPreventionAdvice = result.profile.loss_prevention_advice;
        }

        memory.observationsCount = count + 1;
      }

      if (result.decision_engine && Array.isArray(result.decision_engine.learning_insights)) {
        memory.learningInsights = result.decision_engine.learning_insights;
      }

      memory.updatedAt = new Date();
      await memory.save();
      console.log(`Saved dynamic AI profile and learning insights to user memory.`);
    } catch (dbErr) {
      console.error(`Failed to update user memory in MongoDB: ${dbErr.message}`);
    }

    // Persist the latest calendar diff in MongoDB
    try {
      const CalendarDiff = require('../models/CalendarDiff');
      if (result.calendar_diff) {
        await CalendarDiff.findOneAndUpdate(
          { user: userId },
          {
            user: userId,
            summary: result.calendar_diff.summary,
            changes: result.calendar_diff.changes,
            updatedAt: new Date()
          },
          { upsert: true, new: true }
        );
        console.log(`Saved calendar diff to MongoDB.`);
      }
    } catch (diffErr) {
      console.error(`Failed to update calendar diff in MongoDB: ${diffErr.message}`);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error(`AI Integration Error: ${error.message}`);
    if (error.response && error.response.status === 429) {
      const detail = error.response.data?.detail || "Gemini API rate limit exceeded. Please wait a few seconds and try again.";
      return res.status(429).json({ error: detail });
    }
    return res.status(500).json({ error: error.message });
  }
};

// Apply AI Negotiated Schedule Fixes to Google Calendar
exports.applyCalendarFixes = async (req, res) => {
  try {
    const userId = req.user.id;
    const { changes } = req.body;

    if (!changes || !Array.isArray(changes) || changes.length === 0) {
      return res.status(400).json({ message: "No changes provided to apply." });
    }

    const Task = require('../models/Task');

    // 1. Clear all existing task schedules (except those with specific dates/times parsed from emails)
    await Task.updateMany(
      { 
        user: userId, 
        status: 'pending',
        $or: [
          { specificDate: { $exists: false } },
          { specificDate: null },
          { specificDate: "" }
        ]
      },
      { $unset: { scheduledStart: "", scheduledEnd: "" } }
    );

    const appliedCount = [];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const allocatedSlots = [];

    // Pre-populate allocated slots with any specific-date tasks scheduled for tomorrow to avoid overlaps
    try {
      const tomorrowStart = new Date(tomorrow);
      tomorrowStart.setHours(0, 0, 0, 0);
      const tomorrowEnd = new Date(tomorrow);
      tomorrowEnd.setHours(23, 59, 59, 999);

      const specificTasksForTomorrow = await Task.find({
        user: userId,
        status: 'pending',
        scheduledStart: { $gte: tomorrowStart, $lte: tomorrowEnd }
      });

      for (const t of specificTasksForTomorrow) {
        allocatedSlots.push({ start: t.scheduledStart, end: t.scheduledEnd });
      }
    } catch (allocErr) {
      console.error("Failed to pre-allocate existing specific tasks:", allocErr.message);
    }

    // Helper to find next available slot of 'duration' hours starting from 'startHour'
    const findNextAvailableSlot = (startHour, durationHours) => {
      const candidateStart = new Date(tomorrow);
      candidateStart.setHours(startHour, 0, 0, 0);
      
      let candidateEnd = new Date(candidateStart.getTime() + durationHours * 60 * 60 * 1000);

      let hasOverlap = true;
      let currentStart = new Date(candidateStart);
      while (hasOverlap) {
        hasOverlap = false;
        for (const slot of allocatedSlots) {
          if (currentStart < slot.end && candidateEnd > slot.start) {
            hasOverlap = true;
            currentStart = new Date(slot.end);
            candidateEnd = new Date(currentStart.getTime() + durationHours * 60 * 60 * 1000);
            break;
          }
        }
      }
      return { start: currentStart, end: candidateEnd };
    };

    // 1. Process negotiator changes/suggestions to update database tasks schedules
    const dbTasks = await Task.find({ user: userId, status: 'pending' });
    const matchedTaskIds = new Set();
    
    for (const changeText of changes) {
      const customSlot = parseTimeRange(changeText, tomorrow);

      // Find all tasks that match this changeText and haven't been matched yet
      const candidates = [];
      for (const task of dbTasks) {
        if (matchedTaskIds.has(task._id.toString())) continue;

        const titleLower = task.title.toLowerCase();
        // Check if the change text mentions this task title
        if (changeText.toLowerCase().includes(titleLower) || titleLower.includes(changeText.toLowerCase())) {
          candidates.push(task);
        }
      }

      if (candidates.length > 0) {
        // Sort candidates by title length descending to get the most specific match first
        candidates.sort((a, b) => b.title.length - a.title.length);
        const bestTask = candidates[0];

        matchedTaskIds.add(bestTask._id.toString());
        if (!appliedCount.includes(changeText)) {
          appliedCount.push(changeText);
        }

        if (customSlot) {
          bestTask.scheduledStart = customSlot.start;
          bestTask.scheduledEnd = customSlot.end;
          allocatedSlots.push(customSlot);
        } else if (!bestTask.scheduledStart) {
          const duration = bestTask.estimated_hours || 1;
          const finalSlot = findNextAvailableSlot(9, duration);
          bestTask.scheduledStart = finalSlot.start;
          bestTask.scheduledEnd = finalSlot.end;
          allocatedSlots.push(finalSlot);
        }
        await bestTask.save();
      }
    }

    // 2. Schedule any remaining unscheduled tasks sequentially starting at 9:00 AM tomorrow
    try {
      const unscheduledTasks = await Task.find({ 
        user: userId, 
        status: 'pending', 
        scheduledStart: { $exists: false } 
      });

      for (const task of unscheduledTasks) {
        const duration = task.estimated_hours || 1;
        const finalSlot = findNextAvailableSlot(9, duration);
        allocatedSlots.push(finalSlot);

        task.scheduledStart = finalSlot.start;
        task.scheduledEnd = finalSlot.end;
        await task.save();
      }
    } catch (remErr) {
      console.error("Failed to auto-schedule remaining tasks:", remErr.message);
    }

    // 3. Clear all ChronoGuard prefix events from Google Calendar first to prevent duplicate entries
    try {
      const existingEvents = await googleService.getCalendarEvents(userId);
      const cgEvents = (existingEvents || []).filter(e => e.title && e.title.startsWith("ChronoGuard:"));
      for (const e of cgEvents) {
        await googleService.deleteCalendarEvent(userId, e.id);
      }
    } catch (delErr) {
      console.error("Failed to clean up old ChronoGuard calendar events:", delErr.message);
    }

    // 4. Create Google Calendar events for the scheduled database tasks ONLY
    const tasksToSchedule = await Task.find({
      user: userId,
      status: 'pending',
      scheduledStart: { $exists: true }
    });

    for (const task of tasksToSchedule) {
      const taskEventDetails = {
        summary: `ChronoGuard: ${task.title}`,
        description: `Scheduled task focus block: ${task.title}. Priority: ${task.priority || 'medium'}.`,
        start: { dateTime: task.scheduledStart.toISOString() },
        end: { dateTime: task.scheduledEnd.toISOString() }
      };

      try {
        await googleService.createCalendarEvent(userId, taskEventDetails);
      } catch (err) {
        console.error(`Failed to create calendar event for task: ${task.title}`, err.message);
      }
    }

    return res.status(200).json({
      message: `Successfully scheduled tasks and optimizations on your daily timeline!`,
      applied: appliedCount
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to apply calendar adjustments.", error: error.message });
  }
};

// Retrieve pending approvals for the approval queue
exports.getApprovals = async (req, res) => {
  try {
    const Approval = require('../models/Approval');
    const Task = require('../models/Task');
    const rawApprovals = await Approval.find({ user: req.user.id, status: 'pending' }).sort({ createdAt: -1 });

    const validApprovals = [];
    for (const app of rawApprovals) {
      const task = await findTaskByTitleMatch(req.user.id, app.taskTitle);
      if (!task || task.status !== 'pending') {
        app.status = 'rejected';
        await app.save();
      } else {
        validApprovals.push(app);
      }
    }
    return res.status(200).json({ approvals: validApprovals });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};

// Handle approval action (approve, reject, or modify)
exports.handleApprovalAction = async (req, res) => {
  try {
    const userId = req.user.id;
    const approvalId = req.params.id;
    const { action, customTime } = req.body;
    const Approval = require('../models/Approval');
    const Task = require('../models/Task');
    const googleService = require('../services/googleService');

    const approval = await Approval.findOne({ _id: approvalId, user: userId });
    if (!approval) {
      return res.status(404).json({ message: "Approval item not found." });
    }

    if (action === 'reject') {
      approval.status = 'rejected';
      await approval.save();
      const { logFeedbackEvent } = require('../utils/learningLogger');
      logFeedbackEvent(userId, 'Recommendation Rejected', { task_title: approval.taskTitle, approval_id: approvalId });
      return res.status(200).json({ message: "Schedule suggestion rejected." });
    }

    let targetTime = customTime || approval.suggestedTime;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    let start, end;
    
    const parsedSlot = typeof targetTime === 'string' ? parseTimeRange(targetTime, tomorrow) : null;
    if (parsedSlot) {
      start = parsedSlot.start;
      end = parsedSlot.end;
    } else {
      start = new Date(tomorrow);
      end = new Date(tomorrow);
      try {
        if (customTime && customTime.start && customTime.end) {
          start = new Date(customTime.start);
          end = new Date(customTime.end);
        } else {
          start.setHours(9, 0, 0, 0);
          end.setHours(10, 0, 0, 0);
        }
      } catch (e) {
        start.setHours(9, 0, 0, 0);
        end.setHours(10, 0, 0, 0);
      }
    }

    // Find the corresponding database task
    const task = await findTaskByTitleMatch(userId, approval.taskTitle);
    if (!task) {
      return res.status(404).json({ message: `Pending task '${approval.taskTitle}' not found to reschedule.` });
    }

    // Create Google Calendar event
    const eventDetails = {
      summary: `ChronoGuard: ${task.title}`,
      description: `Scheduled focus block. Reason: ${approval.reason || task.reason || 'Proactive optimization'}.`,
      start: { dateTime: start.toISOString() },
      end: { dateTime: end.toISOString() }
    };

    try {
      await googleService.createCalendarEvent(userId, eventDetails);
    } catch (calErr) {
      console.error("Failed to write to Google Calendar:", calErr.message);
    }

    // Save time slots into task
    task.scheduledStart = start;
    task.scheduledEnd = end;
    await task.save();

    // Update approval status
    approval.status = 'approved';
    const { logFeedbackEvent } = require('../utils/learningLogger');
    if (customTime && typeof customTime === 'string') {
      approval.suggestedTime = customTime;
      logFeedbackEvent(userId, 'Recommendation Modified', { task_title: approval.taskTitle, approval_id: approvalId, customTime });
    } else {
      logFeedbackEvent(userId, 'Recommendation Accepted', { task_title: approval.taskTitle, approval_id: approvalId, suggestedTime: approval.suggestedTime });
    }
    await approval.save();

    return res.status(200).json({ 
      message: "Successfully approved schedule modification and pushed to Google Calendar!",
      task 
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
};

// Handle bulk approval actions (Approve All or Reject All)
exports.bulkApprovalAction = async (req, res) => {
  try {
    const userId = req.user.id;
    const { action } = req.body;
    const Approval = require('../models/Approval');
    const Task = require('../models/Task');
    const googleService = require('../services/googleService');

    const pendingApprovals = await Approval.find({ user: userId, status: 'pending' });

    if (pendingApprovals.length === 0) {
      return res.status(200).json({ message: "No pending approvals to process." });
    }

    if (action === 'reject_all') {
      await Approval.updateMany({ user: userId, status: 'pending' }, { status: 'rejected' });
      const { logFeedbackEvent } = require('../utils/learningLogger');
      logFeedbackEvent(userId, 'Recommendation Rejected All', { count: pendingApprovals.length });
      return res.status(200).json({ message: "Rejected all schedule optimization proposals." });
    }

    if (action === 'approve_all') {
      let successCount = 0;
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      for (const app of pendingApprovals) {
        let start, end;
        const parsedSlot = parseTimeRange(app.suggestedTime, tomorrow);
        if (parsedSlot) {
          start = parsedSlot.start;
          end = parsedSlot.end;
        } else {
          start = new Date(tomorrow);
          start.setHours(9, 0, 0, 0);
          end = new Date(tomorrow);
          end.setHours(10, 0, 0, 0);
        }

        const task = await findTaskByTitleMatch(userId, app.taskTitle);
        if (task) {
          const eventDetails = {
            summary: `ChronoGuard: ${task.title}`,
            description: `Scheduled focus block. Reason: ${app.reason || task.reason || 'Proactive optimization'}.`,
            start: { dateTime: start.toISOString() },
            end: { dateTime: end.toISOString() }
          };
          try {
            await googleService.createCalendarEvent(userId, eventDetails);
          } catch (err) {
            console.error("Google Calendar API error during bulk approve:", err.message);
          }

          task.scheduledStart = start;
          task.scheduledEnd = end;
          await task.save();
          successCount++;
        }

        app.status = 'approved';
        await app.save();
      }

      const { logFeedbackEvent } = require('../utils/learningLogger');
      logFeedbackEvent(userId, 'Recommendation Accepted All', { count: successCount });
      return res.status(200).json({ message: `Successfully approved and scheduled ${successCount} optimizations!` });
    }

    return res.status(400).json({ message: "Invalid bulk action." });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};

// Retrieve the latest calendar diff analysis
exports.getCalendarDiff = async (req, res) => {
  try {
    const CalendarDiff = require('../models/CalendarDiff');
    const Task = require('../models/Task');
    const diff = await CalendarDiff.findOne({ user: req.user.id });
    if (!diff) {
      return res.status(200).json({ calendar_diff: null });
    }

    // Filter changes to exclude completed or deleted tasks
    const filteredChanges = [];
    for (const change of diff.changes) {
      if (change.category === 'KEEP') {
        filteredChanges.push(change);
        continue;
      }
      const task = await findTaskByTitleMatch(req.user.id, change.title || change.task_title);
      if (task && task.status === 'pending') {
        filteredChanges.push(change);
      }
    }
    
    const diffObj = diff.toObject();
    diffObj.changes = filteredChanges;

    return res.status(200).json({ calendar_diff: diffObj });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
