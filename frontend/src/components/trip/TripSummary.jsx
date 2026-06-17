/**
 * TripSummary Component
 * Displays key stats about the planned trip.
 */

export default function TripSummary({ trip }) {
  if (!trip) return null;

  const {
    total_distance,
    total_driving_hours,
    total_duration,
    total_days,
    stops = [],
  } = trip;

  const fuelStops = stops.filter((s) => s.stop_type === 'fuel').length;
  const restStops = stops.filter((s) => s.stop_type === 'rest').length;

  return (
    <div className="card animate-slide-up" id="trip-summary">
      <h2 className="card__title">
        <span className="card__title-icon">📊</span>
        Route Summary
      </h2>

      <div className="stats-grid">
        <div className="stat-card stat-card--blue">
          <div className="stat-card__value">
            {total_distance ? `${Math.round(total_distance).toLocaleString()}` : '—'}
          </div>
          <div className="stat-card__label">Total Miles</div>
        </div>

        <div className="stat-card stat-card--emerald">
          <div className="stat-card__value">
            {total_driving_hours ? `${total_driving_hours.toFixed(1)}` : '—'}
          </div>
          <div className="stat-card__label">Driving Hours</div>
        </div>

        <div className="stat-card stat-card--amber">
          <div className="stat-card__value">
            {total_days || '—'}
          </div>
          <div className="stat-card__label">Days</div>
        </div>

        <div className="stat-card stat-card--purple">
          <div className="stat-card__value">
            {total_duration ? `${total_duration.toFixed(1)}` : '—'}
          </div>
          <div className="stat-card__label">Total Hours</div>
        </div>
      </div>

      {(fuelStops > 0 || restStops > 0) && (
        <div className="stats-grid" style={{ marginTop: 'var(--space-3)' }}>
          <div className="stat-card">
            <div className="stat-card__value" style={{ color: '#f59e0b' }}>
              {fuelStops}
            </div>
            <div className="stat-card__label">Fuel Stops</div>
          </div>
          <div className="stat-card">
            <div className="stat-card__value" style={{ color: '#64748b' }}>
              {restStops}
            </div>
            <div className="stat-card__label">Rest Stops</div>
          </div>
        </div>
      )}
    </div>
  );
}
