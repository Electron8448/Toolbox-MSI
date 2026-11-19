function button(label, action) {
  const control=document.createElement('button');
  control.type='button';
  control.className='secondary';
  control.textContent=label;
  control.addEventListener('click',action);
  return control;
}
function node(tag,text) {
  const element=document.createElement(tag);
  if(text!==undefined)element.textContent=text;
  return element;
}
function table(rows) {
  const table=node('table');
  for(const [index,row] of rows.entries()){
    const line=table.insertRow();
    for(const value of row) {
      const cell=node(index===0?'th':'td',value);
      if(index===0)cell.scope='col';
      line.append(cell);
    }
  }
  const scroll=node('div');scroll.className='result-table';scroll.append(table);
  return scroll;
}
function timer(target,config,write) {
  let phase=config.mode==='stopwatch'?'Stopwatch':config.rest?'Focus':'Countdown';
  let started=Date.now(),paused=0,running=true,seconds=config.seconds;
  const status=node('p',phase);
  const pause=button('Pause',()=>{
    running=!running;
    if(running){started=Date.now()-paused;pause.textContent='Pause';}
    else{paused=Date.now()-started;pause.textContent='Resume';}
    tick();
  });
  target.append(status,pause);
  function tick(){
    if(!running)return;
    const elapsed=Math.max(0,Date.now()-started);
    const remaining=seconds-Math.floor(elapsed/1000);
    if(config.mode==='countdown'&&remaining<=0){
      if(phase==='Focus'&&config.rest){
        seconds=config.rest;phase='Break';started=Date.now();status.textContent=phase;
        return tick();
      }
      status.textContent=phase==='Break'?'Break complete.':'Time is up.';
      pause.disabled=true;running=false;
    }
    const value=config.mode==='stopwatch'?Math.floor(elapsed/1000):Math.max(0,remaining);
    write([Math.floor(value/3600),Math.floor(value/60)%60,value%60].map(part=>String(part).padStart(2,'0')).join(':'));
  }
  tick();
  const interval=setInterval(()=>target.isConnected?tick():clearInterval(interval),200);
  return ()=>clearInterval(interval);
}
function quiz(target,questions) {
  const inputs=questions.map(([question],index)=>{
    const label=node('label',(index+1)+'. '+question);
    const input=node('input');input.type='text';input.autocomplete='off';
    label.append(input);target.append(label);return input;
  });
  const score=node('p');score.setAttribute('role','status');
  target.append(button('Check answers',()=>{
    const normal=value=>value.trim().toLowerCase().replace(/\s+/g,' ');
    score.textContent=inputs.filter((input,index)=>normal(input.value)===normal(questions[index][1])).length+' / '+questions.length+' correct';
    inputs.forEach((input,index)=>input.setAttribute('aria-invalid',String(normal(input.value)!==normal(questions[index][1]))));
  }),score);
}
function wheel(target,{values,winner}) {
  const colours=['#086456','#d69a3d','#b96547','#47748c','#819657'];
  const disk=node('div');disk.className='decision-disk';
  disk.style.background='conic-gradient('+values.map((_,index)=>colours[index%colours.length]+' '+index/values.length*100+'% '+(index+1)/values.length*100+'%').join(',')+')';
  const pin=node('span','▼');pin.className='wheel-pin';
  const wrapper=node('div');wrapper.className='wheel-wrapper';wrapper.append(pin,disk);
  const key=node('ol');
  for (const [index,value] of values.entries()){
    const sector=node('span',index+1);
    const angle=(index+.5)*2*Math.PI/values.length;
    sector.style.left=50+38*Math.sin(angle)+'%';sector.style.top=50-38*Math.cos(angle)+'%';
    disk.append(sector);key.append(node('li',value));
  }
  target.append(wrapper,key);
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) disk.animate([{transform:'rotate(0deg)'},{transform:'rotate('+(1440-360*(winner+.5)/values.length)+'deg)'}],{duration:980,easing:'ease-out',fill:'forwards'});
  else disk.style.transform='rotate('+(-360*(winner+.5)/values.length)+'deg)';
}
export function showDetails(target,result,write) {
  const cleanups=[];
  const append=element=>target.append(element);
  if(result.colours){
    const row=node('div');row.className='swatches';
    for(const colour of result.colours){
      const item=node('span',colour);item.style.borderTopColor=colour;row.append(item);
    }
    append(row);
  }
  if(result.style){
    const sample=node('div');sample.className='design-sample';Object.assign(sample.style,result.style);
    append(sample);
  }
  if(result.table)append(table(result.table));
  if(result.cards)for(const [question,answer] of result.cards){
    const card=node('details');card.append(node('summary',question),node('p',answer));append(card);
  }
  if(result.quiz)quiz(target,result.quiz);
  if(result.wheel)wheel(target,result.wheel);
  if(result.snippet){
    const {url,title,description}=result.snippet;
    const preview=node('div');preview.className='snippet';
    preview.append(node('small',url),node('strong',title),node('p',description));append(preview);
  }
  if(result.blob){
    const url=URL.createObjectURL(result.blob);
    cleanups.push(()=>URL.revokeObjectURL(url));
    if (!result.downloadLabel) {
      const img=node('img');img.src=url;img.alt='Generated image';
      append(img);
    }
    const link=node('a',result.downloadLabel ?? 'Download image');
    link.href=url;link.download=result.filename;link.className='primary';
    append(link);
  }
  if(result.html!==undefined){
    const frame=node('iframe');frame.title='Document preview';frame.setAttribute('sandbox',result.runScripts ? 'allow-scripts' : '');
    frame.srcdoc='<meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; img-src data:; font-src data:; media-src data:; style-src \'unsafe-inline\' data:; '+(result.runScripts?"script-src 'unsafe-inline' data:; ":'')+'form-action \'none\'; base-uri \'none\'"><meta name="viewport" content="width=device-width">'+result.html;
    frame.inert=!result.runScripts;append(frame);
  }
  if(result.live){
    const tick=()=>write(result.live());tick();
    const interval=setInterval(()=>target.isConnected?tick():clearInterval(interval),1000);
    cleanups.push(()=>clearInterval(interval));
  }
  if(result.timer)cleanups.push(timer(target,result.timer,write));
  return ()=>cleanups.forEach(cleanup=>cleanup());
}
export function recordBook(tool,target,write) {
  const key='toolbox:records:'+tool.path;
  let records=[];
  try { const data=JSON.parse(localStorage.getItem(key)??'[]');if(Array.isArray(data))records=data; } catch {}
  function save(updated) {
    localStorage.setItem(key,JSON.stringify(updated));
    records=updated;
    render();
  }
  function act(operation) {
    try {operation();} catch {write('This browser could not save changes.');}
  }
  function render(){
    target.replaceChildren();
    const list=node('ul');list.className='record-list';
    records.forEach((record,index)=>{
      const item=node('li');
      item.append(node('span',record.text));
      if(tool.records.toggle) {
        const mark=button(record.done?'Mark incomplete':'Mark complete',()=>act(()=>save(records.map((value,i)=>i===index?{...value,done:!value.done}:value))));
        mark.setAttribute('aria-pressed',String(record.done));item.append(mark);
      }
      item.append(button('Delete',()=>act(()=>save(records.filter((_,i)=>i!==index)))));
      list.append(item);
    });
    target.append(list);
    write(records.length?records.map(record=>(tool.records.toggle?(record.done?'✓ ':'○ '):'')+record.text).join('\n'):'No entries yet.');
  }
  render();
  return text=>{if(!String(text).trim())throw new Error('Enter an entry before saving.');save([...records,{text:String(text),done:false}]);};
}
