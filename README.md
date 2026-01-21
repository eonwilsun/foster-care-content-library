# Foster Care Content Library (GitHub Pages)

This repo builds a simple GitHub Pages site that aggregates posts/articles from your own pages and competitor pages into one searchable, filterable feed.

## How it stays updated

GitHub Pages is **static** (it cannot fetch most feeds directly from a browser due to CORS and platform restrictions). Instead, a GitHub Action periodically fetches RSS/Atom feeds and writes the latest items into `docs/data/content.json`. When someone visits the Pages site, they see the most recently generated snapshot.

## Setup

1. Add your sources in `sources.json` (see examples in that file).
2. Enable GitHub Pages:
   - Repo **Settings → Pages**
   - Source: **Deploy from a branch**
   - Branch: `main` (or your default branch)
   - Folder: `/docs`
3. (Optional) Run locally:
   - `npm install`
   - `npm run build:feeds`
   - Open `docs/index.html`

## Notes about Facebook

Facebook does not reliably provide a public RSS feed for Pages anymore.
- If you have a working RSS URL for a Facebook Page (or you use a tool that produces one), put it in `rssUrl`.
- If you only provide `pageUrl` and no `rssUrl`, the site will still show the link under that source, but it can’t list the latest posts automatically.
