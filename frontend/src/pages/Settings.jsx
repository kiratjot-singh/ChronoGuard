import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Settings as SettingsIcon, 
  User, 
  Mail, 
  Calendar, 
  ShieldCheck 
} from 'lucide-react';

const Settings = () => {
  const { user } = useAuth();
  
  const [googleCalendarConnected, setGoogleCalendarConnected] = useState(true);
  const [gmailConnected, setGmailConnected] = useState(true);
  
  const [syncOnLoad, setSyncOnLoad] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(false);
  const [focusBufferMinutes, setFocusBufferMinutes] = useState(30);

  const handleToggleCalendar = () => {
    setGoogleCalendarConnected(!googleCalendarConnected);
  };

  const handleToggleGmail = () => {
    setGmailConnected(!gmailConnected);
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      {/* Header Panel */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
          <SettingsIcon className="h-7 w-7 text-primary" />
          <span>Platform Settings</span>
        </h1>
        <p className="text-slate-500 mt-0.5 text-sm font-medium">Manage OAuth API connector settings and configure behavioral agent preferences.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Profile Details */}
        <div className="space-y-6">
          <div className="p-5 border border-slate-200 bg-white rounded-xl shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <User className="h-4 w-4" />
              <span>User Profile</span>
            </h3>

            {user && (
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase block">Profile Name</label>
                  <p className="text-sm font-bold text-slate-800 mt-0.5">{user.name}</p>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase block">Login Identity</label>
                  <p className="text-sm font-semibold text-slate-600 mt-0.5">{user.email}</p>
                </div>
                <div className="pt-4 border-t border-slate-100 flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  <span>Session Authenticated</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Adjustments */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Workspace Connectors */}
          <div className="p-6 border border-slate-200 bg-white rounded-xl shadow-sm space-y-5">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="h-4.5 w-4.5 text-primary" />
              <span>Google API Workspace Integration</span>
            </h3>

            <p className="text-xs text-slate-500 leading-normal font-semibold">
              ChronoGuard scans your connected calendars and emails to identify calendar overload events and task assignments automatically.
            </p>

            <div className="space-y-4 pt-2">
              {/* Calendar Connection */}
              <div className="flex justify-between items-center p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-3">
                  <Calendar className={`h-5 w-5 ${googleCalendarConnected ? 'text-primary' : 'text-slate-400'}`} />
                  <div className="text-xs">
                    <p className="font-bold text-slate-800">Google Calendar Synchronizer</p>
                    <p className="text-slate-500 font-medium">
                      {googleCalendarConnected ? 'Connected (Sharing schedule slots)' : 'Disconnected'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={handleToggleCalendar}
                  className={`px-3 py-1 rounded text-[10px] font-extrabold uppercase transition border ${
                    googleCalendarConnected 
                      ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' 
                      : 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20'
                  }`}
                >
                  {googleCalendarConnected ? 'Disconnect' : 'Connect'}
                </button>
              </div>

              {/* Gmail Connection */}
              <div className="flex justify-between items-center p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-3">
                  <Mail className={`h-5 w-5 ${gmailConnected ? 'text-primary' : 'text-slate-400'}`} />
                  <div className="text-xs">
                    <p className="font-bold text-slate-800">Gmail Inbox Scanner</p>
                    <p className="text-slate-500 font-medium">
                      {gmailConnected ? 'Connected (Discovering inbox tasks)' : 'Disconnected'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={handleToggleGmail}
                  className={`px-3 py-1 rounded text-[10px] font-extrabold uppercase transition border ${
                    gmailConnected 
                      ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' 
                      : 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20'
                  }`}
                >
                  {gmailConnected ? 'Disconnect' : 'Connect'}
                </button>
              </div>
            </div>
          </div>

          {/* Behavioral Preferences */}
          <div className="p-6 border border-slate-200 bg-white rounded-xl shadow-sm space-y-5">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <SettingsIcon className="h-4.5 w-4.5 text-primary" />
              <span>Agent Behavioral Properties</span>
            </h3>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="text-xs">
                  <p className="font-bold text-slate-850 text-slate-800">Trigger Auto Analysis</p>
                  <p className="text-slate-400 font-semibold">Proactively check calendar upon load</p>
                </div>
                <input 
                  type="checkbox"
                  checked={syncOnLoad}
                  onChange={(e) => setSyncOnLoad(e.target.checked)}
                  className="h-4 w-4 rounded bg-white border-slate-200 border text-primary focus:ring-primary"
                />
              </div>

              <div className="flex justify-between items-center">
                <div className="text-xs">
                  <p className="font-bold text-slate-850 text-slate-800">Send Proactive Email Summaries</p>
                  <p className="text-slate-400 font-semibold">Weekly productivity insights sent to your email</p>
                </div>
                <input 
                  type="checkbox"
                  checked={emailAlerts}
                  onChange={(e) => setEmailAlerts(e.target.checked)}
                  className="h-4 w-4 rounded bg-white border-slate-200 border text-primary focus:ring-primary"
                />
              </div>

              <div className="flex justify-between items-center">
                <div className="text-xs">
                  <p className="font-bold text-slate-850 text-slate-800">Focus Buffer Window</p>
                  <p className="text-slate-400 font-semibold">Buffer minutes inserted between consecutive blocks</p>
                </div>
                <select 
                  value={focusBufferMinutes}
                  onChange={(e) => setFocusBufferMinutes(Number(e.target.value))}
                  className="px-2.5 py-1.5 rounded bg-white border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-primary shadow-sm"
                >
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">60 minutes</option>
                </select>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default Settings;
