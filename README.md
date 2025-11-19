# Resume Bullet Improver

Minimal, polished web app to improve resume bullets using an Express API and OpenAI (with a no-key local fallback).

## Quick Start

1. Create `.env` (optional for real LLM):

```
cp .env.example .env
# Then set OPENAI_API_KEY in .env (optional)
```

2. Install and run:

```
npm install
npm start
```

Open http://localhost:3000

- Without `OPENAI_API_KEY`, the API returns plausible offline improvements.
- With `OPENAI_API_KEY`, it will call OpenAI (model defaults to `gpt-4o-mini`).

## API

POST `/api/improve`

Input:

```
{
  "bullet": "string",
  "style": "Impactful|Technical|Metrics-Focused|Concise"
}
```

Output:

```
{ "results": ["...", "...", "..."] }
```

## Deploy

- Render: use `npm start` and set `OPENAI_API_KEY` env var.
- Vercel: this project runs as a simple Node server; you can deploy via a Node build or adapt by moving the Express logic into a Vercel serverless function. The current structure matches local/dev and Render easily.

## Notes

- Frontend uses plain CSS + vanilla JS, no build step.
- Error handling and loading states are included. Copy buttons for each result.

## SEO & Monetization Checklist

- SEO basics: meaningful `<title>`, meta description, canonical link, Open Graph/Twitter tags (already added in `index.html`).
- Indexing: dynamic `robots.txt` and `sitemap.xml` are served from the API. After deploy, submit your site to Google Search Console and provide the sitemap URL: `https://your-domain.com/sitemap.xml`.
- Performance: run Lighthouse in Chrome, fix any major issues (image sizes, unused CSS). This app is already light.
- Structured data: JSON-LD `WebApplication` is embedded for richer snippets.
- Content: add a short landing copy and example bullets to capture long‑tail queries (e.g., “metrics‑focused resume bullets for PMs”).
- Conversion: add a clear CTA (e.g., “Download Template Pack” or “Unlock Pro”) above the fold.
- Monetization options:
  - Gumroad: sell the downloadable zip (use `npm run zip`). Link your product page from the app.
  - Pro tier: paid features like unlimited improvements, history, CSV export, role‑specific templates.
  - Stripe Checkout: simple one‑time or subscription; add a backend route that creates a Checkout Session and redirects.
  - Affiliates: link to resume templates/courses with affiliate programs.
- Analytics: Plausible is included (see `index.html`), replace `your-domain.com` in the script tag. Optionally enable GA4 by uncommenting the gtag block and setting your Measurement ID.
- Distribution: post on Product Hunt, Indie Hackers, relevant subreddits, and LinkedIn with before/after examples to earn backlinks and traffic.

## Analytics Setup

- Plausible: create a site in Plausible, then set your domain in `index.html` (`data-domain="your-domain.com"`). Events fired: `improve_click`, `results_shown`, `improve_error`, `copy_bullet`, `copy_failed`.
- GA4 (optional): uncomment the GA tag in `index.html` and replace `G-XXXXXXX`. The same events will be sent via `gtag('event', ...)` when available.

## Legal Pages

Static pages are included and linked in the footer:
- `privacy.html`
- `terms.html`
- `refund.html`
Update contact emails and adjust text to match your policies.

## Fonts

- Quick swap: in `index.html`, replace the `href` of the `<link id="fontStylesheet">` tag with your preferred font URL (e.g., a Google Fonts link).
- CSS variable: override `--font-sans` in `style.css` to change the global font stack site‑wide.
- Example (already included): Inter from Google Fonts.