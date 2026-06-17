/**
 * Custom hook for trip planning state management.
 * Handles form state, API calls, loading/error states.
 */

import { useState, useCallback } from 'react';
import { planTrip } from '../api/tripApi';

const initialFormState = {
  current_location: '',
  pickup_location: '',
  dropoff_location: '',
  current_cycle_used: 0,
};

export function useTrip() {
  const [formData, setFormData] = useState(initialFormState);
  const [tripResult, setTripResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const updateField = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const submitTrip = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await planTrip(formData);
      setTripResult(result);
      return result;
    } catch (err) {
      const errorMessage =
        err.response?.data?.error ||
        err.response?.data?.detail ||
        err.message ||
        'Failed to plan trip. Please try again.';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [formData]);

  const resetTrip = useCallback(() => {
    setFormData(initialFormState);
    setTripResult(null);
    setError(null);
  }, []);

  return {
    formData,
    updateField,
    tripResult,
    setTripResult,
    isLoading,
    error,
    submitTrip,
    resetTrip,
  };
}
