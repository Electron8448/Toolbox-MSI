import { requireValue, format } from '../categories/tool-fields.js';

const combine = (a,b,sign=1) => Array.from({length: Math.max(a.length,b.length)},(_,i)=>(a[i]??0)+sign*(b[i]??0));
function multiply(a,b) {
  requireValue(a.length+b.length<=22, 'Use a polynomial of degree 20 or lower.');
  const result = Array(a.length+b.length-1).fill(0);
  a.forEach((left,i)=>b.forEach((right,j)=>{ result[i+j]+=left*right; }));
  return result;
}
function trim(poly) {
  while (poly.length>1 && poly.at(-1)===0) poly.pop();
  requireValue(poly.every(Number.isFinite), 'The coefficients are outside the supported range.');
  return poly;
}
function parse(source) {
  requireValue(source.length<=300,'Enter an expression of at most 300 characters.');
  const tokens=source.toLowerCase().replace(/−/g,'-').replace(/×/g,'*').match(/\d+\.?\d*|\.\d+|[^\s]/g) ?? [];
  const isNumber = token => /^(?:\d|\.\d)/.test(token ?? '');
  let index=0;
  const peek=()=>tokens[index];
  function take(token) {
    if (peek()!==token) return false;
    index++;
    return true;
  }
  function atom() {
    if (take('(')) {
      const result=sum();
      requireValue(take(')'), 'Close each opening bracket.');
      return result;
    }
    if (take('x')) return [0,1];
    const token=tokens[index++];
    requireValue(isNumber(token),'Use numbers, x and brackets in a complete expression.');
    return [Number(token)];
  }
  function signed() {
    if (take('+')) return signed();
    if (take('-')) return signed().map(value=>-value);
    const value=atom();
    if (!take('^')) return value;
    const token=tokens[index++];
    requireValue(/^\d+$/.test(token ?? '') && Number(token)<=20, 'Use a whole-number exponent between 0 and 20.');
    let result=[1];
    for(let i=0;i<Number(token);i++) result=multiply(result,value);
    return result;
  }
  function product() {
    let value=signed();
    while (peek()==='*' || peek()==='/' || peek()==='(' || peek()==='x') {
      if (take('/')) {
        const divisor=trim(signed());
        requireValue(divisor.length===1 && divisor[0]!==0,'Divide only by a nonzero constant.');
        value=value.map(coefficient=>coefficient/divisor[0]);
      } else {
        take('*');
        value=multiply(value,signed());
      }
    }
    return value;
  }
  function sum() {
    let result=product();
    while (peek()==='+' || peek()==='-') {
      const sign=take('+') ? 1 : (index++, -1);
      result=combine(result,product(),sign);
    }
    return result;
  }
  const polynomial=trim(sum());
  requireValue(index===tokens.length,'Check the operators and brackets in your expression.');
  return polynomial;
}
function print(poly) {
  const terms=[];
  for(let power=poly.length-1;power>=0;power--) {
    const value=poly[power];
    if (!value) continue;
    const magnitude=Math.abs(value);
    const variable=power===0 ? '' : power===1 ? 'x' : 'x^'+power;
    const coefficient=power>0 && magnitude===1 ? '' : format(magnitude);
    const sign=value<0 ? (terms.length ? ' - ' : '-') : (terms.length ? ' + ' : '');
    terms.push(sign+coefficient+variable);
  }
  return terms.join('') || '0';
}
export function solveQuadratic(a,b,c) {
  requireValue(a!==0, 'A quadratic requires a nonzero x² coefficient.');
  const scale=Math.max(Math.abs(a),Math.abs(b),Math.abs(c));
  [a,b,c]=[a/scale,b/scale,c/scale];
  const discriminant=b*b-4*a*c;
  if (discriminant<0) {
    const real=format(-b/(2*a));
    const imaginary=format(Math.sqrt(-discriminant)/(2*Math.abs(a)));
    return 'x = '+real+' ± '+imaginary+'i';
  }
  if(discriminant===0) return 'x = '+format(-b/(2*a));
  const q=-0.5*(b+(b<0?-1:1)*Math.sqrt(discriminant));
  return [q/a,c/q].sort((left,right)=>left-right).map(root=>'x = '+format(root)).join('\n');
}
export function solveLinear({ equation }) {
  const sides=equation.split('=');
  requireValue(sides.length===2,'Enter an equation with one equals sign.');
  const [constant,coefficient=0,...higher]=trim(combine(parse(sides[0]),parse(sides[1]),-1));
  requireValue(!higher.length,'Use a linear equation in x.');
  if (!coefficient) return constant ? 'No solution.' : 'Every real number is a solution.';
  return 'x = '+format(-constant/coefficient);
}

export function simplifyExpression({ expression }) {
  return print(parse(expression));
}
