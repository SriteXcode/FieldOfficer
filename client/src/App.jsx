import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Login from './pages/Login';
import Register from './pages/Register';
import FODashboard from './pages/FODashboard';
import SupervisorDashboard from './pages/SupervisorDashboard';
import RMDashboard from './pages/RMDashboard';

// Set Axios defaults
axios.defaults.withCredentials = true;
axios.defaults.baseURL = import.meta.env.VITE_API_URL || '';

// Inactivity session wrapper to monitor user interactions
function SessionMonitor({ children, user, onLogout }) {
  const timeoutRef = useRef(null);
  const navigate = useNavigate();

  // Inactivity timeout length (30 minutes default)
  const INACTIVITY_LIMIT = 3 * 60 * 60 * 1000; 

  const resetTimer = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    if (user) {
      timeoutRef.current = setTimeout(() => {
        console.warn("Session expired due to inactivity.");
        handleAutoLogout();
      }, INACTIVITY_LIMIT);
    }
  };

  const handleAutoLogout = async () => {
    try {
      await axios.post('/api/auth/logout');
    } catch (e) {
      console.error("Auto logout request failed", e);
    }
    onLogout();
    navigate('/login', { state: { expired: true } });
  };

  useEffect(() => {
    if (!user) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      return;
    }

    // Set initial timer
    resetTimer();

    // Listen for activity events
    const events = ['mousemove', 'keydown', 'mousedown', 'scroll', 'touchstart'];
    events.forEach((ev) => window.addEventListener(ev, resetTimer));

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      events.forEach((ev) => window.removeEventListener(ev, resetTimer));
    };
  }, [user]);

  return <>{children}</>;
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

  // Set up Axios interceptors for handling 401 session expirations and attaching JWT tokens globally
  useEffect(() => {
    // 1. Request Interceptor to automatically attach standard Authorization Bearer header
    const reqInterceptor = axios.interceptors.request.use((config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // 2. Response Interceptor to capture token expiration redirecting to login
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
      axios.interceptors.request.eject(reqInterceptor);
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
