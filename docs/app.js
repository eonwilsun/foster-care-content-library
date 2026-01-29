const DATA_URL = './data/content.json';

const els = {
  generatedAt: document.getElementById('generatedAt'),
  counts: document.getElementById('counts'),
  typeFilters: document.getElementById('typeFilters'),
  companyFilters: document.getElementById('companyFilters'),
  specificCompanyFilters: document.getElementById('specificCompanyFilters'),
  search: document.getElementById('search'),
  sources: document.getElementById('sources'),
  items: document.getElementById('items'),
  visibleCount: document.getElementById('visibleCount')
};

const state = {
  type: 'all',
  companyGroup: 'all',
  specificCompany: 'all',
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
  // Add timestamp to force fresh fetch and bypass all caching
  const timestamp = new Date().getTime();
  const res = await fetch(`${DATA_URL}?v=${timestamp}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to load ${DATA_URL}: ${res.status}`);
  data = await res.json();
}

function filterItems() {
  const q = state.q.trim().toLowerCase();

  const filtered = data.items.filter((i) => {
    if (state.type !== 'all' && i.type !== state.type) return false;
    if (state.companyGroup !== 'all' && i.companyGroup !== state.companyGroup) return false;
    if (state.specificCompany !== 'all' && i.company !== state.specificCompany) return false;
    if (q) {
      const hay = `${i.title || ''} ${i.snippet || ''} ${i.company || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  // Sort by date descending (most recent first)
  filtered.sort((a, b) => {
    const dateA = new Date(a.isoDate || 0);
    const dateB = new Date(b.isoDate || 0);
    return dateB - dateA;
  });

  return filtered;
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

    // Add image thumbnail if available
    if (i.images && i.images.length > 0) {
      const img = document.createElement('img');
      img.className = 'card__image';
      img.src = i.images[0];
      img.alt = i.title || '';
      img.loading = 'lazy';
      card.appendChild(img);
    }

    const top = document.createElement('div');
    top.className = 'card__top';

    const h = document.createElement('h3');
    h.className = 'card__title';
    h.textContent = i.title || '(untitled)';

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
    right.href = i.link;
    right.target = '_blank';
    right.rel = 'noopener noreferrer';
    right.textContent = 'View';
    right.style.color = 'var(--accent)';
    right.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    footer.appendChild(left);
    footer.appendChild(right);

    card.appendChild(top);
    if (i.snippet) card.appendChild(snippet);
    card.appendChild(footer);

    // Click card to open article
    card.style.cursor = 'pointer';
    card.addEventListener('click', () => {
      window.open(i.link, '_blank', 'noopener,noreferrer');
    });

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

  // Build specific company filter buttons from data
  const uniqueCompanies = [...new Set(data.items.map(item => item.company))].sort();
  const companyButtons = [
    { value: 'all', label: 'All' },
    ...uniqueCompanies.map(company => ({ value: company, label: company }))
  ];

  makeButtonRow(
    els.specificCompanyFilters,
    companyButtons,
    () => state.specificCompany,
    (v) => (state.specificCompany = v)
  );

  els.search.addEventListener('input', () => {
    state.q = els.search.value;
    render();
  });
}

function openModal(item) {
  const modal = document.getElementById('modal');
  const modalBody = document.getElementById('modalBody');
  
  modalBody.innerHTML = '';

  const title = document.createElement('h2');
  title.className = 'modal__title';
  title.textContent = item.title || '(untitled)';

  const meta = document.createElement('div');
  meta.className = 'modal__meta';
  meta.innerHTML = `
    <span>${item.company}</span>
    <span>•</span>
    <span>${item.type === 'facebook' ? 'Facebook' : 'Website'}</span>
    <span>•</span>
    <span>${formatDate(item.isoDate)}</span>
  `;

  modalBody.appendChild(title);
  modalBody.appendChild(meta);

  // Show images
  if (item.images && item.images.length > 0) {
    const imagesContainer = document.createElement('div');
    imagesContainer.className = 'modal__images';
    item.images.forEach((imgSrc) => {
      const img = document.createElement('img');
      img.className = 'modal__image';
      img.src = imgSrc;
      img.alt = item.title || '';
      imagesContainer.appendChild(img);
    });
    modalBody.appendChild(imagesContainer);
  }

  // Show content (try to render HTML or fallback to snippet)
  const contentDiv = document.createElement('div');
  contentDiv.className = 'modal__content-text';
  
  if (item.content) {
    // Strip script tags for safety
    const safeContent = item.content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    contentDiv.innerHTML = safeContent;
  } else if (item.snippet) {
    const p = document.createElement('p');
    p.textContent = item.snippet;
    contentDiv.appendChild(p);
  }

  modalBody.appendChild(contentDiv);

  // Add link to original
  const link = document.createElement('a');
  link.className = 'modal__link';
  link.href = item.link;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = 'Read full article →';
  modalBody.appendChild(link);

  modal.classList.add('modal--open');
}

function closeModal() {
  const modal = document.getElementById('modal');
  modal.classList.remove('modal--open');
}

async function main() {
  // Close modal on backdrop or close button
  const modal = document.getElementById('modal');
  const closeBtn = modal.querySelector('.modal__close');
  const backdrop = modal.querySelector('.modal__backdrop');
  
  closeBtn.addEventListener('click', closeModal);
  backdrop.addEventListener('click', closeModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  try {
    await load();
  } catch (err) {
    els.generatedAt.textContent = 'Failed to load content snapshot.';
    els.counts.textContent = err?.message || String(err);
    return;
  }

  // Initialize filters after data is loaded (so we can populate company names)
  initFilters();

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
