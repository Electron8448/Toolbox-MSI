import { sitePath } from '../../../../routing.js';
import graphingCalculator from '../graphing-calculator/index.js';
import { compileExpression } from '../../../../calculator/expression.js';
import { draw, defaultBounds, plotArea } from '../graphing-calculator/page.js';

const shapes = {
  line: { name: 'Straight line', term: 'x', scale: 'Slope', shift: false },
  parabola: { name: 'Parabola', term: 'x^2', scale: 'Width and direction', shift: true },
  absolute: { name: 'V shape', term: 'abs(x)', scale: 'Steepness and direction', shift: true }
};

function numberField(name, label, value) {
  return `<div class="field"><label for="maker-${name}">${label}</label>
    <input id="maker-${name}" name="${name}" type="number" step="any" value="${value}" required aria-describedby="maker-error"></div>`;
}

export function makerPage(tool, breadcrumbs) {
  return `${breadcrumbs(tool.category, tool.name)}
    <header class="page-heading"><span class="category-icon maths" aria-hidden="true">${tool.icon}</span>
      <h1>${tool.name}</h1><p>${tool.description}</p></header>
    <form class="panel maker-form" novalidate>
      <div class="field"><label for="maker-shape">Graph shape</label>
        <select id="maker-shape" name="shape">${Object.entries(shapes)
          .map(([key, shape]) => `<option value="${key}">${shape.name}</option>`).join('')}<option value="draw">Draw with dots</option></select>
      </div>
      <div class="maker-values">
        ${numberField('scale', 'Slope', 1)}
        <div class="maker-shift" hidden>${numberField('horizontal', 'Move left or right', 0)}</div>
        ${numberField('vertical', 'Move up or down', 0)}
      </div>
      <p id="maker-error" class="error" role="alert"></p>
      <div class="actions"><button type="reset" class="secondary">Reset graph</button></div>
    </form>
    <section class="panel graph-output" aria-labelledby="maker-plot">
      <h2 id="maker-plot">Graph preview</h2>
      <canvas role="img" aria-label="Graph preview" aria-describedby="maker-status"></canvas>
      <p id="maker-status"></p>
      <form class="maker-points" hidden>
        <div class="maker-values">
          <div class="field"><label for="point-x">Point x</label><input id="point-x" name="pointX" type="number" min="-10" max="10" required></div>
          <div class="field"><label for="point-y">Point y</label><input id="point-y" name="pointY" type="number" min="-10" max="10" required></div>
        </div>
        <div class="actions">
          <button class="primary" type="submit">Add dot</button>
          <button class="secondary" type="button" id="undo-dot">Undo</button>
          <button class="secondary" type="button" id="clear-dots">Clear dots</button>
        </div>
        <p id="maker-points-list" role="status"></p>
      </form>
      <div class="maker-equation">
        <h3>Equation</h3>
        <output id="maker-equation" aria-live="polite"></output>
        <div class="actions"><a class="primary" id="maker-open" data-route hidden>Open in Graphing Calculator ↗</a></div>
      </div>
    </section>`;
}

function equation(shape, scale, horizontal, vertical) {
  if (scale === 0) return String(vertical);
  const inner = horizontal === 0 ? 'x' : `x ${horizontal < 0 ? '+' : '-'} ${Math.abs(horizontal)}`;
  const variable = shape === shapes.parabola && horizontal !== 0 ? `(${inner})` : inner;
  const term = shape.term.replace('x', () => variable);
  const coefficient = scale === 1 ? '' : scale === -1 ? '-' : `${scale}*`;
  const offset = vertical === 0 ? '' : ` ${vertical < 0 ? '-' : '+'} ${Math.abs(vertical)}`;
  return coefficient + term + offset;
}

