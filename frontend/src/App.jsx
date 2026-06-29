import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Welcome from './pages/Welcome';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import Calendar from './pages/Calendar';
import Goals from './pages/Goals';
import Memory from './pages/Memory';
import Settings from './pages/Settings';
import ScheduleReview from './pages/ScheduleReview';
import { Sparkles } from 'lucide-react';


const ProtectedRoute = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-800">
        <Sparkles className="h-8 w-8 text-primary animate-spin mb-4" />
        <span className="text-sm font-semibold tracking-wider">Syncing Neural Core...</span>
      </div>
    );
  }

  return user ? (
    <Layout>
      <Outlet />
    </Layout>
  ) : (
    <Navigate to="/login" replace />
  );
};

const PublicRoute = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-800">
        <Sparkles className="h-8 w-8 text-primary animate-spin mb-4" />
        <span className="text-sm font-semibold tracking-wider">Initializing Auth Grid...</span>
      </div>
    );
  }

  return !user ? <Outlet /> : <Navigate to="/dashboard" replace />;
};

const RootRoute = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-800">
        <Sparkles className="h-8 w-8 text-primary animate-spin mb-4" />
        <span className="text-sm font-semibold tracking-wider">Loading ChronoGuard...</span>
      </div>
    );
  }

  return user ? <Navigate to="/dashboard" replace /> : <Welcome />;
};

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Root Landing Entry Path */}
        <Route path="/" element={<RootRoute />} />

        {/* Public Guest Routes */}
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

        {/* Protected Admin/User Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/memory" element={<Memory />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/schedule-review" element={<ScheduleReview />} />
        </Route>

        {/* Wildcard Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
