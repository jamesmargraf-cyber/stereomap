// ── STEREO MAP ENGINE ──
// Delta-based dragging: tracks cursor movement frame-to-frame,
// applies scale correction for SVG viewport vs rendered size.
// Dot moves in exact same direction as cursor at all times.

const MAP_CX = 340, MAP_CY = 430;
const MAP_RADII = [85, 145, 200, 245, 280];

const COLOR_LIST = [
  '#e05050','#1D9E75','#378ADD','#BA7517','#D85A30','#7F77DD',
  '#f06292','#4fc3f7','#aed581','#ffb74d','#ce93d8','#80cbc4'
];

// ── COORDINATE MATH ──
// Angle 90° = 12:00 (top center)
// Angle 180° = 9:00 (left)
// Angle 0° = 3:00 (right)
// x = CX + r*cos(angle), y = CY - r*sin(angle)
// Moving right in SVG → angle decreases → dot goes toward 3:00 ✓

function mapAngleToXY(angleDeg, radius) {
  const rad = angleDeg * Math.PI / 180;
  return {
    x: MAP_CX + radius * Math.cos(rad),
    y: MAP_CY - radius * Math.sin(rad)
  };
}

function mapXYToAngleRadius(x, y) {
  const dx = x - MAP_CX;
  const dy = MAP_CY - y;
  let a = Math.atan2(dy, dx) * 180 / Math.PI;
  a = Math.min(180, Math.max(0, a));
  const dist = Math.sqrt(dx * dx + dy * dy);
  const clamped = Math.min(Math.max(dist, MAP_RADII[0]), MAP_RADII[MAP_RADII.length - 1]);
  const snapped = MAP_RADII.reduce((a, b) =>
    Math.abs(b - clamped) < Math.abs(a - clamped) ? b : a
  );
  return { angle: a, radius: snapped };
}

function mapClockLabel(a) {
  const hour = 9 + ((180 - a) / 180) * 6;
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  return h + ':' + (m === 0 ? '00' : m < 10 ? '0' + m : m);
}

function mapSideLabel(a) {
  if (a < 89) return 'R';
  if (a > 91) return 'L';
  return 'C';
}

function mapLabelOffset(a) {
  if (a < 70)  return { dx: 14,  dy: -4, anchor: 'start'  };
  if (a > 110) return { dx: -14, dy: -4, anchor: 'end'    };
  return { dx: 0, dy: -16, anchor: 'middle' };
}

