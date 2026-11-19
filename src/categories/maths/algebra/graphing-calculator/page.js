import { compileExpression } from '../../../../calculator/expression.js';

export const defaultBounds = [-10, 10, -10, 10];

export function graphPage(tool, breadcrumbs) {
  return `${breadcrumbs(tool.category, tool.name)}
    <header class="page-heading"><span class="category-icon maths" aria-hidden="true">↗</span>
      <h1>${tool.name}</h1><p>${tool.description}</p></header>
    <form class="graph-form panel" novalidate>
      <div class="field">
        <label for="expression">Function in x</label>
        <input id="expression" name="expression" value="x^2" autocomplete="off" spellcheck="false" aria-describedby="graph-help graph-error">
      </div>
      <p id="graph-help">Try <code>x^2</code>, <code>2x + 1</code>, or <code>sin(x)</code>. Use radians for trigonometry.</p>
      <div class="graph-ranges">
        ${[['xMin', 'x minimum', -10], ['xMax', 'x maximum', 10], ['yMin', 'y minimum', -10], ['yMax', 'y maximum', 10]]
          .map(([name, label, value]) => `<div class="field"><label for="${name}">${label}</label>
          <input id="${name}" name="${name}" type="number" step="any" value="${value}" aria-describedby="graph-error"></div>`).join('')}
      </div>
      <p id="graph-error" class="error" role="alert"></p>
      <div class="actions"><button type="submit" class="primary">Plot graph</button>
        <button type="reset" class="secondary">Reset</button></div>
    </form>
    <section class="panel graph-output" aria-labelledby="plot-title">
      <h2 id="plot-title">Graph</h2>
      <canvas role="img" aria-label="Function graph" aria-describedby="graph-status"></canvas>
      <p id="graph-status" role="status"></p>
    </section>`;
}

function ticks(min, max) {
  const base = 10 ** Math.floor(Math.log10((max - min) / 8));
  const unit = [1, 2, 5, 10].find(value => base * value >= (max - min) / 8) * base;
  const first = Math.ceil(min / unit) * unit;
  return Array.from({ length: 10 }, (_, i) => first + i * unit)
    .filter(value => value <= max).map(value => Number(value.toPrecision(12)));
}

export function plotArea(width, height) {
  return { left: 58, top: 14, right: width - 14, bottom: height - 32 };
}

