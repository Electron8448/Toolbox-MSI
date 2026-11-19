import {request as httpRequest} from 'node:http';
import {request as httpsRequest} from 'node:https';
import {Resolver} from 'node:dns/promises';
import {isIP} from 'node:net';

const resolver = new Resolver({timeout:3000,tries:1});

function publicIPv4(ip) {
  if (isIP(ip)!==4) return false;
  const [a,b]=ip.split('.').map(Number);
  return !(a===0||a===10||a===127||a>=224||(a===100&&b>=64&&b<=127)||
    (a===169&&b===254)||(a===172&&b>=16&&b<=31)||(a===192&&(b===0||b===168))||
    (a===198&&(b===18||b===19||b===51))||(a===203&&b===0));
}
function contact(url,address,method) {
  return new Promise((resolve,reject)=>{
    const transport=url.protocol==='https:'?httpsRequest:httpRequest;
    const outgoing=transport(url,{
      method,agent:false,family:4,autoSelectFamily:false,signal:AbortSignal.timeout(4000),
      lookup:(_name,options,callback)=>options.all?callback(null,[{address,family:4}]):callback(null,address,4),
      headers:{'User-Agent':'Toolbox Link Checker',...(method==='GET'?{Range:'bytes=0-0'}:{})}
    },incoming=>{
      resolve({code:incoming.statusCode,redirect:incoming.headers.location});
      incoming.destroy();
    });
    outgoing.on('error',reject);
    outgoing.end();
  });
}
async function inspect(value) {
  try {
    let url=new URL(value);
    for(let attempt=0;attempt<5;attempt++) {
      if (!['http:','https:'].includes(url.protocol)||url.username||url.password||url.port||
          url.hostname==='localhost'||url.hostname.endsWith('.localhost')) {
        return 'Only public HTTP and HTTPS URLs on their default ports are supported.';
      }
      const addresses=isIP(url.hostname)?[url.hostname]:await resolver.resolve4(url.hostname);
      if(!addresses.length||addresses.some(ip=>!publicIPv4(ip))) return 'This URL does not resolve to a supported public IPv4 address.';
      let result=await contact(url,addresses[0],'HEAD');
      if ([405,501].includes(result.code)) result=await contact(url,addresses[0],'GET');
      if ([301,302,303,307,308].includes(result.code)&&result.redirect) {
        url=new URL(result.redirect,url);
        continue;
      }
      return 'HTTP '+result.code+' • '+(result.code<400?'Reachable':'Server returned an error');
    }
    return 'Too many redirects.';
  } catch {
    return 'Could not verify this URL. Check the address or try again.';
  }
}
let active=0;
export async function checkLinks(incoming,response) {
  if(incoming.method!=='POST') {response.writeHead(405,{Allow:'POST'}).end();return;}
  if(active>=3) {response.writeHead(429).end();return;}
  active++;
  try {
    let body='';
    for await(const chunk of incoming) {
      body+=chunk.toString('utf8');
      if(body.length>12000){response.writeHead(413).end();return;}
    }
    const urls=JSON.parse(body);
    if(!Array.isArray(urls)||!urls.length||urls.length>5||urls.some(url=>typeof url!=='string'||url.length>2048)){
      response.writeHead(400).end();return;
    }
    const results=await Promise.all(urls.map(async url=>({url,status:await inspect(url)})));
    response.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'}).end(JSON.stringify(results));
  } catch {response.writeHead(400).end();}
  finally {active--;}
}
