# 🚛 TruckLog ELD — Trip Planner & Electronic Logging Device

## 📖 Project Overview
TruckLog ELD is a comprehensive full-stack application designed specifically for the trucking industry. It takes trip details—including the driver's current location, pickup point, drop-off destination, and available cycle hours—and intelligently generates FMCSA-compliant route instructions along with beautifully rendered Electronic Logging Device (ELD) daily log sheets. 

It simulates a real driver's journey, taking into account distance, speed, and mandatory rest periods to output a fully compliant, step-by-step itinerary and the corresponding visual log sheets.

## 🎯 How It Is Useful to Truckers
Truck drivers face strict regulations under the Federal Motor Carrier Safety Administration (FMCSA) Hours of Service (HOS) rules. Violations can lead to heavy fines, out-of-service orders, or even losing their Commercial Driver's License (CDL). TruckLog ELD solves these challenges by providing:

1. **Automated HOS Compliance**: The application automatically calculates the complex 70-hour/8-day property-carrying rules. It knows exactly when a driver must take a 30-minute break (after 8 hours of driving), when they hit their 11-hour daily driving limit, and when the 14-hour on-duty window closes.
2. **Precision Trip Planning**: Drivers no longer need to guess where they should stop for fuel or rest. The app maps out the exact route and strategically places 30-minute fuel/rest breaks, 10-hour off-duty sleeps, and 34-hour cycle restarts.
3. **Interactive ELD Log Sheets**: Maintaining paper logs is tedious and prone to human error. TruckLog automatically draws accurate visual log sheets on a standardized 24-hour grid, marking exactly when the driver was "Off Duty," in the "Sleeper Berth," "Driving," or "On Duty (Not Driving)."
4. **Visual Route Mapping**: An interactive map visualizes the entire journey, plotting all the necessary stops, making it incredibly easy for drivers to visualize their day-to-day progress.
5. **Pre/Post-Trip Built-in**: It automatically factors in the required 15-minute pre-trip and post-trip inspections, ensuring no required duty status changes are missed.

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 + Vite |
| **Styling** | Vanilla CSS (Custom modern design system) |
| **Map** | Leaflet + React-Leaflet |
| **ELD Drawing** | HTML5 Canvas |
| **Backend** | Django 5 + Django REST Framework |
| **Routing API** | OpenRouteService (HGV profile) |
| **Database** | SQLite (Dev) / PostgreSQL (Prod) |
| **Deploy (FE)** | Vercel |
| **Deploy (BE)** | Render |

## 🚀 Getting Started

Follow these commands to get the project up and running on your local machine.

### Prerequisites
- **Python 3.11+**
- **Node.js 18+**
- An **OpenRouteService API key** (You can get a free one at [openrouteservice.org](https://openrouteservice.org))

### 1. Backend Setup

Open a terminal and navigate to the backend directory:
```bash
cd backend

# Create a virtual environment
python -m venv venv

# Activate the virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install the Python dependencies
pip install -r requirements.txt

# Run database migrations
python manage.py migrate

# Start the Django development server
python manage.py runserver
```

### 2. Environment Variables

In the `backend` folder, copy the `.env.example` to `.env` and fill in your details:
```
ORS_API_KEY=your_openrouteservice_api_key
SECRET_KEY=your_django_secret_key
DEBUG=True
```

### 3. Frontend Setup

Open a new terminal window and navigate to the frontend directory:
```bash
cd frontend

# Install Node.js dependencies
npm install

# Start the Vite development server
npm run dev
```

Your backend API will be running on `http://localhost:8000` and your frontend application will be accessible at `http://localhost:5173` (or the port specified by Vite).

---

## 📄 License
MIT