// ── SVG BASE BUILDER ──
function buildMapBase(svgEl) {
  svgEl.innerHTML = '';

  // Concentric arc bands
  const radii = [280, 245, 200, 145, 85];
  radii.forEach((r, i) => {
    const opacity = 0.06 + i * 0.035;
    const fill = makeSVG('path');
    fill.setAttribute('d', `M ${MAP_CX - r} ${MAP_CY} A ${r} ${r} 0 0 1 ${MAP_CX + r} ${MAP_CY}`);
    fill.setAttribute('fill', `rgba(79,195,247,${opacity.toFixed(3)})`);
    fill.setAttribute('stroke', 'none');
    svgEl.appendChild(fill);

    const stroke = makeSVG('path');
    stroke.setAttribute('d', `M ${MAP_CX - r} ${MAP_CY} A ${r} ${r} 0 0 1 ${MAP_CX + r} ${MAP_CY}`);
    stroke.setAttribute('fill', 'none');
    stroke.setAttribute('stroke', 'rgba(79,195,247,0.18)');
    stroke.setAttribute('stroke-width', '0.5');
    svgEl.appendChild(stroke);
  });

  // Radial guide lines
  [180, 150, 120, 90, 60, 30, 0].forEach(a => {
    const rad = a * Math.PI / 180;
    const line = makeSVG('line');
    line.setAttribute('x1', MAP_CX); line.setAttribute('y1', MAP_CY);
    line.setAttribute('x2', MAP_CX + 280 * Math.cos(rad));
    line.setAttribute('y2', MAP_CY - 280 * Math.sin(rad));
    line.setAttribute('stroke', 'rgba(79,195,247,0.07)');
    line.setAttribute('stroke-width', '0.5');
    svgEl.appendChild(line);
  });

  // Tick marks + clock labels
  const ticks = [
    { a: 180, label: '9:00',  tx: 22,  ty: 436 },
    { a: 150, label: '10:00', tx: 82,  ty: 255 },
    { a: 120, label: '11:00', tx: 172, ty: 148 },
    { a: 90,  label: '12:00', tx: 340, ty: 107 },
    { a: 60,  label: '1:00',  tx: 508, ty: 148 },
    { a: 30,  label: '2:00',  tx: 598, ty: 255 },
    { a: 0,   label: '3:00',  tx: 658, ty: 436 },
  ];
  ticks.forEach(t => {
    const rad = t.a * Math.PI / 180;
    const ix = MAP_CX + 280 * Math.cos(rad);
    const iy = MAP_CY - 280 * Math.sin(rad);
    const ox = MAP_CX + 298 * Math.cos(rad);
    const oy = MAP_CY - 298 * Math.sin(rad);
    const line = makeSVG('line');
    line.setAttribute('x1', ix); line.setAttribute('y1', iy);
    line.setAttribute('x2', ox); line.setAttribute('y2', oy);
    line.setAttribute('stroke', 'rgba(79,195,247,0.35)');
    line.setAttribute('stroke-width', '1.2');
    line.setAttribute('stroke-linecap', 'round');
    svgEl.appendChild(line);

    const text = makeSVG('text');
    text.setAttribute('x', t.tx); text.setAttribute('y', t.ty);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('font-family', 'DM Mono, monospace');
    text.setAttribute('font-size', '11');
    text.setAttribute('fill', 'rgba(79,195,247,0.55)');
    text.textContent = t.label;
    svgEl.appendChild(text);
  });

  // Listener icon
  [
    ['ellipse', { cx: 340, cy: 454, rx: 38, ry: 13, fill: '#c0392b', opacity: 0.7 }],
    ['rect',    { x: 333, y: 439, width: 14, height: 14, rx: 3, fill: '#d4a574' }],
    ['circle',  { cx: 340, cy: 430, r: 17, fill: '#d4a574' }],
    ['ellipse', { cx: 323, cy: 430, rx: 4, ry: 6, fill: '#c49060' }],
    ['ellipse', { cx: 357, cy: 430, rx: 4, ry: 6, fill: '#c49060' }],
    ['circle',  { cx: 340, cy: 426, r: 9, fill: '#e8b88a', opacity: 0.45 }],
  ].forEach(([tag, attrs]) => {
    const el = makeSVG(tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    svgEl.appendChild(el);
  });

  // Dots group
  const g = makeSVG('g');
  g.setAttribute('id', svgEl.id + '-dots');
  svgEl.appendChild(g);
}

// ── RENDER DOTS ──
function renderDots(svgEl, instruments, activeIdx = null, answerKey = null) {
  const g = document.getElementById(svgEl.id + '-dots');
  if (!g) return;
  g.innerHTML = '';

  // Draw answer key ghost dots first (if showing results)
  if (answerKey) {
    answerKey.forEach((ans, idx) => {
      const inst = instruments[idx];
      if (!inst || ans.angle == null) return;
      const { x, y } = mapAngleToXY(ans.angle, ans.radius);
      const { x: sx, y: sy } = mapAngleToXY(inst.angle, inst.radius);

      // Connector line
      if (Math.hypot(sx - x, sy - y) > 4) {
        const line = makeSVG('line');
        line.setAttribute('x1', sx); line.setAttribute('y1', sy);
        line.setAttribute('x2', x);  line.setAttribute('y2', y);
        line.setAttribute('stroke', inst.color);
        line.setAttribute('stroke-width', '1');
        line.setAttribute('stroke-dasharray', '3 3');
        line.setAttribute('opacity', '0.35');
        g.appendChild(line);
      }

      // Ghost circle
      const ghost = makeSVG('circle');
      ghost.setAttribute('cx', x); ghost.setAttribute('cy', y);
      ghost.setAttribute('r', (inst.r || 8) + 4);
      ghost.setAttribute('fill', 'none');
      ghost.setAttribute('stroke', inst.color);
      ghost.setAttribute('stroke-width', '1.5');
      ghost.setAttribute('stroke-dasharray', '3 2');
      ghost.setAttribute('opacity', '0.65');
      g.appendChild(ghost);
    });
  }

  // Draw instrument dots
  instruments.forEach((inst, idx) => {
    const { x, y } = mapAngleToXY(inst.angle, inst.radius);
    const { dx, dy, anchor } = mapLabelOffset(inst.angle);
    const isActive = idx === activeIdx;
    const isLead = inst.r > 10;
    const draggable = answerKey === null;

    const group = makeSVG('g');
    group.setAttribute('data-idx', idx);
    group.style.cursor = draggable ? (isActive ? 'grabbing' : 'grab') : 'default';

    if (isLead || isActive) {
      const ring = makeSVG('circle');
      ring.setAttribute('cx', x); ring.setAttribute('cy', y);
      ring.setAttribute('r', (inst.r || 8) + (isActive ? 5 : 3));
      ring.setAttribute('fill', 'none');
      ring.setAttribute('stroke', inst.color);
      ring.setAttribute('stroke-width', isActive ? '2.5' : '2');
      ring.setAttribute('opacity', isActive ? '0.9' : '0.5');
      group.appendChild(ring);
    }

    const circle = makeSVG('circle');
    circle.setAttribute('cx', x); circle.setAttribute('cy', y);
    circle.setAttribute('r', isActive ? (inst.r || 8) + 1 : (inst.r || 8));
    circle.setAttribute('fill', isLead ? '#1e2333' : inst.color);
    circle.setAttribute('stroke', inst.color);
    circle.setAttribute('stroke-width', isLead ? '2.5' : '0');
    circle.setAttribute('opacity', '0.95');
    group.appendChild(circle);

    const label = makeSVG('text');
    label.setAttribute('x', x + dx); label.setAttribute('y', y + dy);
    label.setAttribute('text-anchor', anchor);
    label.setAttribute('font-family', 'DM Sans, sans-serif');
    label.setAttribute('font-size', '11.5');
    label.setAttribute('font-weight', '500');
    label.setAttribute('fill', inst.color);
    label.setAttribute('pointer-events', 'none');
    label.textContent = inst.label;
    group.appendChild(label);

    if (draggable) {
      group.addEventListener('mousedown', e => mapStartDrag(e, svgEl, instruments));
      group.addEventListener('touchstart', e => mapStartDrag(e, svgEl, instruments), { passive: false });
    }
    g.appendChild(group);
  });
}

// ── DRAG STATE ──
let _dragging = null;
let _dotX = 0, _dotY = 0;
let _prevClientX = 0, _prevClientY = 0;
let _activeSvg = null;
let _activeInstruments = null;
let _readoutId = null;
let _onDragEndCallback = null;

function mapGetScale(svgEl) {
  const rect = svgEl.getBoundingClientRect();
  return { sx: 680 / rect.width, sy: 490 / rect.height };
}

function mapStartDrag(e, svgEl, instruments, onEnd) {
  e.preventDefault();
  const idx = parseInt(e.currentTarget.getAttribute('data-idx'));
  _dragging = idx;
  _activeSvg = svgEl;
  _activeInstruments = instruments;
  _onDragEndCallback = onEnd || null;

  // Find nearest readout sibling
  _readoutId = svgEl.id === 'map-svg' ? 'map-readout' : 'student-readout';

  const pos = mapAngleToXY(instruments[idx].angle, instruments[idx].radius);
  _dotX = pos.x; _dotY = pos.y;

  const src = e.touches ? e.touches[0] : e;
  _prevClientX = src.clientX;
  _prevClientY = src.clientY;

  document.body.style.cursor = 'grabbing';
  document.addEventListener('mousemove', _onDrag);
  document.addEventListener('mouseup', _onDragEnd);
  document.addEventListener('touchmove', _onDrag, { passive: false });
  document.addEventListener('touchend', _onDragEnd);

  renderDots(svgEl, instruments, idx, null);
}

function _onDrag(e) {
  if (_dragging === null) return;
  e.preventDefault();
  const src = e.touches ? e.touches[0] : e;
  const { sx, sy } = mapGetScale(_activeSvg);

  // Delta-based movement — dot follows cursor exactly
  const ddx = (src.clientX - _prevClientX) * sx;
  const ddy = (src.clientY - _prevClientY) * sy;
  _prevClientX = src.clientX;
  _prevClientY = src.clientY;

  _dotX += ddx;
  _dotY += ddy;

  const clampedY = Math.min(_dotY, MAP_CY - 5);
  const { angle, radius } = mapXYToAngleRadius(_dotX, clampedY);
  _activeInstruments[_dragging].angle = angle;
  _activeInstruments[_dragging].radius = radius;

  renderDots(_activeSvg, _activeInstruments, _dragging, null);

  const rd = document.getElementById(_readoutId);
  if (rd) {
    rd.textContent = _activeInstruments[_dragging].label +
      ' — ' + mapClockLabel(angle) + ' · ' + mapSideLabel(angle);
    rd.classList.add('active');
  }
}

function _onDragEnd() {
  if (_dragging === null) return;
  const wasIdx = _dragging;
  _dragging = null;
  document.body.style.cursor = '';
  document.removeEventListener('mousemove', _onDrag);
  document.removeEventListener('mouseup', _onDragEnd);
  document.removeEventListener('touchmove', _onDrag);
  document.removeEventListener('touchend', _onDragEnd);

  renderDots(_activeSvg, _activeInstruments, null, null);

  const rd = document.getElementById(_readoutId);
  if (rd) { rd.textContent = 'Drag instruments into position'; rd.classList.remove('active'); }

  if (_onDragEndCallback) _onDragEndCallback(wasIdx);
  _activeSvg = null; _activeInstruments = null;
}

// ── SCORING ──
function scoreAttempt(studentInstruments, answerKey) {
  return studentInstruments.map((inst, idx) => {
    const ans = answerKey[idx];
    if (!ans) return { label: inst.label, color: inst.color, grade: 'none', score: 0 };
    const ringDiff  = Math.abs(MAP_RADII.indexOf(inst.radius) - MAP_RADII.indexOf(ans.radius));
    const angleDiff = Math.abs(inst.angle - ans.angle) / 30;
    const dist = ringDiff + angleDiff;
    let grade, score;
    if (dist < 1.2)      { grade = 'close'; score = 100; }
    else if (dist < 2.5) { grade = 'near';  score = 60;  }
    else                 { grade = 'far';   score = 20;  }
    return { label: inst.label, color: inst.color, grade, score };
  });
}

// ── UTIL ──
function makeSVG(tag) {
  return document.createElementNS('http://www.w3.org/2000/svg', tag);
}

function scramblePositions(instruments) {
  return instruments.map(inst => ({
    ...inst,
    angle: 25 + Math.random() * 130,
    radius: MAP_RADII[Math.floor(Math.random() * MAP_RADII.length)]
  }));
}
