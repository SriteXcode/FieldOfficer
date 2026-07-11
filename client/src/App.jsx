import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AlertTriangle, Clock } from 'lucide-react';
import Login from './pages/Login';
import Register from './pages/Register';
import FODashboard from './pages/FODashboard';
import SupervisorDashboard from './pages/SupervisorDashboard';
import RMDashboard from './pages/RMDashboard';
import { detectIncognito } from './utils/detectIncognito';

// Set Axios defaults
axios.defaults.withCredentials = true;
axios.defaults.baseURL = import.meta.env.VITE_API_URL || '';

// Request Interceptor to automatically attach standard Authorization Bearer header
axios.interceptors.request.use(async (config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Inject isPrivate flag if running in private/incognito browsing mode
  try {
    const result = await detectIncognito();
    if (result && result.isPrivate) {
      if (config.method === 'post' || config.method === 'put') {
        if (typeof config.data === 'object' && config.data !== null) {
          config.data.isPrivate = true;
        } else if (typeof config.data === 'string') {
          try {
            const parsed = JSON.parse(config.data);
            parsed.isPrivate = true;
            config.data = JSON.stringify(parsed);
          } catch (e) {}
        }
      }
    }
  } catch (err) {
    console.warn("Private mode detection failed:", err);
  }

  return config;
});

