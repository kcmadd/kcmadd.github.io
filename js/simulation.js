// Interactive Geometric Brownian Motion chart in the hero.
//
// Each path follows  ln(S_t / S_0) = sum of (drift - vol^2 / 2) * dt + vol * sqrt(dt) * Z
// where Z is a standard normal shock. The shocks are generated once and reused,
// so moving the sliders reshapes the same set of paths instead of redrawing random ones.

const PATH_COUNT = 70;
const STEPS = 240;
const YEARS = 3;          // time horizon shown on the chart
const MAX_LOG = 1.4;      // chart shows log returns from -MAX_LOG to +MAX_LOG
const INTRO_MS = 2200;    // how long the draw-in animation takes
const CURSOR_RADIUS = 140;

const canvas = document.getElementById('sim');
const ctx = canvas.getContext('2d');
const volSlider = document.getElementById('vol');
const driftSlider = document.getElementById('drift');
const volOutput = document.getElementById('vol-out');
const driftOutput = document.getElementById('drift-out');
const pctUp = document.getElementById('pct-up');

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let width = 0;
let height = 0;
let shocks = [];
let seed = 7;
let startTime = null;
let visible = true;
const mouse = { x: -1000, y: -1000 };

// Small seeded random number generator so the first picture is the same every load
let state = seed;
function random() {
  state = (state * 16807) % 2147483647;
  return state / 2147483647;
}

// Box-Muller transform
function randomNormal() {
  const u = random() + 1e-9;
  const v = random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function generateShocks() {
  state = seed;
  shocks = [];
  for (let i = 0; i < PATH_COUNT; i++) {
    const row = [];
    for (let k = 0; k < STEPS; k++) {
      row.push(randomNormal());
    }
    shocks.push(row);
  }
}

function resizeCanvas() {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  width = canvas.clientWidth;
  height = canvas.clientHeight;
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

// Returns an array of paths, each a list of log returns over time
function buildPaths() {
  const vol = volSlider.value / 100;
  const drift = driftSlider.value / 100;
  const dt = YEARS / STEPS;

  volOutput.textContent = volSlider.value + '%';
  driftOutput.textContent = driftSlider.value + '%';

  return shocks.map(row => {
    const path = [0];
    let logReturn = 0;
    for (let k = 1; k < STEPS; k++) {
      logReturn += (drift - 0.5 * vol * vol) * dt + vol * Math.sqrt(dt) * row[k];
      path.push(logReturn);
    }
    return path;
  });
}

function drawGrid(left, right, midY, scale) {
  ctx.font = '11px "DM Sans", system-ui, sans-serif';
  ctx.textBaseline = 'middle';

  [-1, -0.5, 0, 0.5, 1].forEach(level => {
    const y = midY - level * scale;
    const isStart = level === 0;

    ctx.strokeStyle = isStart ? 'rgba(255, 198, 92, 0.45)' : 'rgba(255, 255, 255, 0.07)';
    ctx.setLineDash(isStart ? [5, 5] : []);
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(right, y);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#7c82bf';
    ctx.fillText(isStart ? 'start' : Math.exp(level).toFixed(1) + 'x', 0, y);
  });
}

function draw(timestamp) {
  if (startTime === null) startTime = timestamp;

  const paths = buildPaths();
  const progress = reduceMotion ? 1 : Math.min(1, (timestamp - startTime) / INTRO_MS);
  const eased = 1 - Math.pow(1 - progress, 3);
  const pointsToDraw = Math.floor(eased * (STEPS - 1)) + 1;

  const left = 36;
  const right = width - 8;
  const midY = height / 2;
  const scale = (height / 2 - 10) / MAX_LOG;

  ctx.clearRect(0, 0, width, height);
  drawGrid(left, right, midY, scale);

  let endedUp = 0;

  paths.forEach((path, i) => {
    const final = path[STEPS - 1];
    if (final > 0) endedUp++;

    const gradient = ctx.createLinearGradient(left, 0, right, 0);
    gradient.addColorStop(0, 'rgba(154, 140, 255, 0.08)');
    gradient.addColorStop(1, final > 0 ? 'rgba(255, 198, 92, 0.8)' : 'rgba(111, 227, 255, 0.6)');
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 1.1;
    ctx.beginPath();

    for (let k = 0; k < pointsToDraw; k++) {
      const x = left + (right - left) * k / (STEPS - 1);
      const clamped = Math.max(-MAX_LOG, Math.min(MAX_LOG, path[k]));
      let y = midY - clamped * scale;

      // Lines near the cursor wobble
      const dist = Math.hypot(x - mouse.x, y - mouse.y);
      if (dist < CURSOR_RADIUS) {
        const strength = Math.pow(1 - dist / CURSOR_RADIUS, 2) * 30;
        y += Math.sin(k * 0.4 + i + timestamp * 0.006) * strength;
      }

      if (k === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  });

  // Vertical guide under the cursor
  if (mouse.x > left) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.beginPath();
    ctx.moveTo(mouse.x, 0);
    ctx.lineTo(mouse.x, height);
    ctx.stroke();
  }

  pctUp.textContent = Math.round(endedUp / PATH_COUNT * 100) + '%';

  if (visible) requestAnimationFrame(draw);
}

// Pointer events
canvas.addEventListener('pointermove', (e) => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = e.clientX - rect.left;
  mouse.y = e.clientY - rect.top;
});

canvas.addEventListener('pointerleave', () => {
  mouse.x = -1000;
  mouse.y = -1000;
});

// New random paths and replay the intro
document.getElementById('rerun').addEventListener('click', () => {
  seed = (seed * 48271 + 11) % 2147483647;
  generateShocks();
  startTime = null;
});

// Stop animating when the hero is scrolled out of view
new IntersectionObserver(([entry]) => {
  const wasVisible = visible;
  visible = entry.isIntersecting;
  if (visible && !wasVisible) requestAnimationFrame(draw);
}).observe(canvas);

window.addEventListener('resize', resizeCanvas);

generateShocks();
resizeCanvas();
requestAnimationFrame(draw);
