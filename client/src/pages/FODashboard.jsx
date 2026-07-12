import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import { 
  Camera, 
  MapPin, 
  LogOut, 
  RefreshCw, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  AlertOctagon,
  Battery,
  Wifi,
  WifiOff,
  CloudLightning,
  ShieldCheck,
  Upload,
  X,
  Send,
  MessageSquare,
  Compass,
  Settings,
  BookOpen
} from 'lucide-react';
import { addToQueue, getQueue, removeFromQueue } from '../utils/db';
import CameraModal from '../components/CameraModal';
import { detectIncognito } from '../utils/detectIncognito';

const MAX_ACCEPTABLE_ACCURACY_METERS = 150;
const RECENT_COORDS_MAX_AGE_MS = 15000;
const GPS_LOCK_TIMEOUT_MS = 45000;
const SINGLE_GPS_ATTEMPT_TIMEOUT_MS = 15000;

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
  const [detectedAddress, setDetectedAddress] = useState('Detecting location...');
  const [gpsError, setGpsError] = useState('');
  const [fakeGpsWarning, setFakeGpsWarning] = useState(() => {
    return !!localStorage.getItem('fakeGpsDetectedAt');
  });
  const [fakeGpsDetectedAt, setFakeGpsDetectedAt] = useState(() => {
    return localStorage.getItem('fakeGpsDetectedAt') || null;
  });
  const [elapsedTime, setElapsedTime] = useState('');

  const pingLocation = async (lat, lng, acc) => {
    if (acc > MAX_ACCEPTABLE_ACCURACY_METERS) {
      setGpsError(`Location accuracy is ±${Math.round(acc)}m. Waiting for ±${Math.round(MAX_ACCEPTABLE_ACCURACY_METERS)}m or better before sending.`);
      return;
    }

    const locationPing = {
      latitude: lat,
      longitude: lng,
      accuracy: acc,
      battery: telemetry.battery,
      network: telemetry.network,
      device: navigator.userAgent,
      gpsTimestamp: latestCoordsRef.current?.gpsTimestamp || Date.now(),
      webdriver: navigator.webdriver || false
    };

    if (navigator.onLine) {
      try {
        const res = await axios.post('/api/locations', locationPing);
        if (res.data?.isSuspicious) {
          setFakeGpsWarning(true);
        } else {
          setFakeGpsWarning(false);
        }
      } catch (e) {
        await addToQueue('locations', locationPing);
        updateQueueSize();
      }
    } else {
      await addToQueue('locations', locationPing);
      updateQueueSize();
    }
  };

  const refreshDetectedLocation = async () => {
    setDetectedAddress('Detecting location...');
    try {
      const isMockDetected = await verifyGpsHardware();
      if (isMockDetected) {
        setFakeGpsWarning(true);
        setDetectedAddress('Suspicious location provider detected.');
        return;
      }
      
      const pos = await getCoordinates();
      const { latitude, longitude, accuracy } = pos.coords;
      const res = await axios.get(`/api/geocode?lat=${latitude}&lon=${longitude}`);
      setDetectedAddress(res.data.address || 'Unknown Address');
      if (attendance?.checkIn && !attendance?.checkOut) {
        await pingLocation(latitude, longitude, accuracy);
      }
    } catch (err) {
      console.error(err);
      setDetectedAddress('Failed to auto-detect location. Ensure GPS is enabled.');
    }
  };

  useEffect(() => {
    refreshDetectedLocation();
  }, []);

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

  // Chat & Socket states
  const [socket, setSocket] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [chatImage, setChatImage] = useState(null); // base64 string
  const chatEndRef = useRef(null);

  const watchIdRef = useRef(null);
  const pingIntervalRef = useRef(null);
  const syncIntervalRef = useRef(null);
  const latestCoordsRef = useRef(null);
  const wakeLockRef = useRef(null);
  const silentAudioRef = useRef(null);

  const requestWakeLock = async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        console.log('💡 Wake Lock active');
      } catch (err) {
        console.warn(`Wake Lock request failed: ${err.message}`);
      }
    }
  };

  const releaseWakeLock = async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        console.log('💡 Wake Lock released');
      } catch (err) {
        console.warn(`Wake Lock release failed: ${err.message}`);
      }
    }
  };

  const startSilentAudio = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.connect(ctx.destination);
      source.start(0);
      silentAudioRef.current = { ctx, source };
      console.log('🔊 Silent background audio active');
    } catch (err) {
      console.warn("Silent audio context start failed:", err);
    }
  };

  const stopSilentAudio = () => {
    try {
      if (silentAudioRef.current) {
        silentAudioRef.current.source.stop();
        silentAudioRef.current.ctx.close();
        silentAudioRef.current = null;
        console.log('🔊 Silent background audio stopped');
      }
    } catch (err) {
      console.warn("Silent audio context stop failed:", err);
    }
  };

  // Handle page close warning when checked in
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (attendance && !attendance.checkOut) {
        const msg = "You are currently checked in. Closing this tab will stop location tracking.";
        e.preventDefault();
        e.returnValue = msg;
        return msg;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [attendance]);

  // Re-acquire Wake Lock when app is brought back to the foreground
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && attendance && !attendance.checkOut) {
        await requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [attendance]);

  // Check private / incognito browsing mode and mock GPS on mount
  useEffect(() => {
    const checkSecurityOnMount = async () => {
      try {
        const incognitoResult = await detectIncognito();
        const isMockDetected = await verifyGpsHardware();
        
        if ((incognitoResult && incognitoResult.isPrivate) || isMockDetected || navigator.webdriver) {
          setFakeGpsWarning(true);
        } else {
          // If all client-side checks are clean on reload, clear the warning
          setFakeGpsWarning(false);
        }
      } catch (err) {
        console.warn("Security check on mount failed:", err);
      }
    };
    checkSecurityOnMount();
  }, []);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    // 1. Fetch announcements
    const fetchAnnouncements = async () => {
      try {
        const res = await axios.get('/api/announcements');
        setAnnouncements(res.data.announcements || []);
      } catch (err) {
        console.error("Failed to fetch announcements:", err);
      }
    };

    // 2. Fetch chat history
    const fetchChatMessages = async () => {
      if (!user.supervisorId) return;
      try {
        const res = await axios.get(`/api/chat?userId=${user.supervisorId}`);
        setChatMessages(res.data.messages || []);
      } catch (err) {
        console.error("Failed to fetch chat messages:", err);
      }
    };

    fetchAnnouncements();
    fetchChatMessages();

    // 3. Initialize Socket.io
    const getSocketUrl = () => {
      if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:5000';
      }
      return 'https://fieldofficer-1.onrender.com';
    };
    const socketInstance = io(getSocketUrl(), { withCredentials: true });
    setSocket(socketInstance);

    socketInstance.on('connect', () => {
      console.log('Socket connected');
      // Join rooms
      socketInstance.emit('join_room', `chat_${user.id || user._id}`);
      if (user.supervisorId) {
        socketInstance.emit('join_room', `supervisor_${user.supervisorId}`);
      }
    });

    socketInstance.on('new_announcement', (ann) => {
      setAnnouncements(prev => [ann, ...prev]);
    });

    socketInstance.on('new_message', (msg) => {
      // Only append if it belongs to this chat
      const selfId = user.id || user._id;
      if (
        (msg.senderId === selfId || msg.senderId === user.supervisorId) &&
        (msg.receiverId === selfId || msg.receiverId === user.supervisorId)
      ) {
        setChatMessages(prev => {
          if (prev.some(m => m._id === msg._id || m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    });

    return () => {
      socketInstance.disconnect();
    };
  }, [user]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!messageText.trim() && !chatImage) || !user.supervisorId) return;

    try {
      const payload = {
        receiverId: user.supervisorId,
        content: messageText,
        image: chatImage || ""
      };

      const res = await axios.post('/api/chat', payload);
      const newMsg = res.data.chatMessage;

      // Append locally to prevent waiting
      setChatMessages(prev => {
        if (prev.some(m => m._id === newMsg._id || m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });

      setMessageText('');
      setChatImage(null);
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  const handleChatImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setChatImage(reader.result); // base64 encoding
    };
    reader.readAsDataURL(file);
  };

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

  // Persist fake GPS detection timestamp when fakeGpsWarning is triggered
  useEffect(() => {
    if (fakeGpsWarning) {
      if (!fakeGpsDetectedAt) {
        const timestamp = new Date().toISOString();
        localStorage.setItem('fakeGpsDetectedAt', timestamp);
        setFakeGpsDetectedAt(timestamp);
      }
    } else {
      localStorage.removeItem('fakeGpsDetectedAt');
      setFakeGpsDetectedAt(null);
    }
  }, [fakeGpsWarning, fakeGpsDetectedAt]);

  // Update mock GPS warning duration timer dynamically
  useEffect(() => {
    if (!fakeGpsDetectedAt) {
      setElapsedTime('');
      return;
    }

    const updateTimer = () => {
      const diffMs = Date.now() - new Date(fakeGpsDetectedAt).getTime();
      if (diffMs < 0) {
        setElapsedTime('0 hours 0 minutes');
        return;
      }
      const totalMinutes = Math.floor(diffMs / 60000);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      
      const hoursStr = `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
      const minutesStr = `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
      setElapsedTime(`${hoursStr} ${minutesStr}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 10000); // update every 10 seconds

    return () => clearInterval(interval);
  }, [fakeGpsDetectedAt]);



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
      const res = await axios.get('/api/attendance?date=today');
      if (res.data && res.data.attendance && res.data.attendance.length > 0) {
        const todayAtt = res.data.attendance[0];
        setAttendance(todayAtt);
        // If checked in but not checked out, start watching location
        if (todayAtt.checkIn && !todayAtt.checkOut) {
          startLiveTracking();
        }
        if (todayAtt.checkIn?.isSuspicious || todayAtt.checkOut?.isSuspicious) {
          setFakeGpsWarning(true);
        } else {
          setFakeGpsWarning(false);
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
          const res = await axios.post('/api/attendance', item);
          if (res.data?.isSuspicious || res.data?.attendance?.checkIn?.isSuspicious || res.data?.attendance?.checkOut?.isSuspicious) {
            setFakeGpsWarning(true);
          }
          await removeFromQueue('attendance', item.id);
        }
      }

      // 2. Sync Location history points
      if (loc.length > 0) {
        setSyncProgress('Uploading Route...');
        for (const item of loc) {
          const res = await axios.post('/api/locations', item);
          if (res.data?.isSuspicious) {
            setFakeGpsWarning(true);
          }
          await removeFromQueue('locations', item.id);
        }
      }

      // 3. Sync Visits (with base64 photos)
      if (visits.length > 0) {
        setSyncProgress('Uploading Visits...');
        for (const item of visits) {
          const res = await axios.post('/api/visits', item);
          if (res.data?.isSuspicious || res.data?.visit?.isSuspicious) {
            setFakeGpsWarning(true);
          }
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

  // Helper to verify GPS hardware integrity by running 5 rapid queries
  // Disabled as per supervisor request: +-1m accuracy can be reported by normal phones and cached by browser/OS, leading to false alerts.
  const verifyGpsHardware = async () => {
    return false;
  };

  // Geolocation API fetch coordinates wrapper. Critical actions require <=100m accuracy.
  const getCoordinates = ({ requireAccurate = false } = {}) => {
    return new Promise((resolve, reject) => {

      const now = Date.now();
      const latestCoordsAge = latestCoordsRef.current?.timestamp
        ? now - latestCoordsRef.current.timestamp
        : Number.POSITIVE_INFINITY;

      // If we already have a recent accurate position from watchPosition, use it.
      if (
        latestCoordsRef.current &&
        latestCoordsAge <= RECENT_COORDS_MAX_AGE_MS &&
        (!requireAccurate || latestCoordsRef.current.accuracy <= MAX_ACCEPTABLE_ACCURACY_METERS)
      ) {
        resolve({
          coords: {
            latitude: latestCoordsRef.current.latitude,
            longitude: latestCoordsRef.current.longitude,
            accuracy: latestCoordsRef.current.accuracy
          },
          timestamp: latestCoordsRef.current.gpsTimestamp || Date.now()
        });
        return;
      }

      const updatePositionState = (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        latestCoordsRef.current = { 
          latitude, 
          longitude, 
          accuracy, 
          timestamp: Date.now(), 
          gpsTimestamp: pos.timestamp || Date.now() 
        };
        setCurrentCoords({ lat: latitude, lng: longitude });
        setTelemetry(t => ({ ...t, accuracy }));
      };

      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by your browser."));
        return;
      }

      if (requireAccurate) {
        const startedAt = Date.now();
        let bestPosition = null;

        const rejectWithBestAccuracy = (fallbackMessage) => {
          if (bestPosition?.coords?.accuracy) {
            reject(new Error(`GPS accuracy is ±${Math.round(bestPosition.coords.accuracy)}m. Need ${MAX_ACCEPTABLE_ACCURACY_METERS}m or better. Move outdoors, enable Precise Location, then try again.`));
          } else {
            reject(new Error(fallbackMessage));
          }
        };

        const tryAcquireAccuratePosition = () => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              updatePositionState(pos);

              if (!bestPosition || pos.coords.accuracy < bestPosition.coords.accuracy) {
                bestPosition = pos;
              }

              if (pos.coords.accuracy <= MAX_ACCEPTABLE_ACCURACY_METERS) {
                setGpsError('');
                resolve(pos);
                return;
              }

              if (Date.now() - startedAt >= GPS_LOCK_TIMEOUT_MS) {
                rejectWithBestAccuracy("Could not get an accurate GPS lock. Need 100m or better.");
                return;
              }

              setGpsError(`Waiting for better GPS accuracy. Current: ±${Math.round(pos.coords.accuracy)}m, required: ±${MAX_ACCEPTABLE_ACCURACY_METERS}m.`);
              setTimeout(tryAcquireAccuratePosition, 1000);
            },
            (err) => {
              if (Date.now() - startedAt >= GPS_LOCK_TIMEOUT_MS) {
                rejectWithBestAccuracy(err.message || "GPS request timed out.");
                return;
              }
              setTimeout(tryAcquireAccuratePosition, 1000);
            },
            { enableHighAccuracy: true, timeout: SINGLE_GPS_ATTEMPT_TIMEOUT_MS, maximumAge: 0 }
          );
        };

        tryAcquireAccuratePosition();
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          updatePositionState(pos);
          resolve(pos);
        },
        reject,
        { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }
      );
    });
  };

  // Clean up location watchers
  const stopLiveTracking = () => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    setGpsError('');
    releaseWakeLock();
    stopSilentAudio();
  };

  // Watch position for continuous tracking
  const startLiveTracking = () => {
    stopLiveTracking();
    requestWakeLock();
    startSilentAudio();

    if (!navigator.geolocation) {
      setGpsError("Geolocation is not supported by your browser.");
      return;
    }

    // Trigger an immediate initial ping on start
    getCoordinates().then((pos) => {
      const { latitude, longitude, accuracy } = pos.coords;
      latestCoordsRef.current = { 
        latitude, 
        longitude, 
        accuracy, 
        timestamp: Date.now(), 
        gpsTimestamp: pos.timestamp || Date.now() 
      };
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
        latestCoordsRef.current = { 
          latitude, 
          longitude, 
          accuracy, 
          timestamp: Date.now(), 
          gpsTimestamp: pos.timestamp || Date.now() 
        };
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

        // Update telemetry and latest coords to flag negative accuracy
        setTelemetry(t => ({ ...t, accuracy: -1 }));
        if (latestCoordsRef.current) {
          latestCoordsRef.current.accuracy = -1;
          latestCoordsRef.current.timestamp = Date.now();
        } else {
          latestCoordsRef.current = { latitude: 0, longitude: 0, accuracy: -1, timestamp: Date.now() };
        }
      },
      options
    );

    // Setup 1m periodic tracking interval to ping server with latest coordinates
    pingIntervalRef.current = setInterval(async () => {
      if (latestCoordsRef.current) {
        const { latitude, longitude, accuracy } = latestCoordsRef.current;
        await pingLocation(latitude, longitude, accuracy);
      }
    }, 60000); // ping every 1 minute
  };

  // Trigger Check-in / Out
  const handleAttendance = async (type) => {
    setGpsLoading(true);
    setAlert({ type: '', message: '' });

    try {
      const isMockDetected = await verifyGpsHardware();
      if (isMockDetected) {
        setFakeGpsWarning(true);
        setGpsLoading(false);
        return;
      }

      const pos = await getCoordinates({ requireAccurate: true });
      const { latitude, longitude, accuracy } = pos.coords;
      
      const payload = {
        type,
        latitude,
        longitude,
        accuracy,
        battery: telemetry.battery,
        network: telemetry.network,
        device: navigator.userAgent,
        browser: navigator.vendor || 'Chrome/Safari',
        gpsTimestamp: pos.timestamp || Date.now(),
        webdriver: navigator.webdriver || false
      };

      if (online) {
        try {
          const res = await axios.post('/api/attendance', payload);
          setAttendance(res.data.attendance);
          if (res.data?.isSuspicious || res.data?.attendance?.checkIn?.isSuspicious || res.data?.attendance?.checkOut?.isSuspicious) {
            setFakeGpsWarning(true);
          } else {
            setFakeGpsWarning(false);
          }
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
      const isMockDetected = await verifyGpsHardware();
      if (isMockDetected) {
        setFakeGpsWarning(true);
        setSubmittingVisit(false);
        return;
      }

      const pos = await getCoordinates({ requireAccurate: false });
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
        device: navigator.userAgent,
        gpsTimestamp: pos.timestamp || Date.now(),
        webdriver: navigator.webdriver || false
      };

      if (online) {
        try {
          const res = await axios.post('/api/visits', visitData);
          if (res.data?.isSuspicious || res.data?.visit?.isSuspicious) {
            setFakeGpsWarning(true);
          } else {
            setFakeGpsWarning(false);
          }
          setAlert({ 
            type: 'success', 
            message: `Visit for '${consumerName}' recorded successfully! (GPS Accuracy: ±${Math.round(accuracy)}m)` 
          });
          resetForm();
        } catch (error) {
          setAlert({ type: 'error', message: error.response?.data?.error || 'Failed to submit visit.' });
        }
      } else {
        // Offline storage
        visitData.id = `offline_${Date.now()}`;
        await addToQueue('visits', visitData);
        await updateQueueSize();
        setAlert({ 
          type: 'warning', 
          message: `Offline Mode: Visit for '${consumerName}' saved locally with GPS Accuracy: ±${Math.round(accuracy)}m. It will upload automatically when online.` 
        });
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
    localStorage.removeItem('fakeGpsDetectedAt');
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

        {/* Fake GPS Detection Warning - Locked Screen Overlay */}
        {fakeGpsWarning && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-xl p-4">
            <div className="relative overflow-hidden flex flex-col items-center text-center max-w-md w-full p-6 rounded-2xl border border-rose-500/30 bg-slate-900/90 text-rose-200 text-xs shadow-2xl glass-panel">
              {/* Background Ambient Glow Decors */}
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl pointer-events-none"></div>
              <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-red-500/10 rounded-full blur-2xl pointer-events-none"></div>

              <div className="flex-shrink-0 p-3.5 bg-rose-500/15 rounded-full text-rose-450 animate-bounce mb-4">
                <AlertOctagon className="w-9 h-9" />
              </div>
              
              <h3 className="text-base font-bold text-rose-400 mb-2 uppercase tracking-wide">
                🚨 Security Alert: Fake GPS Detected
              </h3>
              
              <p className="font-medium text-rose-300/90 text-[12px] leading-relaxed mb-4">
                The system has detected that your device is running a mock location provider, simulator, spoofing application, or is in **Incognito/Private browsing mode**.
              </p>
              
              <div className="font-semibold text-rose-400 bg-rose-950/50 border border-rose-800/40 p-3 rounded-xl text-[11px] leading-relaxed mb-6">
                ⚠️ WARNING: Please turn off **Developer Options** in your phone settings first, disable any mock location apps, close private/incognito windows, and use your real GPS. Continuous use of these features will result in your account being permanently blocked.
              </div>

              {elapsedTime && fakeGpsDetectedAt && (
                <div className="text-[10px] text-rose-300 font-semibold mb-6 flex flex-col items-center gap-1 bg-rose-950/30 border border-rose-900/30 px-3 py-1.5 rounded-lg w-full">
                  <div className="flex items-center gap-1 text-[11px]">
                    <Clock className="w-3.5 h-3.5 text-rose-450" />
                    <span>Duration: {elapsedTime}</span>
                  </div>
                  <span className="text-[9px] text-rose-400/80">
                    Detected: {new Date(fakeGpsDetectedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({new Date(fakeGpsDetectedAt).toLocaleDateString()})
                  </span>
                </div>
              )}

              <div className="text-left bg-slate-950/60 border border-slate-800/80 p-4 rounded-xl space-y-2.5 w-full text-slate-300">
                <span className="font-bold text-slate-200 block text-[11px] uppercase tracking-wide border-b border-slate-800/85 pb-1.5 mb-1.5">
                  How to turn off Developer Mode:
                </span>
                <ol className="list-decimal list-inside space-y-2 text-[10.5px] leading-relaxed">
                  <li>Go to your phone's <strong>Settings</strong> app.</li>
                  <li>Search for <strong>"developer tool"</strong> or <strong>"developer mode"</strong> and turn it off.</li>
                  <li>If search is not available, find it in the <strong>"About Phone"</strong> or <strong>"System"</strong> section and disable the toggle.</li>
                  <li>Ensure all mock GPS applications are closed and incognito/private browser tabs are closed.</li>
                </ol>
              </div>
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
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Detected Location (Read-only)</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    telemetry.accuracy && telemetry.accuracy <= 15 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                    telemetry.accuracy && telemetry.accuracy <= MAX_ACCEPTABLE_ACCURACY_METERS ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                    telemetry.accuracy ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                    'bg-slate-800 text-slate-400 border-slate-700'
                  }`}>
                    Accuracy: {telemetry.accuracy ? `±${Math.round(telemetry.accuracy)}m` : 'Calculating...'}
                  </span>
                </div>
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
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Current Detected Location (Read-only)</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    telemetry.accuracy && telemetry.accuracy <= 15 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                    telemetry.accuracy && telemetry.accuracy <= MAX_ACCEPTABLE_ACCURACY_METERS ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                    telemetry.accuracy ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                    'bg-slate-800 text-slate-400 border-slate-700'
                  }`}>
                    Accuracy: {telemetry.accuracy ? `±${Math.round(telemetry.accuracy)}m` : 'Calculating...'}
                  </span>
                </div>
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

        {/* 3. Team Broadcast Announcements */}
        <section className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4 text-left">
          <h3 className="font-bold text-sm tracking-wide text-slate-200 uppercase flex items-center space-x-1.5">
            <BookOpen className="w-4 h-4 text-sky-400" />
            <span>Team Announcements</span>
          </h3>
          <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
            {announcements.map((ann, idx) => (
              <div key={idx} className="bg-slate-900/40 border border-slate-850 p-3.5 rounded-xl space-y-1">
                <div className="flex justify-between items-start gap-1">
                  <h4 className="text-xs font-bold text-sky-400">{ann.title}</h4>
                  <span className="text-[9px] text-slate-500 font-mono">{new Date(ann.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed break-words">{ann.content}</p>
                <span className="text-[8px] text-slate-500 block text-right">
                  From: {ann.senderName || 'Supervisor'} • {new Date(ann.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
            {announcements.length === 0 && (
              <p className="text-xs text-slate-500 text-center py-6">No announcements broadcasted yet.</p>
            )}
          </div>
        </section>

        {/* 4. Live Chat with Supervisor */}
        {user.supervisorId && (
          <section className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4 text-left flex flex-col min-h-[350px]">
            <h3 className="font-bold text-sm tracking-wide text-slate-200 uppercase flex items-center space-x-1.5 border-b border-slate-800 pb-2">
              <MessageSquare className="w-4 h-4 text-sky-400" />
              <span>Chat with Supervisor</span>
            </h3>

            {/* Chat Messages */}
            <div className="flex-grow overflow-y-auto max-h-[220px] bg-slate-950/40 p-3.5 rounded-xl border border-slate-850 space-y-3 mb-4 custom-scrollbar">
              {chatMessages.map((msg, idx) => {
                const selfId = user.id || user._id;
                const isSelf = msg.senderId === selfId;
                return (
                  <div key={idx} className={`flex ${isSelf ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs text-left ${
                      isSelf 
                        ? 'bg-sky-600 text-white rounded-tr-none' 
                        : 'bg-slate-800 text-slate-200 rounded-tl-none'
                    }`}>
                      {msg.content && <p className="break-words leading-relaxed">{msg.content}</p>}
                      {msg.image && (
                        <div className="mt-2 rounded overflow-hidden max-w-[180px]">
                          <img 
                            src={msg.image} 
                            className="w-full object-cover cursor-pointer max-h-[120px]" 
                            alt="Live share" 
                            onClick={() => window.open(msg.image, '_blank')}
                          />
                        </div>
                      )}
                      <span className={`text-[8px] block mt-1 text-right ${isSelf ? 'text-sky-200' : 'text-slate-500'}`}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })}
              {chatMessages.length === 0 && (
                <div className="text-xs text-slate-500 text-center py-8">No messages yet. Say hello to your supervisor!</div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Message input */}
            <form onSubmit={handleSendMessage} className="space-y-2">
              {chatImage && (
                <div className="flex items-center space-x-2 bg-slate-900/60 p-2 rounded-xl border border-slate-850 w-fit">
                  <div className="w-10 h-10 rounded overflow-hidden border border-slate-800 flex-shrink-0">
                    <img src={chatImage} className="w-full h-full object-cover" alt="Upload preview" />
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setChatImage(null)}
                    className="p-1 text-rose-450 hover:bg-slate-800 rounded transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <label className="p-2 bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-slate-250 border border-slate-750 rounded-lg cursor-pointer transition flex-shrink-0" title="Attach Live Image">
                  <Camera className="w-4 h-4" />
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleChatImageSelect} 
                    className="hidden" 
                  />
                </label>
                <input 
                  type="text" 
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-grow bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-lg px-3 py-2 outline-none focus:border-sky-500 transition"
                />
                <button 
                  type="submit"
                  className="p-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg transition flex-shrink-0 shadow-lg shadow-sky-600/10"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
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
