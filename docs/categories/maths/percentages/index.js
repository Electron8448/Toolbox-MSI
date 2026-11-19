import { field, choice, tool } from '../../tool-fields.js';
import { percentageOf, percentageChange, percentageDifference } from '../../../calculator/percentages.js';

const base = '/maths/percentages';
const number = () => field('number', 'Number');
const percent = () => field('percent', 'Percentage');
export default { name: 'Percentages', tools: [
  tool(base, 'percentage-calculator', 'Percentage Calculator', 'Find a percentage of a number.',
    [number(), percent()], percentageOf),
  tool(base, 'percentage-increase-and-decrease-calculator', 'Percentage Increase and Decrease Calculator',
    'Increase or decrease a number by a percentage.', [number(), percent(), choice('direction','Change',[['increase','Increase'],['decrease','Decrease']])],
    percentageChange),
  tool(base, 'percentage-difference-calculator', 'Percentage Difference Calculator', 'Compare two values relative to their average magnitude.',
    [field('a','First number'),field('b','Second number')], percentageDifference)
]};