export function bindMaker() {
  const form = document.querySelector('.maker-form');
  const { shape, scale, horizontal, vertical } = form.elements;
  const shift = form.querySelector('.maker-shift');
  const scaleLabel = form.querySelector('label[for="maker-scale"]');
  const canvas = document.querySelector('.graph-output canvas');
  const error = document.querySelector('#maker-error');
  const output = document.querySelector('#maker-equation');
  const status = document.querySelector('#maker-status');
  const open = document.querySelector('#maker-open');
  const values = form.querySelector('.maker-values');
  const pointForm = document.querySelector('.maker-points');
  const pointList = document.querySelector('#maker-points-list');
  const undo = document.querySelector('#undo-dot');
  const clear = document.querySelector('#clear-dots');
  const points = new Map();
  const history = [];
  const noCurve = () => NaN;
  let plottedPoints = [];
  let evaluate;

  function setExpression(expression) {
    evaluate = expression ? compileExpression(expression) : undefined;
    output.textContent = expression ? 'y = ' + expression : '';
    open.hidden = !expression;
    if (expression) open.href = sitePath(graphingCalculator.path) + '?' + new URLSearchParams({ expression });
  }

  function updateDots() {
    plottedPoints = [...points].sort(([left], [right]) => left - right);
    const expression = plottedPoints.length < 2 ? '' : `polyline(x, ${plottedPoints.flat().join(', ')})`;
    setExpression(expression);
    status.textContent = 'Click or tap the grid to add a dot. Dots snap to whole numbers and connect from left to right. A new dot at the same x replaces the previous one.';
    pointList.textContent = plottedPoints.length
      ? plottedPoints.map(([x, y]) => `(${x}, ${y})`).join(', ')
      : 'Add at least two dots to create a graph.';
    undo.disabled = !history.length;
    clear.disabled = !points.size;
    repaint();
  }

  function addDot(x, y) {
    if (points.get(x) === y) return;
    history.push({ x, previous: points.get(x) });
    points.set(x, y);
    updateDots();
  }

  function repaint() {
    if (shape.value === 'draw') {
      draw(canvas, evaluate ?? noCurve, defaultBounds, plottedPoints);
      return;
    }
    if (!evaluate) return;
    status.textContent = draw(canvas, evaluate, defaultBounds)
      ? 'Both axes run from −10 to 10.'
      : 'This graph is outside the preview. Open it in Graphing Calculator to adjust the axis ranges.';
  }

  function update() {
    const drawing = shape.value === 'draw';
    values.hidden = drawing;
    pointForm.hidden = !drawing;
    canvas.classList.toggle('drawing-grid', drawing);
    if (drawing) {
      error.textContent = '';
      updateDots();
      return;
    }
    const selected = shapes[shape.value];
    shift.hidden = !selected.shift;
    horizontal.disabled = !selected.shift;
    scaleLabel.textContent = selected.scale;
    const inputs = [scale, horizontal, vertical].filter(input => !input.disabled);
    for (const input of [scale, horizontal, vertical]) input.removeAttribute('aria-invalid');
    const invalid = inputs.find(input => !Number.isFinite(input.valueAsNumber));
    error.textContent = invalid ? 'Enter a number in each visible field.' : '';
    open.hidden = Boolean(invalid);
    if (invalid) {
      invalid.setAttribute('aria-invalid', 'true');
      output.textContent = '';
      status.textContent = '';
      evaluate = undefined;
      canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    const expression = equation(selected, scale.valueAsNumber, selected.shift ? horizontal.valueAsNumber : 0, vertical.valueAsNumber);
    evaluate = compileExpression(expression);
    output.textContent = 'y = ' + expression;
    open.href = sitePath(graphingCalculator.path) + '?' + new URLSearchParams({ expression });
    repaint();
  }

  canvas.addEventListener('click', event => {
    if (shape.value !== 'draw') return;
    const rect = canvas.getBoundingClientRect();
    const { left, top, right, bottom } = plotArea(rect.width, rect.height);
    const px = event.clientX - rect.left;
    const py = event.clientY - rect.top;
    if (px < left || px > right || py < top || py > bottom) return;
    const [xMin, xMax, yMin, yMax] = defaultBounds;
    addDot(
      Math.round(xMin + (px - left) / (right - left) * (xMax - xMin)),
      Math.round(yMax - (py - top) / (bottom - top) * (yMax - yMin))
    );
  });
  pointForm.addEventListener('submit', event => {
    event.preventDefault();
    addDot(pointForm.elements.pointX.valueAsNumber, pointForm.elements.pointY.valueAsNumber);
  });
  undo.addEventListener('click', () => {
    const { x, previous } = history.pop();
    if (previous === undefined) points.delete(x);
    else points.set(x, previous);
    updateDots();
  });
  clear.addEventListener('click', () => {
    points.clear();
    history.length = 0;
    updateDots();
  });
  form.addEventListener('input', update);
  form.addEventListener('submit', event => event.preventDefault());
  form.addEventListener('reset', () => {
    points.clear();
    history.length = 0;
    pointForm.reset();
    queueMicrotask(update);
  });
  const observer = new ResizeObserver(() => {
    if (canvas.isConnected) repaint();
    else observer.disconnect();
  });
  observer.observe(canvas);
  update();
}
