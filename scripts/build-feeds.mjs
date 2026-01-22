import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Parser from 'rss-parser';
import { scrapers } from './scrapers.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, '..');
const SOURCES_PATH = path.join(ROOT, 'sources.json');
const OUT_DIR = path.join(ROOT, 'docs', 'data');
const OUT_PATH = path.join(OUT_DIR, 'content.json');

// Fetch featured image from article page if not in RSS feed
async function fetchFeaturedImage(url) {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    if (!response.ok) return null;
    
    const html = await response.text();
    
    // Try multiple patterns for featured images
    const patterns = [
      // WordPress featured image in meta tags
      /<meta property="og:image" content="([^"]+)"/i,
      /<meta name="twitter:image" content="([^"]+)"/i,
      // WordPress featured image in article
      /<article[^>]*>[\s\S]*?<img[^>]+src=["']([^"']+)["']/i,
      // First image in main content
      /<main[^>]*>[\s\S]*?<img[^>]+src=["']([^"']+)["']/i
    ];
    
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match && match[1] && /^https?:\/\//i.test(match[1])) {
        return match[1];
      }
    }
    
    return null;
  } catch (error) {
    console.error(`Failed to fetch featured image from ${url}:`, error.message);
    return null;
  }
}

const parser = new Parser({
  timeout: 20000,
  headers: {
    'User-Agent': 'github-pages-feed-aggregator (+https://github.com/)'
  },
  customFields: {
    item: [
      ['content:encoded', 'contentEncoded']
    ]
  }
});

function toIsoDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function normalizeText(value) {
  if (!value) return '';
  return String(value)
    .replace(/\s+/g, ' ')
    .trim();
}

function stableId({ sourceId, link, isoDate, title }) {
  const base = [sourceId, link || '', isoDate || '', title || ''].join('|');
  let hash = 0;
  for (let i = 0; i < base.length; i++) {
    hash = (hash * 31 + base.charCodeAt(i)) >>> 0;
  }
  return `${sourceId}:${hash.toString(16)}`;
}

async function loadSources() {
  const raw = await fs.readFile(SOURCES_PATH, 'utf8');
  const parsed = JSON.parse(raw);
  if (!parsed || !Array.isArray(parsed.sources)) {
    throw new Error('sources.json must contain a top-level "sources" array');
  }

  const normalized = parsed.sources.map((s) => ({
    id: String(s.id || '').trim(),
    company: String(s.company || '').trim(),
    companyGroup: (s.companyGroup === 'competitor' ? 'competitor' : 'ours'),
    type: (s.type === 'facebook' ? 'facebook' : 'website'),
    title: normalizeText(s.title || s.company || s.id),
    pageUrl: String(s.pageUrl || '').trim(),
    rssUrl: String(s.rssUrl || '').trim()
  }));

  const missing = normalized.filter((s) => !s.id || !s.company || !s.pageUrl);
  if (missing.length) {
    throw new Error(
      `Invalid source entries (missing id/company/pageUrl): ${missing
        .map((m) => JSON.stringify(m))
        .join(', ')}`
    );
  }

  const dupes = new Set();
  for (const s of normalized) {
    if (dupes.has(s.id)) throw new Error(`Duplicate source id: ${s.id}`);
    dupes.add(s.id);
  }

  return normalized;
}

