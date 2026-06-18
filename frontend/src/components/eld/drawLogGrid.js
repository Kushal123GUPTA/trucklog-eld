/**
 * FMCSA-Compliant RODS (Record of Duty Status) Daily Log Renderer
 *
 * Draws a pixel-perfect U.S. DOT DRIVER'S DAILY LOG form on
 * HTML5 Canvas matching the official FMCSA Form §395.8.
 *
 * Required fields per FMCSA regulations:
 *   - Date (Month/Day/Year)
 *   - Total miles driving today
 *   - Vehicle numbers (show each unit)
 *   - Name of carrier or carriers
 *   - Main office address
 *   - Driver's signature / certification
 *   - Name of co-driver
 *   - 24-hour graph grid (Off Duty, Sleeper Berth, Driving, On Duty)
 *   - Total hours per status row
 *   - Remarks with location annotations
 *   - Pro or Shipping No.
 */

// ── Canvas & Form Layout ──────────────────────────────────────
const CW = 1200;
const CH = 760;
const DPR = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

// Form border inset
const FX = 18;
const FY = 18;
const FW = CW - 36;
const FR = FX + FW;
const FB = CH - 18;
const FH = FB - FY;

// Grid column boundaries
const LABEL_W = 108;
const TOTALS_W = 62;
const GX = FX + LABEL_W;       // Grid left
const GR = FR - TOTALS_W;      // Grid right
const GW = GR - GX;            // Grid width
const HW = GW / 24;            // 1-hour column width

// Section Y positions (top-down accumulation)
const S = {};
S.hdrT = FY;         S.hdrH = 38;
S.dateT = FY + 38;   S.dateH = 50;
S.fromToT = FY + 88; S.fromToH = 30;
S.carT = FY + 118;   S.carH = 42;
S.adrT = FY + 160;   S.adrH = 30;
S.ghT  = FY + 190;   S.ghH  = 20;   // grid hour labels top
S.grT  = FY + 210;   S.rowH = 46;   // grid top, row height
S.grH  = S.rowH * 4;                 // grid total height
S.grB  = S.grT + S.grH;              // grid bottom
S.gbT  = S.grB;      S.gbH  = 20;   // grid hour labels bottom
S.rmT  = S.grB + 20;                 // remarks top
S.rmH  = FB - S.rmT;                 // remarks height

// Colors
const C = {
  bg: '#FFFFFF', black: '#000000', dark: '#1a1a1a',
  gray: '#555555', light: '#888888', rule: '#AAAAAA',
  line: '#333333', blue: '#2563EB',
};

// ── Main Export ───────────────────────────────────────────────
export default function drawLogGrid(canvas, logData, tripInfo = {}, options = {}) {
  if (!canvas || !logData) return;
  canvas.width = CW * DPR;
  canvas.height = CH * DPR;
  canvas.style.width = `${CW}px`;
  canvas.style.height = `${CH}px`;
  const ctx = canvas.getContext('2d');
  ctx.scale(DPR, DPR);
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, CW, CH);

  drawFormBorder(ctx);
  drawHeaderBanner(ctx);
  drawDateMilesVehicle(ctx, logData, tripInfo, options);
  drawFromTo(ctx, logData, tripInfo, options);
  drawCarrierSignature(ctx, logData, tripInfo, options);
  drawAddressCoDriver(ctx, tripInfo, options);
  drawHourLabels(ctx, S.ghT + S.ghH - 4);    // top labels
  drawGrid(ctx);
  drawRowLabels(ctx);
  if (!options.isBlank) {
    drawDutyLines(ctx, logData.entries || []);
    drawTotals(ctx, logData);
  }
  drawHourLabels(ctx, S.gbT + 14);            // bottom labels
  drawRemarksSection(ctx, logData, options);
}


// ── Form Border ───────────────────────────────────────────────
function drawFormBorder(ctx) {
  ctx.strokeStyle = C.black;
  ctx.lineWidth = 2;
  ctx.strokeRect(FX, FY, FW, FH);
}


