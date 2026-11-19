import geometry from './geometry/index.js';
import percentages from './percentages/index.js';
import algebra from './algebra/index.js';
import fractions from './fractions/index.js';

export default {
  name: 'Maths',
  path: '/maths',
  icon: '÷',
  theme: 'maths',
  description: 'Useful mathematical tools for calculations and problem-solving.',
  groups: [fractions, percentages, algebra, geometry]
};
