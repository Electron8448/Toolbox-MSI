import { field, tool } from '../../tool-fields.js';
const base='/writing/formatting';
const text=field('text','Your text','textarea',{optional:true});
const lines=value=>value.split(/\r\n|\r|\n/);
export default {name:'Formatting',tools:[
  tool(base,'remove-line-breaks','Remove Line Breaks','Join lines into continuous text.',[text],({text})=>lines(text).map(line=>line.trim()).filter(Boolean).join(' ')),
  tool(base,'sort-lines-alphabetically','Sort Lines Alphabetically','Sort nonblank lines alphabetically.',[text],
    ({text})=>lines(text).filter(line=>line.trim()).sort((a,b)=>a.localeCompare(b,undefined,{sensitivity:'base'})).join('\n')),
  tool(base,'duplicate-line-remover','Duplicate Line Remover','Keep the first occurrence of each exact line.',[text],
    ({text})=>[...new Set(lines(text))].join('\n')),
  tool(base,'text-to-bullet-points','Text to Bullet Points','Turn each nonblank line into a bullet point.',[text],
    ({text})=>lines(text).map(line=>line.trim()).filter(Boolean).map(line=>'• '+line).join('\n'))
]};
