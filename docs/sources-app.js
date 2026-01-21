const DATA_URL = './data/content.json';

const els = {
  generatedAt: document.getElementById('generatedAt'),
  counts: document.getElementById('counts'),
  sources: document.getElementById('sources')
};

let data = { generatedAt: null, sources: [], items: [] };

async function load() {
  const res = await fetch(`${DATA_URL}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to load ${DATA_URL}: ${res.status}`);
  data = await res.json();
}

function renderSources() {
  els.sources.innerHTML = '';
  for (const s of data.sources) {
    const card = document.createElement('div');
    card.className = 'sourceCard';

    const left = document.createElement('div');
    left.className = 'sourceCard__left';

    const title = document.createElement('div');
    title.className = 'sourceCard__title';
    const a = document.createElement('a');
    a.href = s.pageUrl;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = s.title;
    title.appendChild(a);

    const meta = document.createElement('div');
    meta.className = 'sourceCard__meta';
    meta.textContent = `${s.company} • ${s.type === 'facebook' ? 'Facebook' : 'Website'} • ${s.companyGroup === 'competitor' ? 'Competitor' : 'Ours'}`;

    left.appendChild(title);
    left.appendChild(meta);

    const right = document.createElement('div');
    if (s.rssUrl) {
      const chip = document.createElement('span');
      chip.className = 'chip chip--ok';
      chip.textContent = 'Feed enabled';
      right.appendChild(chip);
    } else {
      const chip = document.createElement('span');
      chip.className = 'chip chip--warn';
      chip.textContent = 'Link only (no RSS)';
      right.appendChild(chip);
    }

    if (s.warning) {
      const warn = document.createElement('div');
      warn.className = 'chip chip--warn';
      warn.style.marginTop = '8px';
      warn.textContent = s.warning;
      right.appendChild(warn);
    }

    card.appendChild(left);
    card.appendChild(right);
    els.sources.appendChild(card);
  }
}

async function main() {
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

  renderSources();
}

main();
