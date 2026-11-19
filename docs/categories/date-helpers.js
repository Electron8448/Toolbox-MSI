import {entry, field, n, t, requireValue, integer, duration} from './shared.js';
const day=86400000;
export const dateField=(name,label)=>field(name,label,'date');
export function date(value) {
  const parsed=new Date(value+'T00:00:00.000Z');
  requireValue(Number.isFinite(+parsed),'Choose a valid date.');
  return parsed;
}
export const iso=value=>value.toISOString().split('T')[0];
export const difference=entry('Date Difference Calculator','Count elapsed calendar days between two dates.',
  [dateField('start','Start date'),dateField('end','End date')],({start,end})=>Math.abs((date(end)-date(start))/day)+' days');
export const addDays=entry('Add Days to Date Calculator','Add or subtract calendar days.',
  [dateField('start','Date'),n('days','Days (negative to subtract)')],({start,days})=>iso(new Date(+date(start)+integer(days,-1000000,1000000)*day)));
export const timezone=entry('Time Zone Converter','Convert a local date and time between IANA time zones.',
  [field('time','Date and time','datetime-local'),t('from','From (e.g. Europe/London)'),t('to','To (e.g. America/New_York)')],({time,from,to})=>{
    const raw=Date.parse(time+'Z');
    requireValue(Number.isFinite(raw),'Choose a valid date and time.');
    const source=new Intl.DateTimeFormat('en-GB',{timeZone:from,dateStyle:'short',timeStyle:'long',hourCycle:'h23'});
    const offset=new Intl.DateTimeFormat('en-GB',{timeZone:from,timeZoneName:'longOffset'});
    const candidates=new Set();
    for(const shift of [-day,0,day]) {
      const token=offset.formatToParts(raw+shift).find(part=>part.type==='timeZoneName').value;
      const match=/GMT([+-])(\d{2}):(\d{2})(?::(\d{2}))?/.exec(token);
      const seconds=match?(match[1]==='-'?-1:1)*(+match[2]*3600 + +match[3]*60 + +(match[4]??0)):0;
      const utc=raw-seconds*1000;
      const same=new Intl.DateTimeFormat('sv-SE',{timeZone:from,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(utc).replace(' ','T');
      if (same===new Date(raw).toISOString().slice(0,19)) candidates.add(utc);
    }
    requireValue(candidates.size,'That local time does not exist in the source zone.');
    const target=new Intl.DateTimeFormat('en-GB',{timeZone:to,dateStyle:'full',timeStyle:'long'});
    return [...candidates].sort().map(utc=>source.format(utc)+' → '+target.format(utc)).join('\n');
  },'Use IANA names such as Europe/London, America/New_York or UTC. Ambiguous daylight-saving times show both results.');
export const timer=(name,description,fields,seconds,mode='countdown')=>({
  ...entry(name,description,fields,values=>({timer:{seconds:seconds(values),mode},text:''})),
  action: mode==='stopwatch'?'Start stopwatch':'Start timer'
});
export const minutesTimer=(name,description)=>timer(name,description,[n('minutes','Minutes',{value:25})],({minutes})=>Math.round(requirePositive(minutes)*60));
function requirePositive(value) {
  requireValue(value>0&&value<=10080,'Enter a duration above zero and at most one week.');
  return value;
}
export { duration };
