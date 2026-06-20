// Cloudflare Worker — serves the static portfolio and proxies/caches the GitHub API.
//
// Routes:
//   GET /api/github  → curated list of public repos, edge-cached
//   everything else  → static assets from /public (via the ASSETS binding)
//
// Resilience: the unauthenticated GitHub API allows only 60 req/hr per IP, and
// Cloudflare's edge IPs are shared, so upstream 403s are common. We keep each
// good response in the edge cache for 6h and treat it as "fresh" for 1h. After
// 1h we try to refresh; if GitHub is rate-limited we serve the stale copy
// instead of failing. Visitors only ever see an error on a cold edge whose
// very first fetch is rate-limited (rare, and degrades gracefully on the page).

const GITHUB_USER = 'kevindar';
const FRESH_MS = 60 * 60 * 1000;        // serve cached copy without refetch for 1h
const STALE_MAX_AGE = 6 * 60 * 60;      // keep copy in edge cache for 6h (stale fallback)

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/api/github') {
      return handleGithub(request, ctx);
    }
    return env.ASSETS.fetch(request);
  },
};

async function handleGithub(request, ctx) {
  const cache = caches.default;
  const cacheKey = new Request(new URL('/api/github', request.url).toString());

  const cached = await cache.match(cacheKey);
  if (cached) {
    const generatedAt = Number(cached.headers.get('x-generated-at') || 0);
    if (Date.now() - generatedAt < FRESH_MS) {
      return cached; // still fresh, no upstream call
    }
    // stale: fall through to refresh, but keep `cached` as a fallback
  }

  try {
    const res = await fetch(
      `https://api.github.com/users/${GITHUB_USER}/repos?per_page=100&sort=updated`,
      {
        headers: {
          'User-Agent': 'kevin-portfolio-worker', // GitHub requires a User-Agent
          Accept: 'application/vnd.github+json',
        },
      }
    );

    if (!res.ok) {
      // GitHub rate-limited or errored: serve stale if we have it.
      if (cached) return cached;
      return json({ error: 'github_upstream', status: res.status }, 502);
    }

    const raw = await res.json();

    // Filter forks + archived, sort by most-recently-pushed (newest / most
    // active first), trim to a clean payload.
    const repos = raw
      .filter((r) => !r.fork && !r.archived)
      .sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at))
      .slice(0, 12)
      .map((r) => ({
        name: r.name,
        description: r.description,
        url: r.html_url,
        language: r.language,
        stars: r.stargazers_count,
        updated: r.pushed_at,
      }));

    const response = json(repos, 200, {
      'Cache-Control': `public, max-age=${STALE_MAX_AGE}`,
      'x-generated-at': String(Date.now()),
    });

    ctx.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  } catch (e) {
    if (cached) return cached; // serve stale on any exception
    return json({ error: 'worker_exception', message: String(e) }, 500);
  }
}

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      ...extraHeaders,
    },
  });
}
