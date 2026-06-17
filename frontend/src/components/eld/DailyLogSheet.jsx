/**
 * DailyLogSheet Component
 *
 * Renders a single FMCSA-compliant ELD daily log sheet using
 * HTML5 Canvas. The canvas is drawn by drawLogGrid.js — this
 * component handles:
 *
 *   - Canvas ref management
 *   - Responsive scaling
 *   - Re-drawing on data change
 *   - Download button for individual log images
 */

import { useEffect, useRef, useCallback } from 'react';
import drawLogGrid from './drawLogGrid';

export default function DailyLogSheet({ logData, dayNumber, tripInfo }) {
  const canvasRef = useRef(null);

  // Draw the log grid whenever data changes
  useEffect(() => {
    if (!canvasRef.current || !logData) return;
    drawLogGrid(canvasRef.current, logData, tripInfo || {});
  }, [logData, tripInfo]);

  // Download as PNG
  const handleDownload = useCallback(() => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `eld-log-day-${dayNumber}-${logData.date}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  }, [dayNumber, logData]);

  if (!logData) return null;

  return (
    <div className="eld-log-wrapper" id={`eld-log-day-${dayNumber}`}>
      {/* Log info bar */}
      <div className="eld-log-header">
        <div className="eld-log-header__title">
          <span className="eld-log-header__day">Day {dayNumber}</span>
          <span className="eld-log-header__date">{formatShortDate(logData.date)}</span>
        </div>

        <div className="eld-log-header__actions">
          <button
            className="eld-log-header__btn"
            onClick={handleDownload}
            title="Download as PNG"
          >
            📥 Download
          </button>
        </div>
      </div>

      {/* Canvas container */}
      <div className="eld-log-canvas-wrap">
        <canvas
          ref={canvasRef}
          className="eld-log-canvas"
        />
      </div>
    </div>
  );
}

function formatShortDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}
