import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  LogOut, Compass, TrendingUp, Users, CheckCircle, Navigation, 
  MapIcon, Landmark, Star, BarChart3 
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

export default function RMDashboard({ user, onLogout }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activeOfficers: 12,
    distanceCovered: 245.8,
    consumersVisited: 84,
    attendanceRate: 94
  });

  const [supervisorTeams, setSupervisorTeams] = useState([
    { name: 'Supervisor North (Alex)', Officers: 5, Visited: 38, Distance: 112.5, Productivity: 94 },
    { name: 'Supervisor South (Clara)', Officers: 4, Visited: 28, Distance: 82.3, Productivity: 88 },
    { name: 'Supervisor East (Marcus)', Officers: 3, Visited: 18, Distance: 51.0, Productivity: 82 },
  ]);

  useEffect(() => {
    // Simulated load
    setTimeout(() => {
      setLoading(false);
    }, 800);
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50 text-slate-800">
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-semibold tracking-wide text-indigo-700 font-sans">Loading Regional Manager Analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-20 p-1">
      {/* Header */}
      <header className="sticky top-0 bg-white/90 backdrop-blur border-b border-slate-200 px-4 sm:px-6 py-3 flex justify-between items-center z-40 rounded-xl m-1 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center font-extrabold text-indigo-600 text-base shadow-sm">
            RM
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 font-sans">Regional Manager Portal</h2>
            <p className="text-xs text-slate-500">Territory Analytics & Auditing</p>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl transition"
          title="Log Out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </header>

      {/* Main Workspace */}
      <main className="max-w-7xl mx-auto px-4 mt-6 space-y-6 animate-fadeIn m-1">
        
        {/* KPI Row */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 m-1">
          <div className="glass-panel p-4 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Active Field Officers</span>
            <div className="text-2xl font-extrabold text-indigo-600 flex items-center justify-between">
              <span>{stats.activeOfficers}</span>
              <Users className="w-5 h-5 text-indigo-500" />
            </div>
          </div>
          <div className="glass-panel p-4 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Today's Distance</span>
            <div className="text-2xl font-extrabold text-sky-600 flex items-center justify-between">
              <span>{stats.distanceCovered} km</span>
              <Navigation className="w-5 h-5 text-sky-500" />
            </div>
          </div>
          <div className="glass-panel p-4 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Stops Completed</span>
            <div className="text-2xl font-extrabold text-emerald-600 flex items-center justify-between">
              <span>{stats.consumersVisited}</span>
              <CheckCircle className="w-5 h-5 text-emerald-500" />
            </div>
          </div>
          <div className="glass-panel p-4 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Attendance Rate</span>
            <div className="text-2xl font-extrabold text-amber-600 flex items-center justify-between">
              <span>{stats.attendanceRate}%</span>
              <TrendingUp className="w-5 h-5 text-amber-500" />
            </div>
          </div>
        </section>

        {/* Supervisor team comparison charts */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 m-1">
          {/* Chart comparison */}
          <div className="lg:col-span-2 glass-panel p-4 rounded-2xl border border-slate-200 bg-white shadow-md space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-sm uppercase text-slate-900 tracking-wide font-sans">Supervisor Team Comparison</h3>
              <span className="text-[10px] text-slate-500">Comparing visits & distance averages</span>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={supervisorTeams} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                  <Legend wrapperStyle={{ fontSize: 12, color: '#334155' }} />
                  <Bar dataKey="Visited" fill="#0284c7" name="Visits completed" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Distance" fill="#4f46e5" name="Distance (KM)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Supervisor Leaderboard table */}
          <div className="glass-panel p-4 rounded-2xl border border-slate-200 bg-white shadow-md flex flex-col space-y-3">
            <h3 className="font-bold text-sm uppercase text-slate-900 tracking-wide font-sans">Supervisor Performance Rank</h3>
            <div className="space-y-2.5 flex-grow overflow-y-auto">
              {supervisorTeams.map((team, idx) => (
                <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between hover:bg-slate-100 transition">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-900 font-sans">{team.name}</span>
                    <div className="text-[10px] text-slate-500">
                      Officers: {team.Officers} | Avg KM: {(team.Distance / team.Officers).toFixed(1)}
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 font-bold text-indigo-700 text-xs bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100">
                    <Star className="w-3.5 h-3.5 fill-current text-indigo-600" />
                    <span>{team.Productivity}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
