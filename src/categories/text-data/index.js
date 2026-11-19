import {category,entry,area,select,items,lines,requireValue,reading,shuffle,pick} from '../shared.js';
import writing from '../writing/text-tools/index.js';
const text=area();
const perform=(name,description,run)=>entry(name,description,[text],({text})=>run(text));
const sort=perform('Alphabetical Sorter','Sort nonblank lines alphabetically.',text=>items(text).sort((a,b)=>a.localeCompare(b,undefined,{sensitivity:'base'})).join('\n'));
const randomList=perform('Random List Picker','Pick an item from one item per line.',text=>pick(items(text)));
function csv(text,delimiter) {
  const rows=[];
  let row=[],value='',quoted=false,closed=false;
  function field(){row.push(value);value='';closed=false;}
  for(let i=0;i<text.length;i++){
    const char=text[i];
    if(quoted){
      if(char==='"'&&text[i+1]==='"'){value+='"';i++;}
      else if(char==='"'){quoted=false;closed=true;}
      else value+=char;
    }else if(char===delimiter){field();}
    else if(char==='\n'||char==='\r'){
      if(char==='\r'&&text[i+1]==='\n')i++;
      field();rows.push(row);row=[];
    }else if(char==='"'&&!value&&!closed){quoted=true;}
    else {requireValue(!closed&&char!=='"','Check the CSV quoting around a field.');value+=char;}
  }
  requireValue(!quoted,'Close the final quoted CSV field.');
  if(row.length||value||closed){field();rows.push(row);}
  requireValue(rows.length,'Enter CSV data.');
  return rows;
}
const csvFields=[area('text','CSV data'),select('separator','Separator',[['comma','Comma'],['tab','Tab'],['semicolon','Semicolon']])];
const parse=({text,separator})=>csv(text.replace(/^\uFEFF/,''),{comma:',',tab:'\t',semicolon:';'}[separator]);
const escape=value=>'"'+String(value??'').replaceAll('"','""')+'"';
export default category('Text & Data','/text-data','≡','Clean text, organise lists and convert data.',[
 ['Text Cleaning',[
  perform('Remove Duplicate Lines','Keep the first occurrence of each line.',text=>[...new Set(lines(text))].join('\n')),
  perform('Remove Empty Lines','Remove lines that contain no visible text.',text=>lines(text).filter(line=>line.trim()).join('\n')),
  writing.tools.find(tool=>tool.name==='Remove Extra Spaces')]],
 ['Text Analysis',[reading,
  perform('Sentence Counter','Count sentences using language-aware boundaries.',text=>[...new Intl.Segmenter(undefined,{granularity:'sentence'}).segment(text)].filter(({segment})=>segment.trim()).length),
  perform('Paragraph Counter','Count blocks of text separated by blank lines.',text=>text.trim().split(/\r?\n\s*\r?\n/).filter(Boolean).length)]],
 ['Data Formatting',[
  entry('CSV Viewer','Display CSV records in a table.',csvFields,values=>{const rows=parse(values);return {table:rows,text:rows.map(row=>row.map(escape).join(',')).join('\n')};}),
  entry('CSV to JSON Converter','Convert CSV with a header row into JSON records.',csvFields,values=>{
    const [header,...rows]=parse(values);
    requireValue(header.every(key=>key.trim())&&new Set(header).size===header.length,'Use a unique, nonblank header for each column.');
    requireValue(rows.every(row=>row.length===header.length),'Each record must have the same number of fields as the header.');
    return JSON.stringify(rows.map(row=>Object.fromEntries(header.map((key,index)=>[key,row[index]]))),null,2);
  }),
  perform('JSON to CSV Converter','Convert an array of objects into CSV.',text=>{
    const objects=JSON.parse(text);
    requireValue(Array.isArray(objects)&&objects.length&&objects.every(value=>value&&typeof value==='object'&&!Array.isArray(value)),'Enter a nonempty JSON array of objects.');
    const keys=[...new Set(objects.flatMap(Object.keys))];
    requireValue(keys.length,'The objects must have at least one field.');
    return [keys.map(escape).join(','),...objects.map(object=>keys.map(key=>{
      const value=Object.hasOwn(object,key)?object[key]:null;
      return escape(value!==null&&typeof value==='object'?JSON.stringify(value):value);
    }).join(','))].join('\r\n');
  })]],
 ['Lists',[sort,randomList,perform('List Shuffler','Shuffle the items on separate lines.',text=>shuffle(items(text)).join('\n'))]]
]);
