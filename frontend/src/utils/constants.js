/**
 * API Configuration & Constants
 */

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// HOS Rule Constants (mirrored from backend for display purposes)
export const HOS_RULES = {
  MAX_DRIVING_HOURS: 11,
  MAX_DUTY_WINDOW: 14,
  BREAK_AFTER_HOURS: 8,
  BREAK_DURATION: 0.5,
  OFF_DUTY_REQUIRED: 10,
  MAX_CYCLE_HOURS: 70,
  RESTART_DURATION: 34,
  FUEL_INTERVAL_MILES: 1000,
  AVG_SPEED_MPH: 55,
};

// Stop type configurations (icons and colors)
export const STOP_TYPES = {
  start: {
    icon: '📍',
    label: 'Start',
    color: '#10b981',
    dotClass: 'timeline-item__dot--start',
  },
  pickup: {
    icon: '📦',
    label: 'Pickup',
    color: '#3b82f6',
    dotClass: 'timeline-item__dot--pickup',
  },
  dropoff: {
    icon: '🏁',
    label: 'Drop-off',
    color: '#8b5cf6',
    dotClass: 'timeline-item__dot--dropoff',
  },
  fuel: {
    icon: '⛽',
    label: 'Fuel Stop',
    color: '#f59e0b',
    dotClass: 'timeline-item__dot--fuel',
  },
  rest: {
    icon: '🛏️',
    label: 'Rest Stop',
    color: '#64748b',
    dotClass: 'timeline-item__dot--rest',
  },
  break: {
    icon: '☕',
    label: '30-min Break',
    color: '#475569',
    dotClass: 'timeline-item__dot--break',
  },
};

// Duty status display config
export const DUTY_STATUSES = {
  off_duty: { label: 'Off Duty', color: '#64748b', row: 0 },
  sleeper: { label: 'Sleeper Berth', color: '#8b5cf6', row: 1 },
  driving: { label: 'Driving', color: '#10b981', row: 2 },
  on_duty: { label: 'On Duty (Not Driving)', color: '#f59e0b', row: 3 },
};
