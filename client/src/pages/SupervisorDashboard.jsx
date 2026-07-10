import React, { useState, useEffect } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import { 
  LogOut, Users, MapPin, CheckCircle, Navigation, PlayCircle, Clock, 
  Search, ShieldAlert, Sparkles, Send, Settings, BookOpen, Download, AlertTriangle, 
  MapIcon, Award, Eye, Calendar
} from 'lucide-react';

import MapComponent from '../components/MapComponent';
import RouteReplay from '../components/RouteReplay';
import AnalyticsCharts from '../components/AnalyticsCharts';
import DashboardWidgets from '../components/DashboardWidgets';

export default function SupervisorDashboard({ user, onLogout }) {
  // Widget Customization state
  const [activeWidgets, setActiveWidgets] = useState({
    stats: true,
    battery: true,
    announcements: true,
  });

  // Selected state for details
  const [selectedFO, setSelectedFO] = useState(null); // FO user object
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]); // YYYY-MM-DD
  const [selectedState, setSelectedState] = useState('All');
  const [selectedFoHistory, setSelectedFoHistory] = useState([]); // List of locations
  const [selectedFoVisits, setSelectedFoVisits] = useState([]); // List of visits
  const [replayCoord, setReplayCoord] = useState(null); // Active coordinate for replay

  // Loading states
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Operational states
  const [officers, setOfficers] = useState([]); // Today's live statuses
  const [announcements, setAnnouncements] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [analytics, setAnalytics] = useState({ officers: [], attendanceSplit: { present: 0, late: 0, pending: 0 } });
  
  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');

  const selectedDateRef = React.useRef(selectedDate);
  useEffect(() => {
    selectedDateRef.current = selectedDate;
  }, [selectedDate]);

  const matchesState = (address) => {
    if (selectedState === 'All') return true;
    if (!address) return false;
    return address.toLowerCase().includes(selectedState.toLowerCase());
  };

  const isOnline = (fo) => {
    if (!fo.lastSeen) return false;
    const lastSeenTime = new Date(fo.lastSeen).getTime();
    return Date.now() - lastSeenTime < 3 * 60 * 1000;
  };
  
  // Form states
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [submittingAnn, setSubmittingAnn] = useState(false);
  const [settings, setSettings] = useState({
    officeStart: '09:00 AM',
    lateAfter: '09:30 AM',
    officeEnd: '06:00 PM',
    sessionTimeout: 30
  });
  const [submittingSettings, setSubmittingSettings] = useState(false);

  // Map markers & bounds trigger
  const [mapMarkers, setMapMarkers] = useState([]);
  const [mapPolyline, setMapPolyline] = useState([]);
  const [mapBoundsTrigger, setMapBoundsTrigger] = useState(0);

  // Socket Setup
  useEffect(() => {

    // Setup Socket connection
    const getSocketUrl = () => {
      if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:5000';
      }
      return 'https://fieldofficer-1.onrender.com';
    };
    const socketUrl = getSocketUrl();
    const socket = io(socketUrl, { withCredentials: true });
    socket.emit('join_room', `supervisor_${user.id}`);

    socket.on('location_update', (data) => {
      // Only process live socket updates if the supervisor is viewing today's date!
      const todayStr = new Date().toISOString().split('T')[0];
      if (selectedDateRef.current !== todayStr) return;

      // Real-time location and stats feed
      setOfficers(prev => prev.map(fo => {
        if (fo.userId === data.userId) {
          return {
            ...fo,
            checkedIn: data.checkedIn !== undefined ? data.checkedIn : fo.checkedIn,
            checkedOut: data.checkedOut !== undefined ? data.checkedOut : fo.checkedOut,
            status: data.status || fo.status,
            distanceCovered: data.distanceCovered !== undefined ? data.distanceCovered : fo.distanceCovered,
            checkInTime: data.checkedIn && !fo.checkInTime ? data.timestamp : fo.checkInTime,
            checkOutTime: data.checkedOut && !fo.checkOutTime ? data.timestamp : fo.checkOutTime,
            checkIn: data.checkIn || fo.checkIn,
            lastLocationAddress: data.lastLocationAddress || fo.lastLocationAddress,
            lastSeen: data.timestamp,
            lastLocation: data.latitude ? { lat: data.latitude, lng: data.longitude, accuracy: data.accuracy } : fo.lastLocation,
            battery: data.battery !== undefined ? data.battery : fo.battery,
            network: data.network || fo.network,
            isSuspicious: data.isSuspicious !== undefined ? data.isSuspicious : fo.isSuspicious,
            suspiciousReason: data.suspiciousReason !== undefined ? data.suspiciousReason : fo.suspiciousReason,
            lateMinutes: data.lateMinutes !== undefined ? data.lateMinutes : fo.lateMinutes
          };
        }
        return fo;
      }));

      // If active selected FO is updated, update live marker on map
      if (selectedFO && selectedFO.userId === data.userId) {
        setMapMarkers(prev => {
          const filtered = prev.filter(m => m.type !== 'live');
          return [
            ...filtered,
            {
              lat: data.latitude,
              lng: data.longitude,
              type: 'live',
              title: `${data.name} (Live)`,
              time: data.timestamp
            }
          ];
        });
      }
    });

    socket.on('new_announcement', (ann) => {
      setAnnouncements(prev => [ann, ...prev]);
    });

    // Refresh live list for the current selected date every 30 seconds
    const interval = setInterval(() => {
      fetchLiveOfficers(selectedDateRef.current);
    }, 30000);

    return () => {
      socket.disconnect();
      clearInterval(interval);
    };
  }, [user.id]);

  // Handle selected date changes - fetch active data for that day with loader
  useEffect(() => {
    const loadAllData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchLiveOfficers(selectedDate),
          fetchAnalytics(selectedDate),
          fetchAnnouncements(),
          fetchAuditLogs(),
          fetchSettings()
        ]);
      } catch (err) {
        console.error("Error loading dashboard data", err);
      } finally {
        setLoading(false);
      }
    };
    loadAllData();
  }, [selectedDate]);

  // Handle selected FO changes or date changes
  useEffect(() => {
    if (selectedFO) {
      fetchFoHistoryDetails();
    } else {
      // No FO selected, show all checked in officers as live markers (filtered by state)
      const liveMarkers = officers
        .filter(fo => fo.lastLocation && (selectedState === 'All' || matchesState(fo.checkIn?.address) || matchesState(fo.lastLocationAddress)))
        .map(fo => ({
          lat: fo.lastLocation.lat,
          lng: fo.lastLocation.lng,
          type: 'live',
          title: fo.name,
          time: fo.lastSeen
        }));
      setMapMarkers(liveMarkers);
      setMapPolyline([]);
    }
  }, [selectedFO, selectedState, officers]);

  const fetchLiveOfficers = async (date) => {
    try {
      const queryDate = date && typeof date === 'string' ? date : selectedDate;
      const res = await axios.get(`/api/locations/live-officers?date=${queryDate}`);
      setOfficers(res.data.officers);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAnnouncements = async () => {
    try {
      const res = await axios.get('/api/announcements');
      setAnnouncements(res.data.announcements);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await axios.get('/api/reports/audit-logs');
      setAuditLogs(res.data.logs);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAnalytics = async (date) => {
    try {
      const queryDate = date && typeof date === 'string' ? date : selectedDate;
      const res = await axios.get(`/api/reports/analytics?startDate=${queryDate}&endDate=${queryDate}`);
      setAnalytics(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await axios.get('/api/settings');
      if (res.data && res.data.settings) {
        setSettings(res.data.settings);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch coordinates history and visits timeline for an officer on a specific day
  const fetchFoHistoryDetails = async () => {
    setHistoryLoading(true);
    try {
      // 1. Fetch tracking path
      const pathRes = await axios.get(`/api/locations/history?userId=${selectedFO.userId}&date=${selectedDate}`);
      const locations = pathRes.data.locations;
      setSelectedFoHistory(locations);

      // 2. Fetch visits
      const visitsRes = await axios.get(`/api/visits?userId=${selectedFO.userId}&date=${selectedDate}`);
      const visits = visitsRes.data.visits;
      setSelectedFoVisits(visits);

      // 3. Fetch attendance checkIn/out for that date
      const attRes = await axios.get(`/api/attendance?userId=${selectedFO.userId}&date=${selectedDate}`);
      const dayAtt = attRes.data.attendance && attRes.data.attendance.length > 0 ? attRes.data.attendance[0] : null;

      // 4. Construct map markers
      const markers = [];
      const polyline = [];

      if (dayAtt && dayAtt.checkIn) {
        markers.push({
          lat: dayAtt.checkIn.latitude,
          lng: dayAtt.checkIn.longitude,
          type: 'checkIn',
          title: 'Shift Check-In',
          time: dayAtt.checkIn.time,
          address: dayAtt.checkIn.address
        });
        polyline.push([dayAtt.checkIn.latitude, dayAtt.checkIn.longitude]);
      }

      // Add consumer stops
      visits.forEach((v, idx) => {
        markers.push({
          lat: v.location.latitude,
          lng: v.location.longitude,
          type: 'stop',
          index: idx + 1,
          title: `Stop ${idx + 1}: ${v.consumerName}`,
          time: v.timestamp,
          address: v.detectedAddress,
          comment: v.comment,
          photo: v.photo
        });
      });

      // Add coordinates tracking lines
      locations.forEach(pt => {
        polyline.push([pt.latitude, pt.longitude]);
      });

      if (dayAtt && dayAtt.checkOut) {
        markers.push({
          lat: dayAtt.checkOut.latitude,
          lng: dayAtt.checkOut.longitude,
          type: 'checkOut',
          title: 'Shift Check-Out',
          time: dayAtt.checkOut.time,
          address: dayAtt.checkOut.address
        });
        polyline.push([dayAtt.checkOut.latitude, dayAtt.checkOut.longitude]);
      }

      // Flag the last active marker to open its popup by default for immediate summary feedback
      if (markers.length > 0) {
        markers[markers.length - 1].openByDefault = true;
      }

      setMapMarkers(markers);
      setMapPolyline(polyline);
      setMapBoundsTrigger(prev => prev + 1); // trigger auto map zoom/fit
    } catch (e) {
      console.error("Failed to load history metrics", e);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Broadcast announcements
  const handleAnnSubmit = async (e) => {
    e.preventDefault();
    if (!annTitle || !annContent) return;
    setSubmittingAnn(true);
    try {
      await axios.post('/api/announcements', { title: annTitle, content: annContent });
      setAnnTitle('');
      setAnnContent('');
      fetchAnnouncements();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmittingAnn(false);
    }
  };

  // Update timing rules
  const handleSettingsSubmit = async (e) => {
    e.preventDefault();
    setSubmittingSettings(true);
    try {
      await axios.post('/api/settings', settings);
      fetchSettings();
      alert("Settings updated successfully!");
    } catch (e) {
      console.error(e);
    } finally {
      setSubmittingSettings(false);
    }
  };

  // CSV Report Generator
  const handleExportCSV = () => {
    if (officers.length === 0) return;
    
    // Construct CSV Header
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Officer Name,Date,Status,Working Hours (Mins),Distance Covered (KM),Last Active,Battery %,Network Type\r\n";

    officers.forEach(fo => {
      const lastActive = fo.lastSeen ? new Date(fo.lastSeen).toLocaleTimeString() : 'N/A';
      const row = `"${fo.name}","${selectedDate}","${fo.status}",${fo.workingHours},${Number(fo.distanceCovered || 0).toFixed(3)},"${lastActive}",${fo.battery ?? 'N/A'},"${fo.network || 'N/A'}"`;
      csvContent += row + "\r\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Field_Shift_Report_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Widgets toggle callback
  const handleWidgetsChange = (list) => {
    const status = {};
    list.forEach(w => {
      status[w.id] = w.visible;
    });
    setActiveWidgets(status);
  };

  // Filter officers based on search name/username AND state
  const filteredOfficers = officers.filter(fo => {
    const matchesSearch = fo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          fo.username.toLowerCase().includes(searchQuery.toLowerCase());
    
    const checkInAddress = fo.checkIn?.address || '';
    const lastAddress = fo.lastLocationAddress || '';
    const matchesGeoState = selectedState === 'All' || 
                            matchesState(checkInAddress) || 
                            matchesState(lastAddress);
                            
    return matchesSearch && matchesGeoState;
  });

  // Calculate statistics metrics for the filtered set
  const totalOfficers = filteredOfficers.length;
  const activeRouteCount = filteredOfficers.filter(o => o.checkedIn && !o.checkedOut && isOnline(o)).length;
  const checkedInCount = filteredOfficers.filter(o => o.checkedIn).length;
  const checkedOutCount = filteredOfficers.filter(o => o.checkedOut).length;
  const totalDistance = filteredOfficers.reduce((acc, curr) => acc + (curr.distanceCovered || 0), 0);
  const lateCheckins = filteredOfficers.filter(o => o.status === 'Late').length;

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-slate-200">
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-semibold tracking-wide text-slate-400">Loading Recovery Supervisor Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-20">
      
      {/* Top Header */}
      <header className="sticky top-0 bg-slate-900/80 backdrop-blur border-b border-slate-800 px-6 py-4 flex justify-between items-center z-40">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-sky-600/10 border border-sky-500/25 flex items-center justify-center font-extrabold text-sky-400 text-lg shadow-inner">
            RF
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">Recovery Admin Portal</h2>
            <p className="text-xs text-slate-400">Supervisor Dashboard</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          
          {/* Widget customizer */}
          <DashboardWidgets onWidgetsChange={handleWidgetsChange} />

          {/* Referral Code box */}
          {user.referralCode && (
            <div className="hidden md:flex flex-col text-right px-3 py-1 bg-slate-800/40 border border-slate-700/50 rounded-xl font-mono text-xs">
              <span className="text-[9px] text-slate-500 uppercase font-semibold">Your Referral Code</span>
              <span className="font-bold text-sky-400">{user.referralCode}</span>
            </div>
          )}

          <button
            onClick={onLogout}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 rounded-xl transition"
            title="Log Out"
          >
            <LogOut className="w-4.5 h-4.5" />
          </button>
        </div>
      </header>

      {/* Main Grid Workspace */}
      <main className="max-w-7xl mx-auto px-6 mt-8 space-y-8">
        
        {/* Widget 1: Statistics Summary */}
        {activeWidgets.stats && (
          <section className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="glass-panel p-4.5 rounded-2xl border border-slate-800 shadow space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Officers</span>
              <div className="text-2xl font-extrabold text-slate-200 flex items-center justify-between">
                <span>{totalOfficers}</span>
                <Users className="w-6 h-6 text-slate-650" />
              </div>
            </div>
            <div className="glass-panel p-4.5 rounded-2xl border border-slate-800 shadow space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Online / Active</span>
              <div className="text-2xl font-extrabold text-sky-400 flex items-center justify-between">
                <span>{activeRouteCount}</span>
                <div className="w-2.5 h-2.5 bg-sky-500 rounded-full animate-ping" />
              </div>
            </div>
            <div className="glass-panel p-4.5 rounded-2xl border border-slate-800 shadow space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Checked In</span>
              <div className="text-2xl font-extrabold text-emerald-400 flex items-center justify-between">
                <span>{checkedInCount}</span>
                <CheckCircle className="w-6 h-6 text-emerald-500/20" />
              </div>
            </div>
            <div className="glass-panel p-4.5 rounded-2xl border border-slate-800 shadow space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Distance Covered</span>
              <div className="text-2xl font-extrabold text-amber-400 flex items-center justify-between">
                <span>{totalDistance.toFixed(3)} km</span>
                <Navigation className="w-6 h-6 text-amber-500/20" />
              </div>
            </div>
            <div className="glass-panel p-4.5 rounded-2xl border border-slate-800 shadow space-y-1 col-span-2 md:col-span-1">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Late Check-ins</span>
              <div className="text-2xl font-extrabold text-rose-500 flex items-center justify-between">
                <span>{lateCheckins}</span>
                <Clock className="w-6 h-6 text-rose-500/20" />
              </div>
            </div>
          </section>
        )}

        {/* Live Map Panel Grid */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Officers Sidebar Directory */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 shadow flex flex-col space-y-4 max-h-[550px]">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-sm uppercase tracking-wide text-slate-200">Field Officers Shift</h3>
              <button 
                onClick={fetchLiveOfficers}
                className="text-[10px] text-sky-400 hover:text-sky-300 font-semibold"
              >
                Refresh
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 focus:border-sky-500 rounded-xl py-2 pl-9 pr-4 text-xs text-slate-100 placeholder-slate-500 outline-none transition"
              />
            </div>

            {/* List */}
            <div className="overflow-y-auto space-y-2 flex-grow pr-1">
              {filteredOfficers.map((fo) => {
                const isActive = selectedFO && selectedFO.userId === fo.userId;
                return (
                  <div
                    key={fo.userId}
                    onClick={() => {
                      if (isActive) setSelectedFO(null);
                      else setSelectedFO(fo);
                    }}
                    className={`p-3.5 rounded-xl border transition cursor-pointer text-left flex items-center justify-between ${isActive ? 'bg-sky-600/10 border-b border-sky-500 shadow-inner' : 'bg-slate-900/35 border-slate-850 hover:bg-slate-850'}`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-xs font-bold text-slate-200">{fo.name}</span>
                        {fo.checkedIn && !fo.checkedOut && (
                          <span 
                            className={`w-2 h-2 rounded-full animate-pulse ${isOnline(fo) ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                            title={isOnline(fo) ? 'Online & Actively Tracking' : 'Offline / Inactive (No GPS ping in >3m)'}
                          />
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center space-x-2">
                        <span>
                          {fo.status}
                          {fo.status === 'Late' && fo.lateMinutes > 0 && ` (by ${fo.lateMinutes} mins)`}
                        </span>
                        {fo.lastSeen && (
                          <span>• Seen {new Date(fo.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        )}
                      </div>
                    </div>

                    <div className="text-right space-y-1 text-[10px] text-slate-500">
                      <div>{Number(fo.distanceCovered || 0).toFixed(3)} km</div>
                      <div>{fo.battery ? `🔋 ${fo.battery}%` : ''}</div>
                    </div>
                  </div>
                );
              })}
              {filteredOfficers.length === 0 && (
                <div className="text-xs text-slate-500 text-center py-6">No officers matches.</div>
              )}
            </div>
          </div>

          {/* Interactive Map View */}
          <div className="lg:col-span-2 glass-panel p-4 rounded-2xl border border-slate-800 shadow relative min-h-[450px]">
            {/* Header filters */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-slate-900 border border-slate-800 p-3 rounded-2xl mb-4 md:mb-0 md:absolute md:top-6 md:right-6 md:z-[1000] md:flex-row md:space-x-3 md:bg-slate-900/90 md:p-2.5 md:rounded-xl md:backdrop-blur md:shadow w-full md:w-auto">
              {/* Date selection picker */}
              <div className="flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5 text-sky-400" />
                <input 
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent text-xs text-slate-200 font-semibold focus:outline-none border-none cursor-pointer"
                />
              </div>

              {/* State Filter dropdown */}
              <div className="flex items-center space-x-1 border-l border-slate-800 pl-3">
                <MapIcon className="w-3.5 h-3.5 text-sky-400" />
                <select
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                  className="bg-transparent text-xs text-slate-200 font-semibold focus:outline-none border-none cursor-pointer pr-4 bg-slate-900"
                >
                  <option value="All" className="bg-slate-900 text-slate-200">All UP</option>
                  <option value="Lucknow" className="bg-slate-900 text-slate-200">Lucknow</option>
                  <option value="Kanpur" className="bg-slate-900 text-slate-200">Kanpur</option>
                  <option value="Noida" className="bg-slate-900 text-slate-200">Noida / G. Noida</option>
                  <option value="Varanasi" className="bg-slate-900 text-slate-200">Varanasi</option>
                  <option value="Bareilly" className="bg-slate-900 text-slate-200">Bareilly</option>
                  <option value="Aliganj" className="bg-slate-900 text-slate-200">Aliganj Area</option>
                </select>
              </div>

              {/* CSV export */}
              <button
                onClick={handleExportCSV}
                className="flex items-center space-x-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-semibold border border-slate-700 transition"
              >
                <Download className="w-3 h-3 text-sky-400" />
                <span>Export Shift CSV</span>
              </button>
            </div>

            <MapComponent 
              markers={mapMarkers} 
              polyline={mapPolyline} 
              replayMarker={replayCoord}
              fitBoundsTrigger={mapBoundsTrigger}
            />
          </div>
        </section>

        {/* Selected Field Officer detailed breakdown (Replay + Visits) */}
        {selectedFO && (
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn relative">
            {historyLoading && (
              <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm z-30 flex items-center justify-center rounded-2xl">
                <div className="text-center space-y-2">
                  <div className="w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-xs text-slate-400 font-medium">Fetching officer history details...</p>
                </div>
              </div>
            )}
            
            {/* Left: Route Replay player */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 shadow space-y-4">
              <h3 className="font-bold text-sm tracking-wide text-slate-200 uppercase flex items-center space-x-1.5">
                <PlayCircle className="w-4.5 h-4.5 text-sky-400" />
                <span>Route Replay: {selectedFO.name}</span>
              </h3>
              
              <RouteReplay 
                path={selectedFoHistory} 
                stops={selectedFoVisits.map((v, i) => ({ index: i + 1, title: v.consumerName, lat: v.location.latitude, lng: v.location.longitude }))}
                onPositionChange={(coord) => setReplayCoord({ lat: coord.latitude, lng: coord.longitude })}
              />
            </div>

            {/* Right: Visits Timeline details */}
            <div className="lg:col-span-2 glass-panel p-5 rounded-2xl border border-slate-800 shadow space-y-4">
              <h3 className="font-bold text-sm tracking-wide text-slate-200 uppercase flex items-center space-x-1.5">
                <MapIcon className="w-4.5 h-4.5 text-sky-400" />
                <span>Consumer Visits Logs & Timeline ({selectedFoVisits.length})</span>
              </h3>

              <div className="overflow-y-auto max-h-[350px] space-y-4 pr-1">
                {selectedFoVisits.map((v, idx) => (
                  <div key={idx} className="flex space-x-3.5 text-left border-l-2 border-slate-800 pl-4 py-1 relative">
                    <span className="absolute -left-[9px] top-1.5 w-4 h-4 bg-sky-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center shadow-md">
                      {idx + 1}
                    </span>

                    <div className="flex-grow space-y-1">
                      <div className="flex justify-between items-center">
                        <h4 className="text-xs font-bold text-slate-200">{v.consumerName}</h4>
                        <span className="text-[10px] text-slate-400 font-mono">{new Date(v.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-[10px] text-slate-400">Target: {v.consumerAddress}</p>
                      <p className="text-[10px] text-sky-400">GPS Detected: {v.detectedAddress}</p>
                      {v.comment && (
                        <p className="text-[10px] italic text-slate-300 bg-slate-900/40 p-2 border border-slate-850 rounded">
                          "{v.comment}"
                        </p>
                      )}
                    </div>

                    {v.photo && (
                      <div className="flex-shrink-0 w-16 h-16 rounded border border-slate-800 overflow-hidden shadow">
                        <img src={v.photo} className="w-full h-full object-cover" alt="Visit proof" />
                      </div>
                    )}
                  </div>
                ))}
                {selectedFoVisits.length === 0 && (
                  <div className="text-xs text-slate-500 text-center py-12">No visits logged for this date.</div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Telemetry warnings (low battery, etc.) */}
        {activeWidgets.battery && (
          <section className="glass-panel p-5 rounded-2xl border border-slate-800 shadow space-y-4">
            <h3 className="font-bold text-sm tracking-wide text-slate-200 uppercase flex items-center space-x-1.5">
              <ShieldAlert className="w-4.5 h-4.5 text-rose-500" />
              <span>Location Security Alerts & Telemetry Anomalies</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Warnings List */}
              <div className="bg-slate-900/35 border border-slate-850 p-4 rounded-xl space-y-3 max-h-[160px] overflow-y-auto">
                <span className="text-[10px] uppercase font-bold text-rose-400 block tracking-wider">Flagged Incidents</span>
                <div className="space-y-2">
                  {officers.filter(fo => fo.isSuspicious || (fo.battery && fo.battery < 20)).map((fo, idx) => (
                    <div key={idx} className="flex items-start space-x-2 text-[10px] text-slate-300">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                      <span>
                        <strong>{fo.name}</strong>:{' '}
                        {fo.isSuspicious ? (fo.suspiciousReason || 'Suspicious location anomalies detected.') : ''}
                        {!fo.isSuspicious && fo.battery && fo.battery < 20 ? 'Battery level extremely low (< 20%).' : ''}
                      </span>
                    </div>
                  ))}
                  {officers.filter(fo => fo.isSuspicious || (fo.battery && fo.battery < 20)).length === 0 && (
                    <div className="text-xs text-slate-500 italic">No GPS or telemetry anomalies reported.</div>
                  )}
                </div>
              </div>

              {/* Security info */}
              <div className="bg-slate-900/35 border border-slate-850 p-4 rounded-xl text-[10.5px] text-slate-400 space-y-1">
                <span className="font-bold text-slate-350 block">ℹ️ Location Security Notes:</span>
                <p>Location checks utilize browser-based Geolocation API coordinates. Server-side security flags automated agents, stale GPS hardware timestamps, zero-drift mock location providers (frequently used in developer options spoofers), and network IP vs reported GPS mismatches.</p>
              </div>
            </div>
          </section>
        )}

        {/* Analytics Section */}
        <section className="space-y-4">
          <h2 className="text-base font-bold tracking-tight text-slate-200">System Visual Analytics</h2>
          <AnalyticsCharts officers={analytics.officers} attendanceSplit={analytics.attendanceSplit} />
        </section>

        {/* Widget 3: Announcements & Settings */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Announcements panel */}
          {activeWidgets.announcements && (
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 shadow flex flex-col space-y-4">
              <h3 className="font-bold text-sm tracking-wide text-slate-200 uppercase flex items-center space-x-1.5">
                <BookOpen className="w-4.5 h-4.5 text-sky-400" />
                <span>Team Broadcast Announcements</span>
              </h3>

              <form onSubmit={handleAnnSubmit} className="space-y-3">
                <input
                  type="text"
                  required
                  placeholder="Announcement Title"
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-850 focus:border-sky-500 rounded-xl py-2 px-3.5 text-xs text-slate-100 placeholder-slate-505 outline-none transition"
                />
                <textarea
                  rows="2"
                  required
                  placeholder="Type broadcast message content..."
                  value={annContent}
                  onChange={(e) => setAnnContent(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-850 focus:border-sky-500 rounded-xl py-2 px-3.5 text-xs text-slate-100 placeholder-slate-505 outline-none transition resize-none"
                />
                <button
                  type="submit"
                  disabled={submittingAnn}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:bg-sky-700 text-white font-bold text-xs rounded-xl transition flex items-center space-x-1.5 self-end"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Broadcast</span>
                </button>
              </form>

              {/* Feed */}
              <div className="border-t border-slate-800 pt-3 space-y-3 max-h-[140px] overflow-y-auto pr-1">
                {announcements.map((ann, idx) => (
                  <div key={idx} className="bg-slate-900/25 p-3 border border-slate-850 rounded-xl text-left space-y-1">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-bold text-slate-200">{ann.title}</h4>
                      <span className="text-[9px] text-slate-500 font-mono">{new Date(ann.createdAt || ann.timestamp).toLocaleDateString()}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed">{ann.content}</p>
                  </div>
                ))}
                {announcements.length === 0 && (
                  <div className="text-xs text-slate-500 italic text-center py-4">No broadcast history.</div>
                )}
              </div>
            </div>
          )}

          {/* Operational timing configurations */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 shadow space-y-4">
            <h3 className="font-bold text-sm tracking-wide text-slate-200 uppercase flex items-center space-x-1.5">
              <Settings className="w-4.5 h-4.5 text-sky-400" />
              <span>Shift Timing Configurations</span>
            </h3>

            <form onSubmit={handleSettingsSubmit} className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400">Office Start Time</label>
                <input
                  type="text"
                  placeholder="e.g. 09:00 AM"
                  value={settings.officeStart}
                  onChange={(e) => setSettings({ ...settings, officeStart: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-850 focus:border-sky-500 rounded-xl py-2 px-3 text-xs text-slate-100 placeholder-slate-500 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400">Late Threshold</label>
                <input
                  type="text"
                  placeholder="e.g. 09:30 AM"
                  value={settings.lateAfter}
                  onChange={(e) => setSettings({ ...settings, lateAfter: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-850 focus:border-sky-500 rounded-xl py-2 px-3 text-xs text-slate-100 placeholder-slate-500 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400">Office End Time</label>
                <input
                  type="text"
                  placeholder="e.g. 06:00 PM"
                  value={settings.officeEnd}
                  onChange={(e) => setSettings({ ...settings, officeEnd: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-850 focus:border-sky-500 rounded-xl py-2 px-3 text-xs text-slate-100 placeholder-slate-500 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400">Session Timeout (Mins)</label>
                <input
                  type="number"
                  placeholder="e.g. 30"
                  value={settings.sessionTimeout}
                  onChange={(e) => setSettings({ ...settings, sessionTimeout: parseInt(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-850 focus:border-sky-500 rounded-xl py-2 px-3 text-xs text-slate-100 placeholder-slate-500 outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={submittingSettings}
                className="col-span-2 py-2.5 bg-sky-600 hover:bg-sky-500 disabled:bg-sky-700 text-white font-bold text-xs rounded-xl transition shadow flex items-center justify-center"
              >
                {submittingSettings ? 'Saving...' : 'Save Shift Settings'}
              </button>
            </form>
          </div>
        </section>

        {/* Audit Trails Section */}
        <section className="glass-panel p-5 rounded-2xl border border-slate-800 shadow space-y-4">
          <h3 className="font-bold text-sm tracking-wide text-slate-200 uppercase flex items-center space-x-1.5">
            <Award className="w-4.5 h-4.5 text-sky-400" />
            <span>Shift Audit Trail Log</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-450 text-[10px] uppercase font-bold tracking-wider">
                  <th className="py-2.5 pr-4">User</th>
                  <th className="py-2.5 px-4">Action</th>
                  <th className="py-2.5 px-4">Details</th>
                  <th className="py-2.5 px-4">IP Address</th>
                  <th className="py-2.5 px-4">Browser/Device</th>
                  <th className="py-2.5 pl-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850/60 text-slate-300">
                {auditLogs.slice(0, 10).map((log, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/10">
                    <td className="py-2.5 pr-4 font-semibold text-slate-200">{log.userId?.name || 'System'}</td>
                    <td className="py-2.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${log.action === 'Login' ? 'bg-sky-500/10 text-sky-450 border-sky-500/20' : log.action === 'Check-in' ? 'bg-emerald-500/10 text-emerald-450 border-emerald-500/20' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 max-w-xs truncate" title={log.details}>{log.details}</td>
                    <td className="py-2.5 px-4 font-mono text-[10px] text-slate-400">{log.ip}</td>
                    <td className="py-2.5 px-4 text-slate-400">{log.browser} / {log.device}</td>
                    <td className="py-2.5 pl-4 font-mono text-[10px] text-slate-400">{new Date(log.timestamp).toLocaleString()}</td>
                  </tr>
                ))}
                {auditLogs.length === 0 && (
                  <tr>
                    <td colSpan="6" className="text-center py-6 text-slate-500 italic">No audit records logged.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

      </main>
    </div>
  );
}
