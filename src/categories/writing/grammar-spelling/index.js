import { field, tool, requireValue } from '../../tool-fields.js';
import { words } from '../text-tools/index.js';
const base='/writing/grammar-spelling';
const text=field('text','Your text','textarea');
const report=(issues,level)=>issues.length ? issues.join('\n') : 'No issues found by these '+level+' checks.';
export function capitalise(text) {
  return text.replace(/(^|[.!?][”"'’)]*\s+|\n+)([ "'“‘(]*)(\p{Ll})/gu,
    (_,prefix,quotes,letter)=>prefix+quotes+letter.toUpperCase()).replace(/\bi(?=\b|['’])/g,'I');
}
const typos=new Map(Object.entries({teh:'the',recieve:'receive',seperate:'separate',definately:'definitely',occured:'occurred',
  accomodate:'accommodate',wierd:'weird',untill:'until',becuase:'because',tommorow:'tomorrow',neccessary:'necessary',adress:'address',
  enviroment:'environment',goverment:'government',thier:'their',freind:'friend',langauge:'language',independant:'independent',mispell:'misspell',
  grammer:'grammar',acheive:'achieve',alot:'a lot',writting:'writing',speling:'spelling',sentance:'sentence',errror:'error'}));
export default {name:'Grammar & Spelling',tools:[
  tool(base,'grammar-checker','Grammar Checker','Flag common grammar and usage patterns.',[text],({text})=>{
    requireValue(text.trim(),'Enter text to check.');
    const issues=[];
    for (const match of text.matchAll(/\b(\p{L}+)\s+\1\b/giu)) issues.push('Possible repeated word: '+match[0]);
    for (const match of text.matchAll(/\b(?:could|should|would) of\b/gi)) issues.push('Consider “'+match[0].replace(/of$/i,'have')+'” in place of “'+match[0]+'”.');
    for (const match of text.matchAll(/\b(?:they|we|you) is\b|\bi (?:is|are)\b|\b(?:she|he|it) are\b/gi)) issues.push('Check subject–verb agreement: '+match[0]);
    return report(issues,'grammar');
  },'Local checks cover repeated words, common usage and subject–verb agreement patterns.'),
  tool(base,'spell-checker','Spell Checker','Find common English misspellings and see suggested corrections.',[text],({text})=>{
    requireValue(text.trim(),'Enter text to check.');
    return report([...new Set(words(text).map(word=>word.toLowerCase()))].filter(word=>typos.has(word))
      .map(word=>word+' → '+typos.get(word)),'common-misspelling');
  },'This tool checks a built-in list of common misspellings. Your browser may underline other words as you type.'),
  tool(base,'punctuation-checker','Punctuation Checker','Spot spacing problems, repeated punctuation and unmatched brackets.',[text],({text})=>{
    requireValue(text.trim(),'Enter text to check.');
    const issues=[];
    if (/[^\S\n][,.;:!?]/u.test(text)) issues.push('Remove spaces before punctuation.');
    if (/[,.!?;:]\p{L}/u.test(text.replace(/(?:https?:\/\/|www\.)\S+|[\w.+-]+@[\w.-]+|\b(?:[A-Za-z]\.){2,}/gi,''))) issues.push('Check for missing spaces after punctuation.');
    if (/([,;:!?])\1+/u.test(text)) issues.push('Check repeated punctuation.');
    const stack=[];
    const closing={')':'(',']':'[','}':'{'};
    for(const token of text.match(/[()[\]{}]/g) ?? []) {
      if ('([{'.includes(token)) stack.push(token);
      else if (stack.pop()!==closing[token]) { issues.push('Check unmatched brackets.'); break; }
    }
    if (stack.length && !issues.includes('Check unmatched brackets.')) issues.push('Check unmatched brackets.');
    if (/[\p{L}\p{N}]["'”’)]*$/u.test(text.trim())) issues.push('Check whether the final sentence needs punctuation.');
    return report(issues,'punctuation');
  }),
  tool(base,'capitalisation-fixer','Capitalisation Fixer','Capitalise sentence openings and the pronoun “I”.',[text],({text})=>{
    requireValue(text.trim(),'Enter text to fix.');
    return capitalise(text);
  })
]};
