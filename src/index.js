// Cloudflare Worker — serves the static portfolio and proxies/caches the GitHub API.
//
// Routes:
//   GET /api/github  → curated list of public repos (cached at the edge for 1 hour)
//   everything else  → static assets from /public (via the ASSETS binding)

const GITHUB_USER = 'kevindar';
const CACHE_TTL = 3600; // seconds

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/api/github') {
      return handleGithub(request, ctx);
    }

    // Fall through to static assets
    return env.ASSETS.fetch(request);
  },
};

async function handleGithub(request, ctx) {
  const cache = caches.default;
  const cacheKey = new Request(new URL('/api/github', request.url).toString(), request);

  // Serve from edge cache when possible
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  try {
    const res = await fetch(
      `https://api.github.com/users/${GITHUB_USER}/repos?per_page=100&sort=updated`,
      {
        headers: {
          // GitHub requires a User-Agent
          'User-Agent': 'kevin-portfolio-worker',
          Accept: 'application/vnd.github+json',
        },
      }
    );

    if (!res.ok) {
      return json({ error: 'github_upstream', status: res.status }, 502);
    }

    const raw = await res.json();

    // Filter forks + archived, sort by most-recently-pushed (newest / most
    // active first), trim to a clean payload
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
      'Cache-Control': `public, max-age=${CACHE_TTL}`,
    });

    // Store in edge cache without blocking the response
    ctx.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  } catch (e) {
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
