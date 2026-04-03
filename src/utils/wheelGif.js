import { createCanvas } from '@napi-rs/canvas';
import GIFEncoder from 'gif-encoder-2';

const SIZE = 400;
const CX = SIZE / 2;
const CY = SIZE / 2;
const RADIUS = 180;
const LABEL_RADIUS = 0.58;
const POINTER_SIZE = 18;
const TOTAL_FRAMES = 55;     // 35 fast + 20 slow
const N_SPINS = 12;
const FAST_FRAMES = 35;
const FAST_DELAY = 85;       // ms — fast phase (~3s total)
const SLOW_DELAY = 350;      // ms — slow phase (~7s total) → ~10s total
const FONT_SIZE = 11;
const MAX_LABEL_CHARS = 14;

const PALETTE = [
  '#E74C3C', '#3498DB', '#2ECC71', '#F39C12', '#9B59B6',
  '#1ABC9C', '#E67E22', '#2980B9', '#27AE60', '#8E44AD',
  '#C0392B', '#16A085', '#D35400', '#2471A3', '#1E8449',
  '#6C3483', '#A93226', '#117A65', '#B7770D', '#4A235A',
];

function easeOutQuart(t) {
  return 1 - Math.pow(1 - t, 4);
}

function buildSlices(votedTickets, games) {
  const entries = [...votedTickets.entries()].sort(([a], [b]) => a.localeCompare(b));
  const total = entries.reduce((s, [, t]) => s + t, 0);

  let angleAccum = 0;
  return entries.map(([id, tickets], i) => {
    const sweep = (tickets / total) * (2 * Math.PI);
    const start = angleAccum;
    angleAccum += sweep;
    return {
      id,
      name: games.find(g => g.id === id)?.name ?? id,
      tickets,
      color: PALETTE[i % PALETTE.length],
      start,
      sweep,
      center: start + sweep / 2,
    };
  });
}

function computeTotalAngle(slices, winnerId) {
  const POINTER_ANGLE = -Math.PI / 2;
  const winnerSlice = slices.find(s => s.id === winnerId);
  let remainder = (POINTER_ANGLE - winnerSlice.center) % (2 * Math.PI);
  if (remainder < 0) remainder += 2 * Math.PI;
  return N_SPINS * 2 * Math.PI + remainder;
}

function drawPointer(ctx) {
  const tipX = CX;
  const tipY = CY - RADIUS + 4;
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(tipX - POINTER_SIZE, tipY - POINTER_SIZE * 1.5);
  ctx.lineTo(tipX + POINTER_SIZE, tipY - POINTER_SIZE * 1.5);
  ctx.closePath();
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.strokeStyle = '#2C2F33';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawLabels(ctx, slices, rotation) {
  ctx.save();
  ctx.translate(CX, CY);
  ctx.font = `bold ${FONT_SIZE}px sans-serif`;
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (const slice of slices) {
    if (slice.sweep < 0.2) continue;

    const labelAngle = slice.center + rotation;
    const labelX = Math.cos(labelAngle) * RADIUS * LABEL_RADIUS;
    const labelY = Math.sin(labelAngle) * RADIUS * LABEL_RADIUS;

    const maxChars = slice.sweep < 0.4 ? 5 : slice.sweep < 0.8 ? 9 : MAX_LABEL_CHARS;
    const label = slice.name.length > maxChars
      ? slice.name.slice(0, maxChars - 1) + '…'
      : slice.name;

    ctx.save();
    ctx.translate(labelX, labelY);
    let textAngle = labelAngle;
    if (Math.cos(labelAngle) < 0) textAngle += Math.PI;
    ctx.rotate(textAngle);
    ctx.fillText(label, 0, 0);
    ctx.restore();
  }

  ctx.restore();
}

function drawFrame(ctx, slices, rotation) {
  // Background
  ctx.fillStyle = '#36393F';
  ctx.fillRect(0, 0, SIZE, SIZE);

  ctx.save();
  ctx.translate(CX, CY);

  // Slices
  for (const slice of slices) {
    const startAngle = slice.start + rotation;
    const endAngle = startAngle + slice.sweep;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, RADIUS, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = slice.color;
    ctx.fill();
    ctx.strokeStyle = '#1E2124';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Hub
  ctx.beginPath();
  ctx.arc(0, 0, 14, 0, 2 * Math.PI);
  ctx.fillStyle = '#23272A';
  ctx.fill();
  ctx.strokeStyle = '#99AAB5';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.restore();

  drawLabels(ctx, slices, rotation);
  drawPointer(ctx);
}

/**
 * @param {Map<string, number>} votedTickets
 * @param {Array<{id: string, name: string}>} games
 * @param {string} winnerId
 * @returns {Buffer}
 */
export function generateWheelGif(votedTickets, games, winnerId) {
  const slices = buildSlices(votedTickets, games);
  const totalAngle = computeTotalAngle(slices, winnerId);

  const canvas = createCanvas(SIZE, SIZE);
  const ctx = canvas.getContext('2d');

  const encoder = new GIFEncoder(SIZE, SIZE, 'octree');
  encoder.setRepeat(-1);
  encoder.setQuality(10);
  encoder.start();

  for (let i = 0; i < TOTAL_FRAMES; i++) {
    const t = i < TOTAL_FRAMES - 1 ? easeOutQuart(i / (TOTAL_FRAMES - 1)) : 1.0;
    drawFrame(ctx, slices, t * totalAngle);
    encoder.setDelay(i < FAST_FRAMES ? FAST_DELAY : SLOW_DELAY);
    encoder.addFrame(ctx);
  }

  encoder.finish();
  return encoder.out.getData();
}
