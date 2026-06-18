/**
 * App — Root Component
 *
 * Layout:
 *   - Header (sticky)
 *   - Sidebar: TripForm + TripSummary + StopTimeline
 *   - Main: RouteMap + ELD Log Sheets
 *   - Footer
 */

import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import TripForm from './components/trip/TripForm';
import TripSummary from './components/trip/TripSummary';
import StopTimeline from './components/trip/StopTimeline';
import RouteMap from './components/map/RouteMap';
import DailyLogSheet from './components/eld/DailyLogSheet';
import drawLogGrid from './components/eld/drawLogGrid';
import { useTrip } from './hooks/useTrip';
import { useState } from 'react';

export default function App() {
  const {
    formData,
    updateField,
    tripResult,
    isLoading,
    error,
    submitTrip,
    resetTrip,
  } = useTrip();

  const [activeTab, setActiveTab] = useState('map'); // 'map' or 'eld'

  const hasTrip = tripResult && tripResult.stops;

  const handleDownloadBlankSheet = () => {
    const canvas = document.createElement('canvas');
    drawLogGrid(canvas, {}, {}, { isBlank: true });
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'TruckLog_Blank_ELD_Sheet.png';
    a.click();
  };

  return (
    <>
      <Header />

      <main className="page-content">
        <div className="container">
          {/* Main Layout Grid */}
          <div className={`app-layout ${hasTrip ? 'app-layout--3col' : ''}`}>
            {/* Left Sidebar */}
            <aside className="app-sidebar app-sidebar--left">
              <TripForm
                formData={formData}
                updateField={updateField}
                onSubmit={submitTrip}
                isLoading={isLoading}
              />

              {error && (
                <div className="card animate-fade-in" style={{
                  borderColor: 'var(--color-accent-red)',
                  background: 'var(--color-accent-red-glow)',
                }}>
                  <p style={{ color: 'var(--color-accent-red)', fontSize: 'var(--text-sm)' }}>
                    ⚠️ {error}
                  </p>
                </div>
              )}
            </aside>

            {/* Center Main Content */}
            <section className="app-main">
              {hasTrip && (
                <div className="tabs-container">
                  <div className="tabs-header">
                    <button 
                      className={`tab-btn ${activeTab === 'map' ? 'active' : ''}`}
                      onClick={() => setActiveTab('map')}
                    >
                      🗺️ Route Map
                    </button>
                    <button 
                      className={`tab-btn ${activeTab === 'eld' ? 'active' : ''}`}
                      onClick={() => setActiveTab('eld')}
                    >
                      📋 ELD Log Sheets
                    </button>
                    <button
                      className="tab-btn"
                      style={{ marginLeft: 'auto', flex: '0 0 auto', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                      onClick={handleDownloadBlankSheet}
                      title="Download a blank sheet to print and fill out manually"
                    >
                      📥 Download Blank Sheet
                    </button>
                  </div>
                  
                  <div className="tab-content">
                    {/* Route Map Tab */}
                    <div style={{ display: activeTab === 'map' ? 'block' : 'none' }}>
                      <RouteMap
                        route={tripResult?.route_geometry}
                        stops={tripResult?.stops}
                        isActive={activeTab === 'map'}
                      />
                    </div>

                    {/* ELD Logs Tab */}
                    <div style={{ display: activeTab === 'eld' ? 'block' : 'none' }}>
                      {tripResult?.daily_logs && tripResult.daily_logs.length > 0 ? (
                        <div className="eld-section" id="eld-logs" style={{ padding: '0', marginTop: 'var(--space-4)' }}>
                          <div className="eld-logs-grid">
                            {tripResult.daily_logs.map((log) => (
                              <DailyLogSheet
                                key={log.id}
                                logData={log}
                                dayNumber={log.day_number}
                                tripInfo={{
                                  currentLocation: tripResult.current_location,
                                  pickupLocation: tripResult.pickup_location,
                                  dropoffLocation: tripResult.dropoff_location,
                                  totalDistance: tripResult.total_distance,
                                  fromLocation: tripResult.pickup_location || tripResult.current_location,
                                  toLocation: tripResult.dropoff_location,
                                  totalMileage: tripResult.total_distance ? Math.round(tripResult.total_distance) : '',
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="card" style={{ minHeight: '300px' }}>
                          <div className="empty-state">
                            <div className="empty-state__icon">📋</div>
                            <div className="empty-state__title">ELD Daily Logs</div>
                            <div className="empty-state__description">
                              Your FMCSA-compliant daily log sheets will appear here after planning a trip.
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Empty state when no trip */}
              {!hasTrip && !isLoading && (
                <div className="card" style={{ minHeight: '300px' }}>
                  <div className="empty-state">
                    <div className="empty-state__icon">🗺️</div>
                    <div className="empty-state__title">Plan Your Trip</div>
                    <div className="empty-state__description">
                      Enter trip details on the left to see your route and ELD log sheets.
                    </div>
                    <button 
                      className="btn" 
                      onClick={handleDownloadBlankSheet}
                      style={{ marginTop: 'var(--space-6)', background: 'var(--color-bg-glass)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                    >
                      📥 Download Blank Print Sheet
                    </button>
                  </div>
                </div>
              )}
            </section>

            {/* Right Sidebar (Stats & Timeline) */}
            {hasTrip && (
              <aside className="app-sidebar app-sidebar--right">
                <TripSummary trip={tripResult} />
                <StopTimeline stops={tripResult.stops} />
              </aside>
            )}
          </div>
        </div>
      </main>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner">
            <div className="loading-spinner__ring" />
            <div className="loading-spinner__text">
              Planning your route & generating ELD logs...
            </div>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}
