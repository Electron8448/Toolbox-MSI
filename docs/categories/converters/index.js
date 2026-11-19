import {category,entry,n,select,format} from '../shared.js';
import {timezone} from '../date-helpers.js';
const conversion=(name,from,to,calculate,note)=>entry(name,'Convert '+from+' to '+to+'.',[n('value',from)],
  ({value})=>format(calculate(value))+' '+to,note);
const scale=(name,from,to,factor,note)=>conversion(name,from,to,value=>value*factor,note);
const units={kg:1,g:0.001,lb:0.45359237,oz:0.028349523125};
const binary='Uses decimal SI units (1 GB = 1,000 MB).';
export default category('Converters','/converters','⇄','Convert common units and time zones.',[
 ['Length',[
  scale('Metres to Feet Converter','Metres','ft',1/0.3048),
  scale('Kilometres to Miles Converter','Kilometres','mi',1/1.609344),
  scale('Inches to Centimetres Converter','Inches','cm',2.54)]],
 ['Weight',[
  scale('Kilograms to Pounds Converter','Kilograms','lb',1/units.lb),
  scale('Grams to Ounces Converter','Grams','oz',units.g/units.oz),
  entry('Weight Converter','Convert between metric and imperial weight units.',[n('value','Weight'),select('from','From',Object.keys(units)),select('to','To',Object.keys(units))],({value,from,to})=>format(value*units[from]/units[to])+' '+to)]],
 ['Temperature',[
  conversion('Celsius to Fahrenheit Converter','Degrees Celsius','°F',value=>value*9/5+32),
  conversion('Fahrenheit to Celsius Converter','Degrees Fahrenheit','°C',value=>(value-32)*5/9)]],
 ['Time',[
  scale('Seconds to Minutes Converter','Seconds','min',1/60),
  scale('Hours to Days Converter','Hours','days',1/24),timezone]],
 ['Data',[
  scale('MB to GB Converter','Megabytes','GB',.001,binary),
  scale('KB to MB Converter','Kilobytes','MB',.001,binary),
  scale('GB to TB Converter','Gigabytes','TB',.001,binary)]],
 ['Speed',[
  scale('MPH to KM/H Converter','Miles per hour','km/h',1.609344),
  scale('KM/H to MPH Converter','Kilometres per hour','mph',1/1.609344)]]
]);
