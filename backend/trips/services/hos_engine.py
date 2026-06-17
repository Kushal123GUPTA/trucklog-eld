"""
HOS (Hours of Service) Engine — Trip Planning Algorithm.

Simulates a driver's journey enforcing FMCSA HOS regulations
for property-carrying drivers (70hr/8day cycle).

Rules: 11-hr driving, 14-hr window, 30-min break after 8 hrs,
10-hr off-duty, 70-hr/8-day cycle, 34-hr restart.
"""

import math
import logging
from datetime import datetime, timedelta, timezone
from typing import List, Tuple, Optional

logger = logging.getLogger(__name__)

# ── HOS Constants ──────────────────────────────────────────────
MAX_DRIVING_HOURS = 11.0
MAX_DUTY_WINDOW_HOURS = 14.0
BREAK_AFTER_DRIVING_HOURS = 8.0
BREAK_DURATION_HOURS = 0.5
OFF_DUTY_REQUIRED_HOURS = 10.0
MAX_CYCLE_HOURS = 70.0
RESTART_DURATION_HOURS = 34.0
FUEL_INTERVAL_MILES = 1000
FUEL_STOP_DURATION_HOURS = 0.5
PICKUP_DURATION_HOURS = 1.0
DROPOFF_DURATION_HOURS = 1.0
PRE_TRIP_DURATION_HOURS = 0.25
POST_TRIP_DURATION_HOURS = 0.25
AVG_SPEED_MPH = 55.0


class DutyEvent:
    """A single duty status period (a line segment on the ELD grid)."""
    __slots__ = ('status', 'start_dt', 'end_dt', 'location', 'lat', 'lng', 'remarks')

    def __init__(self, status, start_dt, end_dt, location='', lat=0.0, lng=0.0, remarks=''):
        self.status = status
        self.start_dt = start_dt
        self.end_dt = end_dt
        self.location = location
        self.lat = lat
        self.lng = lng
        self.remarks = remarks

    @property
    def hours(self):
        return (self.end_dt - self.start_dt).total_seconds() / 3600


class StopEvent:
    """A planned stop along the route."""
    __slots__ = (
        'stop_type', 'location', 'lat', 'lng',
        'arrival', 'departure', 'duration_hours', 'cumulative_miles',
    )

    def __init__(self, stop_type, location, lat, lng, arrival, departure, duration_hours, cumulative_miles):
        self.stop_type = stop_type
        self.location = location
        self.lat = lat
        self.lng = lng
        self.arrival = arrival
        self.departure = departure
        self.duration_hours = duration_hours
        self.cumulative_miles = cumulative_miles


class DriverState:
    """Tracks all HOS counters for the simulation."""

    def __init__(self, cycle_used: float, start_time: datetime):
        self.current_time = start_time
        self.driving_today = 0.0
        self.window_start: Optional[datetime] = None
        self.hours_since_break = 0.0
        self.cycle_used = cycle_used
        self.miles_since_fuel = 0.0
        self.total_miles = 0.0
        self.is_on_duty = False
        self.events: List[DutyEvent] = []
        self.stops: List[StopEvent] = []

    @property
    def available_driving(self):
        return max(0, MAX_DRIVING_HOURS - self.driving_today)

    @property
    def window_remaining(self):
        if self.window_start is None:
            return MAX_DUTY_WINDOW_HOURS
        elapsed = (self.current_time - self.window_start).total_seconds() / 3600
        return max(0, MAX_DUTY_WINDOW_HOURS - elapsed)

    @property
    def available_before_break(self):
        return max(0, BREAK_AFTER_DRIVING_HOURS - self.hours_since_break)

    @property
    def available_cycle(self):
        return max(0, MAX_CYCLE_HOURS - self.cycle_used)

    def needs_daily_rest(self):
        return self.available_driving <= 0.01 or self.window_remaining <= 0.01

    def needs_cycle_restart(self):
        return self.available_cycle <= 0.01

    def start_duty_window(self):
        if self.window_start is None:
            self.window_start = self.current_time

    def reset_daily(self):
        self.driving_today = 0.0
        self.window_start = None
        self.hours_since_break = 0.0
        self.is_on_duty = False

    def reset_break_counter(self):
        self.hours_since_break = 0.0


