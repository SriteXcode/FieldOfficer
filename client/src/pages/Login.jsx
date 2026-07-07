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
  const sessionExpired = location.state?.expired;

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
        onLoginSuccess(res.data.user);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Login failed. Please verify credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md space-y-6">
        
        {/* Title Logo */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-sky-500/10 border border-sky-500/25 rounded-2xl text-sky-400 mb-2">
            <Compass className="w-8 h-8 animate-spin-slow" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-100">Recovery Force</h1>
          <p className="text-xs text-slate-400">Field Officer Tracking & Recovery Management</p>
        </div>

        {/* Form Container */}
        <div className="glass-panel p-8 rounded-2xl border border-slate-800 shadow-2xl space-y-5">
          <h2 className="text-lg font-bold text-slate-200">Sign in to your account</h2>
          
          {sessionExpired && (
            <div className="flex items-center space-x-2.5 p-3.5 bg-amber-500/10 border border-amber-500/25 rounded-xl text-amber-400 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>Security Warning: You have been logged out due to inactivity.</span>
            </div>
          )}

          {error && (
            <div className="flex items-center space-x-2.5 p-3.5 bg-rose-500/10 border border-rose-500/25 rounded-xl text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Username Input */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400" htmlFor="username">Username</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <User className="w-4.5 h-4.5" />
                </span>
                <input
                  id="username"
                  type="text"
                  required
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 outline-none transition"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-slate-400" htmlFor="password">Password</label>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <Lock className="w-4.5 h-4.5" />
                </span>
                <input
                  id="password"
                  type="password"
                  required
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 outline-none transition"
                />
              </div>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 disabled:bg-sky-700 text-white font-semibold text-sm rounded-xl transition shadow-lg shadow-sky-600/10 flex items-center justify-center space-x-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>

          {/* Referral sign up suggestion */}
          <div className="text-center pt-2">
            <p className="text-xs text-slate-400">
              New to the system?{' '}
              <Link to="/register" className="text-sky-400 hover:text-sky-300 font-semibold underline">
                Register here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
