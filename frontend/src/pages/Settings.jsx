import React, { useState, useEffect } from 'react';
import api from '../services/api';
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
  
  const [googleCalendarConnected, setGoogleCalendarConnected] = useState(() => {
    return user?.googleConnected || false;
  });
  const [gmailConnected, setGmailConnected] = useState(() => {
    return user?.googleConnected || false;
  });
  
  const [syncOnLoad, setSyncOnLoad] = useState(() => {
    return user?.syncOnLoad !== undefined ? user.syncOnLoad : true;
  });
  const [emailAlerts, setEmailAlerts] = useState(() => {
    return user?.emailAlerts !== undefined ? user.emailAlerts : false;
  });
  const [focusBufferMinutes, setFocusBufferMinutes] = useState(() => {
    return user?.focusBufferMinutes !== undefined ? user.focusBufferMinutes : 30;
  });
  const [highPriorityKeywords, setHighPriorityKeywords] = useState(() => {
    return user?.highPriorityKeywords ? user.highPriorityKeywords.join(', ') : 'interview, internship, test, deadline, exam';
  });

  const [alertMsg, setAlertMsg] = useState(null);
  const [alertType, setAlertType] = useState('success');

  // Fetch connection state on mount and handle success/error params from OAuth callback redirect
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await api.get('/auth/profile');
        const dbUser = response.data.user;
        if (dbUser) {
          setGoogleCalendarConnected(dbUser.googleConnected || false);
          setGmailConnected(dbUser.googleConnected || false);
          setSyncOnLoad(dbUser.syncOnLoad !== undefined ? dbUser.syncOnLoad : true);
          setEmailAlerts(dbUser.emailAlerts !== undefined ? dbUser.emailAlerts : false);
          setFocusBufferMinutes(dbUser.focusBufferMinutes !== undefined ? dbUser.focusBufferMinutes : 30);
          setHighPriorityKeywords(dbUser.highPriorityKeywords ? dbUser.highPriorityKeywords.join(', ') : 'interview, internship, test, deadline, exam');
        }
      } catch (err) {
        console.error("Failed to load connection status", err);
      }
    };
    checkConnection();

    // Check callback URL parameters
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    const message = params.get('message');

    if (status === 'success') {
      setGoogleCalendarConnected(true);
      setGmailConnected(true);
      setAlertMsg("Successfully connected to Google Workspace!");
      setAlertType('success');
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (status === 'error') {
      setAlertMsg(message || "Failed to connect to Google Workspace.");
      setAlertType('error');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleUpdatePreference = async (field, value) => {
    try {
      if (field === 'syncOnLoad') setSyncOnLoad(value);
      if (field === 'emailAlerts') setEmailAlerts(value);
      if (field === 'focusBufferMinutes') setFocusBufferMinutes(value);
      if (field === 'highPriorityKeywords') setHighPriorityKeywords(value);

      const payloadValue = field === 'highPriorityKeywords'
        ? value.split(',').map(s => s.trim()).filter(Boolean)
        : value;

      await api.put('/auth/preferences', { [field]: payloadValue });
    } catch (e) {
      console.error("Failed to save preference adjustments", e);
    }
  };

  const handleConnectGoogle = async () => {
    try {
      const response = await api.get('/auth/google');
      if (response.data.url) {
        window.location.href = response.data.url;
      }
    } catch (e) {
      console.error("Failed to generate Google Auth URL", e);
      setAlertMsg("Error generating Google Auth Link: " + (e.response?.data?.message || e.message));
      setAlertType('error');
    }
  };

  const handleDisconnectGoogle = async () => {
    try {
      await api.post('/auth/google/disconnect');
      setGoogleCalendarConnected(false);
      setGmailConnected(false);
      setAlertMsg("Google workspace disconnected successfully.");
      setAlertType('success');
    } catch (e) {
      console.error("Failed to disconnect Google", e);
      setAlertMsg("Error disconnecting Google: " + (e.response?.data?.message || e.message));
      setAlertType('error');
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      {/* Alert Banner */}
      {alertMsg && (
        <div className={`p-4 rounded-xl border flex items-center justify-between shadow-sm animate-in fade-in duration-200 ${
          alertType === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-255 text-rose-800'
        }`}>
          <div className="flex items-center gap-2.5 text-xs font-semibold">
            <span className="text-base">{alertType === 'success' ? '✅' : '❌'}</span>
            <span>{alertMsg}</span>
          </div>
          <button 
            onClick={() => setAlertMsg(null)}
            className="text-[10px] uppercase font-bold text-slate-450 hover:text-slate-700 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

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
                  onClick={googleCalendarConnected ? handleDisconnectGoogle : handleConnectGoogle}
                  className={`px-3 py-1 rounded text-[10px] font-extrabold uppercase transition border cursor-pointer ${
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
                  onClick={gmailConnected ? handleDisconnectGoogle : handleConnectGoogle}
                  className={`px-3 py-1 rounded text-[10px] font-extrabold uppercase transition border cursor-pointer ${
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
                  onChange={(e) => handleUpdatePreference('syncOnLoad', e.target.checked)}
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
                  onChange={(e) => handleUpdatePreference('emailAlerts', e.target.checked)}
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
                  onChange={(e) => handleUpdatePreference('focusBufferMinutes', Number(e.target.value))}
                  className="px-2.5 py-1.5 rounded bg-white border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-primary shadow-sm"
                >
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">60 minutes</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-100">
                <div className="text-xs">
                  <p className="font-bold text-slate-800">Custom Priority Keywords</p>
                  <p className="text-slate-400 font-semibold">Comma-separated list of words to prioritize in email scans</p>
                </div>
                <input 
                  type="text"
                  value={highPriorityKeywords}
                  onChange={(e) => setHighPriorityKeywords(e.target.value)}
                  onBlur={(e) => handleUpdatePreference('highPriorityKeywords', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 text-xs focus:border-primary focus:outline-none transition shadow-sm"
                  placeholder="e.g. assignment, test, invoice"
                />
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default Settings;
