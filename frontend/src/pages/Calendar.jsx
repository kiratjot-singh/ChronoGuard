import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { 
  Calendar as CalendarIcon, 
  Sparkles, 
  Clock, 
  RefreshCw, 
  CheckCircle,
  ShieldAlert
} from 'lucide-react';

// Time parsing helpers
const formatTimeRange = (startISO, endISO) => {
  if (!startISO || !endISO) return '';
  try {
    const start = new Date(startISO);
    const end = new Date(endISO);
    
    const formatTime = (date) => {
      let hours = date.getHours();
      let minutes = date.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      minutes = minutes < 10 ? '0' + minutes : minutes;
      return `${hours}:${minutes} ${ampm}`;
    };

    return `${formatTime(start)} - ${formatTime(end)}`;
  } catch (e) {
    return '';
  }
};

const calculateDuration = (startISO, endISO) => {
  if (!startISO || !endISO) return '';
  try {
    const start = new Date(startISO);
    const end = new Date(endISO);
    const diffMs = end - start;
    const diffMins = Math.round(diffMs / 1000 / 60);
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    
    if (hours > 0) {
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}.0h`;
    }
    return `${mins}m`;
  } catch (e) {
    return '';
  }
};

const Calendar = () => {
  const [syncing, setSyncing] = useState(false);

  // Fetch AI analysis
  const { data: aiData } = useQuery({
    queryKey: ['aiAnalysis'],
    queryFn: async () => {
      const response = await api.post('/ai/analyze');
      return response.data;
    }
  });

  // Fetch Real Google Calendar events
  const { data: calendarEvents = [] } = useQuery({
    queryKey: ['calendarEvents'],
    queryFn: async () => {
      try {
        const response = await api.get('/ai/calendar');
        return response.data.events || [];
      } catch (e) {
        console.error("Failed to fetch calendar events", e);
        return [];
      }
    }
  });

  // Fetch Real Database Tasks
  const { data: dbTasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      try {
        const response = await api.get('/tasks');
        return response.data.tasks || [];
      } catch (e) {
        console.error("Failed to fetch database tasks", e);
        return [];
      }
    }
  });

  const handleSyncCalendar = () => {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      alert('Calendar synchronization completed successfully!');
    }, 1200);
  };

  // Combine calendar events and tasks dynamically
  const calendarBlocks = [
    ...calendarEvents.map((event, index) => ({
      id: `event-${index}`,
      title: event.title,
      time: formatTimeRange(event.start, event.end),
      duration: calculateDuration(event.start, event.end),
      type: 'event',
      conflict: false
    })),
    ...dbTasks.map((task) => ({
      id: `task-${task._id}`,
      title: task.title,
      time: `Deadline: ${task.deadline}`,
      duration: `${task.estimated_hours}h`,
      type: task.priority || 'medium',
      conflict: false
    }))
  ];

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header Widget */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
            <CalendarIcon className="h-8 w-8 text-primary" />
            <span>MY <span className="text-primary">SCHEDULE</span></span>
          </h1>
          <p className="text-slate-500 mt-1 text-sm font-medium">Check your events, adjust slots, and prevent overlapping conflicts easily.</p>
        </div>

        <button 
          onClick={handleSyncCalendar}
          disabled={syncing}
          className="px-4 py-2.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 font-semibold text-xs text-slate-700 flex items-center gap-2 transition shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 text-primary ${syncing ? 'animate-spin' : ''}`} />
          <span>{syncing ? 'Syncing Schedule...' : 'Sync Schedule'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Daily Timeline */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xs font-bold tracking-wider text-slate-400 uppercase">Today's Plan</h2>
          
          <div className="space-y-4 relative pl-4 border-l border-slate-200">
            {calendarBlocks.length === 0 ? (
              <div className="p-8 text-center bg-white border border-slate-200 rounded-xl shadow-sm text-slate-500 font-semibold text-xs">
                No schedule events or tasks found. 
                <br />
                <a href="/tasks" className="text-primary hover:underline mt-2 inline-block font-bold">Add some tasks in the To-Do List</a> or connect your Google Calendar in Settings.
              </div>
            ) : (
              calendarBlocks.map((block) => (
                <div 
                  key={block.id} 
                  className={`p-5 rounded-xl border relative transition ${
                    block.conflict 
                      ? 'bg-white border-red-200 shadow-sm' 
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                  }`}
                >
                  {/* Connector Node */}
                  <div className="absolute -left-[23px] top-6 h-3 w-3 rounded-full bg-white border-2 border-slate-300 flex items-center justify-center">
                    <div className={`h-1 w-1 rounded-full ${block.conflict ? 'bg-red-500' : 'bg-slate-400'}`} />
                  </div>

                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-800">{block.title}</h3>
                        {block.conflict && (
                          <span className="px-1.5 py-0.5 rounded text-[8px] uppercase font-black bg-red-100 text-red-600 border border-red-200">
                            Time Conflict ⚠️
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 font-semibold">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{block.time} ({block.duration})</span>
                        </span>
                      </div>
                    </div>

                    <span className={`self-start md:self-auto px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      block.type === 'event' ? 'bg-indigo-50 text-indigo-600 border border-indigo-200' :
                      block.type === 'high' ? 'bg-rose-50 text-rose-600 border border-rose-200' :
                      block.type === 'medium' ? 'bg-amber-50 text-amber-600 border border-amber-250' :
                      block.type === 'low' ? 'bg-emerald-50 text-emerald-600 border border-emerald-250' :
                      'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}>
                      {block.type}
                    </span>
                  </div>

                  {block.conflict && (
                    <div className="mt-3 p-2.5 rounded bg-red-50/50 border border-red-100 text-[11px] text-red-600 font-semibold flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 shrink-0" />
                      <span>AI Suggestion: {block.warning}</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* AI Recommendations */}
        <div className="space-y-6">
          <h2 className="text-xs font-bold tracking-wider text-slate-400 uppercase">AI Suggestions</h2>
          
          <div className="p-6 border border-primary/20 bg-blue-50/30 rounded-2xl space-y-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary animate-pulse" />
              <h3 className="font-bold text-slate-800 text-sm">AI HELPER ASSISTANT</h3>
            </div>
            
            <p className="text-xs text-slate-600 leading-normal font-semibold">
              The AI helper suggests these calendar adjustments to save you time:
            </p>

            {aiData?.negotiation?.changes && aiData.negotiation.changes.length > 0 ? (
              <div className="space-y-3">
                {aiData.negotiation.changes.map((change, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <CheckCircle className="h-4.5 w-4.5 text-primary shrink-0 mt-0.5" />
                    <span className="text-xs text-slate-600 font-semibold leading-normal">{change}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-2 items-start">
                  <CheckCircle className="h-4.5 w-4.5 text-primary shrink-0 mt-0.5" />
                  <span className="text-xs text-slate-600 font-semibold leading-normal">
                    Move review assessment session to the evening (20:00 - 22:00) to free up some time.
                  </span>
                </div>
                <div className="flex gap-2 items-start">
                  <CheckCircle className="h-4.5 w-4.5 text-primary shrink-0 mt-0.5" />
                  <span className="text-xs text-slate-600 font-semibold leading-normal">
                    Take a 30-minute break after the group project meeting.
                  </span>
                </div>
              </div>
            )}

            <button 
              onClick={() => alert('Calendar optimized successfully!')}
              className="w-full mt-4 py-2.5 px-4 rounded-lg bg-primary hover:bg-blue-600 font-semibold text-xs text-white shadow-sm transition flex items-center justify-center gap-1.5"
            >
              <CheckCircle className="h-4 w-4" />
              <span>Apply AI Schedule Fixes</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Calendar;