// Inactivity session wrapper to monitor user interactions
function SessionMonitor({ children, user, onLogout }) {
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(60);

  const warningTimeoutRef = useRef(null);
  const logoutTimeoutRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const navigate = useNavigate();

  // Inactivity timeout length (3 hours by default)
  const INACTIVITY_LIMIT = 3 * 60 * 60 * 1000;
  // Warning duration (60 seconds)
  const WARNING_DURATION = 60 * 1000;

  const resetTimer = () => {
    if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
    if (logoutTimeoutRef.current) clearTimeout(logoutTimeoutRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    setShowWarning(false);

    if (user) {
      // Set timeout for when warning should be shown (total inactivity limit minus the warning duration)
      warningTimeoutRef.current = setTimeout(() => {
        setShowWarning(true);
      }, INACTIVITY_LIMIT - WARNING_DURATION);
    }
  };

  const handleAutoLogout = async () => {
    if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
    if (logoutTimeoutRef.current) clearTimeout(logoutTimeoutRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    
    setShowWarning(false);
    
    try {
      await axios.post('/api/auth/logout');
    } catch (e) {
      console.error("Auto logout request failed", e);
    }
    onLogout();
    navigate('/login', { state: { expired: true } });
  };

  const handleStayLoggedIn = () => {
    resetTimer();
  };

  // Manage countdown and auto logout when warning is active
  useEffect(() => {
    if (showWarning) {
      const seconds = Math.round(WARNING_DURATION / 1000);
      setCountdown(seconds);

      countdownIntervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownIntervalRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      logoutTimeoutRef.current = setTimeout(() => {
        handleAutoLogout();
      }, WARNING_DURATION);
    } else {
      if (logoutTimeoutRef.current) clearTimeout(logoutTimeoutRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    }

    return () => {
      if (logoutTimeoutRef.current) clearTimeout(logoutTimeoutRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [showWarning]);

  // Track activity events and reset timers if user is active
  useEffect(() => {
    if (!user) {
      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
      if (logoutTimeoutRef.current) clearTimeout(logoutTimeoutRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      setShowWarning(false);
      return;
    }

    // Set initial warning timer
    resetTimer();

    // Listen for activity events ONLY if we are NOT currently showing the warning dialog
    const events = ['mousemove', 'keydown', 'mousedown', 'scroll', 'touchstart'];
    const handleActivity = () => {
      if (!showWarning) {
        resetTimer();
      }
    };

    events.forEach((ev) => window.addEventListener(ev, handleActivity));

    return () => {
      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
      events.forEach((ev) => window.removeEventListener(ev, handleActivity));
    };
  }, [user, showWarning]);

  return (
    <>
      {children}
      {showWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md transition-opacity duration-300">
          <div className="relative w-full max-w-md p-6 mx-4 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden transform scale-100 transition-all duration-300 glass-panel">
            {/* Background Ambient Glow Decors */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none"></div>
            <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl pointer-events-none"></div>

            <div className="flex flex-col items-center text-center">
              <div className="p-3.5 bg-amber-500/10 text-amber-500 rounded-full animate-bounce mb-4">
                <AlertTriangle size={32} />
              </div>
              
              <h3 className="text-xl font-bold text-slate-100 mb-2 tracking-wide font-sans">
                Are you still there?
              </h3>
              
              <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                You have been inactive for a while. For your security, your session will expire automatically soon.
              </p>

              {/* Progress Bar showing remaining time */}
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-6 border border-slate-700/30">
                <div 
                  className="bg-gradient-to-r from-amber-500 to-rose-500 h-full rounded-full transition-all duration-1000 ease-linear"
                  style={{ width: `${(countdown / 60) * 100}%` }}
                />
              </div>

              <div className="text-lg font-semibold text-slate-200 mb-6 flex items-center gap-2">
                <Clock className="animate-spin text-amber-400" style={{ animationDuration: '3s' }} size={18} />
                <span>Logging out in <span className="text-amber-400 font-mono font-bold">{countdown}s</span></span>
              </div>

              <div className="flex gap-4 w-full">
                <button
                  onClick={handleAutoLogout}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-400 border border-slate-700/80 hover:border-rose-500/80 hover:text-rose-400 rounded-xl transition-all duration-200"
                >
                  Logout
                </button>
                <button
                  onClick={handleStayLoggedIn}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-950 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.25)] hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  Stay Logged In
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Route Guarding with PrivateRoute
const PrivateRoute = ({ children, role }) => {
  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : null;
  if (!user) return <Navigate to="/login" />;

  if (role) {
    const roles = Array.isArray(role) ? role : [role];
    const isAuthorized = roles.includes(user.role);
    if (!isAuthorized) return <Navigate to="/login" />;
  }

  return children;
};

// Redirects users to their respective dashboard based on their role
const DashboardRedirect = () => {
  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : null;

  if (!user) return <Navigate to="/login" />;
  if (user.role === 'Field Officer') return <Navigate to="/fo/dashboard" />;
  if (user.role === 'Supervisor') return <Navigate to="/supervisor/dashboard" />;
  if (user.role === 'Regional Manager') return <Navigate to="/rm/dashboard" />;
  return <Navigate to="/login" />;
};

export default function App() {
  const [user, setUser] = useState(() => {
    const userString = localStorage.getItem('user');
    try {
      return userString ? JSON.parse(userString) : null;
    } catch (e) {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);

  // Set up Axios response interceptor for handling 401 session expirations
  useEffect(() => {
    // Response Interceptor to capture token expiration redirecting to login
    const resInterceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && error.response.status === 401) {
          console.warn("Session expired. Redirecting to login...");
          localStorage.clear();
          
          const errMsg = error.response.data?.error || '';
          if (errMsg.includes('another device')) {
            sessionStorage.setItem('logoutReason', 'duplicate_login');
          } else {
            sessionStorage.setItem('logoutReason', 'session_expired');
          }
          
          setUser(null);
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(resInterceptor);
    };
  }, []);

  // Sync/Verify session with the backend on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setUser(null);
        localStorage.clear();
        return;
      }
      try {
        const res = await axios.get('/api/auth/me');
        if (res.data && res.data.user) {
          setUser(res.data.user);
          localStorage.setItem('user', JSON.stringify(res.data.user));
        } else {
          setUser(null);
          localStorage.clear();
        }
      } catch (err) {
        if (err.response && (err.response.status === 401 || err.response.status === 403)) {
          setUser(null);
          localStorage.clear();
        }
      }
    };
    checkAuth();
  }, []);

  const handleLoginSuccess = (userData) => {
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.clear();
    setUser(null);
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-slate-200">
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-semibold tracking-wide text-slate-400">Verifying session...</p>
        </div>
      </div>
    );
  }

  const getDynamicBasename = () => {
    const pathname = window.location.pathname;
    const knownRoutes = ['/login', '/register', '/fo/dashboard', '/supervisor/dashboard', '/rm/dashboard', '/audit-logs'];
    for (const route of knownRoutes) {
      if (pathname.includes(route)) {
        const idx = pathname.indexOf(route);
        return pathname.substring(0, idx) || '/';
      }
    }
    const base = import.meta.env.BASE_URL;
    return base && base !== '/' ? base : '/';
  };

  return (
    <BrowserRouter basename={getDynamicBasename()}>
      <SessionMonitor user={user} onLogout={handleLogout}>
        <Routes>
          {/* Public Routes */}
          <Route 
            path="/login" 
            element={user ? <Navigate to="/" replace /> : <Login onLoginSuccess={handleLoginSuccess} />} 
          />
          <Route 
            path="/register" 
            element={user ? <Navigate to="/" replace /> : <Register />} 
          />

          {/* Protected Root Redirection Route */}
          <Route 
            path="/" 
            element={
              <PrivateRoute>
                <DashboardRedirect />
              </PrivateRoute>
            } 
          />

          {/* Protected Dashboard Routes */}
          <Route 
            path="/fo/dashboard" 
            element={
              <PrivateRoute role="Field Officer">
                <FODashboard user={user} onLogout={handleLogout} />
              </PrivateRoute>
            } 
          />

          <Route 
            path="/supervisor/dashboard" 
            element={
              <PrivateRoute role="Supervisor">
                <SupervisorDashboard user={user} onLogout={handleLogout} />
              </PrivateRoute>
            } 
          />

          <Route 
            path="/rm/dashboard" 
            element={
              <PrivateRoute role="Regional Manager">
                <RMDashboard user={user} onLogout={handleLogout} />
              </PrivateRoute>
            } 
          />

          {/* Catch-all redirect to Home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </SessionMonitor>
    </BrowserRouter>
  );
}
