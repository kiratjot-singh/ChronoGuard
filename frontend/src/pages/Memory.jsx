import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  BarChart, 
  Bar, 
  Cell 
} from 'recharts';
import { 
  BrainCircuit, 
  TrendingUp, 
  Clock, 
  Sparkles, 
  Lightbulb 
} from 'lucide-react';

const Memory = () => {
  const [showCharts, setShowCharts] = useState(true);
  
  // Fetch historical cognitive averages
  const { data: memoryData, isLoading } = useQuery({
    queryKey: ['memoryStats'],
    queryFn: async () => {
      const response = await api.get('/memory');
      return response.data.memory;
    }
  });

  const averageFocusVal = memoryData?.averageFocus !== undefined ? memoryData.averageFocus : 0;
  const averageCompletionRateVal = memoryData?.averageCompletionRate !== undefined ? memoryData.averageCompletionRate : 0;
  const preferredHours = memoryData?.preferredWorkHours?.length > 0 
    ? memoryData.preferredWorkHours 
    : [];
  const obsCount = memoryData?.observationsCount || 0;

  const focusTrendData = memoryData?.focusTrendData || [
    { day: 'Mon', focus: averageFocusVal ? Math.round(averageFocusVal * 0.9) : 0 },
    { day: 'Tue', focus: averageFocusVal ? Math.round(averageFocusVal * 1.0) : 0 },
    { day: 'Wed', focus: averageFocusVal ? Math.round(averageFocusVal * 0.95) : 0 },
    { day: 'Thu', focus: averageFocusVal ? Math.round(averageFocusVal * 1.05) : 0 },
    { day: 'Fri', focus: averageFocusVal ? Math.round(averageFocusVal * 1.0) : 0 },
    { day: 'Sat', focus: averageFocusVal ? Math.round(averageFocusVal * 0.8) : 0 },
    { day: 'Sun', focus: averageFocusVal },
  ];

  const hourlyFocusData = memoryData?.hourlyFocusData || [
    { hour: '09:00', efficiency: preferredHours.includes('09:00') ? 95 : 50 },
    { hour: '11:00', efficiency: preferredHours.includes('11:00') ? 95 : 50 },
    { hour: '13:00', efficiency: preferredHours.includes('13:00') ? 95 : 50 },
    { hour: '15:00', efficiency: preferredHours.includes('15:00') ? 95 : 50 },
    { hour: '17:00', efficiency: preferredHours.includes('17:00') ? 95 : 50 },
    { hour: '20:00', efficiency: preferredHours.includes('20:00') ? 95 : 50 },
    { hour: '22:00', efficiency: preferredHours.includes('22:00') ? 95 : 50 },
  ];

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header Panel */}
      <div>
        <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
          <BrainCircuit className="h-8 w-8 text-primary animate-pulse" />
          <span>HELPER <span className="text-primary">TIPS & INSIGHTS</span></span>
        </h1>
        <p className="text-slate-500 mt-1 text-sm font-medium">See your weekly progress stats and tips to help you build great focus habits.</p>
      </div>

      {isLoading ? (
        <div className="text-center py-20 text-slate-400 font-semibold text-xs">
          <span>Loading Memory Clusters...</span>
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-5 border border-slate-200 bg-white rounded-xl shadow-sm">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Focus Rating ⚡</span>
              <p className="text-2xl font-black text-slate-900 mt-1">{averageFocusVal}%</p>
              <div className="mt-2 flex items-center gap-1 text-[11px] text-slate-500">
                <TrendingUp className="h-3.5 w-3.5 text-primary" />
                <span className="font-semibold">How well you focused this week</span>
              </div>
            </div>

            <div className="p-5 border border-slate-200 bg-white rounded-xl shadow-sm">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Tasks Finished 🏆</span>
              <p className="text-2xl font-black text-emerald-600 mt-1">{averageCompletionRateVal}%</p>
              <div className="mt-2 flex items-center gap-1 text-[11px] text-slate-500">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="font-semibold">Percentage of tasks completed</span>
              </div>
            </div>

            <div className="p-5 border border-slate-200 bg-white rounded-xl shadow-sm">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Best Focus Times 🕒</span>
              <p className="text-xs font-bold text-slate-800 mt-2.5 truncate">
                {preferredHours.length > 0 ? preferredHours.join(', ') : 'None'}
              </p>
              <div className="mt-2 flex items-center gap-1 text-[11px] text-slate-500">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                <span className="font-semibold">Your peak performance window</span>
              </div>
            </div>

            <div className="p-5 border border-slate-200 bg-white rounded-xl shadow-sm">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Study Habits 💡</span>
              <p className="text-2xl font-black text-primary mt-1">{obsCount}</p>
              <div className="mt-2 flex items-center gap-1 text-[11px] text-slate-500">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span className="font-semibold">Tips found by helper</span>
              </div>
            </div>
          </div>

          {/* Recharts Analytics */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Productivity Progress Charts</h3>
              <button 
                onClick={() => setShowCharts(!showCharts)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold shadow-sm transition"
              >
                {showCharts ? 'Hide Charts' : 'Show Charts'}
              </button>
            </div>

            {showCharts ? (
              obsCount === 0 ? (
                <div className="p-8 text-center bg-white border border-slate-200 rounded-xl shadow-sm text-slate-500 font-semibold text-xs py-12 lg:col-span-2">
                  <TrendingUp className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <span>No AI observations recorded yet. Run a workload analysis on the Dashboard to unlock timeline tracking charts!</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Focus Curve */}
                <div className="p-6 border border-slate-200 bg-white rounded-2xl shadow-sm">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-6 flex items-center gap-2">
                    <TrendingUp className="h-4.5 w-4.5 text-primary" />
                    <span>Weekly Focus Timeline</span>
                  </h3>
                  <div className="h-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={focusTrendData}>
                        <XAxis dataKey="day" stroke="#64748b" fontSize={11} tickLine={false} />
                        <YAxis stroke="#64748b" fontSize={11} tickLine={false} domain={[0, 100]} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', color: '#0f172a' }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="focus" 
                          stroke="#3b82f6" 
                          strokeWidth={3} 
                          activeDot={{ r: 6 }} 
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Peak Efficiency */}
                <div className="p-6 border border-slate-200 bg-white rounded-2xl shadow-sm">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-6 flex items-center gap-2">
                    <Clock className="h-4.5 w-4.5 text-primary" />
                    <span>Peak Performance Hour Analysis</span>
                  </h3>
                  <div className="h-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={hourlyFocusData}>
                        <XAxis dataKey="hour" stroke="#64748b" fontSize={11} tickLine={false} />
                        <YAxis stroke="#64748b" fontSize={11} tickLine={false} domain={[0, 100]} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', color: '#0f172a' }}
                        />
                        <Bar dataKey="efficiency" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                          {hourlyFocusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index === 1 || index === 5 ? '#10b981' : '#3b82f6'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )
            ) : (
              <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center shadow-sm py-8">
                <p className="text-xs text-slate-400 font-semibold">Weekly progress charts are hidden.</p>
                <p className="text-[10px] text-slate-400 font-medium">Click "Show Charts" above to see detailed graphs.</p>
              </div>
            )}
          </div>

          {/* Diagnosis Card */}
          <div className="p-6 border border-slate-200 bg-white rounded-2xl shadow-sm flex flex-col justify-between">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Lightbulb className="h-4.5 w-4.5 text-primary" />
              <span>My Weekly Study Diagnosis</span>
            </h3>
            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Friction points to improve:</h4>
              {memoryData?.recurringProcrastinationPatterns && memoryData.recurringProcrastinationPatterns.length > 0 ? (
                <p className="text-xs text-slate-550 leading-normal font-semibold">
                  The AI Helper has identified the following friction points: <span className="text-rose-600 font-bold">{memoryData.recurringProcrastinationPatterns.join(', ')}</span>. Try to establish a consistent schedule and break down large tasks to mitigate these!
                </p>
              ) : (
                <p className="text-xs text-slate-400 leading-normal font-medium">
                  No procrastination patterns detected yet. Complete tasks and trigger analyses on the Dashboard to let the Helper diagnose friction points!
                </p>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default Memory;
