import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';

const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#1e293b" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1e293b" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#cbd5e1" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#cbd5e1" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#0f172a" }],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [{ color: "#64748b" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#334155" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1e293b" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#94a3b8" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#475569" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1e293b" }],
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "#f1f5f9" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#0f172a" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#475569" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.stroke",
    stylers: [{ color: "#0f172a" }],
  },
];

let HTMLMapMarkerClass = null;
function getHTMLMapMarkerClass() {
  if (HTMLMapMarkerClass) return HTMLMapMarkerClass;
  HTMLMapMarkerClass = class extends google.maps.OverlayView {
    constructor(latlng, map, htmlElement, onClick) {
      super();
      this.latlng = latlng;
      this.htmlElement = htmlElement;
      this.onClick = onClick;
      this.setMap(map);
    }
    onAdd() {
      const pane = this.getPanes().overlayMouseTarget;
      pane.appendChild(this.htmlElement);
      if (this.onClick) {
        this.listener = this.htmlElement.addEventListener('click', (e) => {
          google.maps.event.trigger(this, 'click');
          this.onClick(e);
        });
      }
    }
    draw() {
      const projection = this.getProjection();
      if (!projection) return;
      const point = projection.fromLatLngToDivPixel(this.latlng);
      if (point) {
        this.htmlElement.style.position = 'absolute';
        this.htmlElement.style.left = (point.x - 16) + 'px';
        this.htmlElement.style.top = (point.y - 16) + 'px';
      }
    }
    onRemove() {
      if (this.htmlElement.parentNode) {
        this.htmlElement.parentNode.removeChild(this.htmlElement);
      }
      if (this.listener) {
        this.htmlElement.removeEventListener('click', this.listener);
      }
    }
  };
  return HTMLMapMarkerClass;
}