// ── 1. Header Banner ──────────────────────────────────────────
function drawHeaderBanner(ctx) {
  const y = S.hdrT;
  const b = y + S.hdrH;
  hLine(ctx, FX, FR, b);

  // Left: U.S. DEPARTMENT OF TRANSPORTATION
  ctx.font = '9px "Times New Roman", serif';
  ctx.fillStyle = C.dark;
  ctx.textAlign = 'left';
  ctx.fillText('U.S. DEPARTMENT OF TRANSPORTATION', FX + 10, y + 14);

  // Center: DRIVER'S DAILY LOG
  ctx.font = 'bold 14px "Times New Roman", serif';
  ctx.textAlign = 'center';
  ctx.fillText("DRIVER'S DAILY LOG", CW / 2, y + 16);
  ctx.font = '9px "Times New Roman", serif';
  ctx.fillText('(ONE CALENDAR DAY — 24 HOURS)', CW / 2, y + 28);

  // Right: ORIGINAL / DUPLICATE
  ctx.font = '7.5px "Times New Roman", serif';
  ctx.textAlign = 'right';
  ctx.fillText('ORIGINAL — Submit to carrier within 13 days', FR - 10, y + 14);
  ctx.fillText('DUPLICATE — Driver retains possession for eight days', FR - 10, y + 26);
}


// ── 2. Date / Total Miles / Vehicle Numbers ───────────────────
function drawDateMilesVehicle(ctx, log, trip, options) {
  const y = S.dateT;
  const b = y + S.dateH;
  hLine(ctx, FX, FR, b);

  // Divide into 4 columns
  const c1 = FX + FW * 0.30;
  const c2 = FX + FW * 0.45;
  const c3 = FX + FW * 0.60;
  vLine(ctx, c1, y, b);
  vLine(ctx, c2, y, b);
  vLine(ctx, c3, y, b);

  if (!options.isBlank) {
    // Parse date
    const parts = parseDateParts(log.date);

    // -- Column 1: Date (MONTH) (DAY) (YEAR)
    ctx.textAlign = 'left';
    ctx.font = 'bold 18px "Times New Roman", serif';
    ctx.fillStyle = C.dark;
    ctx.fillText(`${parts.month}    ${parts.day}    ${parts.year}`, FX + 14, y + 26);
  }
  ctx.textAlign = 'left';
  ctx.font = '8px "Times New Roman", serif';
  ctx.fillStyle = C.gray;
  ctx.fillText('(MONTH)        (DAY)        (YEAR)', FX + 14, y + 40);

  if (!options.isBlank) {
    // -- Column 2: Total Miles Driving Today
    const miles = Math.round(log.total_miles_driving || 0);
    ctx.textAlign = 'center';
    ctx.font = 'bold 18px "Times New Roman", serif';
    ctx.fillStyle = C.dark;
    ctx.fillText(`${miles}`, (c1 + c2) / 2, y + 26);
  }
  ctx.textAlign = 'center';
  ctx.font = '8px "Times New Roman", serif';
  ctx.fillStyle = C.gray;
  ctx.fillText('(TOTAL MILES DRIVING)', (c1 + c2) / 2, y + 40);

  if (!options.isBlank) {
    // -- Column 3: Total Mileage Today
    const totalMileage = trip.totalMileage || '';
    ctx.textAlign = 'center';
    ctx.font = 'bold 18px "Times New Roman", serif';
    ctx.fillStyle = C.dark;
    ctx.fillText(`${totalMileage}`, (c2 + c3) / 2, y + 26);
  }
  ctx.textAlign = 'center';
  ctx.font = '8px "Times New Roman", serif';
  ctx.fillStyle = C.gray;
  ctx.fillText('(TOTAL MILEAGE TODAY)', (c2 + c3) / 2, y + 40);

  if (!options.isBlank) {
    // -- Column 4: Vehicle Numbers
    const vehicleNums = trip.vehicleNumbers || 'TL-1024, TR-5587';
    ctx.textAlign = 'center';
    ctx.font = 'bold 14px "Times New Roman", serif';
    ctx.fillStyle = C.dark;
    ctx.fillText(vehicleNums, (c3 + FR) / 2, y + 22);
  }
  ctx.textAlign = 'center';
  ctx.font = '8px "Times New Roman", serif';
  ctx.fillStyle = C.gray;
  ctx.fillText('VEHICLE NUMBERS—(SHOW EACH UNIT)', (c3 + FR) / 2, y + 40);
}

