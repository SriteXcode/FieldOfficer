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
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-slate-200">
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-semibold tracking-wide text-indigo-400">Loading Regional Manager Analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-20">
      {/* Header */}
      <header className="sticky top-0 bg-slate-900/80 backdrop-blur border-b border-slate-800 px-6 py-4 flex justify-between items-center z-40">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/10 border border-indigo-500/25 flex items-center justify-center font-extrabold text-indigo-400 text-lg shadow-inner">
            RM
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">Regional Manager Portal</h2>
            <p className="text-xs text-slate-400">Territory Analytics & Auditing</p>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 rounded-xl transition"
          title="Log Out"
        >
          <LogOut className="w-4.5 h-4.5" />
        </button>
      </header>

      {/* Main Workspace */}
      <main className="max-w-7xl mx-auto px-6 mt-8 space-y-8 animate-fadeIn">
        
        {/* KPI Row */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-panel p-4.5 rounded-2xl border border-slate-800 shadow space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Active Field Officers</span>
            <div className="text-2xl font-extrabold text-indigo-400 flex items-center justify-between">
              <span>{stats.activeOfficers}</span>
              <Users className="w-6 h-6 text-indigo-500/20" />
            </div>
          </div>
          <div className="glass-panel p-4.5 rounded-2xl border border-slate-800 shadow space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Today's Distance</span>
            <div className="text-2xl font-extrabold text-sky-400 flex items-center justify-between">
              <span>{stats.distanceCovered} km</span>
              <Navigation className="w-6 h-6 text-sky-500/20" />
            </div>
          </div>
          <div className="glass-panel p-4.5 rounded-2xl border border-slate-800 shadow space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Stops Completed</span>
            <div className="text-2xl font-extrabold text-emerald-400 flex items-center justify-between">
              <span>{stats.consumersVisited}</span>
              <CheckCircle className="w-6 h-6 text-emerald-500/20" />
            </div>
          </div>
          <div className="glass-panel p-4.5 rounded-2xl border border-slate-800 shadow space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Attendance Rate</span>
            <div className="text-2xl font-extrabold text-amber-400 flex items-center justify-between">
              <span>{stats.attendanceRate}%</span>
              <TrendingUp className="w-6 h-6 text-amber-500/20" />
            </div>
          </div>
        </section>

        {/* Supervisor team comparison charts */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart comparison */}
          <div className="lg:col-span-2 glass-panel p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-sm uppercase text-slate-200 tracking-wide">Supervisor Team Comparison</h3>
              <span className="text-[10px] text-slate-400">Comparing visits & distance averages</span>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={supervisorTeams} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Visited" fill="#0ea5e9" name="Visits completed" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Distance" fill="#6366f1" name="Distance (KM)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Supervisor Leaderboard table */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 shadow-xl flex flex-col space-y-4">
            <h3 className="font-bold text-sm uppercase text-slate-200 tracking-wide">Supervisor Performance Rank</h3>
            <div className="space-y-3 flex-grow overflow-y-auto">
              {supervisorTeams.map((team, idx) => (
                <div key={idx} className="p-3 bg-slate-900/35 border border-slate-850 rounded-xl flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-200">{team.name}</span>
                    <div className="text-[10px] text-slate-400">
                      Officers: {team.Officers} | Avg KM: {(team.Distance / team.Officers).toFixed(1)}
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 font-bold text-indigo-400 text-xs">
                    <Star className="w-3.5 h-3.5 fill-current" />
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
