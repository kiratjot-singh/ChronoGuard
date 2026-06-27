import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Sparkles, 
  ArrowRight, 
  ShieldCheck, 
  ListTodo, 
  Compass, 
  BrainCircuit 
} from 'lucide-react';

const Welcome = () => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      
      {/* Background Radial Glow */}
      <div className="absolute inset-0 radial-glow pointer-events-none z-0" />
      
      {/* Landing Wrapper Card */}
      <div className="w-full max-w-4xl bg-white border border-slate-200 p-8 md:p-12 rounded-3xl shadow-xl relative z-10 animate-in fade-in zoom-in-95 duration-300 flex flex-col md:flex-row gap-10 items-center justify-between">
        
        {/* Left Side: Product Intro */}
        <div className="flex-1 space-y-6">
          <div className="flex items-center gap-2 text-primary font-bold">
            <Sparkles className="h-6 w-6 text-primary animate-pulse" />
            <span className="tracking-widest text-sm uppercase">AI Chief of Staff</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 leading-tight">
            Meet <span className="text-primary">ChronoGuard</span>
          </h1>
          
          <p className="text-base text-slate-650 font-semibold leading-relaxed">
            ChronoGuard is your personal AI scheduler helper. It proactively organizes your tasks, protects your schedule from overlaps, and builds study habit recommendations.
          </p>

          {/* Core Feature Highlights list */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="flex items-start gap-2.5">
              <ListTodo className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-bold text-slate-800">AI Task Checklist</p>
                <p className="text-slate-500 font-medium">Decompose large goals instantly.</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-bold text-slate-800">Calendar Shield</p>
                <p className="text-slate-500 font-medium">Protect schedule slots and buffer times.</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Compass className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-bold text-slate-800">Future Simulator</p>
                <p className="text-slate-500 font-medium">Predict planning risks before they occur.</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <BrainCircuit className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-bold text-slate-800">Helper Insights</p>
                <p className="text-slate-500 font-medium">Discover your peak focus times.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Authentication Actions Card */}
        <div className="w-full md:w-80 p-6 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-center space-y-4 shrink-0 shadow-sm">
          <div className="text-center pb-2">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center font-bold text-white shadow-md mx-auto mb-2">
              <Sparkles className="h-5 w-5" />
            </div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Access Platform</p>
          </div>

          <Link 
            to="/register"
            className="w-full py-3 px-4 rounded-lg bg-primary hover:bg-blue-600 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2 group"
          >
            <span>Create Credentials</span>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition" />
          </Link>

          <Link 
            to="/login"
            className="w-full py-3 px-4 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-sm shadow-sm transition flex items-center justify-center gap-2"
          >
            <span>Sign In to Account</span>
          </Link>

          <p className="text-[10px] text-slate-400 font-semibold text-center leading-normal pt-2">
            Connect calendar & inbox channels to get proactive alerts.
          </p>
        </div>

      </div>

      {/* Footer copyright tagline */}
      <footer className="mt-8 text-center text-xs text-slate-400 font-semibold relative z-10">
        &copy; {new Date().getFullYear()} ChronoGuard AI Platform. All rights reserved.
      </footer>
    </div>
  );
};

export default Welcome;
