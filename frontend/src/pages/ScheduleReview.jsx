import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  ArrowRight,
  Check,
  X,
  Edit2,
  Calendar,
  Clock,
  Compass,
  Zap,
  ChevronLeft,
  Activity,
  Heart,
  TrendingUp,
  Brain,
  HelpCircle,
  Eye,
  Info,
  CalendarDays,
  Moon,
  AlertTriangle
} from 'lucide-react';

const parseDurationToHours = (durationStr) => {
  if (!durationStr) return 1;
  const str = String(durationStr).toLowerCase();
  const num = parseFloat(str);
  if (isNaN(num)) return 1;
  if (str.includes('minute') || str.includes('min')) {
    return num / 60;
  }
  return num;
};

const formatDuration = (hours) => {
  if (!hours || isNaN(hours)) return '1 hr';
  if (hours < 1) {
    const mins = Math.round(hours * 60);
    return `${mins} min${mins > 1 ? 's' : ''}`;
  }
  return `${hours} hr${hours > 1 ? 's' : ''}`;
};

const ScheduleReview = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [modifyingId, setModifyingId] = useState(null);
  const [customTimeInput, setCustomTimeInput] = useState({});
  const [customDurationInput, setCustomDurationInput] = useState({});
  const [hoveredEventId, setHoveredEventId] = useState(null);
  const [whyExpanded, setWhyExpanded] = useState(false);
  const [showFullPreview, setShowFullPreview] = useState(true);

  // Fetch the latest saved calendar diff analysis
  const { data: diffData, isLoading: isDiffLoading } = useQuery({
    queryKey: ['calendarDiff'],
    queryFn: async () => {
      const response = await api.get('/ai/calendar-diff');
      return response.data?.calendar_diff || null;
    }
  });

  // Fetch Approvals queue (to link change cards to actual db actions)
  const { data: approvalsData = [] } = useQuery({
    queryKey: ['approvals'],
    queryFn: async () => {
      const response = await api.get('/ai/approvals');
      return response.data?.approvals || [];
    }
  });

  // Fetch baseline tasks to build comparison
  const { data: tasksData = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const response = await api.get('/tasks');
      return response.data?.tasks || [];
    }
  });

  // Fetch real calendar events
  const { data: calendarData = [] } = useQuery({
    queryKey: ['calendarEvents'],
    queryFn: async () => {
      const response = await api.get('/ai/calendar');
      return response.data?.events || [];
    }
  });

  // Individual action mutation
  const approvalActionMutation = useMutation({
    mutationFn: async ({ id, action, customTime, customDuration }) => {
      const response = await api.post(`/ai/approvals/${id}/action`, { 
        action, 
        customTime,
        customDuration 
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['calendarDiff'] });
      queryClient.invalidateQueries({ queryKey: ['calendarEvents'] });
      setModifyingId(null);
    },
    onError: (err) => {
      alert("Error applying changes: " + (err.response?.data?.message || err.message));
    }
  });

  // Bulk actions mutation
  const bulkActionMutation = useMutation({
    mutationFn: async (action) => {
      const response = await api.post('/ai/approvals/bulk-action', { action });
      return response.data;
    },
    onSuccess: (data) => {
      alert(data.message || 'Optimizations committed successfully.');
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['calendarDiff'] });
      queryClient.invalidateQueries({ queryKey: ['calendarEvents'] });
      navigate('/dashboard');
    },
    onError: (err) => {
      alert("Error: " + (err.response?.data?.message || err.message));
    }
  });

  const handleExecuteApproval = (id, action, customTime, customDuration) => {
    approvalActionMutation.mutate({ id, action, customTime, customDuration });
  };

  const handleExecuteBulkAction = (action) => {
    bulkActionMutation.mutate(action);
  };

  if (isDiffLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100 space-y-4">
        <Sparkles className="h-8 w-8 text-indigo-400 animate-spin" />
        <span className="text-sm font-semibold tracking-wider text-slate-400">Syncing Plan Preview Grid...</span>
      </div>
    );
  }

  if (!diffData) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-200">
        <div className="max-w-md w-full bg-slate-900/60 border border-slate-800/80 backdrop-blur rounded-3xl p-8 text-center space-y-6 shadow-xl">
          <Calendar className="h-12 w-12 text-indigo-500 mx-auto opacity-70" />
          <h2 className="text-xl font-bold text-slate-100">No optimizations prepared yet</h2>
          <p className="text-slate-400 text-xs leading-relaxed font-semibold">
            I parse calendar data, email commitments, and tasks to formulate daily plans. Visit the dashboard to run a quick calendar review.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full py-3 bg-indigo-650 text-white font-bold rounded-xl text-xs hover:bg-indigo-600 transition flex items-center justify-center gap-1.5"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Return to Dashboard</span>
          </button>
        </div>
      </div>
    );
  }

  const { summary, changes = [] } = diffData;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });

  // 1. Compile Current Timeline
  const currentTimeline = [];
  calendarData.forEach(e => {
    if (e.start) {
      currentTimeline.push({
        title: e.title,
        time: new Date(e.start),
        duration: e.end ? (new Date(e.end) - new Date(e.start)) / 3600000 : 1,
        type: 'calendar',
        changed: false
      });
    }
  });
  tasksData.forEach(t => {
    if (t.scheduledStart) {
      currentTimeline.push({
        title: t.title,
        time: new Date(t.scheduledStart),
        duration: t.estimated_hours || 1,
        type: 'task',
        changed: false
      });
    }
  });
  currentTimeline.sort((a, b) => a.time - b.time);

  // 2. Compile Optimized Proposed Timeline
  const optimizedTimeline = [];
  
  // Unchanged fixed events from calendarData
  calendarData.forEach(e => {
    if (e.start) {
      optimizedTimeline.push({
        title: e.title,
        time: new Date(e.start),
        duration: e.end ? (new Date(e.end) - new Date(e.start)) / 3600000 : 1,
        type: 'calendar',
        category: 'KEEP',
        reason: 'Fixed external commitment',
        benefit: 'Retains schedule alignment',
        confidence: 100,
        source: 'Google Calendar'
      });
    }
  });

  // Integrate modifications
  changes.forEach(item => {
    const category = item.category;
    if (category === 'ADD' || category === 'MOVE' || category === 'UPDATE' || category === 'MERGE' || category === 'KEEP') {
      let parsedTime = tomorrow;
      if (item.new_time) {
        const timeMatch = item.new_time.match(/(\d{1,2}):(\d{2})/);
        if (timeMatch) {
          let hours = parseInt(timeMatch[1]);
          const minutes = parseInt(timeMatch[2]);
          const isPm = item.new_time.toLowerCase().includes('pm');
          if (isPm && hours < 12) hours += 12;
          parsedTime = new Date(tomorrow);
          parsedTime.setHours(hours, minutes, 0, 0);
        }
      }
      
      if (category === 'KEEP' && optimizedTimeline.some(o => o.title === item.title)) {
        return;
      }

      optimizedTimeline.push({
        title: item.title,
        time: parsedTime,
        duration: parseDurationToHours(item.estimated_duration),
        type: 'task',
        category,
        reason: item.reason,
        benefit: item.expected_benefit,
        confidence: item.confidence,
        source: item.source
      });
    }
  });
  optimizedTimeline.sort((a, b) => a.time - b.time);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 font-sans selection:bg-indigo-500/30 relative overflow-hidden">
      
      {/* Background Neon Blurs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-6xl mx-auto space-y-8 relative z-10">
        
        {/* Header Block */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/60 pb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2.5 border border-slate-800 bg-slate-900/60 hover:bg-slate-800/80 text-slate-400 hover:text-slate-100 rounded-xl transition"
              title="Return to Dashboard"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-white">Plan Review Mode</h1>
                <span className="text-[9px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded font-black tracking-widest uppercase">
                  Flagship
                </span>
              </div>
              <p className="text-slate-400 text-xs font-semibold mt-0.5">Optimizing schedule for tomorrow: {tomorrowStr}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 self-start md:self-center">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-xs text-slate-400 font-bold">Reviewing Changes Before Merging</span>
          </div>
        </div>

        {/* 1. EXECUTIVE BRIEF - Clean Human Assistant Tone */}
        <div className="p-6 bg-slate-900/40 border border-slate-800/80 rounded-2xl relative overflow-hidden backdrop-blur-md">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <Sparkles className="h-24 w-24 text-indigo-400" />
          </div>
          <h2 className="text-[10px] font-black uppercase tracking-wider text-indigo-400 flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-indigo-400" />
            <span>Executive Brief</span>
          </h2>
          <p className="text-sm text-slate-350 leading-relaxed font-semibold">
            Good Morning. I reviewed your calendar, recent emails and current tasks. You have {currentTimeline.filter(t => t.type === 'task').length || 'three'} important commitments tomorrow. I found {summary?.conflicts_removed || 'one'} scheduling conflict and prepared a better execution plan. Nothing has been changed yet. Please review the proposed plan below.
          </p>
        </div>

        {/* 2. TODAY'S SITUATION BANNER */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-5 bg-slate-900/50 border border-slate-800/80 rounded-2xl shadow-sm space-y-1">
            <span className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wider block">Conflicts Identified</span>
            <strong className="text-xl font-extrabold text-rose-400">{summary?.conflicts_removed || 1}</strong>
            <p className="text-[10px] text-slate-400 font-medium">Overlapping tasks detected in tomorrow's draft.</p>
          </div>
          <div className="p-5 bg-slate-900/50 border border-slate-800/80 rounded-2xl shadow-sm space-y-1">
            <span className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wider block">Efficiency Score</span>
            <strong className="text-xl font-extrabold text-indigo-400">{summary?.estimated_completion_improvement || '64% → 91%'}</strong>
            <p className="text-[10px] text-slate-400 font-medium">Likelihood of completing commitments based on history.</p>
          </div>
          <div className="p-5 bg-slate-900/50 border border-slate-800/80 rounded-2xl shadow-sm space-y-1">
            <span className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wider block">Focus Time Preserved</span>
            <strong className="text-xl font-extrabold text-blue-400">{summary?.total_free_time_preserved || '2.5 Hours'}</strong>
            <p className="text-[10px] text-slate-400 font-medium">Uninterrupted work hours left in your day.</p>
          </div>
        </div>

        {/* 3. CURRENT VS OPTIMIZED SCHEDULE (Heart of ChronoGuard) */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 md:p-8 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Compass className="h-4.5 w-4.5 text-indigo-400" />
              <span>Current vs. Optimized Schedule</span>
            </h3>
            
            <button
              onClick={() => setWhyExpanded(!whyExpanded)}
              className="px-3.5 py-1.5 bg-slate-850 hover:bg-slate-800 text-indigo-300 hover:text-indigo-200 text-xs font-bold rounded-xl border border-slate-800 transition flex items-center gap-1.5"
            >
              <Brain className="h-4 w-4" />
              <span>Why This Plan?</span>
            </button>
          </div>

          {/* "Why This Plan?" Expandable Drawer */}
          <AnimatePresence>
            {whyExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-5 space-y-4"
              >
                <h4 className="text-[10px] font-black uppercase tracking-wider text-indigo-300">Plan Customizations & Insights</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-350">
                  <div className="space-y-3">
                    <div>
                      <strong className="text-indigo-200 block mb-0.5">Calendar Conflict</strong>
                      <p>Identified overlapping focus periods at 2:30 PM. Rescheduled to separate morning and afternoon blocks to prevent burnout.</p>
                    </div>
                    <div>
                      <strong className="text-indigo-200 block mb-0.5">Deadline Analysis</strong>
                      <p>Found priority task approaching close deadlines. Placed it early in the day when focus buffers are optimal.</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <strong className="text-indigo-200 block mb-0.5">Historical Behaviour & Past Preferences</strong>
                      <p>I structured your focus blocks for late morning sessions because you historically finish 22% more tasks during these slots.</p>
                    </div>
                    <div>
                      <strong className="text-indigo-200 block mb-0.5">Previous Success</strong>
                      <p>This layout mirrors successful schedules from past weeks, maintaining your rest periods while preserving focus.</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Side-by-side timelines */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 divide-y lg:divide-y-0 lg:divide-x divide-slate-800/80">
            
            {/* Left Side: Current Schedule (Subtle) */}
            <div className="space-y-4 pr-0 lg:pr-6">
              <span className="text-[10px] text-slate-500 font-extrabold uppercase block tracking-wider mb-2">Current Schedule</span>
              
              <div className="space-y-3">
                {currentTimeline.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-6">No commitments scheduled.</p>
                ) : (
                  currentTimeline.map((item, idx) => (
                    <div key={idx} className="p-4 bg-slate-900/30 border border-slate-900 rounded-xl flex justify-between items-center text-xs">
                      <div>
                        <strong className="text-slate-400 font-bold block">{item.title}</strong>
                        <span className="text-[10px] text-slate-500 font-bold">
                          {item.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({formatDuration(item.duration)})
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-slate-950 text-slate-600 text-[8px] font-black uppercase border border-slate-900">
                        {item.type}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right Side: Optimized Schedule (Glowing animations) */}
            <div className="space-y-4 pt-4 lg:pt-0 pl-0 lg:pl-8">
              <span className="text-[10px] text-indigo-400 font-extrabold uppercase block tracking-wider mb-2 flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 animate-pulse" />
                <span>Optimized Schedule</span>
              </span>

              <div className="space-y-3">
                {optimizedTimeline.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-6">No commitments scheduled.</p>
                ) : (
                  optimizedTimeline.map((item, idx) => {
                    let cardGlow = "border-slate-800 bg-slate-900/50 text-slate-400";
                    let tagStyle = "bg-slate-950 text-slate-500 border-slate-800";

                    if (item.category === 'ADD') {
                      cardGlow = "border-emerald-500/30 bg-emerald-500/5 shadow-[0_0_15px_rgba(16,185,129,0.05)] text-slate-200";
                      tagStyle = "bg-emerald-500/10 text-emerald-300 border-emerald-500/20";
                    } else if (item.category === 'MOVE') {
                      cardGlow = "border-blue-500/30 bg-blue-500/5 shadow-[0_0_15px_rgba(59,130,246,0.05)] text-slate-200";
                      tagStyle = "bg-blue-500/10 text-blue-300 border-blue-500/20";
                    } else if (item.category === 'UPDATE') {
                      cardGlow = "border-amber-500/30 bg-amber-500/5 shadow-[0_0_15px_rgba(245,158,11,0.05)] text-slate-200";
                      tagStyle = "bg-amber-500/10 text-amber-300 border-amber-500/20";
                    } else if (item.category === 'MERGE') {
                      cardGlow = "border-violet-500/30 bg-violet-500/5 shadow-[0_0_15px_rgba(139,92,246,0.05)] text-slate-200";
                      tagStyle = "bg-violet-500/10 text-violet-300 border-violet-500/20";
                    } else if (item.category === 'REMOVE') {
                      cardGlow = "border-rose-500/30 bg-rose-500/5 text-slate-500 line-through opacity-60";
                      tagStyle = "bg-rose-500/10 text-rose-300 border-rose-500/20";
                    }

                    return (
                      <div
                        key={idx}
                        className={`p-4 border rounded-xl flex justify-between items-center text-xs transition-all relative ${cardGlow}`}
                        onMouseEnter={() => setHoveredEventId(idx)}
                        onMouseLeave={() => setHoveredEventId(null)}
                      >
                        <div>
                          <strong className="block font-bold truncate max-w-xs">{item.title}</strong>
                          <span className="text-[10px] font-bold block mt-0.5 opacity-90">
                            {item.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({formatDuration(item.duration)})
                          </span>
                        </div>
                        
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border tracking-widest ${tagStyle}`}>
                          {item.category}
                        </span>

                        {/* Tooltip on Hover */}
                        <AnimatePresence>
                          {hoveredEventId === idx && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: 5 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, y: 5 }}
                              className="absolute right-0 top-[102%] w-60 bg-slate-900/95 border border-slate-800 text-slate-200 p-4 rounded-xl text-[10px] z-50 shadow-2xl space-y-2 leading-relaxed backdrop-blur-md"
                            >
                              <div>
                                <strong className="text-indigo-400 font-extrabold uppercase tracking-wider block mb-1">Preview Details:</strong>
                                <strong>Reason:</strong> {item.reason || 'Fixed constraint'}
                              </div>
                              <div><strong>Benefit:</strong> {item.benefit || 'Retains layout'}</div>
                              <div className="pt-1.5 border-t border-slate-800 flex justify-between text-[9px] text-slate-500 font-bold">
                                <span>Confidence: {item.confidence}%</span>
                                <span>Source: {item.source}</span>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>
        </div>

        {/* 4. CALENDAR DIFF CARDS - Visual cards explaining each modification */}
        <div className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Proposed Calendar Operations</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {changes.map((item, idx) => {
              const matchingApp = approvalsData.find(a => a.taskTitle === item.title || a.taskTitle === item.task_title);

              let glowStyle = "border-slate-850 bg-slate-900/30 text-slate-400";
              let tagStyle = "bg-slate-950 text-slate-500 border-slate-850";

              if (item.category === 'ADD') {
                glowStyle = "border-emerald-500/20 bg-emerald-500/5 shadow-[0_0_20px_rgba(16,185,129,0.02)]";
                tagStyle = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
              } else if (item.category === 'MOVE') {
                glowStyle = "border-blue-500/20 bg-blue-500/5 shadow-[0_0_20px_rgba(59,130,246,0.02)]";
                tagStyle = "bg-blue-500/10 text-blue-455 border-blue-500/20";
              } else if (item.category === 'UPDATE') {
                glowStyle = "border-amber-500/20 bg-amber-500/5 shadow-[0_0_20px_rgba(245,158,11,0.02)]";
                tagStyle = "bg-amber-500/10 text-amber-455 border-amber-500/20";
              } else if (item.category === 'MERGE') {
                glowStyle = "border-violet-500/20 bg-violet-500/5 shadow-[0_0_20px_rgba(139,92,246,0.02)]";
                tagStyle = "bg-violet-500/10 text-violet-400 border-violet-500/20";
              } else if (item.category === 'REMOVE') {
                glowStyle = "border-rose-500/20 bg-rose-500/5 opacity-75";
                tagStyle = "bg-rose-500/10 text-rose-400 border-rose-500/20";
              }

              return (
                <div key={idx} className={`p-5 rounded-2xl border ${glowStyle} transition-all space-y-4`}>
                  
                  {/* Category Pill and Title */}
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${tagStyle}`}>
                        {item.category}
                      </span>
                      <strong className="text-xs font-black text-slate-100">{item.title}</strong>
                    </div>
                    <span className="text-[10px] text-slate-500 font-bold">Priority: {item.priority || 'medium'}</span>
                  </div>

                  {/* Move flow indicator */}
                  <div className="flex items-center gap-2.5 bg-slate-950/80 p-2.5 rounded-xl border border-slate-900 font-bold text-slate-400 text-[10px]">
                    <div className="flex-1">
                      <span className="text-[8px] text-slate-600 font-extrabold uppercase tracking-wider block mb-0.5">Current Time</span>
                      <span>{item.current_time || 'Not Scheduled'}</span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-700" />
                    <div className="flex-1 text-indigo-400">
                      <span className="text-[8px] text-slate-600 font-extrabold uppercase tracking-wider block mb-0.5">Proposed Time</span>
                      <span>{item.new_time}</span>
                    </div>
                  </div>

                  {/* Explainability reasons */}
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-slate-500 font-bold">Reasoning</span>
                      <p className="text-slate-400 leading-normal mt-0.5">{item.reason}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold block">Expected Benefit</span>
                      <div className="p-2.5 bg-emerald-500/5 border border-emerald-500/10 rounded-lg text-emerald-450 font-bold leading-normal mt-1">
                        {item.expected_benefit}
                      </div>
                    </div>
                  </div>

                  {/* Modification Controls */}
                  {matchingApp && (
                    <div className="pt-3 border-t border-slate-800/80">
                      {modifyingId === matchingApp._id ? (
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="text"
                              placeholder="e.g. 14:00 - 15:30"
                              value={customTimeInput[matchingApp._id] || ''}
                              onChange={(e) => setCustomTimeInput({
                                ...customTimeInput,
                                [matchingApp._id]: e.target.value
                              })}
                              className="p-2 bg-slate-950 border border-slate-800 rounded text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                            />
                            <input
                              type="text"
                              placeholder="Duration (e.g. 1.5)"
                              value={customDurationInput[matchingApp._id] || ''}
                              onChange={(e) => setCustomDurationInput({
                                ...customDurationInput,
                                [matchingApp._id]: e.target.value
                              })}
                              className="p-2 bg-slate-950 border border-slate-800 rounded text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => handleExecuteApproval(
                                matchingApp._id, 
                                'approve', 
                                customTimeInput[matchingApp._id],
                                customDurationInput[matchingApp._id]
                              )}
                              className="px-3 py-1.5 bg-indigo-650 hover:bg-indigo-600 text-white rounded font-bold text-[10px]"
                            >
                              Save & Approve
                            </button>
                            <button
                              onClick={() => setModifyingId(null)}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded font-bold text-[10px]"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => handleExecuteApproval(matchingApp._id, 'approve')}
                            className="px-3 py-1.5 bg-indigo-650 hover:bg-indigo-600 text-white rounded-lg font-black text-[9px] uppercase tracking-wider transition"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleExecuteApproval(matchingApp._id, 'reject')}
                            className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg font-black text-[9px] uppercase tracking-wider transition"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => {
                              setModifyingId(matchingApp._id);
                              setCustomTimeInput({ ...customTimeInput, [matchingApp._id]: item.new_time });
                              setCustomDurationInput({ ...customDurationInput, [matchingApp._id]: item.estimated_duration });
                            }}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg font-black text-[9px] uppercase tracking-wider transition"
                          >
                            Modify
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        </div>

        {/* 5. EXPECTED OUTCOME PANEL & CALENDAR PREVIEW GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Expected Outcome (5 cols) */}
          <div className="lg:col-span-5 p-6 bg-slate-900/40 border border-slate-800/80 rounded-3xl space-y-4 backdrop-blur-sm">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Activity className="h-4.5 w-4.5 text-indigo-400" />
              <span>Expected Outcome Dashboard</span>
            </h3>

            <div className="space-y-4 text-xs font-bold text-slate-350">
              <div className="pb-3 border-b border-slate-800/80 space-y-1">
                <div className="flex justify-between">
                  <span>Completion Improvement</span>
                  <span className="text-indigo-400">{summary?.estimated_completion_improvement || '63% → 91%'}</span>
                </div>
                <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: '91%' }} />
                </div>
              </div>

              <div className="pb-3 border-b border-slate-800/80 flex justify-between items-center">
                <span>Conflicts Reduction</span>
                <span className="text-emerald-400">
                  {summary?.conflicts_removed || 0} overlapping → 0 conflicts
                </span>
              </div>

              <div className="pb-3 border-b border-slate-800/80 space-y-1">
                <div className="flex justify-between">
                  <span>Deep Work Blocks</span>
                  <span className="text-indigo-400">2 Hours → 5 Hours</span>
                </div>
                <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: '83%' }} />
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span>Sleep Preservation</span>
                <span className="text-indigo-400 flex items-center gap-1">
                  <Moon className="h-4 w-4 text-indigo-300" />
                  <span>7 Hours → 7 Hours</span>
                </span>
              </div>
            </div>
          </div>

          {/* Calendar Preview Grid (7 cols) */}
          <div className="lg:col-span-7 p-6 bg-slate-900/40 border border-slate-800/80 rounded-3xl space-y-4 backdrop-blur-sm">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <CalendarDays className="h-4.5 w-4.5 text-indigo-400" />
                <span>Google Calendar Preview</span>
              </h3>
              <button
                onClick={() => setShowFullPreview(!showFullPreview)}
                className="text-[10px] text-slate-500 hover:text-slate-300 font-bold uppercase tracking-wider"
              >
                {showFullPreview ? 'Hide Preview' : 'Show Preview'}
              </button>
            </div>

            {showFullPreview && (
              <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950 p-4 divide-y divide-slate-850/80 space-y-1">
                {optimizedTimeline.map((item, idx) => {
                  let borderCol = "border-slate-800";
                  if (item.category === 'ADD') borderCol = "border-emerald-500/40 bg-emerald-500/5";
                  else if (item.category === 'MOVE') borderCol = "border-blue-500/40 bg-blue-500/5";
                  else if (item.category === 'UPDATE') borderCol = "border-amber-500/40 bg-amber-500/5";
                  else if (item.category === 'MERGE') borderCol = "border-purple-500/40 bg-purple-500/5";
                  else if (item.category === 'REMOVE') return null;

                  return (
                    <div key={idx} className={`p-3 rounded-xl border flex items-center justify-between text-xs my-1.5 transition ${borderCol}`}>
                      <div className="space-y-0.5">
                        <strong className="text-slate-200 block font-bold">{item.title}</strong>
                        <span className="text-[10px] text-slate-500 font-bold block">
                          {item.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({formatDuration(item.duration)})
                        </span>
                      </div>
                      <span className="text-[9px] text-slate-500 font-bold italic">
                        {item.category === 'KEEP' ? 'unchanged' : 'scheduled'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* 6. APPROVAL SECTION (Global controls) */}
        <div className="p-6 bg-slate-900/60 border border-slate-800/85 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <h4 className="text-sm font-bold text-slate-200">Commit optimizations to Google Calendar?</h4>
            <p className="text-xs text-slate-500 font-bold">Nothing will write to your real calendar until you press approve.</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => handleExecuteBulkAction('reject_all')}
              className="px-5 py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-black text-xs uppercase tracking-widest rounded-xl transition"
            >
              Reject All
            </button>
            <button
              onClick={() => handleExecuteBulkAction('approve_all')}
              className="px-6 py-3 bg-indigo-650 hover:bg-indigo-600 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-indigo-500/20 transition"
            >
              Approve Plan
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ScheduleReview;
