import {category,entry,field,n,t,select,integer,requireValue,duration} from '../shared.js';
import {date,dateField,iso,difference,addDays,timezone,timer,minutesTimer} from '../date-helpers.js';
const day=86400000;
function yearDate(year,month=0,day=1) {
  const result=new Date(0);
  result.setUTCFullYear(year,month,day);
  return result;
}
function timeSeconds(value) {
  const [hours,minutes,seconds=0]=value.split(':').map(Number);
  return hours*3600+minutes*60+seconds;
}
const calendar=entry('Calendar Generator','Generate a Monday-first calendar for a month.',[n('year','Year'),n('month','Month (1–12)')],({year,month})=>{
  integer(year,1,9999); integer(month,1,12);
  const first=yearDate(year,month-1), last=yearDate(year,month,0).getUTCDate();
  const cells=Array((first.getUTCDay()+6)%7).fill('  ');
  for(let d=1;d<=last;d++) cells.push(String(d).padStart(2,' '));
  const rows=[];
  for(let i=0;i<cells.length;i+=7) rows.push(cells.slice(i,i+7).join(' '));
  return first.toLocaleDateString('en-GB',{month:'long',year:'numeric',timeZone:'UTC'})+'\nMo Tu We Th Fr Sa Su\n'+rows.join('\n');
});
export default category('Date & Time','/date-time','◷','Work with dates, time zones, calendars and timers.',[
 ['Date Tools',[entry('Date Calculator','Add or subtract days, weeks, months or years.',
    [dateField('start','Date'),n('count','Amount (negative to subtract)'),select('unit','Unit',['Days','Weeks','Months','Years'])],
    ({start,count,unit})=>{
      integer(count,-100000,100000);
      const value=date(start);
      if(unit==='Days'||unit==='Weeks')return iso(new Date(+value+count*(unit==='Weeks'?7:1)*day));
      const target=yearDate(value.getUTCFullYear(),value.getUTCMonth()+count*(unit==='Years'?12:1));
      const final=yearDate(target.getUTCFullYear(),target.getUTCMonth()+1,0).getUTCDate();
      target.setUTCDate(Math.min(value.getUTCDate(),final));
      return iso(target);
    }),difference,addDays]],
 ['Time Tools',[
  {...entry('World Clock','Compare the current time in multiple time zones.',[field('zones','IANA zones, one per line','textarea',{value:'UTC\nEurope/London\nAmerica/New_York'})],({zones})=>{
    const names=zones.split(/\n/).map(zone=>zone.trim()).filter(Boolean);
    requireValue(names.length>0&&names.length<=20,'Enter 1 to 20 IANA time zone names.');
    const clocks=names.map(zone=>[zone,new Intl.DateTimeFormat('en-GB',{timeZone:zone,dateStyle:'medium',timeStyle:'medium'})]);
    return {text:'',live:()=>clocks.map(([zone,clock])=>zone+' — '+clock.format(new Date())).join('\n')};
  }),action:'Show clocks'},
  timezone,
  entry('Time Duration Calculator','Find elapsed time between two times, including overnight.',[field('start','Start time','time'),field('end','End time','time')],({start,end})=>duration((timeSeconds(end)-timeSeconds(start)+86400)%86400))
 ]],
 ['Calendar',[calendar,
  entry('Week Number Calculator','Find the ISO week number and week year.',[dateField('value','Date')],({value})=>{
    const thursday=date(value);
    thursday.setUTCDate(thursday.getUTCDate()+4-(thursday.getUTCDay()||7));
    const year=thursday.getUTCFullYear();
    return year+'-W'+String(Math.ceil(((thursday-yearDate(year))/day+1)/7)).padStart(2,'0');
  }),
  entry('Leap Year Checker','Check the Gregorian leap-year rule.',[n('year','Year')],({year})=>{
    integer(year,1,999999);
    return year+(year%4===0&&(year%100!==0||year%400===0)?' is a leap year.':' is a common year.');
  })]],
 ['Countdowns',[
  minutesTimer('Countdown Timer','Count down from a duration.'),
  timer('Stopwatch','Measure elapsed time.',[],()=>0,'stopwatch'),
  timer('Event Countdown','Count down to an event in your local time zone.',[field('target','Event date and time','datetime-local')],({target})=>{
    const seconds=Math.ceil((new Date(target)-Date.now())/1000);
    requireValue(seconds>0,'Choose a date and time in the future.'); return seconds;
  })
 ]]
]);