// ── 2.5. From and To Locations ──────────────────────────────────
function drawFromTo(ctx, log, trip, options) {
  const y = S.fromToT;
  const b = y + S.fromToH;
  hLine(ctx, FX, FR, b);

  // Divide into 2 columns
  const c1 = FX + FW * 0.50;
  vLine(ctx, c1, y, b);

  // -- Left: From
  const fromLocation = trip.fromLocation || '';
  if (!options.isBlank) {
    ctx.textAlign = 'left';
    ctx.font = 'bold 14px "Times New Roman", serif';
    ctx.fillStyle = C.dark;
    ctx.fillText(fromLocation, FX + 14, y + 16);
  }
  hLine(ctx, FX + 10, c1 - 10, y + 19, 0.5);
  ctx.textAlign = 'left';
  ctx.font = '8px "Times New Roman", serif';
  ctx.fillStyle = C.gray;
  ctx.fillText('(FROM / STARTING POINT)', FX + 14, y + 28);

  // -- Right: To
  const toLocation = trip.toLocation || '';
  if (!options.isBlank) {
    ctx.textAlign = 'left';
    ctx.font = 'bold 14px "Times New Roman", serif';
    ctx.fillStyle = C.dark;
    ctx.fillText(toLocation, c1 + 14, y + 16);
  }
  hLine(ctx, c1 + 10, FR - 10, y + 19, 0.5);
  ctx.textAlign = 'left';
  ctx.font = '8px "Times New Roman", serif';
  ctx.fillStyle = C.gray;
  ctx.fillText('(TO / DESTINATION)', c1 + 14, y + 28);
}


// ── 3. Carrier / Certification / Signature ────────────────────
function drawCarrierSignature(ctx, log, trip, options) {
  const y = S.carT;
  const b = y + S.carH;
  hLine(ctx, FX, FR, b);

  // Certification text (center)
  ctx.font = '8px "Times New Roman", serif';
  ctx.fillStyle = C.gray;
  ctx.textAlign = 'center';
  ctx.fillText('I certify that these entries are true and correct', CW / 2, y + 8);

  // Divider between carrier and signature
  const mid = FX + FW * 0.52;
  vLine(ctx, mid, y + 12, b);

  // -- Left: Name of Carrier
  const carrier = trip.carrier || 'TruckLog ELD Transport';
  ctx.textAlign = 'left';
  ctx.font = 'bold italic 16px "Times New Roman", serif';
  ctx.fillStyle = C.dark;
  ctx.fillText(carrier, FX + 14, y + 28);
  // Underline
  hLine(ctx, FX + 10, mid - 10, y + 31, 0.5);
  ctx.font = '8px "Times New Roman", serif';
  ctx.fillStyle = C.gray;
  ctx.fillText('(NAME OF CARRIER OR CARRIERS)', FX + 14, y + 40);

  if (!options.isBlank) {
    // -- Right: Driver's Signature
    const driverName = trip.driverName || 'Property-Carrying Driver';
    ctx.textAlign = 'left';
    ctx.font = 'bold italic 16px "Times New Roman", serif';
    ctx.fillStyle = C.dark;
    ctx.fillText(driverName, mid + 14, y + 28);
  }
  hLine(ctx, mid + 10, FR - 10, y + 31, 0.5);
  ctx.font = '8px "Times New Roman", serif';
  ctx.fillStyle = C.gray;
  ctx.fillText("(DRIVER'S SIGNATURE IN FULL)", mid + 14, y + 40);
}


