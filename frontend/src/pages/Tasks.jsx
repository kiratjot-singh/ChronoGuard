import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { 
  Plus, 
  Trash2, 
  CheckSquare, 
  Square, 
  Clock, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  ListTodo,
  Calendar,
  AlertCircle
} from 'lucide-react';

const Tasks = () => {
  const queryClient = useQueryClient();
  const [expandedTaskId, setExpandedTaskId] = useState(null);
  
  // New Task form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState('medium');
  const [estimatedHours, setEstimatedHours] = useState(2);
  const [formError, setFormError] = useState('');

  // Fetch all tasks
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const response = await api.get('/tasks');
      return response.data.tasks || [];
    }
  });

  // Create Task Mutation
  const createTaskMutation = useMutation({
    mutationFn: async (newTask) => {
      const response = await api.post('/tasks', newTask);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setIsModalOpen(false);
      setTitle('');
      setDeadline('');
      setPriority('medium');
      setEstimatedHours(2);
      setFormError('');
    }
  });

  // Toggle Task Status Mutation
  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, updates }) => {
      const response = await api.put(`/tasks/${id}`, updates);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    }
  });

  // Delete Task Mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (id) => {
      const response = await api.delete(`/tasks/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    }
  });

  // AI Subtask Generator Mutation
  const generateSubtasksMutation = useMutation({
    mutationFn: async ({ id, taskTitle }) => {
      const mockSubtaskBreakdowns = {
        "Amazon ML Test": [
          "Study logistic regression and tree architectures",
          "Practice hackerrank machine learning test set",
          "Validate model training epochs and loss metrics"
        ],
        "Hackathon Submission": [
          "Complete React Vite UI views and local routing",
          "Ensure Express API is linked with database schemas",
          "Verify FastAPI LangGraph agents return JSON"
        ],
        "Gym": [
          "Prepare hydration shaker and dynamic warm-up",
          "High intensity compound lifts (Squats & Deadlifts)",
          "15-minute cardiovascular cool-down session"
        ]
      };

      const customMatch = Object.keys(mockSubtaskBreakdowns).find(key => 
        taskTitle.toLowerCase().includes(key.toLowerCase())
      );
      
      const subtasks = customMatch 
        ? mockSubtaskBreakdowns[customMatch] 
        : [
            `Decompose ${taskTitle} requirements`,
            `Analyze critical execution dependencies`,
            `Perform unit verification and complete task`
          ];

      const response = await api.put(`/tasks/${id}`, { subtasks });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    }
  });

  const handleCreateTask = (e) => {
    e.preventDefault();
    if (!title || !deadline) {
      setFormError('Please enter a task title and deadline');
      return;
    }
    createTaskMutation.mutate({
      title,
      deadline,
      priority,
      estimated_hours: Number(estimatedHours)
    });
  };

  const handleToggleStatus = (task) => {
    const nextStatus = task.status === 'pending' ? 'completed' : 'pending';
    updateTaskMutation.mutate({
      id: task._id,
      updates: { status: nextStatus }
    });
  };

  const handleDelete = (id) => {
    if (window.confirm('Delete this task from your schedule?')) {
      deleteTaskMutation.mutate(id);
    }
  };

  const triggerDecomposition = (task) => {
    generateSubtasksMutation.mutate({ id: task._id, taskTitle: task.title });
  };

  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header Panel */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
            <ListTodo className="h-8 w-8 text-primary" />
            <span>MY <span className="text-primary">TO-DO LIST</span></span>
          </h1>
          <p className="text-slate-500 mt-1 text-sm font-medium">Create checklists, set due dates, and let the AI helper organize them.</p>
        </div>

        <button 
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 rounded-lg bg-primary hover:bg-blue-600 font-semibold text-xs text-white flex items-center gap-1.5 shadow-sm transition"
        >
          <Plus className="h-4 w-4" />
          <span>Add a Task</span>
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Sparkles className="h-8 w-8 animate-spin text-primary mb-4" />
          <span className="text-xs font-bold tracking-widest uppercase">Loading Task Grid...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Pending Tasks List */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-sm font-bold tracking-wider text-slate-400 uppercase flex items-center gap-2 mb-2">
              <span>My Tasks ({pendingTasks.length})</span>
            </h2>

            {pendingTasks.length === 0 ? (
              <div className="p-10 border border-slate-200 bg-white rounded-2xl text-center shadow-sm">
                <AlertCircle className="h-8 w-8 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-xs font-semibold">No tasks here! You are all caught up!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingTasks.map((task) => (
                  <div 
                    key={task._id}
                    className="border border-slate-200 bg-white rounded-xl overflow-hidden hover:border-slate-300 transition shadow-sm"
                  >
                    {/* Primary Row */}
                    <div className="p-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <button 
                          onClick={() => handleToggleStatus(task)}
                          className="text-slate-300 hover:text-primary transition"
                        >
                          <Square className="h-5 w-5" />
                        </button>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-800 truncate">{task.title}</p>
                          <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400 font-semibold">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              <span>Due: {task.deadline}</span>
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              <span>{task.estimated_hours}h estimated</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${
                          task.priority === 'high' ? 'bg-red-50 text-red-600 border-red-100' : 
                          task.priority === 'medium' ? 'bg-amber-50 text-amber-600 border-amber-100' : 
                          'bg-slate-50 text-slate-500 border-slate-200'
                        }`}>
                          {task.priority}
                        </span>
                        
                        <button 
                          onClick={() => setExpandedTaskId(expandedTaskId === task._id ? null : task._id)}
                          className="p-1.5 rounded hover:bg-slate-50 text-slate-400 hover:text-slate-800 transition"
                        >
                          {expandedTaskId === task._id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>

                        <button 
                          onClick={() => handleDelete(task._id)}
                          className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 transition"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Collapsible Subtasks Row */}
                    {expandedTaskId === task._id && (
                      <div className="px-4 pb-4 pt-1 border-t border-slate-100 bg-slate-50/50">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Checklist Items</h4>
                          {(!task.subtasks || task.subtasks.length === 0) && (
                            <button 
                              onClick={() => triggerDecomposition(task)}
                              disabled={generateSubtasksMutation.isPending}
                              className="px-2 py-1 rounded bg-primary/10 border border-primary/20 text-[10px] font-bold text-primary hover:bg-primary/20 transition flex items-center gap-1 disabled:opacity-50"
                            >
                              <Sparkles className="h-3 w-3" />
                              <span>Split with AI Helper</span>
                            </button>
                          )}
                        </div>

                        {task.subtasks && task.subtasks.length > 0 ? (
                          <div className="space-y-1.5">
                            {task.subtasks.map((sub, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-xs text-slate-600 font-semibold">
                                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                                <span>{sub}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-400 italic">No checklist items created yet.</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Completed Tasks Summary */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold tracking-wider text-slate-400 uppercase flex items-center gap-2 mb-2">
              <span>Completed Tasks ({completedTasks.length})</span>
            </h2>

            <div className="p-4 border border-slate-200 bg-white rounded-2xl shadow-sm space-y-3.5">
              {completedTasks.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">No recently completed tasks found.</p>
              ) : (
                completedTasks.map((task) => (
                  <div key={task._id} className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <button 
                        onClick={() => handleToggleStatus(task)}
                        className="text-emerald-500 transition hover:scale-105"
                      >
                        <CheckSquare className="h-5 w-5 fill-emerald-500/10" />
                      </button>
                      <span className="text-xs font-semibold text-slate-400 line-through truncate">{task.title}</span>
                    </div>
                    <button 
                      onClick={() => handleDelete(task._id)}
                      className="text-slate-300 hover:text-red-600 transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}

      {/* Task Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-wider mb-4">Add a New Task</h3>
            
            {formError && (
              <div className="mb-4 p-2.5 rounded bg-red-50 border border-red-200 text-red-600 text-xs font-semibold">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Task Name</label>
                <input 
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Work on school project"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-950 text-xs focus:border-primary focus:outline-none transition shadow-sm"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Due Date</label>
                <input 
                  type="text"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  placeholder="e.g. Tomorrow or June 28th"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-950 text-xs focus:border-primary focus:outline-none transition shadow-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Priority</label>
                  <select 
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-950 text-xs focus:border-primary focus:outline-none transition shadow-sm"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">How long will it take? (hours)</label>
                  <input 
                    type="number"
                    min="1"
                    value={estimatedHours}
                    onChange={(e) => setEstimatedHours(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-950 text-xs focus:border-primary focus:outline-none transition shadow-sm"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition border border-slate-200"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={createTaskMutation.isPending}
                  className="flex-1 py-2.5 rounded bg-primary hover:bg-blue-600 text-white text-xs font-bold shadow-sm transition disabled:opacity-50"
                >
                  Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tasks;
