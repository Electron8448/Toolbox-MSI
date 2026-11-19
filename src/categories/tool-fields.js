export const field = (name, label, type = 'number', options = {}) => ({ name, label, type, ...options });
export const choice = (name, label, choices) => field(name, label, 'select', { choices });
export const tool = (base, slug, name, description, fields, run, note) =>
  ({ path: base + '/' + slug, name, description, fields, run, note });
export function requireValue(condition, message) {
  if (!condition) throw new Error(message);
}
export function format(number) {
  requireValue(Number.isFinite(number), 'The result is outside the supported numeric range.');
  return String(Number(number.toPrecision(12)));
}
