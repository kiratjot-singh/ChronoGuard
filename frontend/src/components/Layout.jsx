import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { 
  LayoutDashboard, 
  CheckSquare, 
  Calendar, 
  BrainCircuit, 
  Settings, 
  LogOut, 
  Bell, 
  Menu, 
  X,
  Sparkles,
  Trophy
} from 'lucide-react';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Fetch AI alerts and notifications
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await api.get('/notifications');
      return response.data.notifications || [];
    },
    refetchInterval: 10000,
  });

  // Mutation to mark all notifications as read
  const markReadMutation = useMutation({
    mutationFn: async () => {
      return await api.put('/notifications/read');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const navItems = [
    { name: 'Home', path: '/dashboard', icon: LayoutDashboard },
    { name: 'To-Do List', path: '/tasks', icon: CheckSquare },
    { name: 'My Schedule', path: '/calendar', icon: Calendar },
    { name: 'Plan Review Mode', path: '/schedule-review', icon: Sparkles },
    { name: 'Goals & Habits', path: '/goals', icon: Trophy },
    { name: 'Helper Tips', path: '/memory', icon: BrainCircuit },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col md:flex-row relative overflow-x-hidden font-sans">
      
      {/* Radial Top Glow */}
      <div className="absolute top-0 left-0 right-0 h-[300px] radial-glow pointer-events-none z-0" />

      {/* Mobile Top Navbar */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-slate-200 bg-white/90 backdrop-blur z-20 w-full">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg tracking-wider text-slate-900">
          <Sparkles className="h-5 w-5 text-primary" />
          <span>CHRONO<span className="text-primary">GUARD</span></span>
        </Link>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="relative p-2 rounded-lg hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-accent" />
            )}
          </button>
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Sidebar Navigation */}
      <aside className={`
        fixed inset-y-0 left-0 w-64 border-r border-slate-200 bg-white z-30 transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:flex md:flex-col
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Sidebar Logo */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-black text-xl tracking-widest text-slate-900">
            <Sparkles className="h-6 w-6 text-primary animate-pulse" />
            <span>CHRONO<span className="text-primary">GUARD</span></span>
          </Link>
          <button className="md:hidden p-1 hover:bg-slate-50 rounded" onClick={() => setMobileMenuOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User Badge */}
        {user && (
          <div className="p-4 mx-4 my-6 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center font-bold text-white shadow-sm">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate text-slate-800">{user.name}</p>
              <p className="text-xs text-slate-500 truncate">{user.email}</p>
            </div>
          </div>
        )}

        {/* Sidebar Links */}
        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition duration-200 group
                  ${isActive 
                    ? 'bg-primary/5 text-primary border border-primary/10 font-semibold shadow-sm' 
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/50 border border-transparent'}
                `}
              >
                <Icon className={`h-5 w-5 transition duration-200 ${isActive ? 'text-primary' : 'text-slate-400 group-hover:text-slate-700'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Logout Footer */}
        <div className="p-4 border-t border-slate-100 mt-auto">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-red-500 hover:bg-red-500/5 hover:text-red-600 font-medium transition border border-transparent"
          >
            <LogOut className="h-5 w-5" />
            <span>Logout Account</span>
          </button>
        </div>
      </aside>

      {/* Main Content Layout */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        
        {/* Desktop Top Header */}
        <header className="hidden md:flex items-center justify-between px-8 py-5 border-b border-slate-200 bg-white/60 backdrop-blur-sm relative z-20">
          <div className="flex items-center gap-3">
            <span className="text-slate-400 font-medium select-none">ChronoGuard</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-800 font-bold capitalize">
              {location.pathname === '/' ? 'Home Overview' : 
               location.pathname === '/tasks' ? 'To-Do List' :
               location.pathname === '/calendar' ? 'My Schedule' :
               location.pathname === '/schedule-review' ? 'AI Schedule Review' :
               location.pathname === '/goals' ? 'Goals & Habit Tracking' :
               location.pathname === '/memory' ? 'Helper Tips & Insights' :
               location.pathname === '/settings' ? 'Settings' : 'Overview'}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* AI Warning Alerts Trigger */}
            <div className="relative">
              <button 
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative p-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition shadow-sm"
              >
                <Bell className="h-4.5 w-4.5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-accent" />
                )}
              </button>

              {/* Desktop Notification Dropdown Drawer */}
              {notificationsOpen && (
                <div className="absolute right-0 mt-3 w-80 rounded-xl border border-slate-200 bg-white shadow-xl p-4 z-40 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                    <h3 className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <span>AI Proactive Warnings</span>
                    </h3>
                    {unreadCount > 0 && (
                      <button 
                        onClick={() => markReadMutation.mutate()}
                        className="text-xs text-primary hover:text-blue-600 transition font-bold"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-2.5 pr-1">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-4">No warnings or risk notifications detected.</p>
                    ) : (
                      notifications.map((notif) => (
                        <div 
                          key={notif._id} 
                          className={`p-2.5 rounded-lg border transition text-xs ${notif.read ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-blue-50/50 border-blue-100'}`}
                        >
                          <div className="flex justify-between items-start gap-2 mb-1">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
                              notif.type === 'risk' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 
                              notif.type === 'simulation' ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20' : 
                              'bg-primary/10 text-primary border border-primary/20'
                            }`}>
                              {notif.type}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-slate-700 leading-normal font-medium">{notif.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* AI Active Indicator */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-green-500/20 bg-green-500/5">
              <span className="h-2 w-2 rounded-full bg-green-400 animate-ping" />
              <span className="text-xs font-semibold text-green-500 select-none">AI Agent Active</span>
            </div>
          </div>
        </header>

        {/* Mobile Notification Pop-down Drawer */}
        {notificationsOpen && mdHiddenDropdown()}

        {/* View Children Elements */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto z-10 relative">
          {children}
        </main>
      </div>
    </div>
  );

  function mdHiddenDropdown() {
    return (
      <div className="md:hidden border-b border-slate-200 bg-white p-4 z-40">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
          <h3 className="font-bold text-sm text-slate-800">AI Warnings ({unreadCount} unread)</h3>
          {unreadCount > 0 && (
            <button 
              onClick={() => markReadMutation.mutate()}
              className="text-xs text-primary font-bold"
            >
              Clear Warnings
            </button>
          )}
        </div>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-2">No alerts detected.</p>
          ) : (
            notifications.map((notif) => (
              <div key={notif._id} className="p-2 rounded bg-slate-50 border border-slate-100 text-xs">
                <p className="font-medium text-slate-700">{notif.message}</p>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }
};

export default Layout;
