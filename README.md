# Kevin Darmawan — Portfolio

A fast, single-page portfolio deployed on **Cloudflare Workers** with a live GitHub feed.

- **Static site** in `public/` (HTML/CSS/JS, no build step)
- **Worker** in `src/index.js` serves the assets and proxies `/api/github` (edge-cached 1h)
- Dark theme matching Kevin's CV brand (Space Grotesk + DM Sans, cyan→purple gradient)
- Sections: Hero · About · Experience · Featured Work · Live GitHub repos · Contact (incl. Threads)

---

## Local preview

```bash
cd portfolio
npm install
npm run dev          # → http://localhost:8787
```

`wrangler dev` runs the real Worker locally, so the `/api/github` route works too.

---

## Deploy

### 1. One-time setup

```bash
npm install
npx wrangler login   # opens browser to authorize your Cloudflare account
```

### 2. Ship it

```bash
npm run deploy
```

This deploys to `https://kevin-portfolio.<your-subdomain>.workers.dev`.

---

## Custom domain

**Option A — Dashboard (easiest):**
1. Cloudflare dashboard → **Workers & Pages** → `kevin-portfolio`
2. **Settings** → **Domains & Routes** → **Add** → **Custom Domain**
3. Enter e.g. `kevindarmawan.com` (the domain's DNS must already be on Cloudflare)
4. Cloudflare auto-creates the DNS record + SSL cert

**Option B — Config file:**
Uncomment the `routes` block in `wrangler.jsonc`, set your domain, then `npm run deploy`.

> If your domain isn't on Cloudflare yet: add the site under **Websites → Add a site**, then point your registrar's nameservers at the ones Cloudflare gives you. Once the zone is active, the steps above work.

---

## Editing content

| What | Where |
|------|-------|
| Bio, experience, featured projects | `public/index.html` |
| Colors, fonts, layout | `public/styles.css` |
| GitHub feed behavior / repo count | `src/index.js` (`slice(0, 12)`, `CACHE_TTL`) |
| GitHub username | `src/index.js` (`GITHUB_USER`) |
| Social links (GitHub, LinkedIn, Threads, email) | `public/index.html` → `#contact` |

The GitHub feed is fetched live and cached at the edge for 1 hour — push a new repo and it appears automatically within the hour (or purge cache to see it instantly).
