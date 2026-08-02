import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Lock, User, AlertCircle, Compass } from 'lucide-react';

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const location = useLocation();
  const [logoutReason, setLogoutReason] = useState(() => {
    const reason = sessionStorage.getItem('logoutReason');
    sessionStorage.removeItem('logoutReason'); // clear immediately
    return reason;
  });

  const sessionExpired = location.state?.expired || logoutReason === 'session_expired';
  const duplicateLogin = logoutReason === 'duplicate_login';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Please fill in all fields.");
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await axios.post('/api/auth/login', { username, password });
      if (res.data && res.data.user) {
        if (res.data.token) {
          localStorage.setItem('token', res.data.token);
        }
        localStorage.setItem('user', JSON.stringify(res.data.user));
        onLoginSuccess(res.data.user);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Login failed. Please verify credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-4 relative overflow-hidden m-1">
      {/* Background Ambient Cool Light FX */}
      <div className="fixed top-10 left-1/3 w-[500px] h-[400px] bg-sky-200/40 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="fixed bottom-10 right-1/3 w-[450px] h-[400px] bg-indigo-200/30 rounded-full blur-[150px] pointer-events-none -z-10" />

      <div className="w-full max-w-md space-y-4 m-1">
        
        {/* Title Logo */}
        <div className="text-center space-y-1.5">
          <Link to="/" className="inline-flex items-center justify-center w-12 h-12 bg-sky-50 border border-sky-200 rounded-2xl text-sky-600 mb-1 shadow-sm hover:scale-105 transition-transform">
            <Compass className="w-7 h-7 animate-spin-slow" />
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-sans">Recovery Force</h1>
          <p className="text-xs text-slate-600">Field Officer Tracking & Recovery Management</p>
        </div>

        {/* Form Container */}
        <div className="glass-panel p-4 rounded-2xl border border-slate-200 bg-white/90 shadow-xl space-y-4 m-1">
          <h2 className="text-base font-bold text-slate-900 font-sans">Sign in to your account</h2>
          
          {sessionExpired && (
            <div className="flex items-center space-x-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-600" />
              <span>Security Warning: You have been logged out due to inactivity.</span>
            </div>
          )}

          {duplicateLogin && (
            <div className="flex items-start space-x-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs text-left">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
              <span>
                <strong>Account Disconnected:</strong> This profile was signed in on another device. Simultaneous logins are restricted.
              </span>
            </div>
          )}

          {error && (
            <div className="flex items-center space-x-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            
            {/* Username Input */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700" htmlFor="username">Username</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <User className="w-4 h-4" />
                </span>
                <input
                  id="username"
                  type="text"
                  required
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-sky-600 focus:ring-1 focus:ring-sky-600 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-900 placeholder-slate-400 outline-none transition"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-slate-700" htmlFor="password">Password</label>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  id="password"
                  type="password"
                  required
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-sky-600 focus:ring-1 focus:ring-sky-600 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-900 placeholder-slate-400 outline-none transition"
                />
              </div>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-gradient-to-r from-sky-600 via-indigo-600 to-teal-600 hover:from-sky-500 hover:to-teal-500 disabled:opacity-70 text-white font-semibold text-xs rounded-xl transition shadow-md shadow-sky-600/20 flex items-center justify-center space-x-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>

          {/* Referral sign up suggestion */}
          <div className="text-center pt-1">
            <p className="text-xs text-slate-600">
              New to the system?{' '}
              <Link to="/register" className="text-sky-600 hover:text-sky-700 font-semibold underline">
                Register here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
