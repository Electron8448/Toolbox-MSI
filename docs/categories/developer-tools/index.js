import codeEditor from './utilities/code-editor.js';
import {category,entry,area,select,requireValue} from '../shared.js';
const text=area('text','Source text');
const code=(name,description,run,fields=[text])=>entry(name,description,fields,run);
async function pretty(text,parser,files) {
  const {format}=await import('../../vendor/prettier.mjs');
  const plugins=await Promise.all(files.map(file=>import('../../vendor/'+file+'.mjs')));
  return format(text,{parser,plugins:plugins.map(plugin=>plugin.default??plugin)});
}
function jsonLayout(text, pretty) {
  JSON.parse(text);
  const tokens = text.match(/"(?:\\.|[^"\\])*"|[{}\[\],:]|[^\s{}\[\],:]+/g);
  if (!pretty) return tokens.join('');
  let depth = 0;
  const indent = () => '\n' + '  '.repeat(depth);
  return tokens.map((token, index) => {
    if (token === '{' || token === '[') {
      depth++;
      return token + (['}', ']'].includes(tokens[index + 1]) ? '' : indent());
    }
    if (token === '}' || token === ']') {
      depth--;
      return (['{', '['].includes(tokens[index - 1]) ? '' : indent()) + token;
    }
    if (token === ',') return token + indent();
    if (token === ':') return ': ';
    return token;
  }).join('');
}

function entity(text,mode) {
  const map={'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'};
  if(mode==='Encode') return text.replace(/[&<>"']/g,char=>map[char]);
  const node=document.createElement('textarea');
  return text.replace(/&(?:#[xX][\da-fA-F]+|#\d+|[a-zA-Z][\w]+);/g,value=>{
    node.innerHTML=value;
    return node.value;
  });
}
const mode=select('mode','Action',['Encode','Decode']);
function base64(text,mode) {
  if(mode==='Decode') return new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(atob(text.replace(/\s/g,'')),char=>char.charCodeAt(0)));
  const bytes=new TextEncoder().encode(text);
  let binary='';
  for(let i=0;i<bytes.length;i+=8192) binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
  return btoa(binary);
}
export default category('Developer Tools','/developer-tools','⌘','Format code, validate JSON and encode text.',[
 ['JSON',[
  code('JSON Formatter','Format JSON with readable indentation.',({text})=>jsonLayout(text,true)),
  code('JSON Validator','Check whether input is syntactically valid JSON.',({text})=>{JSON.parse(text);return 'Valid JSON.';}),
  code('JSON Minifier','Remove unnecessary whitespace from JSON.',({text})=>jsonLayout(text,false))
 ]],
 ['HTML',[
  code('HTML Formatter','Format HTML using Prettier.',({text})=>pretty(text,'html',['html'])),
  code('HTML Entity Converter','Encode special characters or decode HTML entities.',({text,mode})=>entity(text,mode),[text,mode])
 ]],
 ['CSS',[
  code('CSS Minifier','Minify CSS using CSSO.',async({text})=>{
    const {minify}=await import('../../vendor/csso.mjs');return minify(text,{restructure:false}).css;
  }),
  code('CSS Formatter','Format CSS using Prettier.',({text})=>pretty(text,'css',['postcss']))
 ]],
 ['JavaScript',[
  code('JavaScript Formatter','Format JavaScript using Prettier.',({text})=>pretty(text,'babel',['babel','estree'])),
  code('JavaScript Minifier','Minify JavaScript without running it.',async({text})=>{
    await import('../../vendor/terser.js');
    requireValue(globalThis.Terser,'The JavaScript minifier is unavailable. Reload this page.');
    return (await globalThis.Terser.minify(text,{compress:false,mangle:false})).code??'';
  })
 ]],
 ['Encoding',[
  code('Base64 Encoder/Decoder','Convert UTF-8 text to and from Base64.',({text,mode})=>base64(text,mode),[text,mode]),
  code('URL Encoder/Decoder','Percent-encode or decode an individual URL component.',({text,mode})=>mode==='Encode'?encodeURIComponent(text):decodeURIComponent(text),[text,mode])
 ]],
 ['Utilities',[
  codeEditor,
  code('UUID Generator','Generate a random UUID version 4.',()=>crypto.randomUUID(),[]),
  code('Hash Generator','Compute a SHA hash for UTF-8 text.',async({text,algorithm})=>{
    const digest=await crypto.subtle.digest(algorithm,new TextEncoder().encode(text));
    return [...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,'0')).join('');
  },[area('text','Source text'),select('algorithm','Algorithm',['SHA-256','SHA-384','SHA-512'])])
 ]]
]);
