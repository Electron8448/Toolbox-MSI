import {field, choice, tool, requireValue, format} from './tool-fields.js';
export {field, choice, requireValue, format};
export const n = (name,label,options)=>field(name,label,'number',options);
export const t = (name,label,options)=>field(name,label,'text',options);
export const area = (name='text',label='Your text')=>field(name,label,'textarea');
export const select = (name,label,values)=>choice(name,label,values.map(value=>Array.isArray(value)?value:[value,value]));
export const slug = value=>value.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
export const entry = (name,description,fields,run,note)=>({name,description,fields,run,note});
export function category(name,path,icon,description,definitions) {
  return {name,path,icon,description,theme:'maths',groups:definitions.map(([name,entries])=>{
    const base=path+'/'+slug(name);
    return {name,path:base,tools:entries.map(item=>({...tool(base,slug(item.name),item.name,item.description,item.fields,item.run,item.note),...item,path:base+'/'+slug(item.name)}))};
  })};
}
export const lines = text=>text.split(/\r\n|\r|\n/);
export const items = text=>lines(text).map(line=>line.trim()).filter(Boolean);
export function integer(value,min,max) {
  requireValue(Number.isSafeInteger(value)&&value>=min&&value<=max,'Enter a whole number between '+min+' and '+max+'.');
  return value;
}
export function random(min,max) {
  integer(min,-2147483648,2147483647);
  integer(max,min,2147483647);
  const range=max-min+1;
  const bound=Math.floor(2**32/range)*range;
  const buffer=new Uint32Array(1);
  do { crypto.getRandomValues(buffer); } while(buffer[0]>=bound);
  return min+buffer[0]%range;
}
export function shuffle(values) {
  const result=[...values];
  for(let index=result.length-1;index>0;index--) {
    const other=random(0,index);
    [result[index],result[other]]=[result[other],result[index]];
  }
  return result;
}
export function pick(values) {
  requireValue(values.length,'Enter at least one item.');
  return values[random(0,values.length-1)];
}
export const duration = seconds=>{
  const value=Math.round(Math.abs(seconds));
  return [Math.floor(value/3600),Math.floor(value/60)%60,value%60].map(part=>String(part).padStart(2,'0')).join(':');
};
export const reading = entry('Reading Time Calculator','Estimate time to read a passage.',[area(),n('speed','Words per minute',{value:200})],({text,speed})=>{
  requireValue(speed>0,'Enter a positive reading speed.');
  const count=([...new Intl.Segmenter(undefined,{granularity:'word'}).segment(text)].filter(part=>part.isWordLike)).length;
  return count+' words • '+duration(count/speed*60);
});
export const randomNumber = entry('Random Number Generator','Pick a whole number within an inclusive range.',[n('min','Minimum'),n('max','Maximum')],({min,max})=>random(min,max));
