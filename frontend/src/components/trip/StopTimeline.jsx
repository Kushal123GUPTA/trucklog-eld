/**
 * StopTimeline Component
 * Vertical timeline showing all stops along the route.
 */

import { STOP_TYPES } from '../../utils/constants';

function formatTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatDuration(hours) {
  if (!hours) return '';
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function StopTimeline({ stops }) {
  if (!stops || stops.length === 0) return null;

  return (
    <div className="card animate-slide-up" id="stop-timeline">
      <h2 className="card__title">
        <span className="card__title-icon">🛣️</span>
        Trip Stops
      </h2>

      <div className="timeline">
        {stops.map((stop, index) => {
          const config = STOP_TYPES[stop.stop_type] || STOP_TYPES.rest;
          return (
            <div className="timeline-item" key={index}>
              <div className={`timeline-item__dot ${config.dotClass}`}>
                {config.icon}
              </div>
              <div className="timeline-item__content">
                <div className="timeline-item__title">
                  {config.label}: {stop.location_name}
                </div>
                <div className="timeline-item__subtitle">
                  {formatDate(stop.arrival_time)} • {formatTime(stop.arrival_time)}
                  {stop.duration_hours > 0 && ` • ${formatDuration(stop.duration_hours)}`}
                </div>
                {stop.cumulative_miles > 0 && (
                  <div className="timeline-item__meta">
                    Mile {Math.round(stop.cumulative_miles).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
