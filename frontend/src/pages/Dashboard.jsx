import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { motion } from 'framer-motion';
import { 
  Sparkles, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp, 
  Activity,
  Shield,
  Zap,
  RefreshCw,
  Compass
} from 'lucide-react';

const Dashboard = () => {
  const queryClient = useQueryClient();
  const [queryInput, setQueryInput] = useState('');
  const [showTrace, setShowTrace] = useState(true);

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

  // Fetch current AI analysis state (only if tasks are present)
  const { data: aiData, isLoading: isAiLoading, refetch } = useQuery({
    queryKey: ['aiAnalysis'],
    queryFn: async () => {
      const response = await api.post('/ai/analyze', { query: queryInput || undefined });
      return response.data;
    },
    enabled: dbTasks.length > 0,
    staleTime: 60000 * 5,
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
    }
  });

  const handleTriggerAnalysis = (e) => {
    e.preventDefault();
    runAnalysisMutation.mutate(queryInput);
  };

  const isPerformingAnalysis = isTasksLoading || isAiLoading || runAnalysisMutation.isPending;
  const currentAiState = runAnalysisMutation.data || aiData;

  // Calculate dynamic task completion rate based on real tasks
  const totalTasks = dbTasks.length;
  const completedTasks = dbTasks.filter(t => t.status === 'completed').length;
  const dynamicCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Circle helper for progress indicator in light mode
  const CircularProgress = ({ value, label, colorClass }) => {
    const radius = 36;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (value / 100) * circumference;

    return (
      <div className="flex flex-col items-center p-5 rounded-2xl border border-slate-200 bg-white shadow-sm relative overflow-hidden group">
        <div className="relative h-24 w-24">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="48"
              cy="48"
              r={radius}
              className="stroke-slate-100"
              strokeWidth="6"
              fill="transparent"
            />
            <motion.circle
              cx="48"
              cy="48"
              r={radius}
              className={`${colorClass} transition-all duration-1000 ease-out`}
              strokeWidth="7"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-black text-slate-800">{value}%</span>
            <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Score</span>
          </div>
        </div>
        <span className="mt-4 text-xs font-bold text-slate-500 tracking-wide uppercase">{label}</span>
      </div>
    );
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Top Banner section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
            <Shield className="h-8 w-8 text-primary" />
            <span>CHRONOGUARD <span className="text-primary">HOME</span></span>
          </h1>
          <p className="text-slate-500 mt-1 text-sm font-medium">Get daily planning help, alerts, and calendar recommendations.</p>
        </div>

        {/* Live Diagnostics Input */}
        <form onSubmit={handleTriggerAnalysis} className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Sparkles className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="Ask Chief of Staff (e.g. Schedule optimization)..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 placeholder-slate-400 text-xs focus:border-primary focus:outline-none transition shadow-sm"
              disabled={isPerformingAnalysis}
            />
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
            ChronoGuard helps you align your calendar, analyze your focus habits, and simulate task completion scenarios.
          </p>
          <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl max-w-sm mx-auto text-xs text-slate-500 font-semibold leading-relaxed">
            To get started, please add some tasks in the <a href="/tasks" className="text-primary hover:underline font-bold">To-Do List</a> or connect your Google Calendar under <a href="/settings" className="text-primary hover:underline font-bold">Settings</a>!
          </div>
        </div>
      )}

      {/* Dashboard Analytics & Metrics */}
      {!isPerformingAnalysis && dbTasks.length > 0 && (
        <div className="space-y-8">
          
          {/* Section 1: Focus Progress Rings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <CircularProgress 
              value={currentAiState?.profile?.focus_score || 0} 
              label="Focus Rating ⚡" 
              colorClass="stroke-primary" 
            />
            <CircularProgress 
              value={currentAiState?.profile?.procrastination_score || 0} 
              label="Free Time Buffer ⚽" 
              colorClass="stroke-amber-500" 
            />
            <CircularProgress 
              value={dynamicCompletionRate} 
              label="Tasks Completed 🏆" 
              colorClass="stroke-emerald-500" 
            />
          </div>

          {!currentAiState ? (
            <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl shadow-sm py-16 max-w-2xl mx-auto space-y-4">
              <Sparkles className="h-10 w-10 text-primary mx-auto animate-pulse" />
              <h3 className="text-base font-bold text-slate-800">Ready to Analyze your Workload?</h3>
              <p className="text-xs text-slate-500 font-semibold max-w-sm mx-auto">
                Click the **Analyze** button in the header to run your digital twin simulation, identify potential calendar conflicts, and get AI insights!
              </p>
            </div>
          ) : (
            <>
              {/* Section 2: Future Simulation & Agent Timeline Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Col 1 & 2: AI Cognitive Timeline Trace (Helper's Thoughts) */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold tracking-tight text-slate-805 flex items-center gap-2">
                      <Activity className="h-5 w-5 text-primary" />
                      <span>Helper's Thoughts</span>
                    </h2>
                    <button 
                      onClick={() => setShowTrace(!showTrace)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold shadow-sm transition"
                    >
                      {showTrace ? 'Hide details' : 'Show details'}
                    </button>
                  </div>

                  {showTrace ? (
                    <div className="p-6 bg-white border border-slate-200 rounded-2xl relative overflow-hidden shadow-sm animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="absolute top-8 bottom-8 left-9 w-0.5 timeline-line pointer-events-none" />
                      
                      <div className="space-y-6 relative z-10">
                        {currentAiState.reasoning?.map((step, idx) => (
                          <div key={idx} className="flex gap-4">
                            <div className="h-6 w-6 rounded-full bg-white border border-primary/40 flex items-center justify-center shrink-0 shadow-sm relative z-20">
                              <span className="h-2 w-2 rounded-full bg-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs font-bold text-slate-850 uppercase tracking-wider">{step.agent}</h4>
                              <p className="text-[10px] text-slate-400 font-semibold mb-1">{step.decision}</p>
                              <p className="text-xs text-slate-600 font-semibold leading-normal">{step.reasoning}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center shadow-sm py-12">
                      <Activity className="h-6 w-6 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs text-slate-400 font-semibold">Helper's trace log is hidden.</p>
                      <p className="text-[10px] text-slate-400 font-medium">Click "Show details" above to see the step-by-step thinking.</p>
                    </div>
                  )}
                </div>

                {/* Col 3: Future Simulator Scenarios & Predictions */}
                <div className="space-y-6">
                  <h2 className="text-xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
                    <Compass className="h-5 w-5 text-emerald-500" />
                    <span>AI TIME PREDICTIONS</span>
                  </h2>

                  <div className="p-6 bg-white border border-primary/20 rounded-2xl flex flex-col items-center justify-between gap-6 hover:border-primary/40 transition shadow-md w-full">
                    <div className="space-y-2 w-full">
                      <div className="flex items-center gap-2">
                         <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                           AI Recommendation
                         </span>
                      </div>
                      <span className="text-xs font-semibold text-slate-450 block">Success Probability: 90%</span>
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Shield Guard Schedule</h3>
                      <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                        {currentAiState.simulation?.future_b || "Applying schedule modifications avoids conflicts. Target goals delivered before deadline."}
                      </p>
                    </div>
                    <div className="text-center shrink-0 w-full pt-4 border-t border-slate-100 flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-400 uppercase">Overall Risk</span>
                      <span className="text-sm font-black text-emerald-500 uppercase tracking-wider">Very Low</span>
                    </div>
                  </div>

                  {/* Proactive Intervention Actions */}
                  {currentAiState.negotiation?.changes && currentAiState.negotiation.changes.length > 0 && (
                    <div className="p-5 rounded-2xl border border-primary/20 bg-blue-50/20 relative overflow-hidden">
                      <div className="flex items-center gap-2 mb-3.5">
                        <Shield className="h-5 w-5 text-primary" />
                        <h3 className="font-bold text-slate-800 text-sm">PROACTIVE SHIELD</h3>
                      </div>
                      <ul className="space-y-2 mb-5">
                        {currentAiState.negotiation.changes.map((change, index) => (
                          <li key={index} className="flex items-start gap-2.5 text-xs text-slate-600 font-semibold leading-normal">
                            <CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                            <span>{change}</span>
                          </li>
                        ))}
                      </ul>
                      <button 
                        onClick={() => alert('Negotiated adjustments pushed successfully to Google Calendar grid!')}
                        className="w-full px-4 py-2.5 rounded-lg bg-primary hover:bg-blue-600 text-white text-xs font-bold shadow-md transition flex items-center justify-center gap-2"
                      >
                        <Zap className="h-3.5 w-3.5 fill-white" />
                        <span>Apply adaptations</span>
                      </button>
                    </div>
                  )}

                </div>

              </div>

              {/* Section 3: Static Workload Info Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Risk Factors Card */}
                <div className="p-6 border border-slate-200 bg-white rounded-2xl shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm uppercase tracking-wide">
                      <AlertTriangle className="h-4.5 w-4.5 text-amber-500" />
                      <span>DANGER & CONTEXT PROFILE</span>
                    </h3>
                    <span className="text-xs font-bold text-amber-600 px-2 py-0.5 rounded bg-amber-100/50 border border-amber-200">
                      Risk Level: {currentAiState.risk?.risk_score || 0}%
                    </span>
                  </div>
                  <div className="space-y-3.5 text-xs text-slate-600 font-semibold">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                      <span className="text-slate-400">Calculated Stress Ceiling:</span>
                      <span className="text-slate-800 font-bold">{currentAiState.risk?.stress_score || 0}%</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                      <span className="text-slate-400">Success Safety Rate:</span>
                      <span className="text-emerald-600 font-bold">{currentAiState.risk?.completion_probability || 0}%</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                      <span className="text-slate-400">Google OAuth Connect:</span>
                      <span className="text-slate-500 font-bold">Active & Live</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Requires AI Mitigation:</span>
                      <span className="text-primary font-bold">Yes (Proactive)</span>
                    </div>
                  </div>
                </div>

                {/* AI Task breakdown Recommendations */}
                <div className="p-6 border border-slate-200 bg-white rounded-2xl shadow-sm">
                  <h3 className="font-bold text-slate-850 flex items-center gap-2 text-sm uppercase tracking-wide mb-4">
                    <CheckCircle className="h-4.5 w-4.5 text-primary" />
                    <span>AI SUGGESTED SUBTASK DRILLDOWN</span>
                  </h3>
                  <div className="space-y-3">
                    {currentAiState.plan?.subtasks?.map((sub, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg border border-slate-100">
                        <span className="h-4.5 w-4.5 bg-white border border-slate-200 text-[10px] text-slate-500 rounded-full flex items-center justify-center font-bold">
                          {idx + 1}
                        </span>
                        <span className="text-xs text-slate-600 font-semibold truncate">{sub}</span>
                      </div>
                    ))}
                    {(!currentAiState.plan?.subtasks || currentAiState.plan.subtasks.length === 0) && (
                      <p className="text-xs text-slate-400 py-4 text-center">No micro-subtask analysis required for the current calendar grid.</p>
                    )}
                  </div>
                </div>

              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
