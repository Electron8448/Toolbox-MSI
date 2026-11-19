import { field, choice, tool, requireValue } from '../../tool-fields.js';
const base='/writing/text-tools';
const text=field('text','Your text','textarea',{optional:true});
export const words=value=>value.match(/[\p{L}\p{N}]+(?:[’'\-][\p{L}\p{N}]+)*/gu) ?? [];
export default {name:'Text Tools',tools:[
  tool(base,'word-counter','Word Counter','Count the words in your text.',[text],({text})=>String(words(text).length)),
  tool(base,'character-counter','Character Counter','Count characters with and without white space.',[text],({text})=>{
    const segmenter=new Intl.Segmenter(undefined,{granularity:'grapheme'});
    return 'Including white space: '+[...segmenter.segment(text)].length+
      '\nExcluding white space: '+[...segmenter.segment(text.replace(/\s/gu,''))].length;
  }),
  tool(base,'uppercase-lowercase-converter','Uppercase / Lowercase Converter','Change the case of letters in your text.',
    [text,choice('mode','Convert to',[['upper','Uppercase'],['lower','Lowercase']])],({text,mode})=>mode==='upper'?text.toUpperCase():text.toLowerCase()),
  tool(base,'remove-extra-spaces','Remove Extra Spaces','Collapse repeated spaces and tabs while preserving lines.',[text],
    ({text})=>text.split(/\r?\n/).map(line=>line.replace(/[^\S\r\n]+/g,' ').trim()).join('\n')),
  tool(base,'find-and-replace-text','Find and Replace Text','Replace every exact, case-sensitive match.',
    [text,field('find','Find','text'),field('replacement','Replace with','text',{optional:true})],({text,find,replacement})=>{
      requireValue(find.length,'Enter the text to find.');
      return text.split(find).join(replacement);
    })
]};
