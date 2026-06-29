import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  AlertTriangle, 
  CheckCircle, 
  Activity,
  Shield,
  Zap,
  RefreshCw,
  Compass,
  Mic,
  Volume2,
  VolumeX,
  ChevronDown,
  ChevronUp,
  Bookmark,
  Calendar as CalendarIcon,
  Trophy,
  BrainCircuit,
  Clock,
  Check,
  Eye,
  AlertCircle,
  ThumbsUp,
  Brain,
  ArrowRight
} from 'lucide-react';

const CollapsibleSection = ({ title, icon: Icon, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border border-slate-200 bg-white rounded-2xl overflow-hidden shadow-sm transition hover:shadow-md">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-slate-50/50 hover:bg-slate-50 transition border-b border-slate-100 select-none text-left"
      >
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-4.5 w-4.5 text-indigo-500" />}
          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700">{title}</span>
        </div>
        {isOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
      </button>
      {isOpen && <div className="p-5 space-y-4 animate-in fade-in duration-200">{children}</div>}
    </div>
  );
};

const Dashboard = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [queryInput, setQueryInput] = useState('');
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [activeTab, setActiveTab] = useState('doNow');
  const [selectedTask, setSelectedTask] = useState(null); // for task origin inspection popup
  const [customTimeInput, setCustomTimeInput] = useState({}); // stores manual modify time inputs by approval id
  const [modifyingId, setModifyingId] = useState(null); // approval id being manually edited
  const [hoveredEventId, setHoveredEventId] = useState(null); // hover optimized event id
  
  const [dashboardMode, setDashboardMode] = useState(() => {
    return localStorage.getItem('chronoGuard_dashboardMode') || 'cozy';
  });

  const startVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice recognition is not supported in this browser. Please try using Chrome or Edge.");
      return;
    }
    
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    
    recognition.onstart = () => {
      setListening(true);
    };
    
    recognition.onresult = (event) => {
      const speechToText = event.results[0][0].transcript;
      setQueryInput(speechToText);
    };
    
    recognition.onerror = (e) => {
      console.error("Speech recognition error", e);
      setListening(false);
    };
    
    recognition.onend = () => {
      setListening(false);
    };
    
    recognition.start();
  };

  const handleSpeakOutput = (textToSpeak) => {
    if (!textToSpeak) return;

    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const handleToggleMode = (mode) => {
    setDashboardMode(mode);
    localStorage.setItem('chronoGuard_dashboardMode', mode);
  };

  // Fetch Real Database Tasks
  const { data: tasksData = [], isLoading: isTasksLoading } = useQuery({
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
  const dbTasks = Array.isArray(tasksData) ? tasksData : [];

  // Fetch notifications
  const { data: notificationsData = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      try {
        const response = await api.get('/notifications');
        return response.data.notifications || [];
      } catch (e) {
        return [];
      }
    }
  });

  // Fetch approvals queue
  const { data: approvalsData = [] } = useQuery({
    queryKey: ['approvals'],
    queryFn: async () => {
      try {
        const response = await api.get('/ai/approvals');
        return response.data.approvals || [];
      } catch (e) {
        console.error("Failed to fetch approvals queue", e);
        return [];
      }
    }
  });

  // Fetch current AI analysis state (only if tasks are present)
  const { data: aiData, isLoading: isAiLoading } = useQuery({
    queryKey: ['aiAnalysis'],
    queryFn: async () => {
      const response = await api.post('/ai/analyze', { query: queryInput || undefined });
      return response.data;
    },
    enabled: dbTasks.length > 0,
    staleTime: 60000 * 2,
  });

  // Mutation to trigger new analysis manually
  const runAnalysisMutation = useMutation({
    mutationFn: async (queryText) => {
      const response = await api.post('/ai/analyze', { query: queryText || undefined });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['aiAnalysis'], data);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
    }
  });

  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const handleTriggerAnalysis = (e) => {
    e.preventDefault();
    runAnalysisMutation.mutate(queryInput);
  };

  // Bulk approvals mutation
  const bulkApprovalMutation = useMutation({
    queryKey: ['bulkApproval'],
    mutationFn: async (action) => {
      const response = await api.post('/ai/approvals/bulk-action', { action });
      return response.data;
    },
    onSuccess: (data) => {
      alert(data.message || 'Bulk action executed successfully.');
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['aiAnalysis'] });
      setShowPreviewModal(false);
    },
    onError: (err) => {
      alert("Error executing bulk action: " + (err.response?.data?.message || err.message));
    }
  });

  // Approval queue action mutation (Approve, Reject, Modify)
  const approvalActionMutation = useMutation({
    mutationFn: async ({ id, action, customTime }) => {
      const response = await api.post(`/ai/approvals/${id}/action`, { action, customTime });
      return response.data;
    },
    onSuccess: (data) => {
      alert(data.message || 'Action executed successfully.');
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['aiAnalysis'] });
      setModifyingId(null);
    },
    onError: (err) => {
      alert("Error executing approval action: " + (err.response?.data?.message || err.message));
    }
  });

  const handleExecuteApproval = (id, action, customTime) => {
    approvalActionMutation.mutate({ id, action, customTime });
  };

  const handleExecuteBulkAction = (action) => {
    bulkApprovalMutation.mutate(action);
  };

  const isPerformingAnalysis = isTasksLoading || isAiLoading || runAnalysisMutation.isPending;
  const currentAiState = runAnalysisMutation.data || aiData;

  // Process timeline items dynamically (Calendar + Database Tasks)
  const timelineItems = [];
  if (currentAiState?.calendar_events) {
    currentAiState.calendar_events.forEach(e => {
      if (e.start) {
        const startD = new Date(e.start);
        timelineItems.push({
          title: e.title,
          time: startD,
          type: 'calendar',
          duration: e.end ? (new Date(e.end) - startD) / 3600000 : 1,
        });
      }
    });
  }

  dbTasks.forEach(t => {
    if (t.scheduledStart) {
      const startD = new Date(t.scheduledStart);
      timelineItems.push({
        title: t.title,
        time: startD,
        type: 'task',
        duration: t.estimated_hours || 1,
        priority: t.priority,
        reason: t.reason,
      });
    }
  });

  timelineItems.sort((a, b) => a.time - b.time);

  // Success progress indicators
  const totalTasks = dbTasks.length;
  const completedTasks = dbTasks.filter(t => t.status === 'completed').length;
  const completionPercentage = Math.min(100, Math.round((completedTasks / (totalTasks || 1)) * 100));

  // Priorities from Decision Engine (Feature 8)
  const dashboardTasks = currentAiState?.decision_engine?.dashboard_tasks || [];
  const doNowTasks = dashboardTasks.filter(t => t.category === 'Do Now').slice(0, 3);
  const dueSoonTasks = dashboardTasks.filter(t => t.category === 'Due Soon').slice(0, 3);
  const canWaitTasks = dashboardTasks.filter(t => t.category === 'Can Wait');

  // If Decision Engine tasks are empty, fallback to simple client calculations
  const pendingTasks = dbTasks.filter(t => t.status === 'pending');
  const fallbackDoNow = pendingTasks.filter(t => t.priority === 'high').slice(0, 3);
  const fallbackDueSoon = pendingTasks.filter(t => t.priority === 'medium').slice(0, 3);
  const fallbackCanWait = pendingTasks.filter(t => t.priority === 'low');

  const displayedDoNow = dashboardTasks.length > 0 ? doNowTasks : fallbackDoNow;
  const displayedDueSoon = dashboardTasks.length > 0 ? dueSoonTasks : fallbackDueSoon;
  const displayedCanWait = dashboardTasks.length > 0 ? canWaitTasks : fallbackCanWait;

  // Closest upcoming deadline task
  let closestDeadlineTask = null;
  if (pendingTasks.length > 0) {
    const scheduled = pendingTasks.filter(t => t.scheduledStart).sort((a, b) => new Date(a.scheduledStart) - new Date(b.scheduledStart));
    if (scheduled.length > 0) {
      closestDeadlineTask = scheduled[0];
    } else {
      closestDeadlineTask = pendingTasks[0];
    }
  }

  // Filter Notification Priorities: Only Critical & Important interrupt/alert the user (Feature 5)
  const unreadNotifications = notificationsData.filter(n => !n.read);
  const highPriorityNotifications = unreadNotifications.filter(
    n => n.severity === 'critical' || n.severity === 'important' || n.type === 'risk'
  );

  // Render AI Timeline trace mapping steps
  const steps = [
    { label: "Analyzed your schedule", done: true },
    { label: "Checked Calendar", done: true },
    {
      label: "Found Assignment Email",
      done: dbTasks.some(t => t.calendarSource === 'Gmail') || (currentAiState?.profile?.loss_prevention_advice ? true : false)
    },
    {
      label: "Detected Conflict",
      done: (currentAiState?.risk?.risk_score > 30) || (approvalsData.length > 0)
    },
    {
      label: "Optimized Schedule",
      done: approvalsData.length > 0 || (currentAiState?.decision_engine?.approvals?.length > 0)
    },
    {
      label: "Ready for Approval",
      done: approvalsData.length > 0 || (currentAiState?.decision_engine?.approvals?.length > 0)
    }
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12 font-sans relative">
      
      {/* Task Origin Modal */}
      <AnimatePresence>
        {selectedTask && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-200 shadow-xl rounded-2xl max-w-md w-full p-6 space-y-4"
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                  <BrainCircuit className="h-4.5 w-4.5 text-indigo-500" />
                  <span>Task Source Inspection</span>
                </h3>
                <button 
                  onClick={() => setSelectedTask(null)}
                  className="text-slate-400 hover:text-slate-600 font-extrabold text-xs"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-400 block">Task Title:</span>
                  <strong className="text-slate-700">{selectedTask.title}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Attributed Source:</span>
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-650 font-bold border border-slate-200">
                    {selectedTask.calendarSource || selectedTask.calendar_source || 'Manual'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Confidence:</span>
                  <strong className="text-slate-750">{selectedTask.confidence || 100}%</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Detection context:</span>
                  <p className="text-slate-600 leading-normal bg-slate-50 p-2.5 rounded-lg border border-slate-150 mt-1 italic">
                    "{selectedTask.reason || 'Manually created task'}"
                  </p>
                </div>
              </div>

              <div className="pt-2 text-right">
                <button 
                  onClick={() => setSelectedTask(null)}
                  className="px-4 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-700 transition"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Top Banner section */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 border-b border-slate-100 pb-6">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
              <Shield className="h-8 w-8 text-primary" />
              <span>CHRONOGUARD <span className="text-primary">PORTAL</span></span>
            </h1>
            <p className="text-slate-500 mt-1 text-sm font-medium">Your quiet executive assistant for scheduling, emails, and time protection.</p>
          </div>

          {/* Mode Switcher segmented control */}
          <div className="flex bg-slate-150 p-1 rounded-xl border border-slate-200/60 self-start md:self-center shadow-inner">
            <button
              onClick={() => handleToggleMode('cozy')}
              type="button"
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1.5 cursor-pointer select-none ${
                dashboardMode === 'cozy'
                  ? 'bg-white text-slate-800 shadow-sm scale-102 font-extrabold'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <span>Cozy View 🛋️</span>
            </button>
            <button
              onClick={() => handleToggleMode('technical')}
              type="button"
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1.5 cursor-pointer select-none ${
                dashboardMode === 'technical'
                  ? 'bg-white text-slate-800 shadow-sm scale-102 font-extrabold'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <span>Detailed Agents 🤖</span>
            </button>
          </div>
        </div>

        {/* Live Diagnostics Input */}
        <form onSubmit={handleTriggerAnalysis} className="flex items-center gap-2 w-full xl:w-auto">
          <div className="relative flex-1 xl:w-80">
            <Sparkles className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="Ask Chief of Staff..."
              className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 placeholder-slate-400 text-xs focus:border-primary focus:outline-none transition shadow-sm"
              disabled={isPerformingAnalysis}
            />
            <button
              type="button"
              onClick={startVoiceInput}
              className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md transition ${listening ? 'bg-red-500 text-white animate-pulse' : 'text-slate-450 hover:text-slate-700 hover:bg-slate-50'}`}
              title="Voice Search"
            >
              <Mic className="h-3.5 w-3.5" />
            </button>
          </div>
          <button 
            type="submit"
            disabled={isPerformingAnalysis}
            className="px-4 py-2.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 font-semibold text-xs text-slate-700 flex items-center gap-2 disabled:opacity-50 transition shadow-sm"
          >
            {isPerformingAnalysis ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Zap className="h-3.5 w-3.5 text-primary" />
            )}
            <span>Analyze</span>
          </button>
        </form>
      </div>

      {/* Loading state indicator */}
      {isPerformingAnalysis && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
          <div className="h-44 border border-slate-200 bg-white rounded-2xl" />
          <div className="h-44 border border-slate-200 bg-white rounded-2xl" />
          <div className="h-44 border border-slate-200 bg-white rounded-2xl" />
        </div>
      )}

      {/* Onboarding Welcome State when there is no data */}
      {!isPerformingAnalysis && dbTasks.length === 0 && (
        <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl shadow-sm py-16 max-w-2xl mx-auto space-y-6">
          <Sparkles className="h-12 w-12 text-primary mx-auto animate-pulse" />
          <h2 className="text-xl font-bold text-slate-850">Welcome to ChronoGuard!</h2>
          <p className="text-slate-600 text-sm font-semibold max-w-md mx-auto">
            ChronoGuard acts as your executive assistant, sorting tasks, classifing inbox emails, detecting schedule overlaps, and preparing optimized calendar recommendations.
          </p>
          <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl max-w-sm mx-auto text-xs text-slate-500 font-semibold leading-relaxed">
            To get started, please add some tasks in the <a href="/tasks" className="text-primary hover:underline font-bold">To-Do List</a> or connect your Google Calendar under <a href="/settings" className="text-primary hover:underline font-bold">Settings</a>!
          </div>
        </div>
      )}

      {/* Minimal Dashboard Layout (Adhering to Feature 11 Dashboard Minimalism) */}
      {!isPerformingAnalysis && dbTasks.length > 0 && (
        dashboardMode === 'cozy' ? (
          <div className="space-y-8 animate-in fade-in duration-200">
            
            {/* 1. EXECUTIVE BRIEF - MANDATORY FIRST ELEMENT */}
            {currentAiState?.executive_brief ? (
              <div className="p-8 bg-gradient-to-br from-indigo-50/80 via-blue-50/40 to-slate-50 border border-indigo-100 rounded-2xl shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-[0.05] pointer-events-none">
                  <Sparkles className="h-32 w-32 text-primary" />
                </div>
                
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xs font-black uppercase tracking-wider text-indigo-750 flex items-center gap-2">
                    <Bookmark className="h-5 w-5 text-primary" />
                    <span>DAILY EXECUTIVE BRIEF</span>
                  </h2>
                  <button
                    type="button"
                    onClick={() => handleSpeakOutput(currentAiState.executive_brief)}
                    className={`p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition shadow-sm flex items-center gap-1.5 font-bold text-xs cursor-pointer select-none ${speaking ? 'border-primary text-primary' : 'text-slate-650'}`}
                  >
                    {speaking ? <VolumeX className="h-4 w-4 text-rose-500" /> : <Volume2 className="h-4 w-4 text-primary" />}
                    <span>{speaking ? 'Mute' : 'Listen'}</span>
                  </button>
                </div>
                
                <div className="prose max-w-none">
                  <p className="text-sm text-slate-700 leading-relaxed font-semibold whitespace-pre-line">
                    {currentAiState.executive_brief}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl shadow-sm py-12 max-w-2xl mx-auto space-y-4 animate-in fade-in">
                <Sparkles className="h-10 w-10 text-primary mx-auto animate-pulse" />
                <h3 className="text-base font-bold text-slate-800">Ready to Analyze your Workload?</h3>
                <p className="text-xs text-slate-505 font-semibold max-w-sm mx-auto">
                  Click the **Analyze** button in the header to run your digital twin simulation, identify potential calendar conflicts, and prepare your Executive Brief.
                </p>
              </div>
            )}

            {/* Core Dashboard Indicators answering the 4 questions (Feature 11) */}
            {currentAiState && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Question 1: What is most important today? (Top Priorities) & Question 2: What is at risk? (Timelines) */}
                <div className="lg:col-span-2 space-y-8">
                  
                  {/* A. TODAY'S SUCCESS (Dynamic Completed Progress) */}
                  <div className="p-6 border border-slate-200 bg-white rounded-2xl shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                    <div className="flex items-center gap-4">
                      <div className="relative h-20 w-20 flex items-center justify-center shrink-0">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle cx="40" cy="40" r="32" className="stroke-slate-100" strokeWidth="5" fill="transparent" />
                          <circle cx="40" cy="40" r="32" className="stroke-emerald-500 transition-all duration-500" strokeWidth="6" strokeDasharray={2 * Math.PI * 32} strokeDashoffset={2 * Math.PI * 32 - (completionPercentage / 100) * 2 * Math.PI * 32} strokeLinecap="round" fill="transparent" />
                        </svg>
                        <span className="absolute text-sm font-black text-slate-800">{completionPercentage}%</span>
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-800 block uppercase tracking-wider">Today's Progress</h4>
                        <p className="text-[11px] text-slate-505 mt-0.5 leading-relaxed font-semibold">
                          {completionPercentage === 100 
                            ? "All scheduled commitments have been resolved successfully."
                            : `You've resolved ${completedTasks} out of ${totalTasks} tasks.`}
                        </p>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl flex items-center gap-3">
                      <Trophy className="h-8 w-8 text-amber-505 shrink-0" />
                      <div>
                        <span className="text-[10px] text-slate-400 font-extrabold uppercase block tracking-wider">Performance Goal</span>
                        <strong className="text-xs font-extrabold text-slate-700">Healthy workload protection active.</strong>
                      </div>
                    </div>
                  </div>

                  {/* B. TODAY'S PRIORITIES (Feature 8 Dashboard Prioritization) */}
                  <div className="p-6 border border-slate-200 bg-white rounded-2xl shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-655 flex items-center gap-2">
                        <CheckCircle className="h-4.5 w-4.5 text-emerald-505" />
                        <span>Today's Priorities</span>
                      </h3>

                      {/* Priorities Tabs switcher */}
                      <div className="flex bg-slate-105 p-0.5 rounded-lg border border-slate-200/50 shadow-inner">
                        <button
                          onClick={() => setActiveTab('doNow')}
                          className={`px-3 py-1 rounded-md text-[10px] font-extrabold transition-all duration-150 ${
                            activeTab === 'doNow' ? 'bg-white text-slate-850 shadow-sm' : 'text-slate-500 hover:text-slate-750'
                          }`}
                        >
                          Do Now
                        </button>
                        <button
                          onClick={() => setActiveTab('dueSoon')}
                          className={`px-3 py-1 rounded-md text-[10px] font-extrabold transition-all duration-150 ${
                            activeTab === 'dueSoon' ? 'bg-white text-slate-850 shadow-sm' : 'text-slate-505 hover:text-slate-750'
                          }`}
                        >
                          Due Soon
                        </button>
                        {displayedCanWait.length > 0 && (
                          <button
                            onClick={() => setActiveTab('canWait')}
                            className={`px-3 py-1 rounded-md text-[10px] font-extrabold transition-all duration-150 ${
                              activeTab === 'canWait' ? 'bg-white text-slate-850 shadow-sm' : 'text-slate-505 hover:text-slate-750'
                            }`}
                          >
                            Can Wait
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      {/* Render active priorities tab */}
                      {activeTab === 'doNow' && (
                        displayedDoNow.length === 0 ? (
                          <p className="text-xs text-slate-400 py-4 text-center">No critical 'Do Now' tasks.</p>
                        ) : (
                          displayedDoNow.map((task, idx) => (
                            <div key={idx} className="p-3.5 bg-rose-50/10 border border-slate-205 rounded-xl hover:border-slate-350 transition duration-150 flex justify-between items-center gap-3">
                              <div className="space-y-0.5">
                                <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 font-extrabold text-[8px] uppercase tracking-wider mr-2 border border-rose-500/20">
                                  Do Now
                                </span>
                                <strong className="text-xs text-slate-800">{task.title}</strong>
                                <p className="text-[10px] text-slate-500 leading-normal">{task.reason}</p>
                              </div>
                              <button
                                onClick={() => setSelectedTask(task)}
                                className="p-1 rounded bg-slate-100 hover:bg-slate-202 text-slate-505 shrink-0"
                                title="Inspect Task Source"
                              >
                                <Eye className="h-4.5 w-4.5" />
                              </button>
                            </div>
                          ))
                        )
                      )}

                      {activeTab === 'dueSoon' && (
                        displayedDueSoon.length === 0 ? (
                          <p className="text-xs text-slate-400 py-4 text-center">No 'Due Soon' tasks.</p>
                        ) : (
                          displayedDueSoon.map((task, idx) => (
                            <div key={idx} className="p-3.5 bg-slate-50/50 border border-slate-205 rounded-xl hover:border-slate-350 transition duration-150 flex justify-between items-center gap-3">
                              <div className="space-y-0.5">
                                <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 font-extrabold text-[8px] uppercase tracking-wider mr-2 border border-amber-550/20">
                                  Due Soon
                                </span>
                                <strong className="text-xs text-slate-800">{task.title}</strong>
                                <p className="text-[10px] text-slate-500 leading-normal">{task.reason}</p>
                              </div>
                              <button
                                onClick={() => setSelectedTask(task)}
                                className="p-1 rounded bg-slate-100 hover:bg-slate-202 text-slate-505 shrink-0"
                                title="Inspect Task Source"
                              >
                                <Eye className="h-4.5 w-4.5" />
                              </button>
                            </div>
                          ))
                        )
                      )}

                      {activeTab === 'canWait' && (
                        displayedCanWait.map((task, idx) => (
                          <div key={idx} className="p-3.5 bg-slate-50/50 border border-slate-205 rounded-xl hover:border-slate-350 transition duration-150 flex justify-between items-center gap-3">
                            <div className="space-y-0.5">
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-505 font-extrabold text-[8px] uppercase tracking-wider mr-2 border border-slate-200">
                                Can Wait
                              </span>
                              <strong className="text-xs text-slate-800">{task.title}</strong>
                              <p className="text-[10px] text-slate-500 leading-normal">{task.reason}</p>
                            </div>
                            <button
                              onClick={() => setSelectedTask(task)}
                              className="p-1 rounded bg-slate-100 hover:bg-slate-202 text-slate-505 shrink-0"
                              title="Inspect Task Source"
                            >
                              <Eye className="h-4.5 w-4.5" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* C. VISUAL DAY PLANNER (Feature 2 Visual Day View) */}
                  <div className="p-6 border border-slate-200 bg-white rounded-2xl shadow-sm space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-655 flex items-center gap-2">
                      <Clock className="h-4.5 w-4.5 text-indigo-550" />
                      <span>Tomorrow's Timeline Planner</span>
                    </h3>
                    
                    <div className="relative border-l-2 border-slate-150 pl-6 ml-3 space-y-6">
                      {timelineItems.length === 0 ? (
                        <p className="text-xs text-slate-400 py-4 italic">No items scheduled on timeline.</p>
                      ) : (
                        timelineItems.map((item, idx) => {
                          const timeStr = item.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                          return (
                            <div key={idx} className="relative group">
                              <div className="absolute -left-[31px] top-1 h-3 w-3 rounded-full bg-white border-2 border-indigo-550 group-hover:bg-indigo-550 transition" />
                              <div className="p-4 bg-slate-50/55 hover:bg-slate-50 border border-slate-200 rounded-xl transition duration-150 flex justify-between items-start gap-4">
                                <div className="space-y-0.5">
                                  <span className="text-[10px] text-slate-405 font-bold">{timeStr}</span>
                                  <h4 className="text-xs font-bold text-slate-800 leading-normal">{item.title}</h4>
                                  {item.reason && <p className="text-[10px] text-slate-505 leading-relaxed italic">"{item.reason}"</p>}
                                </div>
                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border shrink-0 ${
                                  item.type === 'calendar' 
                                    ? 'bg-blue-50 text-blue-700 border-blue-200' 
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                }`}>
                                  {item.type}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                </div>

                {/* Question 3: What actions do I need to take? (Approvals Queue) & Question 4: What has ChronoGuard already done? */}
                <div className="space-y-8">

                  {/* CALENDAR UPDATE READY ALERT (Feature — Calendar Change Preview) */}
                  {currentAiState?.calendar_diff && approvalsData.length > 0 && (
                    <div className="p-6 border border-slate-800 bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl shadow-md space-y-4 animate-in fade-in">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4.5 w-4.5 text-indigo-300 animate-pulse" />
                        <h3 className="font-extrabold uppercase tracking-wider text-[11px] text-indigo-200">Your Day Is Ready</h3>
                      </div>
                      
                      <div className="space-y-1">
                        <span className="text-xl font-black block">
                          {currentAiState.calendar_diff.changes?.length || approvalsData.length} Improvements Prepared
                        </span>
                        <div className="text-[10px] text-amber-400 font-extrabold uppercase tracking-wider mb-2">
                          Review Required
                        </div>
                        <div className="flex justify-between text-xs text-indigo-200 pt-1.5 border-t border-slate-800">
                          <span>Estimated Completion</span>
                          <strong className="text-white">
                            {currentAiState.calendar_diff.summary?.estimated_completion_improvement?.split('->')[1]?.trim() || 
                             currentAiState.calendar_diff.summary?.estimated_completion_improvement || '91%'}
                          </strong>
                        </div>
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => navigate('/schedule-review')}
                        className="w-full py-2.5 bg-primary hover:bg-blue-650 text-white font-extrabold tracking-wider text-[11px] uppercase rounded-xl shadow-sm transition"
                      >
                        Review Plan
                      </button>
                    </div>
                  )}
                  
                  {/* D. APPROVALS QUEUE (Feature 3 Approval Queue) */}
                  <div className="p-6 rounded-2xl border border-indigo-200 bg-gradient-to-b from-indigo-50/30 to-blue-50/10 shadow-sm space-y-4">
                    <div className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-indigo-600" />
                      <h3 className="font-extrabold text-slate-855 uppercase tracking-wider text-xs">Calendar Approval Queue</h3>
                    </div>

                    {approvalsData.length === 0 ? (
                      <p className="text-xs text-slate-450 py-4 text-center italic">No suggested calendar changes pending approval.</p>
                    ) : (
                      <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
                        {approvalsData.map((app) => (
                          <div key={app._id} className="p-4 bg-white border border-slate-205 hover:border-slate-350 rounded-xl transition duration-150 space-y-3.5 shadow-sm">
                            
                            <div className="flex justify-between items-start gap-2.5">
                              <div>
                                <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-primary border border-indigo-500/20 font-extrabold text-[8px] uppercase tracking-wider mr-2">
                                  Reschedule Match
                                </span>
                                <strong className="text-[11px] text-slate-805 font-extrabold leading-snug">{app.taskTitle}</strong>
                              </div>
                              <span className="text-[10px] text-slate-450 font-bold shrink-0">{app.confidence}% match</span>
                            </div>

                            <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 p-2 rounded-lg text-slate-500 text-[10px] font-bold">
                              <span>Current: {app.currentTime || 'Not Scheduled'}</span>
                              <ArrowRight className="h-3 w-3 text-slate-400" />
                              <span className="text-indigo-600">AI Suggested: {app.suggestedTime}</span>
                            </div>

                            <div className="text-[10px] leading-relaxed text-slate-505 space-y-1 bg-slate-50/40 p-2.5 rounded-lg border border-slate-100">
                              <span className="text-[8px] uppercase font-black text-slate-455 tracking-wider">Reasoning</span>
                              <p className="italic font-medium">"{app.reason}"</p>
                              {app.expectedBenefit && (
                                <p className="text-emerald-700 font-extrabold mt-1 text-[9px]">💡 Expected Benefit: {app.expectedBenefit}</p>
                              )}
                            </div>

                            {/* Action Buttons */}
                            {modifyingId === app._id ? (
                              <div className="space-y-2 pt-2 border-t border-slate-100">
                                <input 
                                  type="text"
                                  placeholder="e.g. 14:00 - 16:00"
                                  value={customTimeInput[app._id] || ''}
                                  onChange={(e) => setCustomTimeInput({
                                    ...customTimeInput,
                                    [app._id]: e.target.value
                                  })}
                                  className="w-full p-2 border border-slate-202 rounded text-xs focus:outline-none focus:border-primary"
                                />
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleExecuteApproval(app._id, 'approve', customTimeInput[app._id])}
                                    className="flex-1 bg-slate-855 hover:bg-slate-700 text-white p-1.5 rounded font-bold text-[10px]"
                                  >
                                    Save & Approve
                                  </button>
                                  <button
                                    onClick={() => setModifyingId(null)}
                                    className="px-2.5 bg-slate-100 hover:bg-slate-202 text-slate-505 rounded font-bold text-[10px]"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100">
                                <button
                                  onClick={() => handleExecuteApproval(app._id, 'approve')}
                                  className="flex-1 py-1.5 bg-primary hover:bg-blue-600 text-white rounded font-black tracking-wider text-[10px]"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleExecuteApproval(app._id, 'reject')}
                                  className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-650 rounded font-extrabold text-[10px]"
                                >
                                  Reject
                                </button>
                                <button
                                  onClick={() => {
                                    setModifyingId(app._id);
                                    setCustomTimeInput({ ...customTimeInput, [app._id]: app.suggestedTime });
                                  }}
                                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-202 text-slate-655 rounded font-extrabold text-[10px]"
                                >
                                  Modify
                                </button>
                              </div>
                            )}

                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* E. ALREADY DONE FOR YOU (Feature 9 Log) */}
                  {currentAiState?.decision_engine?.already_done_actions && (
                    <div className="p-6 border border-slate-202 bg-white rounded-2xl shadow-sm space-y-4">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-655 flex items-center gap-2">
                        <ThumbsUp className="h-4.5 w-4.5 text-emerald-500 animate-bounce" />
                        <span>Already Done</span>
                      </h3>
                      
                      <div className="space-y-2">
                        {currentAiState.decision_engine.already_done_actions.map((act, idx) => (
                          <div key={idx} className="flex items-center gap-2.5 text-xs text-slate-655 font-semibold">
                            <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                            <span>{act}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* F. ONE PRIMARY RECOMMENDATION (Feature 1, 10, 11 Natural Language Only) */}
                  {currentAiState?.decision_engine?.one_primary_recommendation && (
                    <div className="p-6 border border-slate-202 bg-white rounded-2xl shadow-sm space-y-3">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-655 flex items-center gap-2">
                        <Sparkles className="h-4.5 w-4.5 text-indigo-500 animate-pulse" />
                        <span>Assistant Insight</span>
                      </h3>
                      
                      <p className="text-xs text-slate-700 leading-relaxed font-semibold">
                        {currentAiState.decision_engine.one_primary_recommendation}
                      </p>
                    </div>
                  )}

                  {/* G. UPCOMING DEADLINE */}
                  {closestDeadlineTask && (
                    <div className="p-6 border border-slate-202 bg-white rounded-2xl shadow-sm space-y-3.5">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-655 flex items-center gap-2">
                        <Clock className="h-4.5 w-4.5 text-amber-500" />
                        <span>Upcoming Deadline</span>
                      </h3>
                      
                      <div className="p-3.5 bg-amber-50/30 border border-amber-100 rounded-xl space-y-1">
                        <span className="text-[9px] text-amber-600 font-extrabold uppercase tracking-wider">Attention Required</span>
                        <h4 className="text-xs font-extrabold text-slate-800">{closestDeadlineTask.title}</h4>
                        <p className="text-[10px] text-slate-500">Deadline: <strong className="text-slate-700">{closestDeadlineTask.deadline}</strong></p>
                      </div>
                    </div>
                  )}

                  {/* LEARNING ABOUT YOU (Feature 14 Dashboard Integration) */}
                  {currentAiState?.decision_engine?.learning_insights && (
                    <div className="p-6 border border-slate-200 bg-white rounded-2xl shadow-sm space-y-4">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-650 flex items-center gap-2">
                        <BrainCircuit className="h-4.5 w-4.5 text-indigo-505 animate-pulse" />
                        <span>Learning About You</span>
                      </h3>
                      <div className="space-y-3">
                        {currentAiState.decision_engine.learning_insights.map((insight, idx) => (
                          <div key={idx} className="flex items-center gap-2.5 p-3 bg-indigo-50/10 border border-indigo-100 rounded-xl text-xs text-slate-700 font-semibold leading-normal">
                            <Check className="h-4 w-4 text-indigo-505 shrink-0" />
                            <span>{insight}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>

              </div>
            )}

            {/* Collapsible Sections containing details to avoid cognitive overload (Feature 11 & 12) */}
            {currentAiState && (
              <div className="space-y-6 pt-6 border-t border-slate-200">
                
                {/* 1. Moderate Confidence Recommendations (Confidence 60-80%) */}
                {currentAiState.decision_engine?.details_recommendations && currentAiState.decision_engine.details_recommendations.length > 0 && (
                  <CollapsibleSection title="Details & Lower Priority Recommendations" icon={Bookmark}>
                    <div className="space-y-3 text-xs text-slate-600 leading-normal">
                      {currentAiState.decision_engine.details_recommendations.map((rec, i) => (
                        <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-100 font-semibold">
                          {rec}
                        </div>
                      ))}
                    </div>
                  </CollapsibleSection>
                )}

                {/* 2. AI TIMELINE */}
                <CollapsibleSection title="Assistant Steps Timeline" icon={Activity} defaultOpen={dashboardMode === 'technical'}>
                  <div className="space-y-4 max-w-md">
                    {steps.map((step, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <div className={`h-5 w-5 rounded-full flex items-center justify-center border text-[10px] font-bold shrink-0 ${
                          step.done 
                            ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600' 
                            : 'bg-slate-50 border-slate-200 text-slate-400 opacity-40'
                        }`}>
                          {step.done ? "✓" : "-"}
                        </div>
                        <span className={`text-xs font-semibold ${step.done ? 'text-slate-700' : 'text-slate-400'}`}>
                          {step.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </CollapsibleSection>

                {/* 3. FUTURE SCENARIOS COMPARISON */}
                {currentAiState.simulation?.current_plan && (
                  <CollapsibleSection title="Compare Scheduling Paths" icon={Compass} defaultOpen={dashboardMode === 'technical'}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {[
                        { name: "Current Path", key: "current_plan", color: "border-slate-200 bg-white" },
                        { name: "Optimized Path", key: "ai_optimized_plan", color: "border-indigo-250 bg-indigo-50/10" },
                        { name: "Aggressive Path", key: "aggressive_plan", color: "border-rose-250 bg-rose-50/5" }
                      ].map(p => {
                        const data = currentAiState.simulation[p.key];
                        if (!data) return null;
                        return (
                          <div key={p.key} className={`p-4 rounded-xl border ${p.color} space-y-3`}>
                            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800">{p.name}</h4>
                            <p className="text-[11px] text-slate-655 leading-relaxed italic">"{data.description}"</p>
                            <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                              <div className="flex justify-between">
                                <span className="text-slate-400">Completion rate:</span>
                                <span className="font-bold text-slate-700">{data.completion_rate}%</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">Stress levels:</span>
                                <span className="font-bold text-slate-700">{data.stress_level}%</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">Rest / Sleep:</span>
                                <span className="font-bold text-slate-700">{data.sleep_hours} hrs</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">Assistant Confidence:</span>
                                <span className="font-bold text-slate-700">{data.confidence}%</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">Free / buffer time:</span>
                                <span className="font-bold text-slate-700">{data.time_remaining_hours} hrs</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CollapsibleSection>
                )}

                {/* 4. DIGITAL TWIN BEHAVIORAL PROFILE */}
                {currentAiState.profile && (
                  <CollapsibleSection title="Behavioral Insights & Twin Diagnostics" icon={BrainCircuit}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-650">
                      <div className="p-4 bg-slate-50 rounded-xl space-y-3">
                        <h4 className="font-bold text-slate-800">Behavioral Observation Summary</h4>
                        <div className="space-y-1.5">
                          <div className="flex justify-between pb-1 border-b border-slate-100">
                            <span className="text-slate-400">Productive period:</span>
                            <span className="font-bold text-slate-700">{currentAiState.profile.focus_score}/100</span>
                          </div>
                          <div className="flex justify-between pb-1 border-b border-slate-100">
                            <span className="text-slate-400">Buffer preference score:</span>
                            <span className="font-bold text-slate-750">{currentAiState.profile.procrastination_score}/100</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Observations Count rate:</span>
                            <span className="font-bold text-slate-750">{currentAiState.profile.completion_rate}%</span>
                          </div>
                        </div>
                        
                        <div className="pt-2">
                          <span className="text-slate-400 block mb-1">Preferred focus slots:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {currentAiState.profile.preferred_work_hours?.map((h, i) => (
                              <span key={i} className="px-2 py-0.5 rounded bg-white border border-slate-200 font-semibold">{h}</span>
                            )) || <span className="italic">None detected</span>}
                          </div>
                        </div>
                      </div>

                      <div className="p-4 bg-slate-50 rounded-xl space-y-3">
                        <h4 className="font-bold text-slate-800">Commitment alerts from inbox</h4>
                        {currentAiState.profile.loss_prevention_advice ? (
                          <div className="p-3 bg-white border border-rose-100 rounded-lg text-slate-700 leading-relaxed font-semibold">
                            {currentAiState.profile.loss_prevention_advice}
                          </div>
                        ) : (
                          <p className="italic text-slate-405">No critical alerts detected in inbox.</p>
                        )}
                      </div>
                    </div>
                  </CollapsibleSection>
                )}

                {/* 5. MICRO-SUBTASK DRILLDOWN */}
                {currentAiState.plan?.subtasks && currentAiState.plan.subtasks.length > 0 && (
                  <CollapsibleSection title="Actionable Subtasks Drilldown" icon={CheckCircle}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {currentAiState.plan.subtasks.map((sub, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50/50 rounded-xl border border-slate-100 hover:border-slate-200 transition">
                          <span className="h-5 w-5 bg-white border border-slate-200 text-[10px] text-slate-500 rounded-full flex items-center justify-center font-bold">
                            {idx + 1}
                          </span>
                          <span className="text-xs text-slate-700 font-semibold truncate">{sub}</span>
                        </div>
                      ))}
                    </div>
                  </CollapsibleSection>
                )}

              </div>
            )}

          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* AI Control Center Header */}
            <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-850 flex justify-between items-center shadow-md">
              <div className="flex items-center gap-2.5">
                <Brain className="h-5 w-5 text-indigo-400 animate-pulse" />
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-indigo-200">Agent Diagnostics Console</h3>
                  <p className="text-[10px] text-slate-400 font-semibold">Active neural sub-agents status and telemetry.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400">All Agents Online</span>
              </div>
            </div>

            {/* Row 1: Supervisor (Chief of Staff) & Risk Assessment */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Chief of Staff / Supervisor */}
              <div className="lg:col-span-2 p-6 border border-slate-200 bg-white rounded-2xl shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-650 flex items-center gap-2">
                    <Sparkles className="h-4.5 w-4.5 text-indigo-500" />
                    <span>Chief of Staff Agent</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => handleSpeakOutput(currentAiState?.executive_brief)}
                    className={`p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition text-[10px] font-bold flex items-center gap-1.5 ${speaking ? 'border-primary text-primary' : 'text-slate-500'}`}
                  >
                    {speaking ? <VolumeX className="h-3.5 w-3.5 text-rose-500" /> : <Volume2 className="h-3.5 w-3.5 text-indigo-500" />}
                    <span>Listen</span>
                  </button>
                </div>
                
                <div className="space-y-3.5">
                  <div className="text-xs leading-relaxed font-semibold text-slate-750 bg-slate-50 p-4 rounded-xl border border-slate-150">
                    "{currentAiState?.executive_brief || 'Generating brief...'}"
                  </div>
                  
                  <div className="flex gap-4 text-[10px] font-bold text-slate-500">
                    <div>
                      Classification workflow: <span className="text-indigo-650 uppercase font-black">simulation</span>
                    </div>
                    <div>•</div>
                    <div>
                      Agent Confidence: <span className="text-indigo-650 font-black">98%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Risk Assessment */}
              <div className="p-6 border border-slate-200 bg-white rounded-2xl shadow-sm space-y-4 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-650 flex items-center gap-2 border-b border-slate-100 pb-3 mb-3">
                    <AlertTriangle className="h-4.5 w-4.5 text-amber-500" />
                    <span>Risk Assessment Agent</span>
                  </h4>
                  
                  <div className="flex items-center gap-4">
                    <div className="relative h-16 w-16 flex items-center justify-center shrink-0">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="32" cy="32" r="26" className="stroke-slate-100" strokeWidth="4" fill="transparent" />
                        <circle cx="32" cy="32" r="26" className="stroke-amber-500" strokeWidth="4" strokeDasharray={2 * Math.PI * 26} strokeDashoffset={2 * Math.PI * 26 - ((currentAiState?.risk?.risk_score || 35) / 100) * 2 * Math.PI * 26} strokeLinecap="round" fill="transparent" />
                      </svg>
                      <span className="absolute text-xs font-black text-slate-800">{currentAiState?.risk?.risk_score || 35}%</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-450 font-extrabold uppercase tracking-wider">Burnout Severity</span>
                      <strong className="text-xs font-extrabold text-slate-800 block capitalize">{currentAiState?.risk?.risk_level || 'moderate'}</strong>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 bg-amber-500/5 border border-amber-500/10 rounded-xl text-[10px] text-amber-800 font-bold leading-normal">
                  {currentAiState?.risk?.reason || 'Calculated moderate friction points on early-afternoon slots.'}
                </div>
              </div>

            </div>

            {/* Row 2: Digital Twin (Behavior Profiler) & AI Planner */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Digital Twin */}
              <div className="p-6 border border-slate-200 bg-white rounded-2xl shadow-sm space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-650 flex items-center gap-2 border-b border-slate-100 pb-3">
                  <BrainCircuit className="h-4.5 w-4.5 text-indigo-500 animate-pulse" />
                  <span>Digital Twin Profile Agent</span>
                </h4>
                
                <div className="grid grid-cols-2 gap-6 text-[11px] font-bold text-slate-600">
                  <div className="space-y-2">
                    <div className="flex justify-between pb-1 border-b border-slate-100">
                      <span className="text-slate-400">Focus Score:</span>
                      <strong className="text-slate-700">{currentAiState?.profile?.focus_score || 85}/100</strong>
                    </div>
                    <div className="flex justify-between pb-1 border-b border-slate-100">
                      <span className="text-slate-400">Procrastination Score:</span>
                      <strong className="text-slate-700">{currentAiState?.profile?.procrastination_score || 30}/100</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Completion rate:</span>
                      <strong className="text-slate-700">{currentAiState?.profile?.completion_rate || 78}%</strong>
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-1">Preferred Slots:</span>
                    <div className="flex flex-wrap gap-1">
                      {currentAiState?.profile?.preferred_work_hours?.map((h, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-slate-50 border border-slate-200 text-[10px] font-bold">{h}</span>
                      )) || <span className="italic text-[10px] text-slate-400">None detected</span>}
                    </div>
                  </div>
                </div>

                {currentAiState?.profile?.loss_prevention_advice && (
                  <div className="p-3 bg-rose-500/5 border border-rose-500/10 rounded-xl text-[10px] text-rose-850 font-bold leading-normal">
                    <strong className="block mb-0.5">Inbox Warning:</strong>
                    {currentAiState.profile.loss_prevention_advice}
                  </div>
                )}
              </div>

              {/* AI Planner */}
              <div className="p-6 border border-slate-200 bg-white rounded-2xl shadow-sm space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-655 flex items-center gap-2 border-b border-slate-100 pb-3">
                  <CheckCircle className="h-4.5 w-4.5 text-emerald-500" />
                  <span>AI Goal Planner Agent</span>
                </h4>
                
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {currentAiState?.plan?.subtasks && currentAiState.plan.subtasks.length > 0 ? (
                    currentAiState.plan.subtasks.map((sub, idx) => (
                      <div key={idx} className="flex items-center gap-3.5 p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-[11px] font-semibold text-slate-700">
                        <span className="h-4.5 w-4.5 bg-white border border-slate-200 text-[9px] font-black rounded-full flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="truncate">{sub}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-[11px] text-slate-450 italic py-4">No planning milestones generated.</p>
                  )}
                </div>
              </div>

            </div>

            {/* Row 3: Simulator & Diff Engine */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Simulator paths comparison */}
              <div className="lg:col-span-2 p-6 border border-slate-200 bg-white rounded-2xl shadow-sm space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-650 flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Compass className="h-4.5 w-4.5 text-blue-500" />
                  <span>Simulator & Negotiator Agent</span>
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-bold">
                  {[
                    { name: "Current Path", key: "current_plan", border: "border-slate-200 bg-slate-55/50" },
                    { name: "Optimized Path", key: "ai_optimized_plan", border: "border-indigo-200 bg-indigo-50/5" },
                    { name: "Aggressive Path", key: "aggressive_plan", border: "border-rose-200 bg-rose-50/5" }
                  ].map(p => {
                    const data = currentAiState?.simulation?.[p.key];
                    if (!data) return null;
                    return (
                      <div key={p.key} className={`p-4 rounded-xl border ${p.border} space-y-2`}>
                        <strong className="text-[9px] uppercase tracking-wider text-slate-800 block">{p.name}</strong>
                        <p className="text-[10px] text-slate-500 italic leading-relaxed">"{data.description}"</p>
                        <div className="pt-2 border-t border-slate-150 space-y-1 text-[10px] text-slate-600">
                          <div className="flex justify-between">
                            <span>Completion:</span>
                            <span className="text-slate-850 font-black">{data.completion_rate}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Stress:</span>
                            <span className="text-slate-850 font-black">{data.stress_level}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Sleep:</span>
                            <span className="text-slate-850 font-black">{data.sleep_hours} hrs</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Diff Engine & Review Plan */}
              <div className="p-6 border border-indigo-250 bg-slate-900 text-white rounded-2xl shadow-md flex flex-col justify-between space-y-4">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-indigo-300 flex items-center gap-2 border-b border-slate-800 pb-3 mb-3">
                    <Activity className="h-4.5 w-4.5 text-indigo-400" />
                    <span>Diff & Integration Engine</span>
                  </h4>
                  
                  <div className="space-y-1 text-xs">
                    <strong className="text-lg font-black block text-indigo-100">
                      {currentAiState?.calendar_diff?.changes?.length || approvalsData.length} Suggestions Ready
                    </strong>
                    <div className="flex justify-between pt-2 border-t border-slate-800">
                      <span className="text-slate-400">Target Efficiency:</span>
                      <strong className="text-indigo-300 font-extrabold">
                        {currentAiState?.calendar_diff?.summary?.estimated_completion_improvement || '64% → 91%'}
                      </strong>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => navigate('/schedule-review')}
                  className="w-full py-3 bg-primary hover:bg-blue-600 text-white font-extrabold text-[11px] uppercase tracking-wider rounded-xl shadow-md transition"
                >
                  Open Plan Review Mode
                </button>
              </div>

            </div>
          </div>
        )
      )}

      {/* Visual Calendar Change Preview Modal (Feature — Calendar Change Preview) */}
      {showPreviewModal && currentAiState?.calendar_diff && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden animate-in zoom-in duration-150">
            
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-indigo-650 animate-pulse" />
                  <span>Calendar Change Preview & Review</span>
                </h3>
                <p className="text-[11px] text-slate-500 font-semibold mt-0.5">Compare and approve proposed daily schedule optimizations before saving to Google Calendar.</p>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="text-slate-400 hover:text-slate-655 font-black text-sm p-1"
              >
                ✕
              </button>
            </div>

            {/* Diff Summary Strip */}
            <div className="px-6 py-3 bg-indigo-50/40 border-b border-indigo-100/50 flex flex-wrap gap-6 items-center text-xs justify-between">
              <div className="flex gap-4 flex-wrap">
                <span className="font-bold text-slate-600">Summary:</span>
                <span className="text-emerald-700 font-extrabold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  +{currentAiState.calendar_diff.summary?.events_added} Added
                </span>
                <span className="text-blue-700 font-extrabold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  ~{currentAiState.calendar_diff.summary?.events_moved} Moved
                </span>
                <span className="text-purple-700 font-extrabold bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                  ={currentAiState.calendar_diff.summary?.events_merged} Merged
                </span>
                <span className="text-rose-700 font-extrabold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                  -{currentAiState.calendar_diff.summary?.events_removed} Removed
                </span>
              </div>

              <div className="flex items-center gap-4 text-[11px] font-bold">
                <span className="text-slate-500">Completion rate: <strong className="text-indigo-650">{currentAiState.calendar_diff.summary?.estimated_completion_improvement}</strong></span>
                <span className="text-slate-500">Free time: <strong className="text-indigo-650">{currentAiState.calendar_diff.summary?.total_free_time_preserved}</strong></span>
                <span className="text-slate-500">Conflicts removed: <strong className="text-indigo-650">{currentAiState.calendar_diff.summary?.conflicts_removed}</strong></span>
              </div>
            </div>

            {/* Side-by-Side View */}
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-8 divide-x divide-slate-150">
              
              {/* Column Left: Current Schedule */}
              <div className="space-y-4 pr-4">
                <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1.5 mb-3">
                  <Clock className="h-4 w-4" />
                  <span>Current Calendar</span>
                </h4>

                {timelineItems.length === 0 ? (
                  <p className="text-xs text-slate-450 italic py-8 text-center">No current calendar events scheduled.</p>
                ) : (
                  <div className="space-y-3">
                    {timelineItems.map((item, idx) => {
                      const timeStr = item.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      return (
                        <div key={idx} className="p-3 bg-slate-50 border border-slate-150 rounded-xl text-xs flex justify-between items-center">
                          <div>
                            <strong className="text-slate-700 font-bold block">{item.title}</strong>
                            <span className="text-[10px] text-slate-455 font-bold">{timeStr} ({item.duration}h duration)</span>
                          </div>
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[8px] uppercase tracking-wider">
                            {item.type}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Column Right: Optimized Proposed Preview */}
              <div className="space-y-4 pl-8">
                <h4 className="font-extrabold text-xs uppercase tracking-wider text-indigo-600 flex items-center gap-1.5 mb-3">
                  <Sparkles className="h-4 w-4 text-indigo-500 animate-pulse" />
                  <span>Optimized Proposed Schedule (Hover for details)</span>
                </h4>

                <div className="space-y-4">
                  {currentAiState.calendar_diff.changes.map((item, idx) => {
                    // Determine styling according to category
                    let cardStyle = "bg-slate-50 border-slate-200 text-slate-650";
                    let badgeStyle = "bg-slate-100 text-slate-605";
                    
                    if (item.category === 'ADD') {
                      cardStyle = "bg-emerald-50/30 border-emerald-250 text-emerald-800 shadow-sm";
                      badgeStyle = "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20";
                    } else if (item.category === 'MOVE') {
                      cardStyle = "bg-blue-50/20 border-blue-250 text-blue-800 shadow-sm";
                      badgeStyle = "bg-blue-500/10 text-blue-700 border border-blue-500/20";
                    } else if (item.category === 'REMOVE') {
                      cardStyle = "bg-rose-50/10 border-rose-200 text-slate-400 line-through opacity-70";
                      badgeStyle = "bg-rose-500/10 text-rose-700 border border-rose-500/20";
                    } else if (item.category === 'MERGE') {
                      cardStyle = "bg-purple-50/20 border-purple-250 text-purple-800 shadow-sm";
                      badgeStyle = "bg-purple-500/10 text-purple-700 border border-purple-500/20";
                    } else if (item.category === 'UPDATE') {
                      cardStyle = "bg-amber-50/15 border-amber-250 text-amber-800 shadow-sm";
                      badgeStyle = "bg-amber-500/10 text-amber-700 border border-amber-500/20";
                    }

                    // Check if this change matches a pending approval id in database to enable individual actions
                    const matchingApp = approvalsData.find(a => a.taskTitle === item.task_title);

                    return (
                      <div 
                        key={idx} 
                        className={`relative p-3.5 border rounded-xl transition duration-150 flex flex-col gap-2.5 ${cardStyle}`}
                        onMouseEnter={() => setHoveredEventId(idx)}
                        onMouseLeave={() => setHoveredEventId(null)}
                      >
                        
                        {/* Tooltip Overlay */}
                        {hoveredEventId === idx && (
                          <div className="absolute left-4 right-4 bottom-[98%] bg-slate-900/95 text-white p-3.5 rounded-xl text-[11px] z-50 shadow-xl leading-relaxed animate-in fade-in duration-100">
                            <strong className="block text-indigo-300 font-extrabold mb-1">Preview Details:</strong>
                            <div><strong>Reason:</strong> {item.reason}</div>
                            <div className="mt-1"><strong>Benefit:</strong> {item.expected_benefit}</div>
                            <div className="mt-1.5 pt-1.5 border-t border-slate-800 flex justify-between text-[10px] text-slate-450">
                              <span>Confidence: {item.confidence}%</span>
                              <span>Source: {item.source}</span>
                            </div>
                          </div>
                        )}

                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <strong className="text-xs font-extrabold">{item.task_title}</strong>
                            
                            <div className="text-[10px] font-semibold mt-1">
                              {item.category === 'MOVE' && (
                                <span className="flex items-center gap-1.5 text-blue-650">
                                  <span>{item.current_time}</span>
                                  <span>→</span>
                                  <strong className="font-extrabold">{item.new_time}</strong>
                                </span>
                              )}
                              {item.category === 'ADD' && (
                                <span className="text-emerald-700">Scheduled: <strong className="font-extrabold">{item.new_time}</strong></span>
                              )}
                              {item.category === 'MERGE' && (
                                <span className="text-purple-700">Merged target: <strong className="font-extrabold">{item.new_time}</strong></span>
                              )}
                              {item.category === 'REMOVE' && (
                                <span className="text-rose-600 line-through">Removing slot {item.current_time}</span>
                              )}
                              {item.category === 'UPDATE' && (
                                <span className="text-amber-700">Modified: <strong className="font-extrabold">{item.new_time}</strong></span>
                              )}
                              {item.category === 'KEEP' && (
                                <span className="text-slate-500">Unchanged: {item.current_time}</span>
                              )}
                            </div>
                          </div>

                          <span className={`px-2 py-0.5 rounded text-[8px] font-black tracking-wider uppercase shrink-0 ${badgeStyle}`}>
                            {item.category}
                          </span>
                        </div>

                        {/* Individual approval queue controls within visual diff */}
                        {matchingApp && (
                          <div className="flex items-center gap-2 pt-2 border-t border-slate-100/50 justify-end">
                            <button
                              onClick={() => handleExecuteApproval(matchingApp._id, 'approve')}
                              className="px-3 py-1 bg-indigo-650 hover:bg-indigo-750 text-white rounded font-bold text-[9px] uppercase tracking-wider shadow-sm transition"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleExecuteApproval(matchingApp._id, 'reject')}
                              className="px-3 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 rounded font-bold text-[9px] uppercase tracking-wider transition"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

              </div>

            </div>

            {/* Footer Actions */}
            <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
              <button
                onClick={() => setShowPreviewModal(false)}
                className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl shadow-sm transition"
              >
                Close Preview
              </button>
              
              <div className="flex gap-2">
                <button
                  onClick={() => handleExecuteBulkAction('reject_all')}
                  className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 font-extrabold text-xs rounded-xl transition"
                >
                  Reject All
                </button>
                <button
                  onClick={() => handleExecuteBulkAction('approve_all')}
                  className="px-5 py-2 bg-primary hover:bg-blue-600 text-white font-extrabold text-xs rounded-xl shadow transition"
                >
                  Approve All
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
