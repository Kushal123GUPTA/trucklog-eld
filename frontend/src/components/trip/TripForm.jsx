/**
 * TripForm Component
 * Input form for trip planning — uses autocomplete for locations.
 * Handles validation and submission.
 */

import { useState } from 'react';
import AutocompleteInput from './AutocompleteInput';

export default function TripForm({ formData, updateField, onSubmit, isLoading }) {
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};

    if (!formData.current_location.trim()) {
      newErrors.current_location = 'Current location is required';
    }
    if (!formData.pickup_location.trim()) {
      newErrors.pickup_location = 'Pickup location is required';
    }
    if (!formData.dropoff_location.trim()) {
      newErrors.dropoff_location = 'Dropoff location is required';
    }
    if (
      formData.current_cycle_used < 0 ||
      formData.current_cycle_used > 70
    ) {
      newErrors.current_cycle_used = 'Must be between 0 and 70 hours';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSubmit();
    }
  };

  return (
    <div className="card animate-slide-up" id="trip-form">
      <h2 className="card__title">
        <span className="card__title-icon">🗺️</span>
        Plan Your Trip
      </h2>

      <form onSubmit={handleSubmit}>
        {/* Current Location */}
        <AutocompleteInput
          id="current-location"
          label="Current Location"
          icon="📍"
          placeholder="e.g., Chicago, IL"
          value={formData.current_location}
          onChange={(val) => updateField('current_location', val)}
          error={errors.current_location}
        />

        {/* Pickup Location */}
        <AutocompleteInput
          id="pickup-location"
          label="Pickup Location"
          icon="📦"
          placeholder="e.g., Indianapolis, IN"
          value={formData.pickup_location}
          onChange={(val) => updateField('pickup_location', val)}
          error={errors.pickup_location}
        />

        {/* Dropoff Location */}
        <AutocompleteInput
          id="dropoff-location"
          label="Dropoff Location"
          icon="🏁"
          placeholder="e.g., Nashville, TN"
          value={formData.dropoff_location}
          onChange={(val) => updateField('dropoff_location', val)}
          error={errors.dropoff_location}
        />

        {/* Current Cycle Used */}
        <div className="form-group">
          <label className="form-label" htmlFor="cycle-used">
            <span className="form-label__icon">⏱️</span>
            Current Cycle Used (Hours)
          </label>
          <input
            id="cycle-used"
            type="number"
            className={`form-input ${errors.current_cycle_used ? 'form-input--error' : ''}`}
            placeholder="0"
            min="0"
            max="70"
            step="0.5"
            value={formData.current_cycle_used}
            onChange={(e) =>
              updateField('current_cycle_used', parseFloat(e.target.value) || 0)
            }
          />
          <span className="form-hint">
            Hours used in the 70-hr/8-day cycle (0–70)
          </span>
          {errors.current_cycle_used && (
            <span className="form-error">{errors.current_cycle_used}</span>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          className={`btn btn--primary btn--lg btn--full ${isLoading ? 'btn--disabled' : ''}`}
          disabled={isLoading}
          id="plan-trip-btn"
        >
          {isLoading ? (
            <>
              <span className="btn__spinner" />
              Planning Route...
            </>
          ) : (
            <>
              🚀 Plan Trip
            </>
          )}
        </button>
      </form>
    </div>
  );
}