export default function MapComponent({ 
  center = [26.8467, 80.9462], 
  zoom = 13, 
  markers = [], 
  polyline = [], 
  replayMarker = null,
  fitBoundsTrigger = null,
  onMarkerClick = null,
  selectedMarker = null
}) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  
  const activeMarkers = useRef([]);
  const activePolyline = useRef(null);
  const activeReplayMarker = useRef(null);
  
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
  const [mapType, setMapType] = useState('dark'); // 'dark', 'streets', 'satellite'
  
  const apiKey = import.meta.env.GOOGLE_MAPS_API_KEY || '';

  // Load Google Maps API script
  useEffect(() => {
    if (!apiKey) return;
    
    const loadScript = () => {
      const existingScript = document.getElementById('googleMapsScript');
      if (existingScript) {
        if (window.google && window.google.maps) {
          setGoogleMapsLoaded(true);
        } else {
          existingScript.addEventListener('load', () => setGoogleMapsLoaded(true));
        }
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`;
      script.id = 'googleMapsScript';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
      script.onload = () => {
        setGoogleMapsLoaded(true);
      };
    };

    loadScript();
  }, [apiKey]);

  // Initialize Map
  useEffect(() => {
    if (!googleMapsLoaded || !mapRef.current) return;

    mapInstance.current = new google.maps.Map(mapRef.current, {
      center: { lat: center[0], lng: center[1] },
      zoom: zoom,
      mapTypeId: mapType === 'satellite' ? 'hybrid' : 'roadmap',
      styles: mapType === 'dark' ? darkMapStyle : null,
      disableDefaultUI: true,
      zoomControl: true,
      streetViewControl: false,
      mapTypeControl: false,
      fullscreenControl: false,
    });

    return () => {
      // Cleanup
      activeMarkers.current.forEach(m => m.setMap(null));
      activeMarkers.current = [];
      if (activePolyline.current) {
        activePolyline.current.setMap(null);
      }
      if (activeReplayMarker.current) {
        activeReplayMarker.current.setMap(null);
      }
      mapInstance.current = null;
    };
  }, [googleMapsLoaded]);

  // Handle map type changes
  const handleMapTypeChange = (type) => {
    setMapType(type);
    if (!mapInstance.current) return;

    if (type === 'satellite') {
      mapInstance.current.setMapTypeId('hybrid');
      mapInstance.current.setOptions({ styles: null });
    } else if (type === 'streets') {
      mapInstance.current.setMapTypeId('roadmap');
      mapInstance.current.setOptions({ styles: null });
    } else if (type === 'dark') {
      mapInstance.current.setMapTypeId('roadmap');
      mapInstance.current.setOptions({ styles: darkMapStyle });
    }
  };

  // Render markers and polyline
  useEffect(() => {
    if (!googleMapsLoaded || !mapInstance.current) return;

    // 1. Clear old markers
    activeMarkers.current.forEach(m => m.setMap(null));
    activeMarkers.current = [];

    const HTMLMapMarker = getHTMLMapMarkerClass();

    // 2. Render new markers
    markers.forEach((m, index) => {
      let iconColor = 'bg-blue-500';
      let border = 'border-white';
      let label = '';

      const isSelected = selectedMarker && 
        selectedMarker.lat === m.lat && 
        selectedMarker.lng === m.lng && 
        selectedMarker.type === m.type &&
        selectedMarker.time === m.time;

      if (m.type === 'checkIn') {
        iconColor = 'bg-emerald-500';
        label = 'In';
      } else if (m.type === 'checkOut') {
        iconColor = 'bg-rose-500';
        label = 'Out';
      } else if (m.type === 'live') {
        iconColor = 'bg-purple-600 animate-pulse';
        border = 'border-purple-300';
        label = '📡';
      } else {
        iconColor = 'bg-sky-500';
        label = m.index !== undefined ? `${m.index}` : '🔵';
      }

      if (isSelected) {
        border = 'border-amber-400 ring-4 ring-amber-400/30 scale-125';
      }

      const div = document.createElement('div');
      div.className = 'custom-google-marker';
      div.innerHTML = `
        <div class="flex items-center justify-center w-8 h-8 rounded-full shadow-lg ${iconColor} border-2 ${border} text-white font-semibold text-xs transition-transform transform hover:scale-110 cursor-pointer">
          ${label}
        </div>
      `;

      const markerLatLng = new google.maps.LatLng(m.lat, m.lng);

      const markerInstance = new HTMLMapMarker(
        markerLatLng,
        mapInstance.current,
        div,
        () => {
          if (onMarkerClick) {
            onMarkerClick(m);
          }
        }
      );

      activeMarkers.current.push(markerInstance);

      if (m.openByDefault) {
        setTimeout(() => {
          if (onMarkerClick) {
            onMarkerClick(m);
          }
        }, 300);
      }
    });

    // 3. Clear and draw polyline
    if (activePolyline.current) {
      activePolyline.current.setMap(null);
      activePolyline.current = null;
    }

    if (polyline && polyline.length > 1) {
      activePolyline.current = new google.maps.Polyline({
        path: polyline.map(p => ({ lat: p[0], lng: p[1] })),
        geodesic: true,
        strokeColor: '#0ea5e9',
        strokeOpacity: 0.8,
        strokeWeight: 4,
        map: mapInstance.current
      });
    }
  }, [googleMapsLoaded, markers, polyline, selectedMarker, onMarkerClick]);

  // Update Replay moving marker
  useEffect(() => {
    if (!googleMapsLoaded || !mapInstance.current) return;

    if (activeReplayMarker.current) {
      activeReplayMarker.current.setMap(null);
      activeReplayMarker.current = null;
    }

    if (replayMarker) {
      const HTMLMapMarker = getHTMLMapMarkerClass();
      const div = document.createElement('div');
      div.innerHTML = `
        <div class="flex items-center justify-center w-8 h-8 rounded-full shadow-lg bg-yellow-500 border-2 border-yellow-200 text-slate-950 animate-bounce cursor-pointer">
          🛵
        </div>
      `;

      const replayLatLng = new google.maps.LatLng(replayMarker.lat, replayMarker.lng);
      activeReplayMarker.current = new HTMLMapMarker(
        replayLatLng,
        mapInstance.current,
        div
      );

      mapInstance.current.panTo(replayLatLng);
    }
  }, [googleMapsLoaded, replayMarker]);

  // Fit bounds when markers/polyline change
  useEffect(() => {
    if (!googleMapsLoaded || !mapInstance.current) return;

    let points = [];
    markers.forEach(m => points.push({ lat: m.lat, lng: m.lng }));
    if (polyline && polyline.length > 0) {
      polyline.forEach(p => points.push({ lat: p[0], lng: p[1] }));
    }

    if (points.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      points.forEach(pt => bounds.extend(pt));
      mapInstance.current.fitBounds(bounds);
      
      // Prevent zooming in too close automatically if only 1 point
      if (points.length === 1) {
        const listener = google.maps.event.addListener(mapInstance.current, 'bounds_changed', function() {
          if (this.getZoom() > 16) {
            this.setZoom(16);
          }
          google.maps.event.removeListener(listener);
        });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleMapsLoaded, fitBoundsTrigger]);

  return (
    <div className="relative w-full h-full min-h-[400px]">
      {!apiKey && (
        <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center z-20 border border-slate-800 rounded-2xl animate-fadeIn">
          <div className="bg-amber-500/10 p-3 rounded-full text-amber-400 mb-3 animate-pulse">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-slate-200 font-bold mb-1 text-sm">Google Maps API Key Required</h3>
          <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
            Please add <code>GOOGLE_MAPS_API_KEY</code> to your environment or <code>.env</code> file.
          </p>
        </div>
      )}
      
      {apiKey && !googleMapsLoaded && (
        <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm z-20 flex items-center justify-center rounded-2xl">
          <div className="text-center space-y-2">
            <div className="w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs text-slate-400 font-medium">Loading Google Maps...</p>
          </div>
        </div>
      )}

      <div ref={mapRef} className="w-full h-full min-h-[400px] rounded-2xl border border-slate-800 bg-[#1e293b]" style={{ height: '100%', width: '100%', minHeight: '400px' }} />

      {googleMapsLoaded && (
        <div className="absolute bottom-4 right-4 z-10 flex bg-slate-950/80 backdrop-blur-md border border-slate-800 rounded-xl p-1 shadow-2xl space-x-1">
          <button
            onClick={() => handleMapTypeChange('dark')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${mapType === 'dark' ? 'bg-sky-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
          >
            🕶️ Dark
          </button>
          <button
            onClick={() => handleMapTypeChange('streets')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${mapType === 'streets' ? 'bg-sky-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
          >
            🗺️ Streets
          </button>
          <button
            onClick={() => handleMapTypeChange('satellite')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${mapType === 'satellite' ? 'bg-sky-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
          >
            🛰️ Satellite
          </button>
        </div>
      )}
    </div>
  );
}
