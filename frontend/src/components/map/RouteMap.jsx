/**
 * RouteMap Component
 *
 * Interactive Leaflet map displaying:
 *   - Route polyline (blue gradient line)
 *   - Stop markers with colored icons and popups
 *   - Auto-fit bounds to show the full route
 */

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { STOP_TYPES } from '../../utils/constants';

// Custom colored circle marker factory
function createStopIcon(color) {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      width: 14px; height: 14px;
      background: ${color};
      border: 2.5px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 6px rgba(0,0,0,0.4);
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -10],
  });
}

// Larger icon for major stops (start, pickup, dropoff)
function createMajorIcon(emoji) {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      width: 32px; height: 32px;
      background: rgba(17, 24, 39, 0.9);
      border: 2px solid rgba(255,255,255,0.2);
      border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      font-size: 16px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    ">${emoji}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  });
}

export default function RouteMap({ route, stops, isActive = true }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layerGroupRef = useRef(null);

  // Initialize map once on mount
  useEffect(() => {
    if (mapInstanceRef.current || !mapContainerRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [39.8283, -98.5795], // Center of US
      zoom: 4,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    // Dark tile layer to match our theme
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
      maxZoom: 19,
    }).addTo(map);

    layerGroupRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    // Force initial size calculation
    setTimeout(() => map.invalidateSize(), 100);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      layerGroupRef.current = null;
    };
  }, []);

  // Fix Leaflet map sizing when returning to the Map tab
  useEffect(() => {
    if (isActive && mapInstanceRef.current) {
      // Small delay allows the DOM display transition to finish
      setTimeout(() => {
        mapInstanceRef.current.invalidateSize();
      }, 50);
    }
  }, [isActive]);

  // Update route + markers when data changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layers = layerGroupRef.current;
    if (!map || !layers) return;

    layers.clearLayers();

    if (!route || route.length === 0) return;

    // Invalidate size since container may have been hidden
    map.invalidateSize();

    // Draw route polyline
    const latLngs = route.map(([lng, lat]) => [lat, lng]);

    L.polyline(latLngs, {
      color: '#3b82f6',
      weight: 4,
      opacity: 0.8,
      smoothFactor: 1.5,
    }).addTo(layers);

    // Glow effect underneath
    L.polyline(latLngs, {
      color: '#3b82f6',
      weight: 10,
      opacity: 0.15,
      smoothFactor: 1.5,
    }).addTo(layers);

    // Add stop markers
    if (stops && stops.length > 0) {
      stops.forEach((stop) => {
        if (!stop.lat || !stop.lng) return;

        const config = STOP_TYPES[stop.stop_type] || STOP_TYPES.rest;
        const isMajor = ['start', 'pickup', 'dropoff'].includes(stop.stop_type);
        const icon = isMajor
          ? createMajorIcon(config.icon)
          : createStopIcon(config.color);

        const marker = L.marker([stop.lat, stop.lng], { icon }).addTo(layers);

        // Popup content
        const popupHtml = `
          <div style="font-family: Inter, sans-serif; min-width: 160px;">
            <div style="font-weight: 600; font-size: 13px; margin-bottom: 4px;">
              ${config.icon} ${stop.stop_type_display || config.label}
            </div>
            <div style="font-size: 12px; color: #64748b; margin-bottom: 2px;">
              ${stop.location_name}
            </div>
            ${stop.duration_hours > 0 ? `<div style="font-size: 11px; color: #94a3b8;">Duration: ${formatDuration(stop.duration_hours)}</div>` : ''}
            ${stop.cumulative_miles > 0 ? `<div style="font-size: 11px; color: #94a3b8;">Mile ${Math.round(stop.cumulative_miles).toLocaleString()}</div>` : ''}
          </div>
        `;
        marker.bindPopup(popupHtml, {
          className: 'custom-popup',
          closeButton: false,
        });
      });
    }

    // Fit map bounds to route with a slight delay for invalidateSize
    setTimeout(() => {
      map.invalidateSize();
      const bounds = L.latLngBounds(latLngs);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }, 150);
  }, [route, stops]);

  const hasData = route && route.length > 0;

  return (
    <div className="map-container" id="route-map">
      {!hasData && (
        <div className="map-placeholder">
          <div className="map-placeholder__icon">🗺️</div>
          <div className="map-placeholder__text">
            Enter trip details and click "Plan Trip" to see your route
          </div>
        </div>
      )}
      <div
        ref={mapContainerRef}
        style={{
          height: '100%',
          width: '100%',
          position: hasData ? 'relative' : 'absolute',
          visibility: hasData ? 'visible' : 'hidden',
        }}
      />
    </div>
  );
}

function formatDuration(hours) {
  if (!hours) return '';
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

