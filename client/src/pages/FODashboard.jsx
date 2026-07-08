import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  LogOut, MapPin, CheckCircle, Clock, Send, Camera, 
  Wifi, WifiOff, CloudLightning, ShieldCheck, Battery, RefreshCw, Compass
} from 'lucide-react';
import { addToQueue, getQueue, removeFromQueue } from '../utils/db';
import CameraModal from '../components/CameraModal';

export default function FODashboard({ user, onLogout }) {
  // UI states
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState('');
  const [queueSize, setQueueSize] = useState(0);
  const [cameraOpen, setCameraOpen] = useState(false);
  
  // Geolocation & telemetry
  const [gpsLoading, setGpsLoading] = useState(false);
  const [currentCoords, setCurrentCoords] = useState(null);
  const [telemetry, setTelemetry] = useState({ battery: 100, network: 'Unknown', accuracy: 0 });
  const [simulatedMode, setSimulatedMode] = useState(() => localStorage.getItem('simulatedGPS') === 'true');
  const [detectedAddress, setDetectedAddress] = useState('Detecting location...');
  const [gpsError, setGpsError] = useState('');

  const handleSimulatedModeChange = (checked) => {
    setSimulatedMode(checked);
    localStorage.setItem('simulatedGPS', checked ? 'true' : 'false');
  };

  const refreshDetectedLocation = async () => {
    setDetectedAddress('Detecting location...');
    try {
      const pos = await getCoordinates();
      const { latitude, longitude } = pos.coords;
      const res = await axios.get(`/api/geocode?lat=${latitude}&lon=${longitude}`);
      setDetectedAddress(res.data.address || 'Unknown Address');
    } catch (err) {
      console.error(err);
      setDetectedAddress('Failed to auto-detect location. Ensure GPS is enabled.');
    }
  };

  useEffect(() => {
    refreshDetectedLocation();
  }, [simulatedMode]);

  // Attendance
  const [attendance, setAttendance] = useState(null); // today's attendance
  
  // Visit Log Form
  const [consumerName, setConsumerName] = useState('');
  const [consumerPhone, setConsumerPhone] = useState('');
  const [consumerAddress, setConsumerAddress] = useState('');
  const [comment, setComment] = useState('');
  const [photo, setPhoto] = useState('');
  const [submittingVisit, setSubmittingVisit] = useState(false);

  // Status Alerts
  const [alert, setAlert] = useState({ type: '', message: '' });

  const watchIdRef = useRef(null);
  const pingIntervalRef = useRef(null);
  const syncIntervalRef = useRef(null);
  const latestCoordsRef = useRef(null);

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      triggerAutoSync();
    };
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check of queue size
    updateQueueSize();

    // Check battery level
    if (navigator.getBattery) {
      navigator.getBattery().then((bat) => {
        setTelemetry(t => ({ ...t, battery: Math.round(bat.level * 100) }));
        bat.addEventListener('levelchange', () => {
          setTelemetry(t => ({ ...t, battery: Math.round(bat.level * 100) }));
        });
      });
    }

    // Check network speed
    if (navigator.connection) {
      setTelemetry(t => ({ ...t, network: navigator.connection.effectiveType || 'Wifi' }));
    }

    // Fetch today's attendance
    fetchTodayAttendance();

    // Periodic synchronization queue check
    syncIntervalRef.current = setInterval(() => {
      if (navigator.onLine) {
        triggerAutoSync();
      }
    }, 30000); // every 30 seconds

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      stopLiveTracking();
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    };
  }, []);

  const checkedIn = !!attendance?.checkIn;
  const checkedOut = !!attendance?.checkOut;

  // Restart live tracking when simulation mode toggles
  useEffect(() => {
    if (checkedIn && !checkedOut) {
      stopLiveTracking();
      startLiveTracking();
    }
  }, [simulatedMode, checkedIn, checkedOut]);

  // Persist simulated mode preference to localStorage
  useEffect(() => {
    localStorage.setItem('simulatedGPS', simulatedMode ? 'true' : 'false');
  }, [simulatedMode]);

  // Intercept page exit/closure if shift is active
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (checkedIn && !checkedOut) {
        e.preventDefault();
        e.returnValue = 'You have an active shift checked-in. Closing or reloading this app will stop location tracking.';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [checkedIn, checkedOut]);

  // Sync today's attendance state
  const fetchTodayAttendance = async () => {
    setLoading(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const res = await axios.get(`/api/attendance?date=${todayStr}`);
      if (res.data && res.data.attendance && res.data.attendance.length > 0) {
        setAttendance(res.data.attendance[0]);
        // If checked in but not checked out, start watching location
        if (res.data.attendance[0].checkIn && !res.data.attendance[0].checkOut) {
          startLiveTracking();
        }
      }
    } catch (e) {
      console.warn("Failed to fetch online attendance. Checking offline state.");
      // Check offline queue for attendance checkIn/checkOut
      const attQueue = await getQueue('attendance');
      if (attQueue.length > 0) {
        const lastAction = attQueue[attQueue.length - 1];
        if (lastAction.type === 'checkIn') {
          setAttendance({
            checkIn: { time: lastAction.queuedAt, latitude: lastAction.latitude, longitude: lastAction.longitude, address: 'Pending Offline Sync' },
            status: 'Offline Pending Sync'
          });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const updateQueueSize = async () => {
    const visits = await getQueue('visits');
    const att = await getQueue('attendance');
    const loc = await getQueue('locations');
    setQueueSize(visits.length + att.length + loc.length);
  };

  // Sync engine
  const triggerAutoSync = async () => {
    if (syncing || !navigator.onLine) return;
    
    const visits = await getQueue('visits');
    const att = await getQueue('attendance');
    const loc = await getQueue('locations');

    if (visits.length === 0 && att.length === 0 && loc.length === 0) {
      setSyncing(false);
      updateQueueSize();
      return;
    }

    setSyncing(true);
    setSyncProgress('Sync Started');

    try {
      // 1. Sync Attendance events first
      if (att.length > 0) {
        setSyncProgress('Uploading Attendance...');
        for (const item of att) {
          await axios.post('/api/attendance', item);
          await removeFromQueue('attendance', item.id);
        }
      }

      // 2. Sync Location history points
      if (loc.length > 0) {
        setSyncProgress('Uploading Route...');
        for (const item of loc) {
          await axios.post('/api/locations', item);
          await removeFromQueue('locations', item.id);
        }
      }

      // 3. Sync Visits (with base64 photos)
      if (visits.length > 0) {
        setSyncProgress('Uploading Visits...');
        for (const item of visits) {
          await axios.post('/api/visits', item);
          await removeFromQueue('visits', item.id);
        }
      }

      setSyncProgress('Completed');
      setAlert({ type: 'success', message: 'Offline logs successfully synced with server!' });
      
      // Reload states
      fetchTodayAttendance();
    } catch (e) {
      console.error("Sync failed: ", e);
      setSyncProgress('Failed (Will retry)');
    } finally {
      setTimeout(() => {
        setSyncing(false);
        setSyncProgress('');
        updateQueueSize();
      }, 2000);
    }
  };

  // Geolocation API fetch coordinates wrapper with low accuracy fallbacks
  const getCoordinates = () => {
    return new Promise((resolve, reject) => {
      if (simulatedMode) {
        const latOffset = (Math.random() - 0.5) * 0.005;
        const lngOffset = (Math.random() - 0.5) * 0.005;
        resolve({
          coords: {
            latitude: 26.8467 + latOffset,
            longitude: 80.9462 + lngOffset,
            accuracy: 8
          }
        });
        return;
      }

      // If we already have a highly accurate recent position from watchPosition, use it
      if (latestCoordsRef.current && latestCoordsRef.current.accuracy <= 30) {
        resolve({
          coords: {
            latitude: latestCoordsRef.current.latitude,
            longitude: latestCoordsRef.current.longitude,
            accuracy: latestCoordsRef.current.accuracy
          }
        });
        return;
      }

      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by your browser."));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        resolve,
        (err) => {
          if (err.code === err.TIMEOUT) {
            console.warn("GPS High Accuracy timed out. Retrying with low accuracy...");
            navigator.geolocation.getCurrentPosition(
              resolve,
              reject,
              { enableHighAccuracy: false, timeout: 20000, maximumAge: 5000 }
            );
          } else {
            reject(err);
          }
        },
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 3000 }
      );
    });
  };

  // Clean up location watchers
  const stopLiveTracking = () => {
    if (watchIdRef.current) {
      if (simulatedMode) {
        clearInterval(watchIdRef.current);
      } else {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      watchIdRef.current = null;
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    setGpsError('');
  };

  // Watch position for continuous tracking
  const startLiveTracking = () => {
    stopLiveTracking();

    const pingLocation = async (lat, lng, acc) => {
      const locationPing = {
        latitude: lat,
        longitude: lng,
        accuracy: acc,
        battery: telemetry.battery,
        network: telemetry.network,
        device: navigator.userAgent
      };

      if (navigator.onLine) {
        try {
          await axios.post('/api/locations', locationPing);
        } catch (e) {
          await addToQueue('locations', locationPing);
          updateQueueSize();
        }
      } else {
        await addToQueue('locations', locationPing);
        updateQueueSize();
      }
    };

    if (simulatedMode) {
      let mockLat = 26.8467;
      let mockLng = 80.9462;
      
      // Immediate ping
      setCurrentCoords({ lat: mockLat, lng: mockLng });
      pingLocation(mockLat, mockLng, 10);

      watchIdRef.current = setInterval(() => {
        mockLat += (Math.random() - 0.5) * 0.001;
        mockLng += (Math.random() - 0.5) * 0.001;
        setCurrentCoords({ lat: mockLat, lng: mockLng });
        pingLocation(mockLat, mockLng, 10);
      }, 3000); // ping every 3s
      return;
    }

    if (!navigator.geolocation) {
      setGpsError("Geolocation is not supported by your browser.");
      return;
    }

    // Trigger an immediate initial ping on start
    getCoordinates().then((pos) => {
      const { latitude, longitude, accuracy } = pos.coords;
      latestCoordsRef.current = { latitude, longitude, accuracy };
      setCurrentCoords({ lat: latitude, lng: longitude });
      setTelemetry(t => ({ ...t, accuracy }));
      pingLocation(latitude, longitude, accuracy);
      setGpsError('');
    }).catch(err => {
      console.error("Initial GPS fetch failed:", err);
      setGpsError("Initial GPS lock failed. Retrying in background...");
    });

    // Start watching position continuously to maintain GPS warm-lock
    const options = {
      enableHighAccuracy: true,
      maximumAge: 3000, // Allow slightly cached position (3s)
      timeout: 30000 // Give device up to 30s to obtain lock
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        latestCoordsRef.current = { latitude, longitude, accuracy };
        setCurrentCoords({ lat: latitude, lng: longitude });
        setTelemetry(t => ({ ...t, accuracy }));
        setGpsError(''); // clear any errors
      },
      (err) => {
        console.error("GPS Watch failed:", err);
        let errMsg = "GPS error occurred.";
        if (err.code === err.PERMISSION_DENIED) {
          errMsg = "Location permission denied. Please allow Precise Location permission in browser/device settings.";
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          errMsg = "Location signal unavailable. Move outdoors or near a window for better satellite visibility.";
        } else if (err.code === err.TIMEOUT) {
          errMsg = "GPS request timed out. Trying again to acquire satellite lock...";
        }
        setGpsError(errMsg);
      },
      options
    );

    // Setup 3s periodic tracking interval to ping server with latest coordinates
    pingIntervalRef.current = setInterval(async () => {
      if (latestCoordsRef.current) {
        const { latitude, longitude, accuracy } = latestCoordsRef.current;
        await pingLocation(latitude, longitude, accuracy);
      }
    }, 3000); // ping every 3s
  };

  // Trigger Check-in / Out
  const handleAttendance = async (type) => {
    setGpsLoading(true);
    setAlert({ type: '', message: '' });

    try {
      const pos = await getCoordinates();
      const { latitude, longitude, accuracy } = pos.coords;
      
      const payload = {
        type,
        latitude,
        longitude,
        accuracy,
        battery: telemetry.battery,
        network: telemetry.network,
        device: navigator.userAgent,
        browser: navigator.vendor || 'Chrome/Safari'
      };

      if (online) {
        try {
          const res = await axios.post('/api/attendance', payload);
          setAttendance(res.data.attendance);
          setAlert({ type: 'success', message: `${type === 'checkIn' ? 'Check-in' : 'Check-out'} completed successfully.` });
          
          if (type === 'checkIn') {
            startLiveTracking();
          } else {
            stopLiveTracking();
          }
        } catch (e) {
          setAlert({ type: 'error', message: e.response?.data?.error || 'Attendance log failed.' });
        }
      } else {
        // Store Offline
        await addToQueue('attendance', payload);
        await updateQueueSize();
        setAlert({ type: 'warning', message: 'Offline Mode: Attendance queued. Will sync automatically once online.' });
        
        if (type === 'checkIn') {
          setAttendance({
            checkIn: { time: new Date().toISOString(), latitude, longitude, address: 'Pending Sync' },
            status: 'Offline Pending Sync'
          });
          startLiveTracking();
        } else {
          setAttendance(prev => ({
            ...prev,
            checkOut: { time: new Date().toISOString(), latitude, longitude, address: 'Pending Sync' },
          }));
          stopLiveTracking();
        }
      }
    } catch (err) {
      setAlert({ 
        type: 'error', 
        message: `GPS error: ${err.message}. If you are testing on desktop/localhost, try checking "Simulate GPS" below.` 
      });
    } finally {
      setGpsLoading(false);
    }
  };

  // Capture Photo
  const handlePhotoCapture = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setPhoto(reader.result); // Base64 encoding
    };
    reader.readAsDataURL(file);
  };

  // Submit Visit
  const handleVisitSubmit = async (e) => {
    e.preventDefault();
    if (!consumerName || !consumerAddress) {
      setAlert({ type: 'error', message: 'Consumer name and address are required.' });
      return;
    }

    setSubmittingVisit(true);
    setAlert({ type: '', message: '' });

    try {
      const pos = await getCoordinates();
      const { latitude, longitude, accuracy } = pos.coords;

      const visitData = {
        consumerName,
        consumerPhone,
        consumerAddress,
        latitude,
        longitude,
        comment,
        photo,
        battery: telemetry.battery,
        network: telemetry.network,
        accuracy,
        device: navigator.userAgent
      };

      if (online) {
        try {
          await axios.post('/api/visits', visitData);
          setAlert({ type: 'success', message: `Visit for '${consumerName}' recorded successfully!` });
          resetForm();
        } catch (error) {
          setAlert({ type: 'error', message: error.response?.data?.error || 'Failed to submit visit.' });
        }
      } else {
        // Offline storage
        visitData.id = `offline_${Date.now()}`;
        await addToQueue('visits', visitData);
        await updateQueueSize();
        setAlert({ type: 'warning', message: `Offline Mode: Visit for '${consumerName}' saved locally. It will upload automatically when online.` });
        resetForm();
      }
    } catch (err) {
      setAlert({ 
        type: 'error', 
        message: `GPS lock failed: ${err.message}. If you are testing on desktop/localhost, try checking "Simulate GPS" below.` 
      });
    } finally {
      setSubmittingVisit(false);
    }
  };

  const resetForm = () => {
    setConsumerName('');
    setConsumerPhone('');
    setConsumerAddress('');
    setComment('');
    setPhoto('');
  };

  const handleLogoutClick = async () => {
    try {
      await axios.post('/api/auth/logout');
    } catch (e) {
      console.error(e);
    }
    onLogout();
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-slate-200">
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-semibold tracking-wide text-slate-400">Loading your shift data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-12">
      {/* Top Header */}
      <header className="sticky top-0 bg-slate-900/80 backdrop-blur border-b border-slate-800 px-4 py-3 flex justify-between items-center z-40">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center font-bold text-white text-sm">
            FO
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100">{user.name}</h2>
            <p className="text-[10px] text-slate-400">Field Officer Dashboard</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Connection Status Badge */}
          {online ? (
            <span className="flex items-center space-x-1 text-[10px] bg-emerald-500/10 text-emerald-400 font-semibold px-2 py-0.5 rounded-full border border-emerald-500/20">
              <Wifi className="w-3 h-3" />
              <span>Online</span>
            </span>
          ) : (
            <span className="flex items-center space-x-1 text-[10px] bg-rose-500/10 text-rose-400 font-semibold px-2 py-0.5 rounded-full border border-rose-500/20 animate-pulse">
              <WifiOff className="w-3 h-3" />
              <span>Offline</span>
            </span>
          )}

          {/* Sync status */}
          {queueSize > 0 && (
            <button 
              onClick={triggerAutoSync}
              disabled={syncing || !online}
              className={`flex items-center space-x-1 text-[10px] ${syncing ? 'bg-amber-500/20 text-amber-400' : 'bg-sky-500/20 text-sky-400'} font-semibold px-2 py-0.5 rounded-full border border-sky-500/20`}
            >
              <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? syncProgress : `${queueSize} Pending`}</span>
            </button>
          )}

          <button
            onClick={handleLogoutClick}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 rounded-lg transition"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-md mx-auto px-4 mt-6 space-y-6">
        
        {/* Banner Alert messages */}
        {alert.message && (
          <div className={`flex items-start space-x-2.5 p-4 rounded-xl border ${alert.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : alert.type === 'warning' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'} text-xs`}>
            {alert.type === 'success' ? <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5" /> : <CloudLightning className="w-4 h-4 flex-shrink-0 mt-0.5" />}
            <span className="font-medium">{alert.message}</span>
          </div>
        )}

        {/* GPS Error Alert */}
        {gpsError && (
          <div className="flex items-start space-x-2.5 p-4 rounded-xl border bg-rose-500/10 border-rose-500/20 text-rose-400 text-xs">
            <CloudLightning className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
            <div className="space-y-1">
              <span className="font-semibold block">GPS Status Banner</span>
              <span className="font-medium text-rose-300">{gpsError}</span>
            </div>
          </div>
        )}

        {/* 1. Daily Attendance Section */}
        <section className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-sm tracking-wide text-slate-200 uppercase flex items-center space-x-1">
              <Clock className="w-4 h-4 text-sky-400" />
              <span>Daily Shift Attendance</span>
            </h3>
            <div className="flex items-center space-x-2">
              <label className="flex items-center space-x-1 px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-350 border border-slate-750 rounded text-[9px] font-semibold cursor-pointer transition select-none">
                <input 
                  type="checkbox" 
                  checked={simulatedMode}
                  onChange={(e) => handleSimulatedModeChange(e.target.checked)}
                  className="rounded text-sky-600 focus:ring-0 w-3 h-3 cursor-pointer mr-1"
                />
                <span>Simulate GPS</span>
              </label>
              {attendance && (
                <span className={`text-[9px] px-2 py-0.5 rounded font-bold border ${attendance.status === 'Present' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' : attendance.status === 'Late' ? 'bg-amber-500/10 text-amber-400 border-amber-500/25' : 'bg-sky-500/10 text-sky-400 border-sky-500/25'}`}>
                  {attendance.status}
                </span>
              )}
            </div>
          </div>

          {!checkedIn ? (
            <div className="space-y-4 text-left py-2">
              <p className="text-xs text-slate-400 text-center">Log your arrival to begin receiving location updates and recording consumer visits.</p>
              
              <div className="space-y-1 bg-slate-900/40 p-3 rounded-xl border border-slate-900">
                <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Detected Location (Read-only)</span>
                <div className="text-xs text-slate-350 bg-slate-950/40 p-2.5 border border-slate-800/60 rounded font-semibold break-words flex justify-between items-start space-x-2 leading-relaxed">
                  <span>📍 {detectedAddress}</span>
                  <button 
                    type="button" 
                    onClick={refreshDetectedLocation} 
                    className="text-[10px] text-sky-400 hover:text-sky-300 font-bold flex-shrink-0 select-none cursor-pointer"
                  >
                    Refresh
                  </button>
                </div>
              </div>

              <button
                onClick={() => handleAttendance('checkIn')}
                disabled={gpsLoading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-700 text-white font-bold rounded-xl transition shadow-lg shadow-emerald-600/10 flex items-center justify-center space-x-2"
              >
                {gpsLoading ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <MapPin className="w-5 h-5" />
                    <span>Check In Shift</span>
                  </>
                )}
              </button>
            </div>
          ) : !checkedOut ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-900/40 p-3 rounded-xl border border-slate-900">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-500">Check In Time</span>
                  <div className="font-semibold text-slate-200">{new Date(attendance.checkIn.time).toLocaleTimeString()}</div>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-500">Start Address</span>
                  <div className="font-semibold text-slate-200 truncate">{attendance.checkIn.address}</div>
                </div>
              </div>

              <div className="text-left space-y-1 bg-slate-900/40 p-3 rounded-xl border border-slate-900">
                <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Current Detected Location (Read-only)</span>
                <div className="text-xs text-slate-350 bg-slate-950/40 p-2.5 border border-slate-800/60 rounded font-semibold break-words flex justify-between items-start space-x-2 leading-relaxed">
                  <span>📍 {detectedAddress}</span>
                  <button 
                    type="button" 
                    onClick={refreshDetectedLocation} 
                    className="text-[10px] text-sky-400 hover:text-sky-300 font-bold flex-shrink-0 select-none cursor-pointer"
                  >
                    Refresh
                  </button>
                </div>
              </div>

              {/* Background running warning banner */}
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-[10px] text-amber-400 space-y-1 text-left">
                <p className="font-bold flex items-center gap-1">⚠️ Keep App Active / Running</p>
                <p>For background tracking to continue, minimize the app/tab instead of closing it. For optimal results, ensure location permission is set to <strong>"Allow all the time"</strong> in your device settings.</p>
              </div>
              <button
                onClick={() => handleAttendance('checkOut')}
                disabled={gpsLoading}
                className="w-full py-3 bg-rose-600 hover:bg-rose-500 disabled:bg-rose-700 text-white font-bold rounded-xl transition shadow-lg shadow-rose-600/10 flex items-center justify-center space-x-2"
              >
                {gpsLoading ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <LogOut className="w-5 h-5" />
                    <span>Check Out Shift</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="p-4 bg-slate-900/30 rounded-xl border border-slate-900 text-center space-y-3">
              <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto" />
              <h4 className="font-bold text-slate-200">Shift Completed</h4>
              <p className="text-xs text-slate-400">You have successfully checked out of today's shift. Total distance and hours have been summarized on the supervisor portal.</p>
              
              <button
                onClick={() => handleAttendance('checkIn')}
                disabled={gpsLoading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-700 text-white font-bold rounded-xl transition shadow-lg shadow-emerald-600/10 flex items-center justify-center space-x-2"
              >
                {gpsLoading ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <MapPin className="w-5 h-5" />
                    <span>Check In Again</span>
                  </>
                )}
              </button>
            </div>
          )}
        </section>

        {/* 2. Log Consumer Visit (Only visible when checked in and not checked out) */}
        {checkedIn && !checkedOut && (
          <section className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="font-bold text-sm tracking-wide text-slate-200 uppercase flex items-center space-x-1.5">
              <Compass className="w-4 h-4 text-sky-400" />
              <span>Log Consumer Visit</span>
            </h3>

            <form onSubmit={handleVisitSubmit} className="space-y-3.5">
              {/* Consumer Name */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400">Consumer Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Full name of consumer visited"
                  value={consumerName}
                  onChange={(e) => setConsumerName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-sky-500 rounded-xl py-2 px-3 text-xs text-slate-100 placeholder-slate-500 outline-none transition"
                />
              </div>

              {/* Phone */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400">Consumer Phone (Optional)</label>
                <input
                  type="text"
                  placeholder="Contact number"
                  value={consumerPhone}
                  onChange={(e) => setConsumerPhone(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-sky-500 rounded-xl py-2 px-3 text-xs text-slate-100 placeholder-slate-500 outline-none transition"
                />
              </div>

              {/* Consumer Address */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400">Consumer Target Address (Optional)</label>
                <input
                  type="text"
                  placeholder="Address as listed on file"
                  value={consumerAddress}
                  onChange={(e) => setConsumerAddress(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-sky-500 rounded-xl py-2 px-3 text-xs text-slate-100 placeholder-slate-500 outline-none transition"
                />
              </div>

              {/* Optional Comment */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400">Visit Summary Comment (Optional)</label>
                <textarea
                  rows="2"
                  placeholder="Add notes about consumer availability, recovery collections, etc."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-sky-500 rounded-xl py-2 px-3 text-xs text-slate-100 placeholder-slate-500 outline-none transition resize-none"
                />
              </div>

              {/* Visit Proof Photo capture */}
              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-slate-400">Upload Photo Proof (Optional)</label>
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => setCameraOpen(true)}
                    className="flex items-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-semibold text-slate-200 transition"
                  >
                    <Camera className="w-4 h-4 text-sky-400" />
                    <span>Take Photo</span>
                  </button>

                  {photo && (
                    <div className="relative w-12 h-12 rounded-lg border border-slate-700 overflow-hidden shadow">
                      <img src={photo} className="w-full h-full object-cover" alt="Captured proof" />
                      <button
                        type="button"
                        onClick={() => setPhoto('')}
                        className="absolute top-0 right-0 bg-slate-950/80 text-rose-500 w-4 h-4 flex items-center justify-center text-[9px] rounded-bl font-bold"
                        title="Remove"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={submittingVisit}
                className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 disabled:bg-sky-700 text-white font-bold text-xs rounded-xl transition shadow-lg shadow-sky-600/10 flex items-center justify-center space-x-2"
              >
                {submittingVisit ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Submit Logged Visit</span>
                  </>
                )}
              </button>
            </form>
          </section>
        )}

        {/* Telemetry info dashboard */}
        <section className="grid grid-cols-3 gap-3 text-center text-xs">
          <div className="bg-slate-900/40 border border-slate-800 p-2.5 rounded-xl text-slate-400 flex flex-col items-center justify-center space-y-1 shadow">
            <Battery className="w-4.5 h-4.5 text-emerald-400" />
            <span className="text-[10px] uppercase text-slate-500 tracking-wider">Battery</span>
            <span className="font-semibold text-slate-200">{telemetry.battery}%</span>
          </div>
          <div className="bg-slate-900/40 border border-slate-800 p-2.5 rounded-xl text-slate-400 flex flex-col items-center justify-center space-y-1 shadow">
            <Wifi className="w-4.5 h-4.5 text-sky-400" />
            <span className="text-[10px] uppercase text-slate-500 tracking-wider">Network</span>
            <span className="font-semibold text-slate-200 uppercase">{telemetry.network}</span>
          </div>
          <div className="bg-slate-900/40 border border-slate-800 p-2.5 rounded-xl text-slate-400 flex flex-col items-center justify-center space-y-1 shadow">
            <MapPin className="w-4.5 h-4.5 text-amber-400" />
            <span className="text-[10px] uppercase text-slate-500 tracking-wider">GPS Acc.</span>
            <span className="font-semibold text-slate-200">±{telemetry.accuracy ? Math.round(telemetry.accuracy) : '--'}m</span>
          </div>
        </section>

      </main>

      {/* Switchable and Mirrored Live View Camera Modal */}
      <CameraModal 
        isOpen={cameraOpen} 
        onClose={() => setCameraOpen(false)} 
        onCapture={(photoData) => setPhoto(photoData)} 
      />
    </div>
  );
}
