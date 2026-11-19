import {category,entry,n,t,area,select,items,integer,requireValue} from '../shared.js';
import {dateField, timer,minutesTimer} from '../date-helpers.js';
const records=(name,description,fields,run,toggle=false)=>({...entry(name,description,fields,run,'Entries are saved in this browser.'),records:{toggle},action:'Add entry'});
const title=t('title','Title');
const details=area('details','Details');
const tasks=(name,description)=>records(name,description,[title],({title})=>title,true);
const planner=(name,description,label)=>records(name,description,[dateField('date',label),title,{...details,optional:true}],({date,title,details})=>date+' — '+title+(details?'\n'+details:''));
export default category('Productivity','/productivity','✓','Plan work, manage time and keep track of goals.',[
 ['Planning',[tasks('To-Do List','Save tasks and mark them complete.'),planner('Daily Planner','Save plans by date.','Day'),planner('Weekly Planner','Save plans by the start date of the week.','Week starting')]],
 ['Organisation',[tasks('Checklist Maker','Build a checklist and tick off items.'),
  records('Simple Notes','Save short notes in your browser.',[title,details],({title,details})=>title+'\n'+details),
  entry('Task Prioritiser','Order tasks by urgency and importance.',[area('text','One task | urgency | importance per line')],({text})=>{
    const tasks=items(text).map(line=>{
      const parts=line.split('|').map(value=>value.trim());
      requireValue(parts.length===3&&parts[0]&&/^[1-5]$/.test(parts[1])&&/^[1-5]$/.test(parts[2]),'Use task | urgency | importance, with ratings from 1 to 5.');
      return {name:parts[0],score:Number(parts[1])+Number(parts[2])};
    });
    requireValue(tasks.length,'Enter at least one task.');
    return tasks.sort((a,b)=>b.score-a.score).map(task=>task.score+' / 10 — '+task.name).join('\n');
  })
 ]],
 ['Time Management',[
  {...timer('Pomodoro Timer','Run a focus session followed by a timed break.',[n('work','Focus minutes',{value:25}),n('rest','Break minutes',{value:5})],({work})=>integer(work,1,240)*60),run:({work,rest})=>({text:'',timer:{seconds:integer(work,1,240)*60,rest:integer(rest,1,120)*60,mode:'countdown'}})},
  minutesTimer('Focus Timer','Count down a focus session.'),
  minutesTimer('Break Reminder','Count down until it is time to take a break.')
 ]],
 ['Goals',[
  records('Goal Tracker','Save goals with a target date and mark them complete.',[title,dateField('date','Target date')],({title,date})=>title+' — due '+date,true),
  records('Habit Tracker','Record habits by date and tick off each occurrence.',[title,dateField('date','Date')],({title,date})=>date+' — '+title,true)
 ]]
]);
