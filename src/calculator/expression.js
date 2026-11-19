const functions = new Map([
  ['sin', Math.sin], ['cos', Math.cos], ['tan', Math.tan], ['sqrt', Math.sqrt],
  ['abs', Math.abs], ['ln', Math.log], ['log', Math.log10], ['exp', Math.exp]
]);

export function compileExpression(input) {
  const expression = input.toLowerCase().replace(/^\s*y\s*=/, '').trim();
  if (!expression || expression.length > 240) {
    throw new Error('Enter an expression of 1 to 240 characters.');
  }

  if (/^polyline\s*\(/.test(expression)) {
    const match = /^polyline\(\s*x\s*,([^()]+)\)$/.exec(expression);
    const coordinates = match?.[1].split(',').map(value => value.trim());
    if (!coordinates || coordinates.length < 4 || coordinates.length % 2 ||
        !coordinates.every(value => /^[+-]?\d+$/.test(value) && Number.isSafeInteger(Number(value)))) {
      throw new Error('Use polyline(x, x1, y1, x2, y2, …) with at least two points.');
    }
    const points = [];
    for (let i = 0; i < coordinates.length; i += 2) {
      const point = [Number(coordinates[i]), Number(coordinates[i + 1])];
      if (points.length && point[0] <= points.at(-1)[0]) {
        throw new Error('List polyline points in increasing x order.');
      }
      points.push(point);
    }
    return x => {
      if (x < points[0][0] || x > points.at(-1)[0]) return NaN;
      const right = Math.max(1, points.findIndex(point => point[0] >= x));
      const [x1, y1] = points[right - 1];
      const [x2, y2] = points[right];
      return y1 + (x - x1) / (x2 - x1) * (y2 - y1);
    };
  }

  const tokens = expression.match(/(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?|[a-z]+|[^\s]/g) ?? [];
  const number = /^(?:\d|\.\d)/;
  let index = 0;
  const peek = () => tokens[index];
  function take(token) {
    if (peek() !== token) return false;
    index++;
    return true;
  }
  function expect(token) {
    if (!take(token)) throw new Error('Expected "' + token + '".');
  }
  function atom() {
    if (take('(')) {
      const inner = additive();
      expect(')');
      return inner;
    }
    const token = tokens[index++];
    if (number.test(token)) {
      const value = Number(token);
      if (!Number.isFinite(value)) throw new Error('Use a finite number.');
      return () => value;
    }
    if (token === 'x') return x => x;
    if (token === 'pi') return () => Math.PI;
    if (token === 'e') return () => Math.E;
    if (functions.has(token)) {
      expect('(');
      const argument = additive();
      expect(')');
      const calculate = functions.get(token);
      return x => calculate(argument(x));
    }
    throw new Error(token ? 'Unexpected "' + token + '".' : 'Complete the expression.');
  }
  function unary() {
    if (take('+')) return unary();
    if (take('-')) {
      const term = unary();
      return x => -term(x);
    }
    const base = atom();
    if (!take('^')) return base;
    const exponent = unary();
    return x => base(x) ** exponent(x);
  }
  function product() {
    let result = unary();
    while (true) {
      const left = result;
      if (take('/') || take('÷')) {
        const right = unary();
        result = x => left(x) / right(x);
      } else if (take('*') || take('×') || peek() === '(' || /^[a-z]/.test(peek() ?? '')) {
        const right = unary();
        result = x => left(x) * right(x);
      } else {
        return result;
      }
    }
  }
  function additive() {
    let result = product();
    while (peek() === '+' || peek() === '-' || peek() === '−') {
      const operator = tokens[index++];
      const left = result;
      const right = product();
      result = operator === '+' ? x => left(x) + right(x) : x => left(x) - right(x);
    }
    return result;
  }

  const evaluate = additive();
  if (index < tokens.length) throw new Error('Unexpected "' + peek() + '".');
  return evaluate;
}
