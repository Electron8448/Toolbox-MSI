import { field, choice, tool } from '../../tool-fields.js';
import { readFraction, fractionAsDecimal, calculateFraction } from '../../../calculator/fractions.js';

const base = '/maths/fractions';
const fraction = (name, label) => field(name, label, 'text');
export default [
  tool(base, 'fraction-calculator', 'Fraction Calculator', 'Add, subtract, multiply or divide two fractions.',
    [fraction('first', 'First fraction (e.g. 3/4)'), choice('operation', 'Operation', [['add','Add'],['subtract','Subtract'],['multiply','Multiply'],['divide','Divide']]), fraction('second', 'Second fraction (e.g. 1/2)')],
    calculateFraction),
  tool(base, 'fraction-to-decimal-converter', 'Fraction to Decimal Converter', 'Convert a fraction to a decimal.',
    [fraction('value', 'Fraction (e.g. 3/4)')], ({ value }) => fractionAsDecimal(...readFraction(value))),
  tool(base, 'fraction-to-percentage-converter', 'Fraction to Percentage Converter', 'Convert a fraction to a percentage.',
    [fraction('value', 'Fraction (e.g. 3/4)')], ({ value }) => {
      const [top,bottom] = readFraction(value);
      return fractionAsDecimal(top * 100n, bottom, '%');
    })
];
