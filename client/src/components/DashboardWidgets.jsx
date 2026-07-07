import React, { useState, useEffect } from 'react';
import { LayoutGrid, Eye, EyeOff, ShieldAlert, Sparkles } from 'lucide-react';

const DEFAULT_WIDGETS = [
  { id: 'stats', title: "Today's Statistics Summary", visible: true },
  { id: 'battery', title: "Battery & GPS Telemetry Warnings", visible: true },
  { id: 'announcements', title: "Announcements & Broadcasts", visible: true },
];

export default function DashboardWidgets({ onWidgetsChange }) {
  const [widgets, setWidgets] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Load supervisor preferences from localStorage
    const saved = localStorage.getItem('supervisor_widgets');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setWidgets(parsed);
        onWidgetsChange(parsed);
      } catch (e) {
        setWidgets(DEFAULT_WIDGETS);
        onWidgetsChange(DEFAULT_WIDGETS);
      }
    } else {
      setWidgets(DEFAULT_WIDGETS);
      onWidgetsChange(DEFAULT_WIDGETS);
    }
  }, []);

  const toggleWidget = (id) => {
    const updated = widgets.map(w => w.id === id ? { ...w, visible: !w.visible } : w);
    setWidgets(updated);
    localStorage.setItem('supervisor_widgets', JSON.stringify(updated));
    onWidgetsChange(updated);
  };

  const resetWidgets = () => {
    setWidgets(DEFAULT_WIDGETS);
    localStorage.setItem('supervisor_widgets', JSON.stringify(DEFAULT_WIDGETS));
    onWidgetsChange(DEFAULT_WIDGETS);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold shadow transition"
      >
        <LayoutGrid className="w-4 h-4 text-sky-400" />
        <span>Customize Dashboard Widgets</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 glass-panel p-4 rounded-xl border border-slate-700 shadow-2xl z-50 space-y-3">
          <div className="flex justify-between items-center pb-2 border-b border-slate-800">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Widget Settings</span>
            <button 
              onClick={resetWidgets} 
              className="text-[10px] text-sky-400 hover:text-sky-300 font-semibold"
            >
              Reset Defaults
            </button>
          </div>
          <div className="space-y-2">
            {widgets.map((widget) => (
              <div 
                key={widget.id} 
                className="flex items-center justify-between p-2 bg-slate-800/40 hover:bg-slate-850 rounded border border-slate-850"
              >
                <span className="text-xs font-medium text-slate-300">{widget.title}</span>
                <button
                  onClick={() => toggleWidget(widget.id)}
                  className={`p-1.5 rounded transition ${widget.visible ? 'text-sky-400 hover:text-sky-300' : 'text-slate-500 hover:text-slate-400'}`}
                  title={widget.visible ? 'Hide Widget' : 'Show Widget'}
                >
                  {widget.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>
            ))}
          </div>
          <div className="text-[9px] text-slate-500 text-center italic mt-2">
            Your widget layout preferences are saved locally.
          </div>
        </div>
      )}
    </div>
  );
}
