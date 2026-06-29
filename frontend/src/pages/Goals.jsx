import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Sparkles,
  Trophy,
  Flame,
  Activity,
  GraduationCap,
  Heart,
  User
} from 'lucide-react';

const Goals = () => {
  const queryClient = useQueryClient();
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalCategory, setNewGoalCategory] = useState('work');
  const [newGoalTarget, setNewGoalTarget] = useState(1);

  // Fetch Goals
  const { data: goalsData = [], isLoading } = useQuery({
    queryKey: ['goals'],
    queryFn: async () => {
      const response = await api.get('/goals');
      return response.data.goals || [];
    }
  });

  // Create Goal Mutation
  const createGoalMutation = useMutation({
    mutationFn: async (newGoal) => {
      const response = await api.post('/goals', newGoal);
      return response.data.goal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      setNewGoalTitle('');
      setNewGoalTarget(1);
    }
  });

  // Update Goal Mutation
  const updateGoalMutation = useMutation({
    mutationFn: async ({ id, updates }) => {
      const response = await api.put(`/goals/${id}`, updates);
      return response.data.goal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    }
  });

  // Delete Goal Mutation
  const deleteGoalMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/goals/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    }
  });

  const handleCreateGoal = (e) => {
    e.preventDefault();
    if (!newGoalTitle.trim()) return;
    createGoalMutation.mutate({
      title: newGoalTitle,
      category: newGoalCategory,
      targetCount: newGoalTarget
    });
  };

  const handleIncrement = (goal) => {
    const nextCount = goal.currentCount + 1;
    updateGoalMutation.mutate({
      id: goal._id,
      updates: { currentCount: nextCount }
    });
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this habit/goal?")) {
      deleteGoalMutation.mutate(id);
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'health': return <Heart className="h-4 w-4 text-rose-500" />;
      case 'learning': return <GraduationCap className="h-4 w-4 text-indigo-500" />;
      case 'personal': return <User className="h-4 w-4 text-emerald-500" />;
      default: return <Activity className="h-4 w-4 text-primary" />;
    }
  };

  const getCategoryGradient = (category) => {
    switch (category) {
      case 'health': return 'from-rose-50/70 to-pink-50/30 border-rose-100';
      case 'learning': return 'from-indigo-50/70 to-blue-50/30 border-indigo-100';
      case 'personal': return 'from-emerald-50/70 to-teal-50/30 border-emerald-100';
      default: return 'from-blue-50/70 to-slate-50 border-blue-100';
    }
  };

  const totalGoals = goalsData.length;
  const completedGoals = goalsData.filter(g => g.completed).length;
  const activeStreak = goalsData.filter(g => g.currentCount > 0).length;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-primary/10 rounded-xl">
            <Trophy className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase">Habit Completion Rate</p>
            <h3 className="text-xl font-black text-slate-800">
              {totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0}%
            </h3>
            <p className="text-[10px] text-slate-400 font-medium">{completedGoals} of {totalGoals} habits completed</p>
          </div>
        </div>

        <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-amber-500/10 rounded-xl">
            <Flame className="h-6 w-6 text-amber-500" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase">Active Daily Habits</p>
            <h3 className="text-xl font-black text-slate-800">{activeStreak}</h3>
            <p className="text-[10px] text-slate-400 font-medium">Habits with progress recorded today</p>
          </div>
        </div>

        <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-emerald-500/10 rounded-xl">
            <Sparkles className="h-6 w-6 text-emerald-500 animate-pulse" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase">AI Companion Focus</p>
            <h3 className="text-sm font-bold text-slate-700">Autonomous Habits Analysis</h3>
            <p className="text-[10px] text-slate-400 font-medium">Behavioral patterns tracked during analysis</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Form to create Habit/Goal */}
        <div className="lg:col-span-1">
          <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-6">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Plus className="h-4.5 w-4.5 text-primary" />
              <span>Track New Habit / Goal</span>
            </h3>

            <form onSubmit={handleCreateGoal} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Habit Title</label>
                <input 
                  type="text"
                  value={newGoalTitle}
                  onChange={(e) => setNewGoalTitle(e.target.value)}
                  placeholder="e.g. Read research papers, Drink water"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-850 placeholder-slate-400 text-xs focus:border-primary focus:outline-none transition shadow-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Category</label>
                  <select 
                    value={newGoalCategory}
                    onChange={(e) => setNewGoalCategory(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-850 text-xs focus:border-primary focus:outline-none transition shadow-sm"
                  >
                    <option value="work">Work/Task</option>
                    <option value="health">Health/Wellbeing</option>
                    <option value="learning">Academic</option>
                    <option value="personal">Personal Development</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Target Count</label>
                  <input 
                    type="number"
                    min="1"
                    max="100"
                    value={newGoalTarget}
                    onChange={(e) => setNewGoalTarget(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-850 text-xs focus:border-primary focus:outline-none transition shadow-sm"
                    required
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={createGoalMutation.isPending}
                className="w-full py-2.5 px-4 rounded-lg bg-primary hover:bg-blue-600 active:scale-[0.98] font-bold text-xs text-white shadow-md transition flex items-center justify-center gap-1.5"
              >
                <Plus className="h-4 w-4" />
                <span>Add Goal Tracker</span>
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: List of Goals & Progress Cards */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-indigo-500 animate-pulse" />
            <span>Active Habits & Goal Trackers</span>
          </h2>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
              <div className="h-32 border border-slate-200 bg-white rounded-2xl" />
              <div className="h-32 border border-slate-200 bg-white rounded-2xl" />
            </div>
          ) : goalsData.length === 0 ? (
            <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl shadow-sm py-16 space-y-3">
              <Trophy className="h-10 w-10 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">No habits or goals tracked yet.</h3>
              <p className="text-xs text-slate-400 font-semibold max-w-xs mx-auto">
                Add your first goal or routine to start proactively building better habits with your AI productivity companion!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {goalsData.map((goal) => {
                const percentage = Math.min(Math.round((goal.currentCount / goal.targetCount) * 100), 100);
                return (
                  <div 
                    key={goal._id} 
                    className={`p-5 rounded-2xl border bg-gradient-to-br shadow-sm hover:shadow-md transition duration-200 relative overflow-hidden flex flex-col justify-between min-h-[160px] ${getCategoryGradient(goal.category)}`}
                  >
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-white/80 rounded-lg shadow-sm border border-slate-100">
                            {getCategoryIcon(goal.category)}
                          </div>
                          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                            {goal.category}
                          </span>
                        </div>
                        <button 
                          onClick={() => handleDelete(goal._id)}
                          className="text-slate-400 hover:text-red-500 transition p-1 hover:bg-white/80 rounded-md"
                          title="Delete Tracker"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <h4 className={`font-bold text-sm leading-snug ${goal.completed ? 'text-slate-450 line-through text-slate-400' : 'text-slate-800'}`}>
                        {goal.title}
                      </h4>
                    </div>

                    <div className="space-y-2.5 pt-4">
                      {/* Progress Metrics */}
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-500">
                          {goal.currentCount} / {goal.targetCount}
                        </span>
                        <span className="font-black text-indigo-650 text-indigo-600">
                          {percentage}%
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-slate-200/60 rounded-full h-2 overflow-hidden border border-slate-100">
                        <div 
                          className="bg-primary h-full rounded-full transition-all duration-500 ease-out"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>

                      {/* Completion status button */}
                      <div className="pt-2">
                        {goal.completed ? (
                          <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-extrabold">
                            <CheckCircle2 className="h-4.5 w-4.5 fill-emerald-50 text-emerald-500" />
                            <span>Habit Complete!</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleIncrement(goal)}
                            className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 active:scale-95 text-slate-700 font-bold text-[10px] shadow-sm transition flex items-center gap-1 cursor-pointer select-none"
                          >
                            <span>Record Progress (+1)</span>
                          </button>
                        )}
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>

      </div>

    </div>
  );
};

export default Goals;
