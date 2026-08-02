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
    { name: 'Present (On Time)', value: attendanceSplit.present, color: '#059669' }, // emerald-600
    { name: 'Late', value: attendanceSplit.late, color: '#d97706' }, // amber-600
    { name: 'Pending Checkout', value: attendanceSplit.pending, color: '#0284c7' } // sky-600
  ].filter(item => item.value > 0);

  // If no attendance split is present, add dummy present data for layout preview
  if (attendanceData.length === 0) {
    attendanceData.push({ name: 'No Attendance Data', value: 1, color: '#64748b' });
  }

  // 3. Travel distance data
  const distanceData = officers.map(o => ({
    name: o.name,
    'Distance (KM)': o.distanceTravelled,
    'Hours Worked': o.hoursWorked
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 m-1">
      {/* 1. Productivity Index */}
      <div className="glass-card p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-sm text-slate-900 font-sans">Productivity Score Index</h3>
          <span className="text-[10px] bg-sky-50 text-sky-700 font-semibold px-2 py-0.5 rounded-full border border-sky-200">Visits & Distance Weighted</span>
        </div>
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={productivityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                cursor={{ fill: 'rgba(2, 132, 199, 0.05)' }}
              />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 12, color: '#334155' }} />
              <Bar dataKey="Score" fill="#0284c7" radius={[4, 4, 0, 0]} name="Productivity (%)" />
              <Bar dataKey="Visits" fill="#059669" radius={[4, 4, 0, 0]} name="Visits Logged" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. Attendance Status Distribution */}
      <div className="glass-card p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-3">
        <h3 className="font-bold text-sm text-slate-900 font-sans">Today's Attendance Split</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
          <div className="h-44 md:col-span-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={attendanceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={65}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {attendanceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2">
            {attendanceData.map((item, idx) => (
              <div key={idx} className="flex items-center space-x-2 text-xs">
                <span className="w-3 h-3 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-slate-600 font-medium">{item.name}: <strong className="text-slate-900 font-bold">{item.value}</strong></span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Distance Covered vs Working Hours */}
      <div className="glass-card p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-3 lg:col-span-2">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-sm text-slate-900 font-sans">Travel Distance & Working Hours</h3>
          <span className="text-[10px] text-slate-500">Total KM covered vs Hours logged</span>
        </div>
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={distanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 12, color: '#334155' }} />
              <Area type="monotone" dataKey="Distance (KM)" stroke="#0284c7" fill="rgba(2, 132, 199, 0.12)" strokeWidth={2} />
              <Area type="monotone" dataKey="Hours Worked" stroke="#059669" fill="rgba(5, 150, 105, 0.12)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
