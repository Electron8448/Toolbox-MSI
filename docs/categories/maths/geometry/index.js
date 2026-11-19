import { field, choice, tool, requireValue, format } from '../../tool-fields.js';
import { pythagoras } from '../../../calculator/geometry.js';

const base = '/maths/geometry';
function shapes(slug, name, description, definitions, unit) {
  const entries = Object.entries(definitions);
  const fields = [...new Set(entries.flatMap(([, definition]) => Object.keys(definition.fields)))];
  return tool(base, slug, name, description, [
    choice('shape','Shape',entries.map(([key, definition]) => [key,definition.name])),
    ...fields.map(key => field(key, entries.find(([, definition]) => key in definition.fields)[1].fields[key], 'number',
      { when: ['shape', ...entries.filter(([, definition]) => key in definition.fields).map(([shape]) => shape)] }))
  ], ({ shape, ...dimensions }) => {
    requireValue(Object.values(dimensions).every(value => value > 0), 'Enter positive dimensions.');
    return format(definitions[shape].calculate(dimensions)) + ' ' + unit;
  }, 'Use the same unit for every measurement.');
}
const rectangle = { length: 'Length', width: 'Width' };
const circle = { radius: 'Radius' };
export default { name: 'Geometry', tools: [
  shapes('area-calculator','Area Calculator','Find the area of a common shape.', {
    rectangle: {name:'Rectangle',fields:rectangle,calculate:({length,width})=>length*width},
    square: {name:'Square',fields:{side:'Side'},calculate:({side})=>side**2},
    triangle: {name:'Triangle',fields:{base:'Base',height:'Perpendicular height'},calculate:({base,height})=>base*height/2},
    circle: {name:'Circle',fields:circle,calculate:({radius})=>Math.PI*radius**2}
  }, 'square units'),
  shapes('perimeter-calculator','Perimeter Calculator','Find the perimeter or circumference.', {
    rectangle: {name:'Rectangle',fields:rectangle,calculate:({length,width})=>2*(length+width)},
    square: {name:'Square',fields:{side:'Side'},calculate:({side})=>4*side},
    triangle: {name:'Triangle',fields:{a:'First side',b:'Second side',c:'Third side'},calculate:({a,b,c})=>{
      const [short,middle,long] = [a,b,c].sort((left,right)=>left-right);
      requireValue(short > long-middle, 'These sides cannot form a triangle.');
      return a+b+c;
    }},
    circle: {name:'Circle',fields:circle,calculate:({radius})=>2*Math.PI*radius}
  }, 'units'),
  shapes('volume-calculator','Volume Calculator','Find the volume of common 3D shapes.', {
    cuboid: {name:'Cuboid',fields:{...rectangle,height:'Height'},calculate:({length,width,height})=>length*width*height},
    cube: {name:'Cube',fields:{side:'Side'},calculate:({side})=>side**3},
    cylinder: {name:'Cylinder',fields:{...circle,height:'Height'},calculate:({radius,height})=>Math.PI*radius**2*height},
    sphere: {name:'Sphere',fields:circle,calculate:({radius})=>4*Math.PI*radius**3/3},
    cone: {name:'Cone',fields:{...circle,height:'Height'},calculate:({radius,height})=>Math.PI*radius**2*height/3}
  }, 'cubic units'),
  tool(base,'pythagoras-calculator','Pythagoras Calculator','Find a missing side in a right-angled triangle.',
    [choice('missing','Find',[['hypotenuse','Hypotenuse'],['leg','Leg']]),
      field('first','First leg','number',{when:['missing','hypotenuse']}),
      field('second','Second leg','number',{when:['missing','hypotenuse']}),
      field('hypotenuse','Hypotenuse','number',{when:['missing','leg']}),
      field('known','Known leg','number',{when:['missing','leg']})],
    pythagoras)
]};
