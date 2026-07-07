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
  const INACTIVITY_LIMIT = 30 * 60 * 1000; 

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

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Set up Axios interceptors for handling 401 session expirations and attaching JWT tokens globally
  useEffect(() => {
    // 1. Request Interceptor to automatically attach standard Authorization Bearer header
    const reqInterceptor = axios.interceptors.request.use((config) => {
      const token = localStorage.getItem('authToken');
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
          localStorage.removeItem('authToken');
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

  // Check auth state on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await axios.get('/api/auth/me');
        if (res.data && res.data.user) {
          setUser(res.data.user);
        }
      } catch (err) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
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

  return (
    <BrowserRouter>
      <SessionMonitor user={user} onLogout={handleLogout}>
        <Routes>
          {/* Public Routes */}
          <Route 
            path="/login" 
            element={user ? <Navigate to="/dashboard" replace /> : <Login onLoginSuccess={handleLoginSuccess} />} 
          />
          <Route 
            path="/register" 
            element={user ? <Navigate to="/dashboard" replace /> : <Register />} 
          />

          {/* Protected Role Router */}
          <Route 
            path="/dashboard" 
            element={
              user ? (
                user.role === 'Field Officer' ? (
                  <Navigate to="/dashboard/fo" replace />
                ) : user.role === 'Supervisor' ? (
                  <Navigate to="/dashboard/supervisor" replace />
                ) : (
                  <Navigate to="/dashboard/rm" replace />
                )
              ) : (
                <Navigate to="/login" replace />
              )
            } 
          />

          <Route 
            path="/dashboard/fo" 
            element={
              user && user.role === 'Field Officer' ? (
                <FODashboard user={user} onLogout={handleLogout} />
              ) : (
                <Navigate to="/login" replace />
              )
            } 
          />

          <Route 
            path="/dashboard/supervisor" 
            element={
              user && user.role === 'Supervisor' ? (
                <SupervisorDashboard user={user} onLogout={handleLogout} />
              ) : (
                <Navigate to="/login" replace />
              )
            } 
          />

          <Route 
            path="/dashboard/rm" 
            element={
              user && user.role === 'Regional Manager' ? (
                <RMDashboard user={user} onLogout={handleLogout} />
              ) : (
                <Navigate to="/login" replace />
              )
            } 
          />

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </SessionMonitor>
    </BrowserRouter>
  );
}
