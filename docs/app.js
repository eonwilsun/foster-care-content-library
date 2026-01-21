const DATA_URL = './data/content.json';

const els = {
  generatedAt: document.getElementById('generatedAt'),
  counts: document.getElementById('counts'),
  typeFilters: document.getElementById('typeFilters'),
  companyFilters: document.getElementById('companyFilters'),
  search: document.getElementById('search'),
  sources: document.getElementById('sources'),
  items: document.getElementById('items'),
  visibleCount: document.getElementById('visibleCount')
};

const state = {
  type: 'all',
  companyGroup: 'all',
  q: ''
};

function formatDate(isoDate) {
  if (!isoDate) return 'Unknown date';
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return 'Unknown date';
  return d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
}

function makeButtonRow(container, buttons, getActive, setActive) {
  container.innerHTML = '';
  for (const b of buttons) {
    const btn = document.createElement('button');
    btn.className = 'btn' + (getActive() === b.value ? ' btn--active' : '');
    btn.type = 'button';
    btn.textContent = b.label;
    btn.addEventListener('click', () => {
      setActive(b.value);
      // rerender active styles
      for (const child of container.querySelectorAll('button')) {
        child.classList.remove('btn--active');
      }
      btn.classList.add('btn--active');
      render();
    });
    container.appendChild(btn);
  }
}

let data = { generatedAt: null, sources: [], items: [] };

async function load() {
  // cache: 'no-store' helps if the browser wants to cache content.json.
  const res = await fetch(`${DATA_URL}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to load ${DATA_URL}: ${res.status}`);
  data = await res.json();
}

function filterItems() {
  const q = state.q.trim().toLowerCase();

  return data.items.filter((i) => {
    if (state.type !== 'all' && i.type !== state.type) return false;
    if (state.companyGroup !== 'all' && i.companyGroup !== state.companyGroup) return false;
    if (q) {
      const hay = `${i.title || ''} ${i.snippet || ''} ${i.company || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function renderItems(items) {
  els.items.innerHTML = '';

  if (!items.length) {
    const card = document.createElement('div');
    card.className = 'card';

    const h = document.createElement('h3');
    h.className = 'card__title';
    h.textContent = 'No items to show yet';

    const p = document.createElement('div');
    p.className = 'card__snippet';
    p.textContent =
      'This usually means the source does not have an RSS/Atom feed configured, or the feed URL is currently failing. The source links above still work, and you can add/adjust rssUrl values in sources.json anytime.';

    card.appendChild(h);
    card.appendChild(p);
    els.items.appendChild(card);
    return;
  }

  for (const i of items) {
    const card = document.createElement('div');
    card.className = 'card';

    const top = document.createElement('div');
    top.className = 'card__top';

    const h = document.createElement('h3');
    h.className = 'card__title';

    const a = document.createElement('a');
    a.href = i.link;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = i.title || '(untitled)';

    h.appendChild(a);

    const chips = document.createElement('div');
    chips.className = 'chip';
    chips.textContent = i.type === 'facebook' ? 'Facebook' : 'Website';

    top.appendChild(h);
    top.appendChild(chips);

    const snippet = document.createElement('div');
    snippet.className = 'card__snippet';
    snippet.textContent = i.snippet || '';

    const footer = document.createElement('div');
    footer.className = 'card__footer';

    const left = document.createElement('div');
    left.textContent = `${i.company} • ${formatDate(i.isoDate)}`;

    const right = document.createElement('a');
    right.href = i.pageUrl;
    right.target = '_blank';
    right.rel = 'noopener noreferrer';
    right.textContent = 'Source';

    footer.appendChild(left);
    footer.appendChild(right);

    card.appendChild(top);
    if (i.snippet) card.appendChild(snippet);
    card.appendChild(footer);

    els.items.appendChild(card);
  }
}

function render() {
  const items = filterItems();
  renderItems(items);

  els.visibleCount.textContent = `${items.length} visible`;
}

function initFilters() {
  makeButtonRow(
    els.typeFilters,
    [
      { value: 'all', label: 'All' },
      { value: 'facebook', label: 'Facebook' },
      { value: 'website', label: 'Website' }
    ],
    () => state.type,
    (v) => (state.type = v)
  );

  makeButtonRow(
    els.companyFilters,
    [
      { value: 'all', label: 'All' },
      { value: 'ours', label: 'Ours' },
      { value: 'competitor', label: 'Competitors' }
    ],
    () => state.companyGroup,
    (v) => (state.companyGroup = v)
  );

  els.search.addEventListener('input', () => {
    state.q = els.search.value;
    render();
  });
}

async function main() {
  initFilters();

  try {
    await load();
  } catch (err) {
    els.generatedAt.textContent = 'Failed to load content snapshot.';
    els.counts.textContent = err?.message || String(err);
    return;
  }

  const generated = data.generatedAt ? new Date(data.generatedAt) : null;
  els.generatedAt.textContent = generated
    ? `Snapshot: ${generated.toLocaleString()}`
    : 'Snapshot: unknown';

  const totalItems = data.items?.length || 0;
  const totalSources = data.sources?.length || 0;
  const feedEnabled = (data.sources || []).filter((s) => !!s.rssUrl).length;

  els.counts.textContent = `${totalItems} items • ${totalSources} sources (${feedEnabled} with feeds)`;

  render();
}

main();
