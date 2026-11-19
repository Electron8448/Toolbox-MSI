import {category,entry,field,n,t,select,integer,requireValue,format} from '../shared.js';
const colour=(name,label,value='#086456')=>field(name,label,'color',{value});
function rgb(hex) {
  const clean=hex.trim().replace(/^#/,'');
  requireValue(/^(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(clean),'Enter a 3- or 6-digit HEX colour.');
  const full=clean.length===3?[...clean].map(c=>c+c).join(''):clean;
  return full.match(/../g).map(part=>parseInt(part,16));
}
const hex=parts=>'#'+parts.map(part=>Math.round(part).toString(16).padStart(2,'0')).join('').toUpperCase();
const colourResult=colours=>({text:colours.join('\n'),colours});
function hslToHex(h,s,l) {
  const a=s*Math.min(l,1-l);
  const channel=n=>{const k=(n+h/30)%12; return 255*(l-a*Math.max(-1,Math.min(k-3,9-k,1)));};
  return hex([channel(0),channel(8),channel(4)]);
}
const gradient=entry('Gradient Generator','Preview a two-colour gradient and copy the CSS.',[
  colour('first','First colour'),colour('second','Second colour','#E9B75B'),n('angle','Angle (degrees)',{value:90})
],({first,second,angle})=>{
  const background='linear-gradient('+angle+'deg, '+first+', '+second+')';
  return {text:'background: '+background+';',style:{background}};
});
const fonts={Serif:'Playfair Display + Source Sans 3\nCormorant Garamond + Inter',Modern:'DM Sans + Instrument Serif\nGeist + Bricolage Grotesque',Technical:'IBM Plex Mono + IBM Plex Sans\nSpace Mono + Inter'};
export default category('Colour & Design','/colour-design','◈','Create palettes and preview design values.',[
 ['Colour Tools',[
  entry('Colour Picker','Pick a colour and see its HEX and RGB values.',[colour('value','Colour')],({value})=>({text:value.toUpperCase()+'\nrgb('+rgb(value).join(', ')+')',colours:[value]})),
  entry('HEX to RGB Converter','Convert a HEX colour into RGB.',[t('value','HEX colour')],({value})=>{const parts=rgb(value);return {text:'rgb('+parts.join(', ')+')',colours:[hex(parts)]};}),
  entry('RGB to HEX Converter','Convert three RGB channels into HEX.',[n('r','Red'),n('g','Green'),n('b','Blue')],({r,g,b})=>colourResult([hex([r,g,b].map(value=>integer(value,0,255)))]))
 ]],
 ['Palettes',[
  entry('Colour Palette Generator','Generate a five-colour palette from a base hue.',[n('hue','Hue (0–359)',{value:260}),select('mode','Harmony',['Analogous','Triadic'])],({hue,mode})=>{
    integer(hue,0,359);
    const offsets=mode==='Analogous'?[-48,-24,0,24,48]:[0,120,240,0,120];
    return colourResult(offsets.map((offset,i)=>hslToHex((hue+offset+360)%360,.62,.33+i*.115)));
  }),
  entry('Complementary Colour Finder','Find the colour opposite on the HSL colour wheel.',[colour('value','Base colour')],({value})=>{
    const parts=rgb(value),sum=Math.max(...parts)+Math.min(...parts);
    return colourResult([value.toUpperCase(),hex(parts.map(part=>sum-part))]);
  }),gradient]],
 ['Design Helpers',[
  {...gradient,name:'CSS Gradient Generator'},
  entry('Box Shadow Generator','Preview a box shadow and copy its CSS.',[n('x','Horizontal offset',{value:4}),n('y','Vertical offset',{value:8}),n('blur','Blur',{value:20}),n('spread','Spread',{value:0}),colour('colour','Shadow colour','#235b50')],({x,y,blur,spread,colour})=>{
    requireValue(blur>=0,'Blur cannot be negative.');
    const boxShadow=[x,y,blur,spread].map(value=>value+'px').join(' ')+' '+colour;
    return {text:'box-shadow: '+boxShadow+';',style:{boxShadow}};
  }),
  entry('Border Radius Generator','Set each corner and preview the CSS border radius.',[n('a','Top left',{value:12}),n('b','Top right',{value:12}),n('c','Bottom right',{value:12}),n('d','Bottom left',{value:12})],({a,b,c,d})=>{
    requireValue([a,b,c,d].every(value=>value>=0),'Corner radii cannot be negative.');
    const borderRadius=[a,b,c,d].map(value=>value+'px').join(' ');
    return {text:'border-radius: '+borderRadius+';',style:{borderRadius}};
  })
 ]],
 ['Typography',[
  entry('Font Pairing Suggestions','Browse font pairings for a visual style.',[select('style','Style',Object.keys(fonts))],({style})=>fonts[style]),
  entry('Font Size Converter','Convert pixels, rems, ems and points with a specified base.',[n('size','Font size'),select('from','From',['px','rem','em','pt']),select('to','To',['rem','px','em','pt']),n('base','Base size in pixels',{value:16})],({size,from,to,base})=>{
    requireValue(size>=0&&base>0,'Enter a non-negative size and a positive base.');
    const scale={px:1,rem:base,em:base,pt:4/3};
    return format(size*scale[from]/scale[to])+' '+to;
  },'The same base is used for em and rem.')]
 ]
]);
