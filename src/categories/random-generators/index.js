import {category,entry,n,area,items,integer,random,randomNumber,pick,shuffle,requireValue} from '../shared.js';
const listPicker=(name,description)=>entry(name,description,[area('text','One item per line')],({text})=>pick(items(text)));
const vocabulary='anchor apple apricot atlas aurora bamboo basalt beacon berry bicycle birch blossom breeze bridge brook canyon cedar cherry circle cloud clover comet coral crane cricket crystal dawn dolphin dune eagle ember fern field finch fjord flame forest frost galaxy garden glacier grain grape gull harbour hazel heather horizon island ivy jade jasmine juniper kelp kite lagoon lantern lark leaf lemon lighthouse lilac lily lime lotus maple marble meadow meteor mint mist moon moss mountain nectar oasis ocean olive opal orchid otter owl palm panda peach pearl pebble pine plum poetry poppy prism pumpkin quartz rabbit rain raven reef river robin rose ruby sage satin seed shell sky snow sparrow spring star stone storm stream summit sun sunset swift thunder tide tiger trail tulip valley velvet violet wave wheat willow wind winter wren'.split(' ');
const count=n('count','Count',{value:5});
function groups(name,description,mode){
  return entry(name,description,[area('text','One name per line'),n('count',mode==='teams'?'Number of teams':'Maximum group size',{value:2})],({text,count})=>{
    const names=shuffle(items(text));
    requireValue(names.length,'Enter at least one name.');
    integer(count,1,names.length);
    const total=mode==='teams'?count:Math.ceil(names.length/count);
    const teams=Array.from({length:total},()=>[]);
    names.forEach((name,index)=>teams[index%total].push(name));
    return teams.map((team,index)=>(mode==='teams'?'Team ':'Group ')+(index+1)+'\n'+team.join('\n')).join('\n\n');
  });
}
export default category('Random Generators','/random-generators','⚄','Pick random numbers, names, groups and decisions.',[
 ['Numbers',[randomNumber,{...randomNumber,name:'Number Range Picker'},
  entry('Random Number List Generator','Generate a list of random integers. Repeats are allowed.',[...randomNumber.fields,count],({min,max,count})=>Array.from({length:integer(count,1,1000)},()=>random(min,max)).join('\n'))]],
 ['Words',[
  entry('Random Word Generator','Pick random words from a built-in English list.',[count],({count})=>Array.from({length:integer(count,1,100)},()=>pick(vocabulary)).join('\n')),
  entry('Random Letter Generator','Pick random letters from A to Z.',[count],({count})=>Array.from({length:integer(count,1,1000)},()=>String.fromCharCode(random(65,90))).join(' '))]],
 ['Decisions',[
  entry('Yes or No Generator','Choose yes or no with equal probability.',[],()=>pick(['Yes','No'])),
  listPicker('Random Choice Picker','Choose among options on separate lines.'),
  {...listPicker('Decision Wheel','Spin a wheel to choose from your options.'),run:({text})=>{
    const values=items(text);integer(values.length,2,30);
    const winner=random(0,values.length-1);
    return {text:values[winner],wheel:{values,winner}};
  },action:'Spin wheel'}
 ]],
 ['Groups',[groups('Team Generator','Shuffle names into a chosen number of balanced teams.','teams'),groups('Group Splitter','Split names into balanced groups below a size limit.','groups'),listPicker('Random Name Picker','Pick one name from your list.')]]
]);
