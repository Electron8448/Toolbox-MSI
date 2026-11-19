import {recordBook,showDetails} from './tool-results.js';
const escape=value=>String(value??'').replace(/[&"<>]/g,char=>({'&':'&amp;','"':'&quot;','<':'&lt;','>':'&gt;'})[char]);

function control(field, index) {
  const id = 'tool-input-' + index;
  const common = `id="${id}" name="${field.name}"`;
  const required = field.optional ? '' : 'required';
  let input;
  if (field.type === 'textarea') {
    input = `<textarea ${common} rows="6" ${field.code ? 'class="code-input" spellcheck="false" autocapitalize="off" autocomplete="off"' : ''} ${required}>${escape(field.value)}</textarea>`;
  } else if (field.type === 'select') {
    input = `<select ${common}>${field.choices.map(([value, label]) =>
      `<option value="${escape(value)}">${escape(label)}</option>`).join('')}</select>`;
  } else {
    const step=field.type==='number'?'step="any"':'';
    const accept=field.accept?`accept="${escape(field.accept)}"`:'';
    input = `<input ${common} type="${field.type}" ${step} ${accept} value="${escape(field.value)}" autocomplete="off" ${required}>`;
  }
  const condition = field.when ? ` data-when="${field.when.join('|')}"` : '';
  return `<div class="field"${condition}><label for="${id}">${field.label}</label>${input}</div>`;
}

export function standardPage(tool, breadcrumbs) {
  return `${breadcrumbs(tool.category, tool.group, tool.name)}
    <header class="page-heading"><span class="category-icon ${tool.category.theme}" aria-hidden="true">${tool.category.icon}</span>
      <h1>${tool.name}</h1><p>${tool.description}</p></header>
    <form class="panel standard-tool">
      ${tool.note ? `<p class="tool-note">${tool.note}</p>` : ''}
      ${tool.fields.map(control).join('')}
      <p class="error" role="alert"></p>
      <div class="actions"><button class="primary">${tool.action??'Run tool'}</button><button class="secondary" type="reset">Reset</button></div>
    </form>
    <section class="panel standard-result" aria-labelledby="standard-result-title" hidden>
      <h2 id="standard-result-title">${tool.records?'Saved entries':'Result'}</h2>
      <div class="result-details"></div><pre aria-live="polite"></pre>
      <div class="actions"><button class="secondary" type="button" data-copy>Copy result</button><span role="status"></span></div>
    </section>`;
}

export function bindStandard(tool) {
  const form = document.querySelector('.standard-tool');
  const result = document.querySelector('.standard-result');
  const output = result.querySelector('pre');
  const details = result.querySelector('.result-details');
  const error = form.querySelector('.error');
  const message = result.querySelector('[role=status]');
  const copy=result.querySelector('[data-copy]');
  const write=value=>{output.textContent=String(value??'');};
  let dispose=()=>{};
  let run=0;
  const save=tool.records?recordBook(tool,details,write):null;
  if(save)result.hidden=false;
  function updateFields() {
    for (const wrapper of form.querySelectorAll('[data-when]')) {
      const [name, ...choices] = wrapper.dataset.when.split('|');
      wrapper.hidden = !choices.includes(form.elements.namedItem(name).value);
      wrapper.querySelector('input, select, textarea').disabled = wrapper.hidden;
    }
  }
  function clear() {
    run++;
    form.removeAttribute('aria-busy');
    error.textContent='';
    message.textContent='';
    if(save)return;
    dispose();
    dispose=()=>{};
    details.replaceChildren();
    result.hidden=true;
  }
  form.addEventListener('change', updateFields);
  form.addEventListener('input', clear);
  form.addEventListener('reset', () => {clear();queueMicrotask(updateFields);});
  form.addEventListener('submit', async event => {
    event.preventDefault();
    clear();
    const current=run;
    const values = Object.fromEntries(tool.fields.flatMap(field=>{
      const control=form.elements.namedItem(field.name);
      if(control.disabled)return [];
      const value=field.type==='number'?control.valueAsNumber:field.type==='file'?control.files[0]:control.value;
      return [[field.name,value]];
    }));
    message.textContent='Working…';
    form.setAttribute('aria-busy','true');
    try {
      const value=await tool.run(values);
      if(current!==run||!form.isConnected)return;
      if(save){save(value);form.reset();return;}
      result.hidden=false;
      const presentation=value&&typeof value==='object'?value:{text:value};
      write(presentation.text);
      dispose=showDetails(details,presentation,write);
    } catch (failure) {
      if(current===run)error.textContent=failure.message||'The tool could not complete this request.';
    } finally {
      if(current===run){message.textContent='';form.removeAttribute('aria-busy');}
    }
  });
  copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(output.textContent);
      message.textContent = 'Copied.';
    } catch {
      message.textContent = 'Select the result and copy it manually.';
    }
  });
  updateFields();
  return disposeResult;
  function disposeResult(){dispose();}
}