class HOSEngine:
    """
    Main simulation engine. Drives a route while enforcing all HOS rules,
    recording duty events and stop markers along the way.
    """

    def __init__(self, state: DriverState):
        self.state = state

    # ── Public API ─────────────────────────────────────────────

    def simulate_leg(self, distance_miles, geometry, cumulative_dists,
                     start_name, end_name, start_coords, end_coords):
        """
        Simulate driving a route leg with full HOS enforcement.
        Handles rest, breaks, fuel stops automatically.
        """
        from .route_utils import interpolate_position

        remaining = distance_miles
        leg_driven = 0.0
        iteration = 0
        max_iterations = 200  # safety valve

        while remaining > 0.1 and iteration < max_iterations:
            iteration += 1

            # ① Cycle exhausted → 34-hr restart
            if self.state.needs_cycle_restart():
                pos = interpolate_position(geometry, cumulative_dists, leg_driven)
                self._do_restart(pos, leg_driven)

            # ② Daily limits hit → 10-hr rest
            if self.state.needs_daily_rest():
                pos = interpolate_position(geometry, cumulative_dists, leg_driven)
                self._do_daily_rest(pos, leg_driven)

            # ③ Start of driving session → pre-trip
            if not self.state.is_on_duty:
                pos = interpolate_position(geometry, cumulative_dists, leg_driven)
                self._do_pre_trip(pos, leg_driven)

            # ④ Calculate max driveable hours right now
            max_drive = min(
                self.state.available_driving,
                self.state.window_remaining - POST_TRIP_DURATION_HOURS,
                self.state.available_before_break,
                self.state.available_cycle,
            )
            max_drive = max(0, max_drive)

            if max_drive < 0.05:
                # Not enough time left in window, force rest
                pos = interpolate_position(geometry, cumulative_dists, leg_driven)
                self._do_post_trip(pos, leg_driven)
                self._do_daily_rest(pos, leg_driven)
                continue

            # ⑤ Check fuel constraint
            miles_to_fuel = FUEL_INTERVAL_MILES - self.state.miles_since_fuel
            hours_to_fuel = miles_to_fuel / AVG_SPEED_MPH
            needs_fuel = False
            if hours_to_fuel > 0 and hours_to_fuel < max_drive and miles_to_fuel < remaining:
                max_drive = hours_to_fuel
                needs_fuel = True

            # ⑥ Check if we can finish the remaining distance
            hours_to_finish = remaining / AVG_SPEED_MPH
            if hours_to_finish <= max_drive:
                max_drive = hours_to_finish

            # ⑦ Drive
            miles_driven = max_drive * AVG_SPEED_MPH
            miles_driven = min(miles_driven, remaining)
            leg_driven += miles_driven
            remaining -= miles_driven

            drive_start_pos = interpolate_position(geometry, cumulative_dists, leg_driven - miles_driven)
            drive_end_pos = interpolate_position(geometry, cumulative_dists, leg_driven)
            self._add_driving(max_drive, miles_driven, drive_start_pos, drive_end_pos)

            # ⑧ Post-driving actions
            if needs_fuel and remaining > 0.1:
                fuel_pos = interpolate_position(geometry, cumulative_dists, leg_driven)
                self._do_fuel_stop(fuel_pos, leg_driven)

            if self.state.hours_since_break >= BREAK_AFTER_DRIVING_HOURS - 0.01 and remaining > 0.1:
                brk_pos = interpolate_position(geometry, cumulative_dists, leg_driven)
                self._do_break(brk_pos, leg_driven)

    def add_pickup(self, lat, lng, location_name, cumulative_miles):
        """Record 1-hour pickup stop (on-duty not driving)."""
        self._ensure_on_duty(lat, lng, cumulative_miles)
        self._add_on_duty_stop(
            'pickup', PICKUP_DURATION_HOURS, location_name,
            lat, lng, cumulative_miles, 'Pickup - Loading'
        )

    def add_dropoff(self, lat, lng, location_name, cumulative_miles):
        """Record 1-hour dropoff stop (on-duty not driving)."""
        self._ensure_on_duty(lat, lng, cumulative_miles)
        self._add_on_duty_stop(
            'dropoff', DROPOFF_DURATION_HOURS, location_name,
            lat, lng, cumulative_miles, 'Dropoff - Unloading'
        )
        # Post-trip after dropoff
        self._do_post_trip((lng, lat), cumulative_miles)

    def generate_daily_logs(self):
        """
        Convert the flat list of DutyEvents into per-day log data,
        splitting events that cross midnight boundaries.

        Returns list of dicts, each representing one day's log.
        """
        if not self.state.events:
            return []

        first_dt = self.state.events[0].start_dt
        last_dt = self.state.events[-1].end_dt
        start_date = first_dt.date()
        end_date = last_dt.date()

        logs = []
        current_date = start_date
        day_num = 1

        while current_date <= end_date:
            day_start = datetime.combine(current_date, datetime.min.time(), tzinfo=timezone.utc)
            day_end = day_start + timedelta(days=1)
            entries = []
            miles_today = 0.0

            for ev in self.state.events:
                # Skip events outside this day
                if ev.end_dt <= day_start or ev.start_dt >= day_end:
                    continue

                # Clip to day boundaries
                clipped_start = max(ev.start_dt, day_start)
                clipped_end = min(ev.end_dt, day_end)
                start_hour = (clipped_start - day_start).total_seconds() / 3600
                end_hour = (clipped_end - day_start).total_seconds() / 3600

                if end_hour - start_hour < 0.001:
                    continue

                entries.append({
                    'status': ev.status,
                    'start_time': round(start_hour, 4),
                    'end_time': round(end_hour, 4),
                    'location': ev.location,
                    'remarks': ev.remarks,
                })

            # Fill gaps with off-duty (start/end of day)
            entries = self._fill_day_gaps(entries)

            # Calculate totals
            totals = {'off_duty': 0, 'sleeper': 0, 'driving': 0, 'on_duty': 0}
            for e in entries:
                dur = e['end_time'] - e['start_time']
                totals[e['status']] = totals.get(e['status'], 0) + dur

            # Calculate miles driven today
            for ev in self.state.events:
                if ev.status != 'driving':
                    continue
                if ev.end_dt <= day_start or ev.start_dt >= day_end:
                    continue
                clipped_start = max(ev.start_dt, day_start)
                clipped_end = min(ev.end_dt, day_end)
                drive_hours = (clipped_end - clipped_start).total_seconds() / 3600
                miles_today += drive_hours * AVG_SPEED_MPH

            # Determine from/to locations for this day
            day_events = [e for e in self.state.events
                          if not (e.end_dt <= day_start or e.start_dt >= day_end)]
            from_loc = day_events[0].location if day_events else ''
            to_loc = day_events[-1].location if day_events else ''

            logs.append({
                'date': current_date,
                'day_number': day_num,
                'entries': entries,
                'total_miles_driving': round(miles_today, 1),
                'total_hours_driving': round(totals.get('driving', 0), 2),
                'total_hours_on_duty': round(totals.get('on_duty', 0), 2),
                'total_hours_off_duty': round(totals.get('off_duty', 0), 2),
                'total_hours_sleeper': round(totals.get('sleeper', 0), 2),
                'from_location': from_loc,
                'to_location': to_loc,
            })

            current_date += timedelta(days=1)
            day_num += 1

        return logs

    # ── Private Helpers ────────────────────────────────────────

    def _add_driving(self, hours, miles, start_pos, end_pos):
        """Record a driving period and update all counters."""
        start_dt = self.state.current_time
        end_dt = start_dt + timedelta(hours=hours)

        self.state.events.append(DutyEvent(
            'driving', start_dt, end_dt,
            location=f"Mile {self.state.total_miles:.0f}",
            lat=start_pos[1], lng=start_pos[0],
            remarks='Driving',
        ))

        self.state.current_time = end_dt
        self.state.driving_today += hours
        self.state.hours_since_break += hours
        self.state.cycle_used += hours
        self.state.miles_since_fuel += miles
        self.state.total_miles += miles

    def _add_on_duty_stop(self, stop_type, duration, location, lat, lng, cum_miles, remarks):
        """Record an on-duty (not driving) period with a stop marker."""
        start_dt = self.state.current_time
        end_dt = start_dt + timedelta(hours=duration)

        self.state.events.append(DutyEvent(
            'on_duty', start_dt, end_dt,
            location=location, lat=lat, lng=lng, remarks=remarks,
        ))

        self.state.stops.append(StopEvent(
            stop_type, location, lat, lng,
            start_dt, end_dt, duration, cum_miles,
        ))

        self.state.current_time = end_dt
        self.state.cycle_used += duration

        # On-duty not driving ≥ 30 min resets break counter
        if duration >= BREAK_DURATION_HOURS:
            self.state.reset_break_counter()

    def _add_off_duty(self, hours, location, lat, lng, cum_miles, remarks, stop_type=None):
        """Record an off-duty period and optionally a stop marker."""
        start_dt = self.state.current_time
        end_dt = start_dt + timedelta(hours=hours)

        self.state.events.append(DutyEvent(
            'off_duty', start_dt, end_dt,
            location=location, lat=lat, lng=lng, remarks=remarks,
        ))

        if stop_type:
            self.state.stops.append(StopEvent(
                stop_type, location, lat, lng,
                start_dt, end_dt, hours, cum_miles,
            ))

        self.state.current_time = end_dt

        # Off-duty ≥ 30 min resets break counter
        if hours >= BREAK_DURATION_HOURS:
            self.state.reset_break_counter()

    def _do_pre_trip(self, pos, cum_miles):
        """15-minute pre-trip inspection (on-duty not driving)."""
        self.state.start_duty_window()
        self.state.is_on_duty = True
        loc = f"Mile {self.state.total_miles:.0f}"

        start_dt = self.state.current_time
        end_dt = start_dt + timedelta(hours=PRE_TRIP_DURATION_HOURS)

        self.state.events.append(DutyEvent(
            'on_duty', start_dt, end_dt,
            location=loc, lat=pos[1], lng=pos[0],
            remarks='Pre-trip inspection',
        ))

        self.state.current_time = end_dt
        self.state.cycle_used += PRE_TRIP_DURATION_HOURS

    def _do_post_trip(self, pos, cum_miles):
        """15-minute post-trip inspection (on-duty not driving)."""
        loc = f"Mile {self.state.total_miles:.0f}"

        start_dt = self.state.current_time
        end_dt = start_dt + timedelta(hours=POST_TRIP_DURATION_HOURS)

        self.state.events.append(DutyEvent(
            'on_duty', start_dt, end_dt,
            location=loc, lat=pos[1], lng=pos[0],
            remarks='Post-trip inspection',
        ))

        self.state.current_time = end_dt
        self.state.cycle_used += POST_TRIP_DURATION_HOURS

    def _do_break(self, pos, cum_miles):
        """30-minute break (off-duty) — resets 8-hour driving counter."""
        loc = f"Mile {self.state.total_miles:.0f}"
        self._add_off_duty(
            BREAK_DURATION_HOURS, loc, pos[1], pos[0], cum_miles,
            '30-min break (HOS)', stop_type='break',
        )

    def _do_fuel_stop(self, pos, cum_miles):
        """30-minute fuel stop (on-duty not driving)."""
        loc = f"Mile {self.state.total_miles:.0f}"
        self._add_on_duty_stop(
            'fuel', FUEL_STOP_DURATION_HOURS, loc,
            pos[1], pos[0], cum_miles, 'Fueling',
        )
        self.state.miles_since_fuel = 0.0

    def _do_daily_rest(self, pos, cum_miles):
        """10-hour off-duty rest period — resets daily driving limits."""
        # Post-trip before rest (if still on duty)
        if self.state.is_on_duty:
            self._do_post_trip(pos, cum_miles)

        loc = f"Mile {self.state.total_miles:.0f}"
        self._add_off_duty(
            OFF_DUTY_REQUIRED_HOURS, loc, pos[1], pos[0], cum_miles,
            '10-hr off-duty rest', stop_type='rest',
        )
        self.state.reset_daily()

    def _do_restart(self, pos, cum_miles):
        """34-hour restart — resets the 70-hour cycle clock."""
        if self.state.is_on_duty:
            self._do_post_trip(pos, cum_miles)

        loc = f"Mile {self.state.total_miles:.0f}"
        self._add_off_duty(
            RESTART_DURATION_HOURS, loc, pos[1], pos[0], cum_miles,
            '34-hr restart (cycle reset)', stop_type='rest',
        )
        self.state.reset_daily()
        self.state.cycle_used = 0.0

    def _ensure_on_duty(self, lat, lng, cum_miles):
        """Ensure driver is on-duty; start window + pre-trip if needed."""
        if not self.state.is_on_duty:
            self._do_pre_trip((lng, lat), cum_miles)

    def _fill_day_gaps(self, entries):
        """Fill gaps at start/end of day with off-duty status."""
        if not entries:
            return [{'status': 'off_duty', 'start_time': 0.0, 'end_time': 24.0,
                      'location': '', 'remarks': ''}]

        filled = []
        # Gap at start of day
        if entries[0]['start_time'] > 0.01:
            filled.append({
                'status': 'off_duty', 'start_time': 0.0,
                'end_time': entries[0]['start_time'],
                'location': '', 'remarks': '',
            })

        for i, entry in enumerate(entries):
            filled.append(entry)
            # Gap between entries
            if i < len(entries) - 1:
                gap = entries[i + 1]['start_time'] - entry['end_time']
                if gap > 0.01:
                    filled.append({
                        'status': 'off_duty',
                        'start_time': entry['end_time'],
                        'end_time': entries[i + 1]['start_time'],
                        'location': '', 'remarks': '',
                    })

        # Gap at end of day
        if entries[-1]['end_time'] < 23.99:
            filled.append({
                'status': 'off_duty',
                'start_time': entries[-1]['end_time'],
                'end_time': 24.0,
                'location': '', 'remarks': '',
            })

        return filled
