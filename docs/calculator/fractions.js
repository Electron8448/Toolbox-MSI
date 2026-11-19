import { requireValue } from '../categories/tool-fields.js';

function gcd(a, b) {
  while (b !== 0n) {
    [a, b] = [b, a % b];
  }
  return a < 0n ? -a : a;
}

export function simplifyFraction(numerator, denominator) {
  const integer = /^[+-]?\d+$/;
  if (!integer.test(numerator.trim())) {
    return { field: 'numerator', error: 'Enter a whole number for the numerator.' };
  }
  if (!integer.test(denominator.trim())) {
    return { field: 'denominator', error: 'Enter a whole number for the denominator.' };
  }
  const top = BigInt(numerator.trim());
  const bottom = BigInt(denominator.trim());
  if (bottom === 0n) {
    return { field: 'denominator', error: 'The denominator cannot be zero.' };
  }
  const divisor = gcd(top, bottom) * (bottom < 0n ? -1n : 1n);
  return { numerator: top / divisor, denominator: bottom / divisor };
}

export function equivalentPage({ numerator, denominator }, topFilter, bottomFilter, start, size) {
  const top = topFilter.trim();
  const bottom = bottomFilter.trim();
  const empty = { fractions: [], nextMultiplier: null };
  if (top && !/^[+-]?\d+$/.test(top)) {
    return { ...empty, field: 'numerator', error: 'Enter a whole number for the numerator filter.' };
  }
  if (bottom && (!/^\+?\d+$/.test(bottom) || BigInt(bottom) === 0n)) {
    return { ...empty, field: 'denominator', error: 'Enter a positive whole number for the denominator filter.' };
  }

  // Reduced fractions generate all equivalents with positive integer multipliers.
  const targetTop = top ? BigInt(top) : null;
  const targetBottom = bottom ? BigInt(bottom) : null;
  let multiplier = null;
  if (targetBottom !== null) {
    if (targetBottom % denominator !== 0n) return empty;
    multiplier = targetBottom / denominator;
  } else if (targetTop !== null && numerator !== 0n) {
    if (targetTop % numerator !== 0n) return empty;
    multiplier = targetTop / numerator;
  }
  if (targetTop !== null && numerator === 0n && targetTop !== 0n) return empty;
  if (multiplier !== null) {
    if (multiplier < 1n || (targetTop !== null && numerator * multiplier !== targetTop)) return empty;
    return { ...empty, fractions: [{ numerator: numerator * multiplier, denominator: denominator * multiplier }] };
  }

  const fractions = Array.from({ length: size }, (_, index) => {
    const factor = start + BigInt(index);
    return { numerator: numerator * factor, denominator: denominator * factor };
  });
  return { fractions, nextMultiplier: start + BigInt(size) };
}

export function readFraction(value) {
  const parts = value.split('/');
  requireValue(parts.length === 2, 'Enter each fraction in the format 3/4.');
  const result = simplifyFraction(...parts);
  requireValue(!result.error, result.error);
  return [result.numerator, result.denominator];
}
export function fractionAsDecimal(top, bottom, suffix = '') {
  const sign = top < 0n ? '-' : '';
  const magnitude = top < 0n ? -top : top;
  const precision = 16n;
  const scale = 10n ** precision;
  const scaled = (magnitude * scale * 2n + bottom) / (bottom * 2n);
  const fraction = String(scaled % scale).padStart(Number(precision), '0').replace(/0+$/, '');
  const exact = magnitude * scale % bottom === 0n;
  return (exact ? '' : '≈ ') + sign + (scaled / scale) + (fraction ? '.' + fraction : '') + suffix;
}
export function calculateFraction({ first, second, operation }) {
  const [a,b] = readFraction(first), [c,d] = readFraction(second);
  const pairs = { add: [a*d+c*b,b*d], subtract: [a*d-c*b,b*d], multiply: [a*c,b*d], divide: [a*d,b*c] };
  const result = simplifyFraction(...pairs[operation].map(String));
  requireValue(!result.error, 'You cannot divide by a zero fraction.');
  return result.numerator + '/' + result.denominator;
}
