import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sparkles, ArrowRight, ShieldAlert } from 'lucide-react';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register(name, email, password);
      navigate('/');
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Radial Glow */}
      <div className="absolute inset-0 radial-glow pointer-events-none z-0" />
      
      {/* Centered Card */}
      <div className="w-full max-w-md bg-white border border-slate-200 p-8 rounded-2xl shadow-xl relative z-10 animate-in fade-in zoom-in-95 duration-300">
        
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-8">
          <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center font-bold text-white shadow-md mb-3">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-widest text-slate-900">
            CHRONO<span className="text-primary">GUARD</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1.5 font-medium">Join the agentic chief of staff developer platform</p>
        </div>

        {/* Error Alert Box */}
        {error && (
          <div className="mb-5 p-3 rounded-lg border border-red-200 bg-red-50 text-red-600 text-xs flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Full Profile Name
            </label>
            <input 
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alex Johnson"
              className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder-slate-400 text-sm focus:border-primary focus:outline-none transition shadow-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <input 
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder-slate-400 text-sm focus:border-primary focus:outline-none transition shadow-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Password Security
            </label>
            <input 
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder-slate-400 text-sm focus:border-primary focus:outline-none transition shadow-sm"
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full mt-6 py-3 px-4 rounded-lg bg-primary hover:bg-blue-600 text-white font-semibold text-sm shadow-md transition flex items-center justify-center gap-2 group disabled:opacity-50"
          >
            <span>{loading ? 'Registering Account...' : 'Generate AI Dashboard'}</span>
            {!loading && <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition" />}
          </button>
        </form>

        {/* Footer Toggle Link */}
        <div className="mt-8 text-center border-t border-slate-100 pt-5">
          <p className="text-xs text-slate-500 font-medium">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:underline font-bold transition">
              Log in instead
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