async function fetchSourceItems(source) {
  // Check if we have a custom scraper for this source
  if (!source.rssUrl && scrapers[source.id]) {
    try {
      console.log(`  Using custom scraper for ${source.id}...`);
      const scrapedArticles = await scrapers[source.id]();
      
      const items = await Promise.all(scrapedArticles.map(async (article) => {
        const isoDate = toIsoDate(article.pubDate);
        const title = normalizeText(article.title || '(untitled)');
        const link = String(article.link || '').trim();
        const snippet = normalizeText(article.contentSnippet || '');
        
        // Get featured image from scraper or fetch from article page
        let finalImages = [];
        
        if (article.image) {
          finalImages = [article.image];
        } else if (link) {
          const featuredImage = await fetchFeaturedImage(link);
          if (featuredImage) {
            finalImages = [featuredImage];
          }
        }
        
        const normalizedItem = {
          sourceId: source.id,
          sourceTitle: source.title,
          company: source.company,
          companyGroup: source.companyGroup,
          type: source.type,
          pageUrl: source.pageUrl,
          title,
          link,
          isoDate,
          snippet,
          content: '',
          images: finalImages.slice(0, 10)
        };
        
        return {
          id: stableId({
            sourceId: source.id,
            link,
            isoDate,
            title
          }),
          ...normalizedItem
        };
      }));
      
      console.log(`  ✓ Scraped ${items.length} articles`);
      return { items, warning: null };
    } catch (err) {
      return {
        items: [],
        warning: `Scraping failed: ${err?.message || String(err)}`
      };
    }
  }
  
  if (!source.rssUrl) {
    return { items: [], warning: 'No rssUrl configured (link-only source).' };
  }

  try {
    const feed = await parser.parseURL(source.rssUrl);
    const items = await Promise.all((feed.items || []).map(async (item) => {
      const isoDate =
        toIsoDate(item.isoDate) ||
        toIsoDate(item.pubDate) ||
        toIsoDate(item.date) ||
        null;

      const title = normalizeText(item.title || '(untitled)');
      const link = String(item.link || '').trim();
      const snippet = normalizeText(item.contentSnippet || item.summary || '');
      const content = String(item.contentEncoded || item.content || item.description || '').trim();

      // Always try to fetch featured image from article page first for consistency
      let finalImages = [];
      
      if (link) {
        const featuredImage = await fetchFeaturedImage(link);
        if (featuredImage) {
          finalImages = [featuredImage];
        }
      }
      
      // If no featured image found, fall back to extracting from RSS feed
      if (finalImages.length === 0) {
        const images = [];
        
        // 1) enclosure tag (podcasts, some blogs)
        if (item.enclosure?.url && /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(item.enclosure.url)) {
          images.push(item.enclosure.url);
        }
        
        // 2) media:content or media:thumbnail (YouTube, some news)
        if (item['media:content']) {
          const mc = Array.isArray(item['media:content']) ? item['media:content'] : [item['media:content']];
          mc.forEach((m) => {
            if (m?.$ && m.$.url && /image/i.test(m.$.medium || m.$.type || '')) {
              images.push(m.$.url);
            }
          });
        }
        if (item['media:thumbnail'] && item['media:thumbnail'].$ && item['media:thumbnail'].$.url) {
          images.push(item['media:thumbnail'].$.url);
        }
        
        // 3) itunes:image (podcasts)
        if (item.itunes?.image) {
          images.push(item.itunes.image);
        }
        
        // 4) Parse <img> from content/description HTML (WordPress and most blogs)
        if (content) {
          const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
          let match;
          while ((match = imgRegex.exec(content)) !== null) {
            if (match[1] && /^https?:\/\//i.test(match[1])) {
              images.push(match[1]);
            }
          }
        }

        // Remove duplicates and skip first image if multiple (often logos)
        const uniqueImages = [...new Set(images)];
        finalImages = uniqueImages.length > 1 ? uniqueImages.slice(1) : uniqueImages;
      }

      const normalizedItem = {
        sourceId: source.id,
        sourceTitle: source.title,
        company: source.company,
        companyGroup: source.companyGroup,
        type: source.type,
        pageUrl: source.pageUrl,
        title,
        link,
        isoDate,
        snippet,
        content,
        images: finalImages.slice(0, 10)
      };

      return {
        id: stableId({
          sourceId: source.id,
          link,
          isoDate,
          title
        }),
        ...normalizedItem
      };
    }));

    return { items, warning: null };
  } catch (err) {
    return {
      items: [],
      warning: `Failed to fetch/parse feed: ${err?.message || String(err)}`
    };
  }
}

async function main() {
  const sources = await loadSources();

  const perSourceResults = [];
  for (const source of sources) {
    // eslint-disable-next-line no-console
    console.log(`Fetching: ${source.id} (${source.rssUrl || 'link-only'})`);
    // Fetch sequentially to be polite to hosts.
    // If you have many sources and want speed, we can add small concurrency later.
    //
    const res = await fetchSourceItems(source);
    perSourceResults.push({ source, ...res });
  }

  const items = perSourceResults
    .flatMap((r) => r.items)
    .filter((i) => i.link);

  items.sort((a, b) => {
    const ad = a.isoDate ? new Date(a.isoDate).getTime() : 0;
    const bd = b.isoDate ? new Date(b.isoDate).getTime() : 0;
    return bd - ad;
  });

  const output = {
    generatedAt: new Date().toISOString(),
    sources: perSourceResults.map((r) => ({
      ...r.source,
      warning: r.warning
    })),
    items
  };

  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(OUT_PATH, JSON.stringify(output, null, 2), 'utf8');

  // eslint-disable-next-line no-console
  console.log(`Wrote ${items.length} items to ${path.relative(ROOT, OUT_PATH)}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});
