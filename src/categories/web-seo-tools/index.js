import { staticHosting } from '../../routing.js';
import {category,entry,t,n,area,select,requireValue} from '../shared.js';
const text=area();
const characters=value=>[...new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(value)].length;
function webURL(value){
  const url=new URL(value.trim());
  requireValue(['http:','https:'].includes(url.protocol),'Enter an HTTP or HTTPS URL.');
  return url;
}
async function qr(value) {
  requireValue(value.trim(),'Enter text or a link to encode.');
  const {default:make}=await import('../../vendor/qrcode.mjs');
  make.stringToBytes=text=>new TextEncoder().encode(text);
  const qr=make(0,'M');qr.addData(value,'Byte');qr.make();
  const size=qr.getModuleCount();
  const canvas=document.createElement('canvas');canvas.width=canvas.height=(size+8)*6;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#000';
  for(let row=0;row<size;row++)for(let col=0;col<size;col++)if(qr.isDark(row,col))ctx.fillRect((col+4)*6,(row+4)*6,6,6);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
  requireValue(blob,'The QR image could not be created.');
  return {text:value,blob,filename:'toolbox-qr.png'};
}
const preview=(name,description,kind)=>entry(name,description,[text],async({text})=>{
  const html=kind==='markdown'?(await import('../../vendor/marked.mjs')).marked.parse(text):text;
  return {text,html:await html};
},'The preview blocks scripts, forms and external resources.');
function snippet(name,description,kind) {
  return entry(name,description,[t('url','Page URL',{optional:true}),t('title','Title'),{...area('description','Description'),optional:kind==='title'}],({url,title,description})=>({
    text:[url,title,description,characters(kind==='title'?title:description)+' characters'].filter(Boolean).join('\n'),
    snippet:{url,title,description}
  }),'This is an illustrative search preview. Actual search snippets may differ.');
}
export default category('Web & SEO Tools','/web-seo-tools','◎','Inspect URLs, preview snippets, and create QR codes.',[
 ['SEO',[snippet('Meta Title Preview','Preview how a title could look in search results.','title'),
  snippet('Meta Description Preview','Preview how a description could appear under a search title.','description'),
  entry('Keyword Counter','Count whole words or phrases in text, ignoring case.',[text,t('keyword','Keyword or phrase')],({text,keyword})=>{
    const term=keyword.trim();requireValue(term,'Enter a keyword.');
    const pattern=term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/\s+/g,'\\s+');
    return [...text.matchAll(new RegExp('(?<![\\p{L}\\p{N}_])'+pattern+'(?![\\p{L}\\p{N}_])','giu'))].length+' matches';
  })
 ]],
 ['Website',[
  entry('URL Parser','Break an HTTP URL into components and query parameters.',[t('url','URL')],({url})=>{
    const parsed=webURL(url);return ['Protocol: '+parsed.protocol,'Host: '+parsed.hostname,'Port: '+(parsed.port||'Default'),
      'Path: '+parsed.pathname,'Fragment: '+(parsed.hash||'None'),...Array.from(parsed.searchParams,([key,value])=>key+' = '+value)].join('\n');
  }),
  entry('Website Link Checker','Check HTTP status for up to five public website links.',[area('text','One HTTP or HTTPS link per line')],async({text})=>{
    requireValue(!staticHosting,'The link checker needs the Toolbox Node server. Run Toolbox locally to use it.');
    const urls=text.split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
    requireValue(urls.length&&urls.length<=5,'Enter between one and five links.');
    const response=await fetch('/api/check-links',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(urls)});
    requireValue(response.ok,'The link checker is temporarily unavailable.');
    const results=await response.json();return results.map(result=>result.url+'\n'+result.status).join('\n\n');
  },'Links are checked by the Toolbox server. It can reach public HTTP and HTTPS endpoints.'),
  entry('QR Code Generator','Create a downloadable QR code from text or a link.',[text],({text})=>qr(text))
 ]],
 ['Social Media',[
  entry('Hashtag Counter','Count hashtags and list unique tags.',[text],({text})=>{
    const tags=[...text.matchAll(/(?<![\p{L}\p{N}_])#[\p{L}\p{N}_]+/gu)].map(match=>match[0]);
    return tags.length+' hashtags\n'+[...new Set(tags.map(tag=>tag.toLowerCase()))].join(' ');
  }),
  entry('Social Post Character Counter','Count visible characters against a limit you set.',[text,n('limit','Character limit',{value:280})],({text,limit})=>{
    requireValue(Number.isSafeInteger(limit)&&limit>=1,'Enter a positive whole-number limit.');
    const count=characters(text);return count+' characters\n'+Math.abs(limit-count)+(count<=limit?' remaining':' over the limit');
  })
 ]],
 ['Formatting',[preview('HTML Previewer','Preview HTML in an isolated frame.','html'),preview('Markdown Previewer','Render Markdown in an isolated frame.','markdown')]]
]);
