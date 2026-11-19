import {category,entry,n,t,area,select,format,integer,requireValue,items,reading,shuffle,duration} from '../shared.js';
import {date,dateField,iso} from '../date-helpers.js';
const study=area('text','One question | answer pair per line');
function pairs(text){
  const values=items(text).map(line=>{const bar=line.indexOf('|');return bar<=0?[]:[line.slice(0,bar).trim(),line.slice(bar+1).trim()];});
  requireValue(values.length&&values.every(([question,answer])=>question&&answer),'Enter each pair as question | answer.');
  return values;
}
const romanPairs=[[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']];
function roman(number) {
  integer(number,1,3999);let result='';
  for(const [value,symbol] of romanPairs) while(number>=value){result+=symbol;number-=value;}
  return result;
}
const prefixes={tera:12,giga:9,mega:6,kilo:3,hecto:2,deca:1,base:0,deci:-1,centi:-2,milli:-3,micro:-6,nano:-9,pico:-12};
export default category('Education & Study','/education-study','✎','Prepare revision, practise recall and track reading.',[
 ['Study Helpers',[
  entry('Flashcard Maker','Build cards with answers you can reveal.',[study],({text})=>({cards:pairs(text),text:pairs(text).map(pair=>pair.join(' — ')).join('\n')})),
  entry('Quiz Generator','Build a shuffled self-marking quiz from your question and answer pairs.',[study],({text})=>({quiz:shuffle(pairs(text)),text:'Answer each question, then check your score.'})),
  entry('Study Notes Organiser','Group notes by topic.',[area('text','One topic | note per line')],({text})=>{
    const topics=new Map();for(const [topic,note] of pairs(text)){ if(!topics.has(topic))topics.set(topic,[]);topics.get(topic).push('• '+note);}
    return [...topics].map(([topic,notes])=>topic+'\n'+notes.join('\n')).join('\n\n');
  })
 ]],
 ['Revision',[
  entry('Revision Timetable Generator','Rotate subjects across a chosen number of calendar days.',[area('text','One subject per line'),dateField('start','Start date'),n('days','Days',{value:7})],({text,start,days})=>{
    const subjects=items(text);requireValue(subjects.length,'Enter at least one subject.');
    return Array.from({length:integer(days,1,90)},(_,i)=>iso(new Date(+date(start)+i*86400000))+' — '+subjects[i%subjects.length]).join('\n');
  }),
  entry('Study Session Planner','Split study time among topics and insert breaks.',[area('text','One topic per line'),n('minutes','Total minutes',{value:60}),n('breaks','Minutes between topics',{value:5})],({text,minutes,breaks})=>{
    const topics=items(text);requireValue(topics.length,'Enter at least one topic.');
    integer(minutes,1,1440);integer(breaks,0,60);
    const work=minutes-(topics.length-1)*breaks;
    requireValue(work>=topics.length,'Allow at least one study minute per topic after breaks.');
    let elapsed=0;
    return topics.flatMap((topic,i)=>{
      const chunk=Math.floor(work/topics.length)+Number(i<work%topics.length);
      const plan=[duration(elapsed*60)+' — '+topic+' ('+chunk+' min)'];
      elapsed+=chunk;
      if(breaks&&i<topics.length-1){plan.push(duration(elapsed*60)+' — Break ('+breaks+' min)');elapsed+=breaks;}
      return plan;
    }).join('\n');
  })
 ]],
 ['Learning',[
  entry('Roman Numeral Converter','Convert whole numbers or canonical Roman numerals.',[t('value','Number or Roman numeral')],({value})=>{
    const input=value.trim().toUpperCase();
    if(/^\d+$/.test(input))return roman(Number(input));
    requireValue(/^[IVXLCDM]+$/.test(input),'Enter a whole number or a Roman numeral.');
    const values={I:1,V:5,X:10,L:50,C:100,D:500,M:1000};
    const total=[...input].reduce((sum,char,index)=>sum+values[char]*(values[char]<values[input[index+1]]?-1:1),0);
    requireValue(total>=1&&total<=3999&&roman(total)===input,'Enter a standard Roman numeral from I to MMMCMXCIX.');
    return total;
  }),
  entry('Periodic Table Explorer','Look up chemical elements by name, symbol or atomic number.',[t('query','Element name, symbol or atomic number',{optional:true})],async({query})=>{
    const response=await fetch(new URL('../../vendor/elements.json', import.meta.url));requireValue(response.ok,'Element data is unavailable.');
    const elements=await response.json(),term=query.trim().toLowerCase();
    const headers=['Number','Symbol','Element','Atomic mass','Category','Period'];
    const matches=elements.filter(row=>String(row[0])===term||row[1].toLowerCase()===term||row[2].toLowerCase().includes(term));
    requireValue(matches.length,'No elements match that search.');
    return {table:[headers,...matches],text:matches.map(row=>row.join(' • ')).join('\n')};
  },'Element data from Bowserinator’s Periodic Table JSON. Leave the search blank to see all elements.'),
  entry('Metric Prefix Converter','Convert a quantity between common SI prefixes.',[n('value','Value'),select('from','From',Object.keys(prefixes)),select('to','To',Object.keys(prefixes))],({value,from,to})=>format(value*10**(prefixes[from]-prefixes[to])))
 ]],
 ['Reading',[reading,
  entry('Reading Progress Calculator','Find your percentage complete and pages remaining.',[n('pages','Total pages'),n('read','Pages read')],({pages,read})=>{
    integer(pages,1,1000000);integer(read,0,pages);
    return format(read/pages*100)+'% complete\n'+(pages-read)+' pages remaining';
  })]]
]);
