import React from 'react';
import { 
  ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, 
  PieChart, Pie, Cell, 
  AreaChart, Area 
} from 'recharts';

export default function AnalyticsCharts({ officers = [], attendanceSplit = { present: 0, late: 0, pending: 0 } }) {
  
  // 1. Productivity score data
  const productivityData = officers.map(o => ({
    name: o.name,
    Score: o.score,
    Visits: o.visitsCount,
    Distance: o.distanceTravelled
  }));

  // 2. Attendance data
  const attendanceData = [
    { name: 'Present (On Time)', value: attendanceSplit.present, color: '#10b981' }, // emerald-500
    { name: 'Late', value: attendanceSplit.late, color: '#f59e0b' }, // amber-500
    { name: 'Pending Checkout', value: attendanceSplit.pending, color: '#0ea5e9' } // sky-500
  ].filter(item => item.value > 0);

  // If no attendance split is present, add dummy present data for layout preview
  if (attendanceData.length === 0) {
    attendanceData.push({ name: 'No Attendance Data', value: 1, color: '#475569' });
  }

  // 3. Travel distance data
  const distanceData = officers.map(o => ({
    name: o.name,
    'Distance (KM)': o.distanceTravelled,
    'Hours Worked': o.hoursWorked
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 1. Productivity Index */}
      <div className="glass-card p-5 rounded-xl border border-slate-700 shadow-xl space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-base text-slate-100">Productivity Score Index</h3>
          <span className="text-[10px] bg-sky-500/20 text-sky-400 font-semibold px-2 py-0.5 rounded-full border border-sky-500/30">Visits & Distance Weighted</span>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={productivityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
              />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Score" fill="#0ea5e9" radius={[4, 4, 0, 0]} name="Productivity (%)" />
              <Bar dataKey="Visits" fill="#10b981" radius={[4, 4, 0, 0]} name="Visits Logged" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. Attendance Status Distribution */}
      <div className="glass-card p-5 rounded-xl border border-slate-700 shadow-xl space-y-4">
        <h3 className="font-bold text-base text-slate-100">Today's Attendance split</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          <div className="h-48 md:col-span-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={attendanceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {attendanceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2.5">
            {attendanceData.map((item, idx) => (
              <div key={idx} className="flex items-center space-x-2 text-xs">
                <span className="w-3.5 h-3.5 rounded-full inline-block" style={{ backgroundColor: item.color }} />
                <span className="text-slate-300 font-medium">{item.name}: <strong className="text-slate-150 font-bold">{item.value}</strong></span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Distance Covered vs Working Hours */}
      <div className="glass-card p-5 rounded-xl border border-slate-700 shadow-xl space-y-4 lg:col-span-2">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-base text-slate-100">Travel Distance & Working Hours</h3>
          <span className="text-[10px] text-slate-400">Total KM covered vs Hours logged</span>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={distanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }} />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="Distance (KM)" stroke="#0ea5e9" fill="rgba(14, 165, 233, 0.15)" strokeWidth={2} />
              <Area type="monotone" dataKey="Hours Worked" stroke="#10b981" fill="rgba(16, 185, 129, 0.15)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
