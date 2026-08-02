import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Lock, User, AlertCircle, Compass, HelpCircle, Key, FileSignature } from 'lucide-react';

export default function Register() {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Field Officer'); // Field Officer or Supervisor
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !username || !password || !role) {
      setError("Please fill in all required fields.");
      return;
    }
    if (role === 'Field Officer' && !referralCode) {
      setError("Field Officers require a supervisor referral code.");
      return;
    }

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await axios.post('/api/auth/register', {
        name,
        username,
        password,
        role,
        referralCode: role === 'Field Officer' ? referralCode : undefined
      });

      if (res.status === 201) {
        setSuccess("Registration successful! Redirecting to login...");
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed. Please check details.");
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
          <p className="text-xs text-slate-600">Join the Field Force & Management System</p>
        </div>

        {/* Form Container */}
        <div className="glass-panel p-4 rounded-2xl border border-slate-200 bg-white/90 shadow-xl space-y-4 m-1">
          <h2 className="text-base font-bold text-slate-900 font-sans">Create new account</h2>
          
          {error && (
            <div className="flex items-center space-x-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center space-x-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs">
              <FileSignature className="w-4 h-4 flex-shrink-0 text-emerald-600" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            
            {/* Full Name Input */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700" htmlFor="name">Full Name</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <User className="w-4 h-4" />
                </span>
                <input
                  id="name"
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-sky-600 focus:ring-1 focus:ring-sky-600 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-900 placeholder-slate-400 outline-none transition"
                />
              </div>
            </div>

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
                  placeholder="e.g. johndoe"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-sky-600 focus:ring-1 focus:ring-sky-600 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-900 placeholder-slate-400 outline-none transition"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700" htmlFor="password">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  id="password"
                  type="password"
                  required
                  placeholder="Create password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-sky-600 focus:ring-1 focus:ring-sky-600 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-900 placeholder-slate-400 outline-none transition"
                />
              </div>
            </div>

            {/* Role Select */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700" htmlFor="role">Role</label>
              <select
                id="role"
                value={role}
                onChange={(e) => {
                  setRole(e.target.value);
                  setError('');
                }}
                className="w-full bg-slate-50 border border-slate-200 focus:border-sky-600 focus:ring-1 focus:ring-sky-600 rounded-xl py-2 px-3 text-xs text-slate-900 outline-none transition"
              >
                <option value="Field Officer">Field Officer</option>
                <option value="Supervisor">Supervisor (Admin)</option>
              </select>
            </div>

            {/* Referral Code (only for Field Officers) */}
            {role === 'Field Officer' && (
              <div className="space-y-1 animate-fadeIn">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-slate-700" htmlFor="referralCode">Supervisor Referral Code</label>
                  <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
                    <HelpCircle className="w-3 h-3" /> Required
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Key className="w-4 h-4" />
                  </span>
                  <input
                    id="referralCode"
                    type="text"
                    required
                    placeholder="REF-XXXXXX"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-sky-600 focus:ring-1 focus:ring-sky-600 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-900 placeholder-slate-400 outline-none transition font-mono"
                  />
                </div>
              </div>
            )}

            {role === 'Supervisor' && (
              <div className="p-2.5 bg-slate-100 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
                <span className="font-semibold text-slate-800 block">ℹ️ Supervisor Registration Details:</span>
                <p>Registering as a supervisor creates an administrative panel. You will receive a Referral Code to share with your Field Officers so they register under your account.</p>
              </div>
            )}

            {/* Register Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-gradient-to-r from-sky-600 via-indigo-600 to-teal-600 hover:from-sky-500 hover:to-teal-500 disabled:opacity-70 text-white font-semibold text-xs rounded-xl transition shadow-md shadow-sky-600/20 flex items-center justify-center space-x-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <span>Register Account</span>
              )}
            </button>
          </form>

          {/* Login link */}
          <div className="text-center pt-1">
            <p className="text-xs text-slate-600">
              Already have an account?{' '}
              <Link to="/login" className="text-sky-600 hover:text-sky-700 font-semibold underline">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
