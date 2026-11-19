import { simplifyFraction, equivalentPage } from '../../../../calculator/fractions.js';

export function fractionPage(tool, breadcrumbs) {
  return `${breadcrumbs(tool.category, tool.name)}
    <header class="page-heading"><span class="category-icon maths" aria-hidden="true">½</span>
      <h1>${tool.name}</h1><p>${tool.description}</p></header>
    <div class="fraction-layout">
      <form class="fraction-form panel" novalidate>
        <div class="field">
          <label for="fraction-query">Search for a fraction</label>
          <input id="fraction-query" name="fractionQuery" type="text" placeholder="e.g. 1/2 or 9/10" autocomplete="off" spellcheck="false" aria-describedby="fraction-error">
        </div>
        <fieldset class="stacked-entry">
          <legend>Or enter a stacked fraction</legend>
          <div class="fraction-fields">
            <input name="numerator" aria-label="Numerator" placeholder="Numerator" type="text" autocomplete="off" aria-describedby="fraction-error">
            <input name="denominator" aria-label="Denominator" placeholder="Denominator" type="text" autocomplete="off" aria-describedby="fraction-error">
          </div>
        </fieldset>
        <p id="fraction-error" class="error" role="alert"></p>
        <div class="actions"><button type="submit" class="primary">Search</button>
          <button type="reset" class="secondary">Reset</button></div>
      </form>
      <section class="result panel" aria-labelledby="result-title">
        <h2 id="result-title">Simplified fraction</h2>
        <div id="fraction-output" role="status"><p>Enter a fraction to see the result.</p></div>
      </section>
    </div>
    <section class="equivalents panel" id="equivalents" aria-labelledby="equivalents-title" hidden>
      <h2 id="equivalents-title">Equivalent fractions</h2>
      <p>Ordered by denominator, smallest first. Enter a filter to match an exact value.</p>
      <div class="filters">
        <div class="field"><label for="filter-numerator">Filter by numerator</label>
          <input id="filter-numerator" type="text" placeholder="Any numerator" autocomplete="off" aria-describedby="filter-status"></div>
        <div class="field"><label for="filter-denominator">Filter by denominator</label>
          <input id="filter-denominator" type="text" placeholder="Any denominator" autocomplete="off" aria-describedby="filter-status"></div>
      </div>
      <p id="filter-status" role="status"></p>
      <ol class="fraction-results" aria-label="Equivalent fractions"></ol>
      <button class="secondary more-fractions" type="button">Show more</button>
    </section>`;
}

function stackedFraction({ numerator, denominator }) {
  return `<span class="sr-only">${numerator} over ${denominator}</span>
    <span class="fraction" aria-hidden="true"><span>${numerator}</span><span>${denominator}</span></span>`;
}

export function bindFraction() {
  const form = document.querySelector('.fraction-form');
  const { fractionQuery, numerator, denominator } = form.elements;
  const error = document.querySelector('#fraction-error');
  const output = document.querySelector('#fraction-output');
  const equivalents = document.querySelector('#equivalents');
  const topFilter = document.querySelector('#filter-numerator');
  const bottomFilter = document.querySelector('#filter-denominator');
  const status = document.querySelector('#filter-status');
  const list = document.querySelector('.fraction-results');
  const more = document.querySelector('.more-fractions');
  const pageSize = 24;
  let reduced;
  let nextMultiplier = 1n;

  function clear() {
    error.textContent = '';
    output.innerHTML = '<p>Enter a fraction to see the result.</p>';
    equivalents.hidden = true;
    form.querySelectorAll('[aria-invalid]').forEach(input => input.removeAttribute('aria-invalid'));
  }

  function showEquivalents(append = false) {
    if (!append) {
      nextMultiplier = 1n;
      list.replaceChildren();
    }
    const page = equivalentPage(reduced, topFilter.value, bottomFilter.value, nextMultiplier, pageSize);
    for (const [field, input] of [['numerator', topFilter], ['denominator', bottomFilter]]) {
      if (page.field === field) input.setAttribute('aria-invalid', 'true');
      else input.removeAttribute('aria-invalid');
    }
    if (page.fractions.length) {
      list.insertAdjacentHTML('beforeend', page.fractions.map(value => `<li>${stackedFraction(value)}</li>`).join(''));
    }
    nextMultiplier = page.nextMultiplier;
    more.hidden = nextMultiplier === null;
    status.textContent = page.error ?? (page.fractions.length
      ? (more.hidden ? '1 matching fraction.' : `Showing ${list.children.length} equivalent fractions.`)
      : 'No equivalent fractions match these filters.');
  }

  form.addEventListener('input', event => {
    clear();
    if (event.target === fractionQuery) {
      const parts = fractionQuery.value.split('/');
      numerator.value = parts.length === 2 ? parts[0].trim() : '';
      denominator.value = parts.length === 2 ? parts[1].trim() : '';
    } else {
      fractionQuery.value = numerator.value || denominator.value ? `${numerator.value}/${denominator.value}` : '';
    }
  });
  form.addEventListener('reset', () => {
    clear();
    topFilter.value = '';
    bottomFilter.value = '';
    fractionQuery.focus();
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    clear();
    const parts = fractionQuery.value.split('/');
    const result = parts.length === 2
      ? simplifyFraction(...parts)
      : { error: 'Enter one fraction in the format 1/2.' };
    if (result.error) {
      error.textContent = result.error;
      const input = document.activeElement === numerator || document.activeElement === denominator
        ? form.elements.namedItem(result.field) ?? fractionQuery
        : fractionQuery;
      input.setAttribute('aria-invalid', 'true');
      input.focus();
      return;
    }
    reduced = result;
    output.innerHTML = stackedFraction(reduced);
    equivalents.hidden = false;
    showEquivalents();
  });
  topFilter.addEventListener('input', () => showEquivalents());
  bottomFilter.addEventListener('input', () => showEquivalents());
  more.addEventListener('click', () => showEquivalents(true));
}