// ── 4. Address / Co-Driver / Total Hours Label ────────────────
function drawAddressCoDriver(ctx, trip, options) {
  const y = S.adrT;
  const b = y + S.adrH;
  hLine(ctx, FX, FR, b);

  // 3 sections
  const c1 = FX + FW * 0.38;
  const c2 = GR;
  vLine(ctx, c1, y, b);
  vLine(ctx, c2, y, b);

  // -- Left: Main Office Address
  const address = trip.mainOfficeAddress || 'Chicago, IL';
  ctx.textAlign = 'left';
  ctx.font = 'bold italic 13px "Times New Roman", serif';
  ctx.fillStyle = C.dark;
  ctx.fillText(address, FX + 14, y + 14);
  hLine(ctx, FX + 10, c1 - 10, y + 17, 0.5);
  ctx.font = '8px "Times New Roman", serif';
  ctx.fillStyle = C.gray;
  ctx.fillText('(MAIN OFFICE ADDRESS)', FX + 14, y + 27);

  if (!options.isBlank) {
    // -- Center: Co-Driver
    const coDriver = trip.coDriverName || '—';
    ctx.textAlign = 'center';
    ctx.font = 'bold 13px "Times New Roman", serif';
    ctx.fillStyle = C.dark;
    ctx.fillText(coDriver, (c1 + c2) / 2, y + 14);
  }
  hLine(ctx, c1 + 10, c2 - 10, y + 17, 0.5);
  ctx.font = '8px "Times New Roman", serif';
  ctx.fillStyle = C.gray;
  ctx.fillText('(NAME OF CO_DRIVER)', (c1 + c2) / 2, y + 27);

  // -- Right: TOTAL HOURS heading
  ctx.textAlign = 'center';
  ctx.font = 'bold 9px Arial, sans-serif';
  ctx.fillStyle = C.dark;
  ctx.fillText('TOTAL', (c2 + FR) / 2, y + 12);
  ctx.fillText('HOURS', (c2 + FR) / 2, y + 23);
}


// ── 5. Hour Labels (top & bottom of grid) ─────────────────────
function drawHourLabels(ctx, baseY) {
  ctx.font = '9px Arial, sans-serif';
  ctx.fillStyle = C.dark;
  ctx.textAlign = 'center';
  for (let h = 0; h <= 24; h++) {
    const x = GX + h * HW;
    let label;
    if (h === 0 || h === 24) label = 'Midnight';
    else if (h === 12) label = 'Noon';
    else label = String(h);
    ctx.fillText(label, x, baseY);
  }
}


// ── 6. Graph Grid ─────────────────────────────────────────────
function drawGrid(ctx) {
  const gT = S.grT;
  const gB = S.grB;
  const rH = S.rowH;

  // Outer border of grid + totals
  ctx.strokeStyle = C.black;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(GX, gT, GR - GX + TOTALS_W, S.grH);

  // Row dividers
  for (let r = 1; r < 4; r++) {
    hLine(ctx, GX, FR, gT + r * rH, 1);
  }

  // Vertical divider between grid and totals
  vLine(ctx, GR, gT, gB, 1.5);

  // Hour lines (full height)
  for (let h = 0; h <= 24; h++) {
    const x = GX + h * HW;
    const isMajor = h === 0 || h === 12 || h === 24;
    ctx.strokeStyle = isMajor ? C.line : C.rule;
    ctx.lineWidth = isMajor ? 1.2 : 0.8;
    ctx.beginPath();
    ctx.moveTo(x, gT);
    ctx.lineTo(x, gB);
    ctx.stroke();
  }

  // 15-minute tick marks inside each row
  ctx.strokeStyle = C.rule;
  ctx.lineWidth = 0.5;
  for (let h = 0; h < 24; h++) {
    for (let q = 1; q <= 3; q++) {
      const x = GX + h * HW + q * (HW / 4);
      ctx.beginPath();
      for (let r = 0; r < 4; r++) {
        const rowTop = gT + r * rH;
        const len = q === 2 ? rH * 0.6 : rH * 0.3;
        const ty = rowTop + (rH - len) / 2;
        ctx.moveTo(x, ty);
        ctx.lineTo(x, ty + len);
      }
      ctx.stroke();
    }
  }
}


