# Foster Care Content Library

This repo builds a simple GitHub Pages site that aggregates posts/articles from your own pages and competitor pages into one searchable, filterable feed.

## How it stays updated

The site **automatically updates every hour** via a GitHub Action that fetches the latest RSS feeds and updates the content. You can also manually trigger an update from the Actions tab in GitHub.

## Setup

1. Add your sources in `sources.json` (see examples in that file).
2. Enable GitHub Pages:
   - Repo **Settings → Pages**
   - Source: **Deploy from a branch**
   - Branch: `main` (or your default branch)
   - Folder: `/docs`
3. The GitHub Action will automatically update feeds every hour

## Manual Update

To manually update feeds locally before pushing:
```bash
npm install
npm run build:feeds
git add docs/data/content.json
git commit -m "Update feeds"
git push
```

## Notes about Facebook

Facebook does not reliably provide a public RSS feed for Pages anymore.
- If you have a working RSS URL for a Facebook Page (or you use a tool like FetchRSS that produces one), put it in `rssUrl`.
- If you only provide `pageUrl` and no `rssUrl`, the site will still show the link under that source, but it can’t list the latest posts automatically.
