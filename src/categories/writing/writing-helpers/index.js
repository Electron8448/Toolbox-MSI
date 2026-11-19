import { field, choice, tool, requireValue } from '../../tool-fields.js';
import { words } from '../text-tools/index.js';
import { capitalise } from '../grammar-spelling/index.js';
const base='/writing/writing-helpers';
const text=field('text','Your text','textarea');
const clean=value=>value.trim().replace(/[^\S\r\n]+/g,' ').replace(/ +([,.!?;:])/g,'$1');
function rewrite(text,rules) {
  requireValue(text.trim(),'Enter text to work on.');
  let result=clean(text);
  for (const [pattern,replacement] of rules) result=result.replace(pattern,replacement);
  return capitalise(result);
}
const concise=[
  [/\bin order to\b/gi,'to'],[/\bdue to the fact that\b/gi,'because'],[/\bat this point in time\b/gi,'now'],
  [/\ba large number of\b/gi,'many'],[/\bhas the ability to\b/gi,'can'],[/\bfor the purpose of\b/gi,'for'],
  [/\bin the event that\b/gi,'if'],[/\butili[sz]e\b/gi,'use']
];
const formal=[
  [/\bcan't\b/gi,'cannot'],[/\bwon't\b/gi,'will not'],[/\bdon't\b/gi,'do not'],
  [/\bit's\b/gi,'it is'],[/\bwe're\b/gi,'we are'],[/\bthat's\b/gi,'that is'],[/\bthanks\b/gi,'thank you']
];
const friendly=[
  [/\bplease be advised that\s+/gi,''],[/\bdo not hesitate to contact me\b/gi,'feel free to get in touch'],
  [/\bthank you for your assistance\b/gi,'thanks for your help'],[/\bI would appreciate it if you could\b/gi,'could you please'],
  [/\bwe would like to\b/gi,"we'd like to"]
];
function changed(result, original) {
  return result===original.trim() ? 'No edits suggested.\n\n'+result : result;
}
const segmenter=new Intl.Segmenter('en',{granularity:'sentence'});
const stop=new Set('a an and are as at be been but by can for from had has have i if in is it its of on or our that the their they this to was we were will with you'.split(' '));
function summarise(text, count) {
  const sentences=[...segmenter.segment(text.trim())].map(({segment})=>segment.trim()).filter(Boolean);
  requireValue(sentences.length,'Enter text to summarise.');
  const tokens=sentences.map(sentence=>words(sentence.toLowerCase()).filter(word=>!stop.has(word)));
  const counts=new Map();
  for(const token of tokens.flat()) counts.set(token,(counts.get(token)??0)+1);
  return tokens.map((tokens,index)=>({index,score:[...new Set(tokens)].reduce((score,word)=>score+counts.get(word),0)/Math.sqrt(tokens.length||1)}))
    .sort((a,b)=>b.score-a.score || a.index-b.index).slice(0,count).sort((a,b)=>a.index-b.index)
    .map(({index})=>sentences[index]).join(' ');
}
export default {name:'Writing Helpers',tools:[
  tool(base,'sentence-rewriter','Sentence Rewriter','Rewrite common wordy phrases in simpler language.',[text],({text})=>changed(rewrite(text,concise),text),
    'This local editor replaces common wordy phrases and tidies capitalisation and spacing.'),
  tool(base,'text-summariser','Text Summariser','Extract key sentences from longer text.',
    [text,choice('count','Maximum sentences',[['3','3 sentences'],['1','1 sentence'],['5','5 sentences']])],
    ({text,count})=>summarise(text,Number(count))),
  tool(base,'tone-changer','Tone Changer','Adjust common phrases to sound more formal or friendly.',
    [text,choice('tone','Tone',[['formal','Formal'],['friendly','Friendly']])],
    ({text,tone})=>changed(rewrite(text,tone==='formal'?formal:friendly),text),'Local phrase substitutions work best with English text.'),
  tool(base,'paragraph-improver','Paragraph Improver','Improve readability with concise wording and consistent spacing.',[text],({text})=>{
    requireValue(text.trim(),'Enter a paragraph to improve.');
    const result=text.trim().split(/\r?\n\s*\r?\n/).map(paragraph=>
      rewrite(paragraph.replace(/\r?\n/g,' '),[...concise,[/\b(\p{L}+)\s+\1\b/giu,'$1']])).join('\n\n');
    return changed(result,text);
  },'Local edits shorten common phrases, remove consecutive duplicate words and preserve paragraph breaks.')
]};