// ── 7. Row Labels ─────────────────────────────────────────────
function drawRowLabels(ctx) {
  const labels = [
    ['Off', 'Duty'],
    ['Sleeper', 'Berth'],
    ['Driving', ''],
    ['On Duty', '(Not', 'Driving)'],
  ];
  ctx.textAlign = 'right';
  ctx.fillStyle = C.dark;

  labels.forEach((lines, i) => {
    const cy = S.grT + i * S.rowH + S.rowH / 2;
    const total = lines.filter(Boolean).length;
    const startY = cy - (total - 1) * 5;
    lines.forEach((line, li) => {
      if (!line) return;
      ctx.font = li === 0 ? 'bold 9px Arial, sans-serif' : '8px Arial, sans-serif';
      ctx.fillText(line, GX - 6, startY + li * 11);
    });
  });
}


// ── 8. Duty Status Lines ──────────────────────────────────────
function drawDutyLines(ctx, entries) {
  if (!entries || entries.length === 0) return;
  const sorted = [...entries].sort((a, b) => a.start_time - b.start_time);
  const rowMap = { off_duty: 0, sleeper: 1, driving: 2, on_duty: 3 };

  ctx.strokeStyle = C.blue;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'square';
  ctx.lineJoin = 'miter';
  ctx.beginPath();

  sorted.forEach((entry, idx) => {
    const row = rowMap[entry.status];
    if (row === undefined) return;
    const y = S.grT + row * S.rowH + S.rowH / 2;
    const x1 = GX + (entry.start_time / 24) * GW;
    const x2 = GX + (entry.end_time / 24) * GW;
    if (idx === 0) ctx.moveTo(x1, y);
    else ctx.lineTo(x1, y);
    ctx.lineTo(x2, y);
  });
  ctx.stroke();
}


// ── 9. Total Hours ────────────────────────────────────────────
function drawTotals(ctx, log) {
  const vals = [
    log.total_hours_off_duty || 0,
    log.total_hours_sleeper  || 0,
    log.total_hours_driving  || 0,
    log.total_hours_on_duty  || 0,
  ];
  const cx = GR + TOTALS_W / 2;

  vals.forEach((v, i) => {
    const y = S.grT + i * S.rowH + S.rowH / 2 + 5;
    ctx.textAlign = 'center';
    ctx.font = 'bold 14px Arial, sans-serif';
    ctx.fillStyle = C.dark;
    ctx.fillText(v.toFixed(2), cx, y);
  });

  // Grand total below grid
  const total = vals.reduce((a, b) => a + b, 0);
  ctx.font = 'bold 13px Arial, sans-serif';
  ctx.fillStyle = C.dark;
  ctx.textAlign = 'right';
  ctx.fillText(`=${total.toFixed(0)}`, FR - 8, S.grB + 16);
}


