import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

export default function MapComponent({ 
  center = [12.9716, 77.5946], 
  zoom = 13, 
  markers = [], 
  polyline = [], 
  replayMarker = null,
  fitBoundsTrigger = null 
}) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersGroup = useRef(null);
  const polylineLayer = useRef(null);
  const replayMarkerLayer = useRef(null);

  // Initialize Map
  useEffect(() => {
    if (!mapRef.current) return;

    // Create Map instance
    mapInstance.current = L.map(mapRef.current, {
      center: center,
      zoom: zoom,
      zoomControl: true,
    });

    // Dark Mode Map Tiles (CartoDB Dark Matter)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(mapInstance.current);

    // Layers groups
    markersGroup.current = L.layerGroup().addTo(mapInstance.current);

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  // Update Markers and Polyline
  useEffect(() => {
    if (!mapInstance.current || !markersGroup.current) return;

    // Clear previous markers
    markersGroup.current.clearLayers();

    // Render Markers
    markers.forEach((m, index) => {
      let iconColor = 'bg-blue-500';
      let border = 'border-white';
      let label = '';

      if (m.type === 'checkIn') {
        iconColor = 'bg-emerald-500';
        label = '🟢';
      } else if (m.type === 'checkOut') {
        iconColor = 'bg-rose-500';
        label = '🔴';
      } else if (m.type === 'live') {
        iconColor = 'bg-purple-600 animate-pulse';
        border = 'border-purple-300';
        label = '📡';
      } else {
        // Consumer stop
        iconColor = 'bg-sky-500';
        label = m.index !== undefined ? `${m.index}` : '🔵';
      }

      const htmlIcon = L.divIcon({
        className: 'custom-leaflet-icon',
        html: `
          <div class="flex items-center justify-center w-8 h-8 rounded-full shadow-lg ${iconColor} border-2 ${border} text-white font-semibold text-xs transition-transform transform hover:scale-110">
            ${label}
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16]
      });

      const popupContent = `
        <div class="p-2 text-slate-800 font-sans max-w-xs">
          <h4 class="font-bold text-sm text-slate-900">${m.title || 'Stop'}</h4>
          ${m.time ? `<p class="text-xs text-slate-500 mt-1">🕒 ${new Date(m.time).toLocaleTimeString()}</p>` : ''}
          ${m.address ? `<p class="text-xs text-slate-600 mt-1">📍 ${m.address}</p>` : ''}
          ${m.comment ? `<p class="text-xs italic text-slate-700 bg-slate-100 p-1.5 rounded mt-2">💬 "${m.comment}"</p>` : ''}
          ${m.photo ? `<div class="mt-2"><img src="${m.photo}" class="w-full h-24 object-cover rounded shadow" alt="Proof" /></div>` : ''}
        </div>
      `;

      L.marker([m.lat, m.lng], { icon: htmlIcon })
        .bindPopup(popupContent)
        .addTo(markersGroup.current);
    });

    // Update Polyline
    if (polylineLayer.current) {
      polylineLayer.current.remove();
      polylineLayer.current = null;
    }

    if (polyline && polyline.length > 1) {
      polylineLayer.current = L.polyline(polyline, {
        color: '#0ea5e9', // Primary sky-500 color
        weight: 4,
        opacity: 0.8,
        dashArray: '8, 6',
        className: 'animated-polyline'
      }).addTo(mapInstance.current);
    }
  }, [markers, polyline]);

  // Update Replay moving marker
  useEffect(() => {
    if (!mapInstance.current) return;

    if (replayMarkerLayer.current) {
      replayMarkerLayer.current.remove();
      replayMarkerLayer.current = null;
    }

    if (replayMarker) {
      const replayIcon = L.divIcon({
        html: `
          <div class="flex items-center justify-center w-8 h-8 rounded-full shadow-lg bg-yellow-500 border-2 border-yellow-200 text-slate-950 animate-bounce">
            🛵
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      replayMarkerLayer.current = L.marker([replayMarker.lat, replayMarker.lng], { icon: replayIcon })
        .addTo(mapInstance.current);
      
      // Auto pan to replay marker
      mapInstance.current.panTo([replayMarker.lat, replayMarker.lng]);
    }
  }, [replayMarker]);

  // Fit bounds when markers change
  useEffect(() => {
    if (!mapInstance.current) return;

    let points = [];
    markers.forEach(m => points.push([m.lat, m.lng]));
    if (polyline && polyline.length > 0) {
      polyline.forEach(p => points.push(p));
    }

    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      mapInstance.current.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [markers, polyline, fitBoundsTrigger]);

  return (
    <div className="relative w-full h-full min-h-[400px]">
      <div ref={mapRef} className="w-full h-full min-h-[400px]" />
    </div>
  );
}
