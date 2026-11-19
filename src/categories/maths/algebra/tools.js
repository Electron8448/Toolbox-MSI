import { field, tool } from '../../tool-fields.js';
import { solveLinear, solveQuadratic, simplifyExpression } from '../../../calculator/algebra.js';

const base = '/maths/algebra';
const expression = field('expression','Expression in x','text');
const note = 'Use x as the variable, ^ for powers and brackets for grouping. For example, (x + 2)(x − 3).';
export default [
  tool(base,'equation-solver','Equation Solver','Solve a linear equation in x.',
    [field('equation','Equation (e.g. 2x + 3 = 9)','text')], solveLinear),
  tool(base,'expression-simplifier','Expression Simplifier','Combine like terms in a polynomial in x.',[expression],
    simplifyExpression,note),
  tool(base,'expanding-brackets-calculator','Expanding Brackets Calculator','Expand brackets and collect like terms.',[expression],
    simplifyExpression,note),
  tool(base,'quadratic-equation-solver','Quadratic Equation Solver','Find the roots of ax² + bx + c = 0.',
    [field('a','a (x² coefficient)'),field('b','b (x coefficient)'),field('c','c (constant)')],({a,b,c})=>solveQuadratic(a,b,c))
];