// ── 10. Remarks Section ───────────────────────────────────────
function drawRemarksSection(ctx, log, options) {
  const y = S.rmT;
  const b = FB;

  // Border
  ctx.strokeStyle = C.black;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(FX, y, FW, b - y);

  // "REMARKS" label
  ctx.font = 'bold 10px Arial, sans-serif';
  ctx.fillStyle = C.dark;
  ctx.textAlign = 'left';
  ctx.fillText('REMARKS', FX + 6, y + 14);

  // Hour column guide lines extending into remarks
  ctx.strokeStyle = '#DDDDDD';
  ctx.lineWidth = 0.3;
  for (let h = 0; h <= 24; h++) {
    const x = GX + h * HW;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + 20);
    ctx.stroke();
  }

  // Horizontal ruled lines for writing
  ctx.strokeStyle = C.rule;
  ctx.lineWidth = 0.4;
  const lineStart = y + 22;
  const lineGap = 18;
  const numLines = Math.floor((b - lineStart - 50) / lineGap);
  for (let i = 0; i < numLines; i++) {
    const ly = lineStart + i * lineGap;
    hLine(ctx, FX + 6, FR - 6, ly, 0.4);
  }

  // Draw location annotations (diagonal text at status change points)
  if (!options.isBlank) {
    drawLocationAnnotations(ctx, log.entries || [], y + 22);
  }

  // Pro or Shipping No. at bottom
  const shipY = b - 30;
  hLine(ctx, FX + 6, FR - 6, shipY, 0.5);
  ctx.font = '8px "Times New Roman", serif';
  ctx.fillStyle = C.gray;
  ctx.textAlign = 'left';
  ctx.fillText('Pro or Shipping No.', FX + 10, shipY + 14);

  // Shipping number value
  ctx.font = 'bold 12px "Times New Roman", serif';
  ctx.fillStyle = C.dark;
  ctx.fillText('—', FX + 120, shipY + 14);
}


// ── Location Annotations (diagonal text in remarks) ───────────
function drawLocationAnnotations(ctx, entries, baseY) {
  if (!entries || entries.length === 0) return;
  const sorted = [...entries].sort((a, b) => a.start_time - b.start_time);

  ctx.font = 'bold 11px Arial, sans-serif';
  ctx.fillStyle = C.dark;

  // Track drawn positions to avoid overlaps
  const drawn = [];

  sorted.forEach((entry) => {
    const loc = entry.location || entry.remarks || '';
    if (!loc.trim()) return;
    const shortLoc = loc.length > 30 ? loc.slice(0, 27) + '...' : loc;
    const x = GX + (entry.start_time / 24) * GW;

    // Avoid drawing too close to previous annotation
    if (drawn.length > 0 && Math.abs(x - drawn[drawn.length - 1]) < 45) return;
    drawn.push(x);

    // Draw a small vertical drop-line from the grid to the text
    ctx.strokeStyle = C.black;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, baseY - 20); // from just below the grid
    ctx.lineTo(x, baseY + 5);
    ctx.stroke();

    ctx.save();
    // Translate to the end of the drop-line, shifted slightly right
    ctx.translate(x + 4, baseY + 8);
    // Rotate 65 degrees downwards (positive rotation)
    ctx.rotate(Math.PI / 2.8); 
    ctx.fillText(shortLoc, 0, 0);
    ctx.restore();
  });
}


// ── Drawing Helpers ───────────────────────────────────────────
function hLine(ctx, x1, x2, y, w = 1) {
  ctx.strokeStyle = C.line;
  ctx.lineWidth = w;
  ctx.beginPath();
  ctx.moveTo(x1, y + 0.5);
  ctx.lineTo(x2, y + 0.5);
  ctx.stroke();
}

function vLine(ctx, x, y1, y2, w = 1) {
  ctx.strokeStyle = C.line;
  ctx.lineWidth = w;
  ctx.beginPath();
  ctx.moveTo(x + 0.5, y1);
  ctx.lineTo(x + 0.5, y2);
  ctx.stroke();
}

function parseDateParts(dateStr) {
  if (!dateStr) return { month: '--', day: '--', year: '----' };
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return {
      month: String(d.getMonth() + 1).padStart(2, '0'),
      day: String(d.getDate()).padStart(2, '0'),
      year: String(d.getFullYear()),
    };
  } catch {
    return { month: '--', day: '--', year: '----' };
  }
}
