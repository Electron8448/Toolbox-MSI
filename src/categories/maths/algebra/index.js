import extraTools from './tools.js';
import beginnerGraphMaker from './beginner-graph-maker/index.js';
import graphingCalculator from './graphing-calculator/index.js';

export default {
  name: 'Algebra',
  tools: [graphingCalculator, beginnerGraphMaker, ...extraTools]
};
