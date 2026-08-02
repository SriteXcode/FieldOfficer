import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Compass,
  MapPin,
  ShieldCheck,
  Zap,
  Users,
  Activity,
  Navigation,
  Radio,
  FileText,
  CheckCircle2,
  ArrowRight,
  Lock,
  Smartphone,
  Globe,
  BarChart3,
  Layers,
  Eye,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Menu,
  X,
  Sparkles,
  Clock,
  AlertTriangle,
  LogOut,
  UserCheck,
  Sliders,
  Cpu
} from 'lucide-react';

export default function Home({ user, onLogout }) {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeRoleTab, setActiveRoleTab] = useState('field-officers');
  const [selectedOfficer, setSelectedOfficer] = useState('alex');
  const [openFaq, setOpenFaq] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());

  // Clock tick for interactive live demo
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Demo Officer Data for the interactive live preview widget
  const demoOfficers = {
    alex: {
      id: 'FO-104',
      name: 'Alex Vance',
      role: 'Field Officer',
      status: 'Active Duty',
      location: 'Downtown Financial Sector (Zone 4)',
      coordinates: '37.7749° N, 122.4194° W',
      battery: '94%',
      speed: '28 km/h',
      signal: '5G Full',
      tasksCompleted: '8 / 10',
      lastPing: '2s ago',
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      path: [
        { x: 25, y: 65 },
        { x: 38, y: 52 },
        { x: 55, y: 48 },
        { x: 72, y: 35 }
      ]
    },
    sarah: {
      id: 'SUP-201',
      name: 'Sarah Chen',
      role: 'Supervisor',
      status: 'In Field Dispatch',
      location: 'North Harbor Industrial District',
      coordinates: '37.7833° N, 122.4167° W',
      battery: '88%',
      speed: '45 km/h',
      signal: '5G Full',
      tasksCompleted: '14 Active Dispatches',
      lastPing: '1s ago',
      badgeColor: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
      path: [
        { x: 15, y: 35 },
        { x: 35, y: 42 },
        { x: 60, y: 58 },
        { x: 80, y: 65 }
      ]
    },
    marcus: {
      id: 'FO-109',
      name: 'Marcus Brody',
      role: 'Field Officer',
      status: 'Geofence Alert',
      location: 'Sector 7 Logistics Hub',
      coordinates: '37.7650° N, 122.4280° W',
      battery: '62%',
      speed: '0 km/h (Stopped)',
      signal: '4G LTE',
      tasksCompleted: '5 / 6',
      lastPing: 'Just now',
      badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      path: [
        { x: 80, y: 25 },
        { x: 65, y: 40 },
        { x: 45, y: 60 },
        { x: 30, y: 75 }
      ]
    }
  };

  const currentDemo = demoOfficers[selectedOfficer];

  const handleDashboardRedirect = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.role === 'Field Officer') navigate('/fo/dashboard');
    else if (user.role === 'Supervisor') navigate('/supervisor/dashboard');
    else if (user.role === 'Regional Manager') navigate('/rm/dashboard');
    else navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-sky-500 selection:text-white relative overflow-x-hidden">
      
      {/* Background Ambient Glow FX */}
      <div className="fixed top-0 left-1/4 -translate-x-1/2 w-[600px] h-[500px] bg-sky-600/15 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="fixed top-1/3 right-0 w-[500px] h-[500px] bg-indigo-600/15 rounded-full blur-[160px] pointer-events-none -z-10" />
      <div className="fixed bottom-10 left-1/3 w-[600px] h-[400px] bg-emerald-600/10 rounded-full blur-[150px] pointer-events-none -z-10" />

      {/* Navigation Header */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-panel border-b border-slate-800/80 backdrop-blur-xl bg-slate-950/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              <div className="relative flex items-center justify-center w-11 h-11 bg-gradient-to-tr from-sky-500 to-indigo-600 rounded-xl text-white shadow-lg shadow-sky-500/25 group-hover:scale-105 transition-transform duration-300">
                <Compass className="w-6 h-6 animate-spin-slow" />
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold tracking-tight text-white font-sans">
                    Recovery<span className="text-sky-400">Force</span>
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-full uppercase tracking-wider">
                    v2.4 Live
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium tracking-wide">
                  Field Officer Tracking & Intelligence
                </p>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-300">
              <a href="#features" className="hover:text-sky-400 transition-colors">Features</a>
              <a href="#roles" className="hover:text-sky-400 transition-colors">Role Portals</a>
              <a href="#demo" className="hover:text-sky-400 transition-colors">Live Demo</a>
              <a href="#security" className="hover:text-sky-400 transition-colors">Security</a>
              <a href="#faq" className="hover:text-sky-400 transition-colors">FAQ</a>
            </div>

            {/* User Controls / Auth Buttons */}
            <div className="hidden md:flex items-center gap-4">
              {user ? (
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs font-semibold text-slate-200">{user.name || user.username}</p>
                    <p className="text-[11px] text-sky-400 font-medium">{user.role}</p>
                  </div>
                  <button
                    onClick={handleDashboardRedirect}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-950 bg-gradient-to-r from-sky-400 to-indigo-400 hover:from-sky-300 hover:to-indigo-300 rounded-xl shadow-lg shadow-sky-500/20 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <span>Go to Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={onLogout}
                    title="Sign Out"
                    className="p-2.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-slate-800 hover:border-rose-500/30 rounded-xl transition-all"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Link
                    to="/login"
                    className="px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-slate-950 bg-gradient-to-r from-sky-400 via-sky-300 to-indigo-300 hover:from-sky-300 hover:to-indigo-200 rounded-xl shadow-lg shadow-sky-500/25 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <span>Get Started</span>
                    <Sparkles className="w-4 h-4 text-slate-900" />
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Menu Toggle Button */}
            <div className="flex md:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden glass-panel border-t border-slate-800 px-4 pt-3 pb-6 space-y-4">
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-slate-300 hover:text-sky-400 font-medium text-sm py-1"
            >
              Features
            </a>
            <a
              href="#roles"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-slate-300 hover:text-sky-400 font-medium text-sm py-1"
            >
              Role Portals
            </a>
            <a
              href="#demo"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-slate-300 hover:text-sky-400 font-medium text-sm py-1"
            >
              Live Demo
            </a>
            <a
              href="#security"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-slate-300 hover:text-sky-400 font-medium text-sm py-1"
            >
              Security
            </a>
            <a
              href="#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-slate-300 hover:text-sky-400 font-medium text-sm py-1"
            >
              FAQ
            </a>
            <div className="pt-3 border-t border-slate-800/80 flex flex-col gap-2">
              {user ? (
                <>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleDashboardRedirect();
                    }}
                    className="w-full py-2.5 text-center font-semibold text-slate-950 bg-sky-400 rounded-xl text-sm"
                  >
                    Go to Dashboard
                  </button>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full py-2 text-center text-rose-400 hover:bg-rose-500/10 rounded-xl text-sm border border-rose-500/20"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center py-2 font-semibold text-slate-200 border border-slate-800 rounded-xl text-sm"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center py-2.5 font-semibold text-slate-950 bg-sky-400 rounded-xl text-sm"
                  >
                    Get Started Free
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* HERO SECTION */}
      <section className="relative pt-36 pb-20 md:pt-44 md:pb-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-6 max-w-4xl mx-auto">
          
          {/* Top Pill Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/90 border border-sky-500/30 text-sky-400 text-xs font-semibold shadow-lg shadow-sky-500/10">
            <Sparkles className="w-4 h-4 text-sky-400 animate-pulse" />
            <span>Next-Gen Enterprise Field Operations & Recovery Intelligence</span>
          </div>

          {/* Main Hero Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.1] font-sans">
            Real-Time Field Tracking & <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-sky-400 via-indigo-300 to-emerald-400 bg-clip-text text-transparent">
              Intelligent Recovery Control
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-xl text-slate-350 font-normal leading-relaxed max-w-3xl mx-auto">
            Empower your field officers, supervisors, and regional leaders with live GPS telemetry, interactive route history playback, automated geofenced alerts, and tamper-proof security safeguards.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            {user ? (
              <button
                onClick={handleDashboardRedirect}
                className="w-full sm:w-auto px-8 py-4 text-base font-semibold text-slate-950 bg-gradient-to-r from-sky-400 via-indigo-400 to-emerald-400 hover:from-sky-300 hover:to-emerald-300 rounded-2xl shadow-xl shadow-sky-500/25 transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3"
              >
                <span>Launch Your Dashboard</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            ) : (
              <>
                <Link
                  to="/register"
                  className="w-full sm:w-auto px-8 py-4 text-base font-semibold text-slate-950 bg-gradient-to-r from-sky-400 via-sky-300 to-indigo-300 hover:from-sky-300 hover:to-indigo-200 rounded-2xl shadow-xl shadow-sky-500/25 transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3"
                >
                  <span>Register Free Account</span>
                  <Sparkles className="w-5 h-5" />
                </Link>
                <Link
                  to="/login"
                  className="w-full sm:w-auto px-8 py-4 text-base font-semibold text-slate-200 bg-slate-900/90 border border-slate-800 hover:border-slate-700 hover:bg-slate-850 rounded-2xl transition-all flex items-center justify-center gap-3"
                >
                  <span>Sign In to Portal</span>
                  <UserCheck className="w-5 h-5 text-sky-400" />
                </Link>
              </>
            )}
            <a
              href="#demo"
              className="w-full sm:w-auto px-6 py-4 text-base font-semibold text-slate-350 hover:text-white transition-colors flex items-center justify-center gap-2"
            >
              <span>Explore Live Demo</span>
              <ChevronDown className="w-4 h-4 text-sky-400 animate-bounce" />
            </a>
          </div>

          {/* Key Assurance Badges */}
          <div className="pt-8 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs sm:text-sm font-medium text-slate-400 border-t border-slate-900 mt-10">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Real-Time WebSocket Sync</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-sky-400" />
              <span>Anti-Spoofing & DevTools Shield</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-400" />
              <span>100% Geofenced Compliance</span>
            </div>
          </div>
        </div>
      </section>

      {/* INTERACTIVE DEMO WIDGET SECTION */}
      <section id="demo" className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-3 mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-semibold">
            <Activity className="w-3.5 h-3.5 animate-pulse" />
            <span>Interactive Operational Telemetry</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight font-sans">
            Experience the Live Field Console
          </h2>
          <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto">
            Click on any officer below to switch perspective and watch real-time coordinates, telemetry status, and simulated vehicle movement paths update live.
          </p>
        </div>

        {/* Demo Glass Panel Box */}
        <div className="glass-panel border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-2xl overflow-hidden relative">
          
          {/* Top Bar inside Demo Box */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span>WebSocket Live Stream: CONNECTED</span>
              </div>
              <div className="hidden md:flex items-center gap-2 text-xs font-mono text-slate-400">
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                <span>{currentTime} UTC</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Select Officer:</span>
              {Object.keys(demoOfficers).map((key) => (
                <button
                  key={key}
                  onClick={() => setSelectedOfficer(key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    selectedOfficer === key
                      ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                      : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  {demoOfficers[key].name}
                </button>
              ))}
            </div>
          </div>

          {/* Main Grid inside Demo Box */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-6">
            
            {/* Left Column: Officer Card Info */}
            <div className="lg:col-span-4 space-y-4">
              <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-sky-400 font-bold font-mono">
                      {currentDemo.id}
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-white font-sans">{currentDemo.name}</h4>
                      <p className="text-xs text-slate-400 font-medium">{currentDemo.role}</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${currentDemo.badgeColor}`}>
                    {currentDemo.status}
                  </span>
                </div>

                <div className="space-y-2.5 text-xs pt-2 border-t border-slate-800/80">
                  <div className="flex justify-between items-center text-slate-300">
                    <span className="text-slate-500 font-medium">Location Sector:</span>
                    <span className="font-semibold text-slate-200">{currentDemo.location}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-300">
                    <span className="text-slate-500 font-medium">GPS Coordinates:</span>
                    <span className="font-mono text-sky-400">{currentDemo.coordinates}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-300">
                    <span className="text-slate-500 font-medium">Current Speed:</span>
                    <span className="font-semibold text-emerald-400">{currentDemo.speed}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-300">
                    <span className="text-slate-500 font-medium">Battery & Signal:</span>
                    <span className="font-semibold text-slate-200">{currentDemo.battery} | {currentDemo.signal}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-300">
                    <span className="text-slate-500 font-medium">Assigned Workload:</span>
                    <span className="font-semibold text-slate-200">{currentDemo.tasksCompleted}</span>
                  </div>
                </div>

                <div className="pt-2">
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>Shift Progress</span>
                    <span className="font-mono text-sky-400">80%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                    <div className="h-full bg-gradient-to-r from-sky-500 to-emerald-400 rounded-full w-[80%] transition-all duration-500"></div>
                  </div>
                </div>
              </div>

              {/* Quick Telemetry Indicators */}
              <div className="grid grid-cols-2 gap-3">
                <div className="glass-card p-3.5 rounded-2xl border border-slate-800 text-center">
                  <p className="text-[10px] text-slate-400 font-medium uppercase">Telemetry Latency</p>
                  <p className="text-lg font-mono font-bold text-emerald-400 mt-0.5">18 ms</p>
                </div>
                <div className="glass-card p-3.5 rounded-2xl border border-slate-800 text-center">
                  <p className="text-[10px] text-slate-400 font-medium uppercase">Geofence Compliance</p>
                  <p className="text-lg font-mono font-bold text-sky-400 mt-0.5">100% Verified</p>
                </div>
              </div>
            </div>

            {/* Center/Right Column: Simulated Map Display */}
            <div className="lg:col-span-8 bg-slate-900/90 rounded-2xl border border-slate-800 p-4 relative min-h-[340px] flex flex-col justify-between overflow-hidden">
              
              {/* Map Canvas Background Grid */}
              <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px]"></div>
              
              {/* Radar Circle FX */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-sky-500/20 rounded-full pointer-events-none animate-ping opacity-25"></div>
              
              {/* Simulated Map Top Overlay Bar */}
              <div className="relative z-10 flex items-center justify-between bg-slate-950/80 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-800 text-xs">
                <div className="flex items-center gap-2 text-slate-300">
                  <Navigation className="w-4 h-4 text-sky-400 animate-spin-slow" />
                  <span className="font-semibold">Live Route Trail & Sector Map</span>
                </div>
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  Precision: ± 2.5m
                </span>
              </div>

              {/* Animated Map SVG Graphic */}
              <div className="relative z-10 my-8 h-48 sm:h-56 w-full flex items-center justify-center">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                  {/* Grid Lines */}
                  <line x1="0" y1="25" x2="100" y2="25" stroke="#1e293b" strokeWidth="0.5" />
                  <line x1="0" y1="50" x2="100" y2="50" stroke="#1e293b" strokeWidth="0.5" />
                  <line x1="0" y1="75" x2="100" y2="75" stroke="#1e293b" strokeWidth="0.5" />
                  <line x1="25" y1="0" x2="25" y2="100" stroke="#1e293b" strokeWidth="0.5" />
                  <line x1="50" y1="0" x2="50" y2="100" stroke="#1e293b" strokeWidth="0.5" />
                  <line x1="75" y1="0" x2="75" y2="100" stroke="#1e293b" strokeWidth="0.5" />

                  {/* Route Polyline */}
                  <polyline
                    points={currentDemo.path.map(p => `${p.x},${p.y}`).join(' ')}
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="1.5"
                    strokeDasharray="3,3"
                    className="animated-polyline"
                  />

                  {/* Waypoints */}
                  {currentDemo.path.map((p, idx) => (
                    <circle key={idx} cx={p.x} cy={p.y} r="1.5" fill={idx === currentDemo.path.length - 1 ? '#34d399' : '#0284c7'} />
                  ))}

                  {/* Current Active Pin */}
                  {(() => {
                    const lastPt = currentDemo.path[currentDemo.path.length - 1];
                    return (
                      <g transform={`translate(${lastPt.x}, ${lastPt.y})`}>
                        <circle r="6" fill="#38bdf8" opacity="0.25" className="animate-ping" />
                        <circle r="3" fill="#38bdf8" stroke="#ffffff" strokeWidth="0.8" />
                      </g>
                    );
                  })()}
                </svg>

                {/* Floating Map Label Tag */}
                <div className="absolute top-4 right-6 glass-card px-3 py-1.5 rounded-xl border border-sky-500/30 text-xs space-y-0.5">
                  <p className="text-[10px] text-slate-400">Current GPS Fix</p>
                  <p className="font-mono text-sky-300 font-bold">{currentDemo.coordinates}</p>
                </div>
              </div>

              {/* Activity Feed at Bottom of Map */}
              <div className="relative z-10 bg-slate-950/80 backdrop-blur-md p-3 rounded-xl border border-slate-800 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-300">
                  <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                  <span>Telemetry Event Stream: <strong className="text-white">{currentDemo.name}</strong> pinged location update ({currentDemo.lastPing}).</span>
                </div>
                <span className="hidden sm:inline text-[10px] text-slate-500 font-mono">ID: {currentDemo.id}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* METRICS & PROOF RIBBON */}
      <section className="py-12 border-y border-slate-900 bg-slate-950/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="p-4 rounded-2xl glass-card border border-slate-800/60">
              <h3 className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-500 font-mono">
                99.98%
              </h3>
              <p className="text-xs sm:text-sm font-medium text-slate-400 mt-1">GPS Telemetry Fidelity</p>
            </div>
            <div className="p-4 rounded-2xl glass-card border border-slate-800/60">
              <h3 className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-500 font-mono">
                &lt; 50ms
              </h3>
              <p className="text-xs sm:text-sm font-medium text-slate-400 mt-1">WebSocket Sync Latency</p>
            </div>
            <div className="p-4 rounded-2xl glass-card border border-slate-800/60">
              <h3 className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500 font-mono">
                3 Portals
              </h3>
              <p className="text-xs sm:text-sm font-medium text-slate-400 mt-1">FO, Supervisor & RM</p>
            </div>
            <div className="p-4 rounded-2xl glass-card border border-slate-800/60">
              <h3 className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-rose-400 font-mono">
                100%
              </h3>
              <p className="text-xs sm:text-sm font-medium text-slate-400 mt-1">DevTools & Anti-Spoof Guard</p>
            </div>
          </div>
        </div>
      </section>

      {/* CORE FEATURES GRID */}
      <section id="features" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-4 max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 text-xs font-semibold">
            <Zap className="w-3.5 h-3.5" />
            <span>Built for Modern Workforce Mobility</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight font-sans">
            Complete Field Intelligence Capabilities
          </h2>
          <p className="text-base text-slate-400">
            Designed specifically for recovery teams, field service officers, and regional supervisors who demand absolute reliability and real-time clarity.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          
          {/* Feature 1 */}
          <div className="glass-panel p-8 rounded-3xl border border-slate-800 hover:border-sky-500/40 transition-all duration-300 hover:shadow-[0_0_30px_rgba(56,189,248,0.1)] group">
            <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-6 group-hover:scale-110 transition-transform">
              <Navigation className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3 font-sans">Real-Time GPS & Telemetry</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              High-frequency location updates streaming directly over secure WebSockets. Includes device battery state, network signal, and speed vectors.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="glass-panel p-8 rounded-3xl border border-slate-800 hover:border-indigo-500/40 transition-all duration-300 hover:shadow-[0_0_30px_rgba(99,102,241,0.1)] group">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-6 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3 font-sans">Anti-Fraud & DevTools Guard</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Proprietary security layer detects active developer console inspection, debugger pauses, and private/incognito mode to prevent location spoofing.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="glass-panel p-8 rounded-3xl border border-slate-800 hover:border-emerald-500/40 transition-all duration-300 hover:shadow-[0_0_30px_rgba(52,211,153,0.1)] group">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-6 group-hover:scale-110 transition-transform">
              <Layers className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3 font-sans">Interactive Route Replay</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Review full daily travel histories with Leaflet map polyline playback, stop duration timestamps, and animated officer location breadcrumbs.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="glass-panel p-8 rounded-3xl border border-slate-800 hover:border-amber-500/40 transition-all duration-300 hover:shadow-[0_0_30px_rgba(245,158,11,0.1)] group">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-6 group-hover:scale-110 transition-transform">
              <FileText className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3 font-sans">Dynamic Task Allocation</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Supervisors seamlessly dispatch tasks to officers based on proximity, track status transitions in real time, and audit completion proof.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="glass-panel p-8 rounded-3xl border border-slate-800 hover:border-purple-500/40 transition-all duration-300 hover:shadow-[0_0_30px_rgba(168,85,247,0.1)] group">
            <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-6 group-hover:scale-110 transition-transform">
              <BarChart3 className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3 font-sans">Regional Manager Analytics</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Macro insights for management: region-wide recovery efficiency, team utilization ratios, interactive charts, and complete compliance logs.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="glass-panel p-8 rounded-3xl border border-slate-800 hover:border-rose-500/40 transition-all duration-300 hover:shadow-[0_0_30px_rgba(244,63,94,0.1)] group">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-6 group-hover:scale-110 transition-transform">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3 font-sans">Geofence & Off-Route Alerts</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Automated notifications alert supervisors instantly whenever a field officer leaves an assigned sector boundary or drops offline unexpectedly.
            </p>
          </div>
        </div>
      </section>

      {/* ROLE PORTAL SHOWCASE TABS */}
      <section id="roles" className="py-20 bg-slate-900/40 border-y border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center space-y-4 max-w-3xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
              <Users className="w-3.5 h-3.5" />
              <span>Role-Tailored Workflows</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-sans">
              Dedicated Portals for Every Operational Level
            </h2>
            <p className="text-sm sm:text-base text-slate-400">
              Each user role receives a customized dashboard interface tuned for maximum productivity and operational clarity.
            </p>

            {/* Tab Selector Buttons */}
            <div className="flex justify-center p-1.5 bg-slate-950/80 border border-slate-800 rounded-2xl max-w-md mx-auto mt-6">
              <button
                onClick={() => setActiveRoleTab('field-officers')}
                className={`flex-1 py-2.5 px-3 text-xs sm:text-sm font-semibold rounded-xl transition-all ${
                  activeRoleTab === 'field-officers'
                    ? 'bg-sky-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Field Officers
              </button>
              <button
                onClick={() => setActiveRoleTab('supervisors')}
                className={`flex-1 py-2.5 px-3 text-xs sm:text-sm font-semibold rounded-xl transition-all ${
                  activeRoleTab === 'supervisors'
                    ? 'bg-sky-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Supervisors
              </button>
              <button
                onClick={() => setActiveRoleTab('regional-managers')}
                className={`flex-1 py-2.5 px-3 text-xs sm:text-sm font-semibold rounded-xl transition-all ${
                  activeRoleTab === 'regional-managers'
                    ? 'bg-sky-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Regional Managers
              </button>
            </div>
          </div>

          {/* Dynamic Tab Content */}
          <div className="glass-panel border border-slate-800 rounded-3xl p-6 sm:p-10">
            {activeRoleTab === 'field-officers' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div className="space-y-5">
                  <span className="px-3 py-1 bg-sky-500/10 text-sky-400 border border-sky-500/20 text-xs font-semibold rounded-full">
                    Field Officer Portal (/fo/dashboard)
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-bold text-white font-sans">
                    Streamlined Mobile Interface for Officers on the Move
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    Designed for field usage on mobile or desktop devices. Officers can initiate tracking with a single tap, review assigned recovery cases, upload check-in reports, and monitor battery telemetry.
                  </p>
                  <ul className="space-y-3 text-sm text-slate-400">
                    <li className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                      <span>One-click Start/Stop tracking with GPS accuracy indicator</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                      <span>Interactive assigned tasks list with priority filters</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                      <span>Offline resilience & automatic PWA background sync</span>
                    </li>
                  </ul>
                  <div className="pt-2">
                    <Link
                      to="/login"
                      className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-slate-950 bg-sky-400 rounded-xl hover:bg-sky-300 transition-colors"
                    >
                      <span>Sign In as Field Officer</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>

                <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4 font-mono text-xs text-slate-300">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <span className="text-sky-400 font-bold">📲 MOBILE FIELD VIEW</span>
                    <span className="text-emerald-400">Tracking: ACTIVE</span>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-xl space-y-2 border border-slate-900">
                    <div className="flex justify-between text-slate-400">
                      <span>Task #4902:</span>
                      <span className="text-amber-400">High Priority</span>
                    </div>
                    <p className="text-slate-200 font-sans text-sm font-bold">Vehicle Recovery - Sector 4</p>
                    <p className="text-slate-400 text-xs font-sans">Check-in Required within 45 mins</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="bg-slate-950 p-3 rounded-xl text-center border border-slate-900">
                      <span className="text-slate-500 block text-[10px]">CURRENT BATTERY</span>
                      <span className="text-white text-base font-bold">94%</span>
                    </div>
                    <div className="bg-slate-950 p-3 rounded-xl text-center border border-slate-900">
                      <span className="text-slate-500 block text-[10px]">SATELLITE ACCURACY</span>
                      <span className="text-emerald-400 text-base font-bold">± 3.2m</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeRoleTab === 'supervisors' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div className="space-y-5">
                  <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-semibold rounded-full">
                    Supervisor Console (/supervisor/dashboard)
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-bold text-white font-sans">
                    Command Center for Real-Time Dispatch & Monitoring
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    Supervisors enjoy an expansive overview of all active officers across the region. Dispatch tasks, monitor live Leaflet maps, inspect route playback, and generate referral codes for team onboarding.
                  </p>
                  <ul className="space-y-3 text-sm text-slate-400">
                    <li className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                      <span>Live multi-officer map markers with active pulse indicators</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                      <span>Route history playback with timeline scrubbing</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                      <span>Supervisor referral code generator for Field Officer onboarding</span>
                    </li>
                  </ul>
                  <div className="pt-2">
                    <Link
                      to="/login"
                      className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-500 transition-colors"
                    >
                      <span>Sign In as Supervisor</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>

                <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4 font-mono text-xs text-slate-300">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <span className="text-indigo-400 font-bold">🗺️ DISPATCH MAP COMMAND</span>
                    <span className="text-sky-400">Active Officers: 14</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center bg-slate-950 p-3 rounded-xl border border-slate-900">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                        <span className="font-bold text-white">Officer Alex Vance</span>
                      </div>
                      <span className="text-slate-400">Zone 4 • 28km/h</span>
                    </div>
                    <div className="flex justify-between items-center bg-slate-950 p-3 rounded-xl border border-slate-900">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
                        <span className="font-bold text-white">Officer Marcus Brody</span>
                      </div>
                      <span className="text-amber-400">Geofence Alert</span>
                    </div>
                  </div>
                  <div className="bg-indigo-950/30 p-3 rounded-xl border border-indigo-800/40 text-[11px] text-indigo-300">
                    💡 Active Referral Code: <span className="font-bold text-white underline">SUP-8921-WEST</span>
                  </div>
                </div>
              </div>
            )}

            {activeRoleTab === 'regional-managers' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div className="space-y-5">
                  <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold rounded-full">
                    Regional Manager Hub (/rm/dashboard)
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-bold text-white font-sans">
                    Macro Analytics, Audit Trails & High-Level Compliance
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    Designed for executive decision-makers. Track cross-team performance metrics, view regional coverage heatmaps, monitor security audit logs, and export compliance reports.
                  </p>
                  <ul className="space-y-3 text-sm text-slate-400">
                    <li className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                      <span>Executive KPI dashboard with completion rate charts</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                      <span>Full system audit trail & devtools block event history</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                      <span>Regional coverage metrics & supervisor performance scoring</span>
                    </li>
                  </ul>
                  <div className="pt-2">
                    <Link
                      to="/login"
                      className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-slate-950 bg-emerald-400 rounded-xl hover:bg-emerald-300 transition-colors"
                    >
                      <span>Sign In as Regional Manager</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>

                <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4 font-mono text-xs text-slate-300">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <span className="text-emerald-400 font-bold">📊 REGIONAL ANALYTICS</span>
                    <span className="text-slate-400">Q3 Performance</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-900">
                      <span className="text-slate-500 block text-[10px]">TOTAL CASES RESOLVED</span>
                      <span className="text-white text-lg font-bold">1,248</span>
                    </div>
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-900">
                      <span className="text-slate-500 block text-[10px]">AVG RESPONSE TIME</span>
                      <span className="text-emerald-400 text-lg font-bold">14.2 min</span>
                    </div>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-900 space-y-1">
                    <div className="flex justify-between text-slate-400 text-[11px]">
                      <span>System Audit Trail</span>
                      <span className="text-emerald-400">Clean</span>
                    </div>
                    <p className="text-slate-300 text-xs font-sans">0 Unresolved Security Violations Logged</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* SECURITY & ANTI-FRAUD HIGHLIGHT SECTION */}
      <section id="security" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="glass-panel border border-slate-800 rounded-3xl p-8 sm:p-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-semibold">
                <Lock className="w-3.5 h-3.5" />
                <span>Enterprise Security & Anti-Spoof Shield</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-extrabold text-white font-sans tracking-tight">
                Zero-Trust Geolocation & Anti-Tamper Protection
              </h2>

              <p className="text-base text-slate-300 leading-relaxed">
                Field Officer tracking requires uncompromised location integrity. Our platform features an active anti-fraud detection engine designed to block developer tools, prevent browser console inspection, and guard against private/incognito session spoofing.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="flex items-start gap-3 p-3.5 rounded-2xl glass-card border border-slate-800">
                  <Cpu className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-white">DevTools Blocker</h4>
                    <p className="text-xs text-slate-400">Detects docked or floating browser dev consoles and blocks execution instantly.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3.5 rounded-2xl glass-card border border-slate-800">
                  <ShieldCheck className="w-5 h-5 text-sky-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-white">Incognito Guard</h4>
                    <p className="text-xs text-slate-400">Identifies private browsing windows to guarantee complete storage persistence.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 flex justify-center">
              <div className="w-full max-w-sm glass-card border border-rose-500/30 p-6 rounded-3xl text-center space-y-4 shadow-2xl relative">
                <div className="w-16 h-16 bg-rose-500/15 rounded-full flex items-center justify-center text-rose-400 mx-auto animate-pulse">
                  <Lock className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-white font-sans">Tamper-Proof Telemetry</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Every GPS fix is cryptographically signed and validated with device timestamps to maintain 100% court-admissible audit trails.
                </p>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-emerald-400">
                  STATUS: SECURE_GUARD_ACTIVE
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FREQUENTLY ASKED QUESTIONS */}
      <section id="faq" className="py-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-3 mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-white font-sans tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-slate-400 text-sm sm:text-base">
            Everything you need to know about the Field Officer Recovery platform.
          </p>
        </div>

        <div className="space-y-4">
          {[
            {
              q: "How does real-time GPS tracking work for Field Officers?",
              a: "When a Field Officer logs in and clicks 'Start Tracking', the app opens a secure WebSocket channel sending high-precision GPS coordinates, battery level, speed, and signal status back to the server in real-time."
            },
            {
              q: "How do Field Officers register for an account?",
              a: "Field Officers can register on the public sign-up page using a Supervisor Referral Code generated from their supervisor's command dashboard. Supervisors can create accounts directly or distribute referral codes."
            },
            {
              q: "What happens if a Field Officer tries to open browser Developer Tools?",
              a: "The application contains an automated DevTools blocker. If a user attempts to open the developer console (F12 or Ctrl+Shift+I) or activate debugger inspection, access to the portal is immediately blocked until DevTools is closed."
            },
            {
              q: "Can supervisors view past route histories?",
              a: "Yes! Supervisors can select any Field Officer and load complete historical route polylines on an interactive Leaflet map, including timestamp markers, stop durations, and location playback."
            },
            {
              q: "Does the application support low-network or offline field conditions?",
              a: "Yes, the client application features Progressive Web App (PWA) support and local caching mechanisms to buffer location fixes until connectivity is restored."
            }
          ].map((faq, idx) => (
            <div
              key={idx}
              className="glass-panel border border-slate-800 rounded-2xl overflow-hidden transition-colors"
            >
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full p-5 text-left flex items-center justify-between gap-4 focus:outline-none"
              >
                <span className="text-base font-semibold text-slate-100 font-sans">{faq.q}</span>
                {openFaq === idx ? (
                  <ChevronUp className="w-5 h-5 text-sky-400 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400 flex-shrink-0" />
                )}
              </button>
              {openFaq === idx && (
                <div className="px-5 pb-5 text-sm text-slate-350 leading-relaxed border-t border-slate-800/60 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* BOTTOM CTA BANNER */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative glass-panel border border-sky-500/30 rounded-3xl p-8 sm:p-14 text-center overflow-hidden shadow-2xl">
          <div className="absolute -top-24 -right-24 w-72 h-72 bg-sky-500/20 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 max-w-3xl mx-auto space-y-6">
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight font-sans">
              Ready to Upgrade Your Field Operations?
            </h2>
            <p className="text-base sm:text-lg text-slate-300">
              Join field officers and supervisors leveraging real-time telemetry, geofenced recovery management, and tamper-proof security today.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              {user ? (
                <button
                  onClick={handleDashboardRedirect}
                  className="w-full sm:w-auto px-8 py-4 text-base font-semibold text-slate-950 bg-gradient-to-r from-sky-400 to-indigo-400 hover:from-sky-300 hover:to-indigo-300 rounded-2xl shadow-xl shadow-sky-500/25 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  Access Your Dashboard
                </button>
              ) : (
                <>
                  <Link
                    to="/register"
                    className="w-full sm:w-auto px-8 py-4 text-base font-semibold text-slate-950 bg-gradient-to-r from-sky-400 via-sky-300 to-indigo-300 hover:from-sky-300 hover:to-indigo-200 rounded-2xl shadow-xl shadow-sky-500/25 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Get Started Now
                  </Link>
                  <Link
                    to="/login"
                    className="w-full sm:w-auto px-8 py-4 text-base font-semibold text-slate-200 bg-slate-900 border border-slate-800 hover:bg-slate-850 rounded-2xl transition-all"
                  >
                    Sign In to Portal
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-900 bg-slate-950 py-12 text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-sky-500/20 border border-sky-500/40 rounded-lg flex items-center justify-center text-sky-400">
                <Compass className="w-5 h-5" />
              </div>
              <span className="text-base font-bold text-white">RecoveryForce Pro</span>
            </div>

            {/* Quick Links */}
            <div className="flex flex-wrap justify-center gap-6 font-medium text-slate-400">
              <a href="#features" className="hover:text-white transition-colors">Features</a>
              <a href="#roles" className="hover:text-white transition-colors">Role Portals</a>
              <a href="#demo" className="hover:text-white transition-colors">Live Demo</a>
              <a href="#security" className="hover:text-white transition-colors">Security</a>
              <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
              <Link to="/login" className="hover:text-white transition-colors">Sign In</Link>
              <Link to="/register" className="hover:text-white transition-colors">Register</Link>
            </div>

            {/* System Status Pill */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-mono text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>All Systems Operational</span>
            </div>
          </div>

          <div className="border-t border-slate-900 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-[11px] text-slate-500">
            <p>© {new Date().getFullYear()} RecoveryForce System. All rights reserved.</p>
            <p className="font-mono">Geofenced Telemetry & Workforce Security Platform</p>
          </div>
        </div>
      </footer>

    </div>
  );
}
