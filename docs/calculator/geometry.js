import { requireValue, format } from '../categories/tool-fields.js';

export const pythagoras = ({missing,first,second,hypotenuse,known}) => {
  if (missing==='hypotenuse') {
    requireValue(first>0 && second>0,'Enter positive leg lengths.');
    return format(Math.hypot(first,second)) + ' units';
  }
  requireValue(known>0 && hypotenuse>known,'The hypotenuse must be longer than the positive known leg.');
  return format(Math.sqrt(hypotenuse-known)*Math.sqrt(hypotenuse)*Math.sqrt(1+known/hypotenuse)) + ' units';
};