export function draw(canvas, evaluate, [xMin, xMax, yMin, yMax], points) {
  const { width, height } = canvas.getBoundingClientRect();
  if (!width || !height) return false;
  const palette = getComputedStyle(canvas);
  const accent = palette.getPropertyValue('--catalogue-accent').trim() || palette.getPropertyValue('--brand').trim();
  const grid = palette.getPropertyValue('--line').trim();
  const labels = palette.getPropertyValue('--muted').trim();
  const scale = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  const { left, top, right, bottom } = plotArea(width, height);
  const px = x => left + (x - xMin) / (xMax - xMin) * (right - left);
  const py = y => bottom - (y - yMin) / (yMax - yMin) * (bottom - top);
  function line(x1, y1, x2, y2, color) {
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  if (points) {
    for (let x = xMin; x <= xMax; x++) line(px(x), top, px(x), bottom, '#eef0e8');
    for (let y = yMin; y <= yMax; y++) line(left, py(y), right, py(y), '#eef0e8');
  }
  ctx.font = '11px system-ui';
  ctx.fillStyle = labels;
  for (const x of ticks(xMin, xMax)) {
    line(px(x), top, px(x), bottom, grid);
    ctx.textAlign = 'center';
    ctx.fillText(Number(x.toPrecision(4)), px(x), bottom + 15, 46);
  }
  for (const y of ticks(yMin, yMax)) {
    line(left, py(y), right, py(y), grid);
    ctx.textAlign = 'right';
    ctx.fillText(Number(y.toPrecision(4)), left - 6, py(y) + 4, 48);
  }
  if (xMin <= 0 && xMax >= 0) line(px(0), top, px(0), bottom, '#788c81');
  if (yMin <= 0 && yMax >= 0) line(left, py(0), right, py(0), '#788c81');
  ctx.save();
  ctx.beginPath();
  ctx.rect(left, top, right - left, bottom - top);
  ctx.clip();
  ctx.beginPath();
  ctx.lineWidth = 2;
  ctx.strokeStyle = accent;
  let previous;
  let visible = false;
  const samples = Math.max(1, Math.ceil((right - left) * 2));
  for (let i = 0; i <= samples; i++) {
    const x = xMin + i / samples * (xMax - xMin);
    const y = py(evaluate(x));
    if (!Number.isFinite(y)) {
      previous = undefined;
      continue;
    }
    if (y >= top && y <= bottom) visible = true;
    if (previous === undefined || Math.abs(y - previous) > bottom - top) ctx.moveTo(px(x), y);
    else {
      ctx.lineTo(px(x), y);
      if (Math.min(y, previous) <= bottom && Math.max(y, previous) >= top) visible = true;
    }
    previous = y;
  }
  ctx.stroke();
  ctx.fillStyle = accent;
  for (const [x, y] of points ?? []) {
    ctx.beginPath();
    ctx.arc(px(x), py(y), 4, 0, 2 * Math.PI);
    ctx.fill();
  }
  ctx.restore();
  return visible;
}

export function bindGraph() {
  const form = document.querySelector('.graph-form');
  const canvas = document.querySelector('.graph-output canvas');
  const error = document.querySelector('#graph-error');
  const status = document.querySelector('#graph-status');
  const expression = form.elements.expression;
  const inputs = ['xMin', 'xMax', 'yMin', 'yMax'].map(name => form.elements[name]);
  let graph;
  function repaint() {
    if (!graph) return;
    const { evaluate, bounds, label } = graph;
    const [xMin, xMax, yMin, yMax] = bounds;
    const visible = draw(canvas, evaluate, bounds);
    status.textContent = visible
      ? `${label}. x from ${xMin} to ${xMax}, y from ${yMin} to ${yMax}.`
      : 'No curve is visible in this range. Try changing the axis bounds.';
  }
  function plot() {
    error.textContent = '';
    for (const input of [expression, ...inputs]) input.removeAttribute('aria-invalid');
    let field = expression;
    try {
      const evaluate = compileExpression(expression.value);
      const bounds = inputs.map(input => input.valueAsNumber);
      for (const index of [0, 2]) {
        const [min, max] = bounds.slice(index, index + 2);
        field = inputs[!Number.isFinite(min) ? index : index + 1];
        const span = max - min;
        if (!Number.isFinite(span) || span < 1e-12 || span > 1e15 ||
            Math.abs(min) > 1e15 || Math.abs(max) > 1e15) {
          const axis = index === 0 ? 'x' : 'y';
          throw new Error(`Enter increasing ${axis} bounds within ±10^15, with a span between 10^-12 and 10^15.`);
        }
      }
      graph = { evaluate, bounds, label: 'y = ' + expression.value.replace(/^\s*y\s*=\s*/i, '').trim() };
      repaint();
    } catch (failure) {
      graph = undefined;
      canvas.width = canvas.width;
      status.textContent = '';
      error.textContent = failure.message;
      field.setAttribute('aria-invalid', 'true');
      field.focus();
    }
  }
  const observer = new ResizeObserver(() => {
    if (canvas.isConnected) repaint();
    else observer.disconnect();
  });
  observer.observe(canvas);
  form.addEventListener('submit', event => {
    event.preventDefault();
    plot();
  });
  form.addEventListener('reset', () => queueMicrotask(plot));
  const incoming = new URLSearchParams(location.search).get('expression');
  if (incoming) expression.value = incoming;
  plot();
}
