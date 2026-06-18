/**
 * API Client for TruckLog ELD Backend.
 * Centralized HTTP client using axios with error handling.
 */

import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000, // 60s — trip planning can take a while
});

/**
 * Plan a new trip.
 * @param {Object} tripData - { current_location, pickup_location, dropoff_location, current_cycle_used }
 * @returns {Promise<Object>} Full trip data with stops and daily logs
 */
export const planTrip = async (tripData) => {
  const response = await apiClient.post('/trips/plan/', tripData);
  return response.data;
};

/**
 * Get a trip by ID.
 * @param {number} tripId
 * @returns {Promise<Object>} Trip data
 */
export const getTrip = async (tripId) => {
  const response = await apiClient.get(`/trips/${tripId}/`);
  return response.data;
};

/**
 * List recent trips.
 * @returns {Promise<Array>} List of trips
 */
export const listTrips = async () => {
  const response = await apiClient.get('/trips/');
  return response.data;
};

/**
 * Geocode a location string.
 * @param {string} query - Location text
 * @returns {Promise<Array>} List of geocoding results
 */
export const geocodeLocation = async (query) => {
  const response = await apiClient.get('/geocode/', {
    params: { q: query },
  });
  return response.data;
};

/**
 * Ping the backend to wake it up from a cold start (e.g. Render free tier sleep).
 * We hit /trips/ because it's a lightweight list endpoint that returns 200 OK.
 */
export const wakeupBackend = async () => {
  try {
    await apiClient.get('/trips/');
  } catch (error) {
    console.log("Wakeup ping error (expected if sleepy):", error);
  }
};

export default apiClient;
