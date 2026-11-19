import { requireValue, format } from '../categories/tool-fields.js';

export const percentageOf = ({ number, percent }) => format(number * (percent / 100));

export const percentageChange = ({number, percent, direction}) => {
  requireValue(percent >= 0, 'Enter a non-negative percentage.');
  const change = number * (percent / 100) * (direction === 'increase' ? 1 : -1);
  return 'New value: ' + format(number + change) + '\nAmount of change: ' + format(Math.abs(change));
};

export const percentageDifference = ({a,b}) => {
  requireValue(a !== 0 || b !== 0, 'Percentage difference is undefined when both values are zero.');
  const scale = Math.max(Math.abs(a), Math.abs(b));
  const first = a / scale, second = b / scale;
  return format(200 * Math.abs(first - second) / (Math.abs(first) + Math.abs(second))) + '%';
};
