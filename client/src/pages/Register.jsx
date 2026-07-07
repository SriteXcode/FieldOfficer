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
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        
        {/* Title Logo */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-sky-500/10 border border-sky-500/25 rounded-2xl text-sky-400 mb-2">
            <Compass className="w-8 h-8 animate-spin-slow" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-100">Recovery Force</h1>
          <p className="text-xs text-slate-400">Join the Field Force & Management System</p>
        </div>

        {/* Form Container */}
        <div className="glass-panel p-8 rounded-2xl border border-slate-800 shadow-2xl space-y-5">
          <h2 className="text-lg font-bold text-slate-200">Create new account</h2>
          
          {error && (
            <div className="flex items-center space-x-2.5 p-3.5 bg-rose-500/10 border border-rose-500/25 rounded-xl text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center space-x-2.5 p-3.5 bg-emerald-500/10 border border-emerald-500/25 rounded-xl text-emerald-400 text-xs">
              <FileSignature className="w-4 h-4 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Full Name Input */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400" htmlFor="name">Full Name</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <User className="w-4.5 h-4.5" />
                </span>
                <input
                  id="name"
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 outline-none transition"
                />
              </div>
            </div>

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
                  placeholder="e.g. johndoe"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 outline-none transition"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400" htmlFor="password">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <Lock className="w-4.5 h-4.5" />
                </span>
                <input
                  id="password"
                  type="password"
                  required
                  placeholder="Create password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 outline-none transition"
                />
              </div>
            </div>

            {/* Role Select */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400" htmlFor="role">Role</label>
              <select
                id="role"
                value={role}
                onChange={(e) => {
                  setRole(e.target.value);
                  setError('');
                }}
                className="w-full bg-slate-900 border border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl py-2.5 px-3 text-sm text-slate-100 outline-none transition"
              >
                <option value="Field Officer">Field Officer</option>
                <option value="Supervisor">Supervisor (Admin)</option>
              </select>
            </div>

            {/* Referral Code (only for Field Officers) */}
            {role === 'Field Officer' && (
              <div className="space-y-1 animate-fadeIn">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-slate-400" htmlFor="referralCode">Supervisor Referral Code</label>
                  <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
                    <HelpCircle className="w-3 h-3" /> Required
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                    <Key className="w-4.5 h-4.5" />
                  </span>
                  <input
                    id="referralCode"
                    type="text"
                    required
                    placeholder="REF-XXXXXX"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 outline-none transition font-mono"
                  />
                </div>
              </div>
            )}

            {role === 'Supervisor' && (
              <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <span className="font-semibold text-slate-350 block">ℹ️ Supervisor Registration Details:</span>
                <p>Registering as a supervisor creates an administrative panel. You will receive a Referral Code to share with your Field Officers so they register under your account.</p>
              </div>
            )}

            {/* Register Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 disabled:bg-sky-700 text-white font-semibold text-sm rounded-xl transition shadow-lg shadow-sky-600/10 flex items-center justify-center space-x-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <span>Register Account</span>
              )}
            </button>
          </form>

          {/* Login link */}
          <div className="text-center pt-2">
            <p className="text-xs text-slate-400">
              Already have an account?{' '}
              <Link to="/login" className="text-sky-400 hover:text-sky-300 font-semibold underline">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
