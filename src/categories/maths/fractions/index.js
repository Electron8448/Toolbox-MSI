import extraTools from './tools.js';
import fractionSimplifier from './fraction-simplifier/index.js';

export default {
  name: 'Fractions',
  tools: [fractionSimplifier, ...extraTools]
};
