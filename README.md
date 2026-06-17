# 🚛 TruckLog ELD — Trip Planner & Electronic Logging Device

A full-stack application that takes trip details as inputs and generates FMCSA-compliant route instructions with ELD daily log sheets.

## 🎯 Features

- **Trip Planning** — Enter current location, pickup, dropoff & cycle hours
- **Route Mapping** — Interactive map showing route with all stops (fuel, rest, breaks)
- **ELD Log Sheets** — Auto-generated, FMCSA-compliant daily driver log sheets (drawn on canvas)
- **HOS Compliance** — Full Hours of Service rules engine (property-carrying, 70hr/8day)

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Styling | Vanilla CSS (custom design system) |
| Map | Leaflet + React-Leaflet |
| ELD Drawing | HTML5 Canvas |
| Backend | Django 5 + Django REST Framework |
| Routing API | OpenRouteService (free tier) |
| Database | SQLite (dev) / PostgreSQL (prod) |
| Deploy (FE) | Vercel |
| Deploy (BE) | Render |

## 📁 Project Structure

```
Truck Log App/
├── README.md
├── backend/                        # Django REST API
│   ├── manage.py
│   ├── requirements.txt
│   ├── Procfile
│   ├── .env.example
│   ├── config/                     # Django project configuration
│   │   ├── settings/
│   │   │   ├── base.py             # Shared settings
│   │   │   ├── development.py      # Dev overrides
│   │   │   └── production.py       # Prod overrides
│   │   ├── urls.py
│   │   ├── wsgi.py
│   │   └── asgi.py
│   └── trips/                      # Main Django app
│       ├── models.py               # Trip, TripStop, DailyLog, DutyStatusEntry
│       ├── serializers.py          # DRF serializers
│       ├── views.py                # API views
│       ├── urls.py                 # App URL routing
│       ├── admin.py                # Admin panel config
│       └── services/               # Business logic layer
│           ├── routing.py          # OpenRouteService directions
│           ├── geocoding.py        # Address → coordinates
│           └── hos_engine.py       # HOS rules engine & trip planner
│
└── frontend/                       # React + Vite SPA
    ├── index.html
    ├── vite.config.js
    ├── package.json
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── index.css               # Design system & global styles
        ├── api/                    # API client layer
        │   └── tripApi.js
        ├── components/
        │   ├── layout/             # App shell components
        │   │   ├── Header.jsx
        │   │   └── Footer.jsx
        │   ├── trip/               # Trip input & results
        │   │   ├── TripForm.jsx
        │   │   ├── TripSummary.jsx
        │   │   └── StopTimeline.jsx
        │   ├── map/                # Map visualization
        │   │   └── RouteMap.jsx
        │   └── eld/                # ELD log sheet rendering
        │       ├── DailyLogSheet.jsx
        │       └── LogSheetGrid.jsx
        ├── hooks/                  # Custom React hooks
        │   └── useTrip.js
        └── utils/                  # Shared utilities
            └── constants.js
```

---

## 📋 Implementation Plan

### FMCSA HOS Rules (Property-Carrying Driver, 70hr/8day)

| Rule | Limit | Description |
|------|-------|-------------|
| 11-Hour Driving | 11 hrs max | Max driving after 10 consecutive hrs off duty |
| 14-Hour Window | 14 hrs | Cannot drive beyond 14th hour after coming on duty |
| 30-Minute Break | After 8 hrs driving | Must take 30-min break after 8 cumulative hrs of driving |
| 10-Hour Off-Duty | 10 hrs | Required rest between duty periods |
| 70-Hour/8-Day | 70 hrs cumulative | Cannot drive after 70 hrs on-duty in rolling 8 days |
| 34-Hour Restart | 34 hrs | Optional full reset of 70-hour clock |

### Assumptions
- Property-carrying driver
- 70-hour/8-day cycle
- No adverse driving conditions
- Fueling at least once every 1,000 miles
- 1 hour for pickup and drop-off (on-duty not driving)
- Average truck speed: 55 mph
- Pre-trip inspection: 15 minutes
- Post-trip inspection: 15 minutes
- Fuel stop duration: 30 minutes

### Core Algorithm Flow

```
1. Geocode all locations → coordinates
2. Get route: current → pickup → dropoff (via OpenRouteService HGV profile)
3. Simulate driver journey:
   a. Start day → pre-trip inspection (15 min on-duty)
   b. Drive until a constraint is hit:
      - 8 hrs driving → 30-min break
      - 11 hrs driving → must stop
      - 14 hrs on-duty window → must stop
      - 1,000 miles → fuel stop (30 min)
      - 70-hr cycle limit → 34-hr restart
   c. At end of driving day → post-trip (15 min), then 10-hr off-duty
   d. Repeat until destination reached
4. At pickup: 1 hr on-duty not driving
5. At dropoff: 1 hr on-duty not driving
6. Generate daily log entries from simulation
7. Render log sheets on canvas
```

### ELD Daily Log Sheet Grid

```
4 duty status rows × 24 hour columns (with 15-min subdivisions):
Row 1: Off Duty
Row 2: Sleeper Berth
Row 3: Driving
Row 4: On Duty (Not Driving)

Drawing: horizontal lines in active row, vertical lines for status transitions
```

### Execution Phases

- **Phase 1**: Project setup, folder structure, Django models, React scaffold, design system
- **Phase 2**: HOS engine, trip planning algorithm, API endpoints
- **Phase 3**: Frontend — trip form, map integration, route display
- **Phase 4**: ELD log sheet canvas rendering, PDF export
- **Phase 5**: Polish, animations, responsive design, deployment

---

## 🚀 Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+
- OpenRouteService API key (free at https://openrouteservice.org)

### Backend Setup
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### Environment Variables
Copy `.env.example` to `.env` and fill in:
```
ORS_API_KEY=your_openrouteservice_api_key
SECRET_KEY=your_django_secret_key
DEBUG=True
```

---

## 📄 License
MIT
