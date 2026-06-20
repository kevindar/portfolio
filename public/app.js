// Footer year
document.getElementById('year').textContent = new Date().getFullYear();

// GitHub language colours
const LANG_COLORS = {
  Go: '#00ADD8', Python: '#3572A5', JavaScript: '#f1e05a', TypeScript: '#3178c6',
  Swift: '#F05138', C: '#555555', 'C++': '#f34b7d', Java: '#b07219', Dart: '#00B4AB',
  'Jupyter Notebook': '#DA5B0B', HTML: '#e34c26', CSS: '#563d7c', Shell: '#89e051',
  VHDL: '#adb2cb', Assembly: '#6E4C13', MATLAB: '#e16737', Ruby: '#701516',
};
const langColor = (l) => LANG_COLORS[l] || '#1b46ff';

const escapeHtml = (s) => !s ? '' : s.replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

const ARROW = '<svg viewBox="0 0 256 256" class="ico" aria-hidden="true"><path fill="currentColor" d="M200,64V168a8,8,0,0,1-16,0V83.31L69.66,197.66a8,8,0,0,1-11.32-11.32L172.69,72H88a8,8,0,0,1,0-16H192A8,8,0,0,1,200,64Z"></path></svg>';

async function loadRepos() {
  const grid = document.getElementById('repo-grid');
  try {
    const res = await fetch('/api/github');
    if (!res.ok) throw new Error('status ' + res.status);
    const repos = await res.json();

    if (!Array.isArray(repos) || repos.length === 0) {
      grid.innerHTML = '<p class="repo-status">Nothing to show right now. See <a href="https://github.com/kevindar" style="color:var(--accent)">github.com/kevindar</a>.</p>';
      return;
    }

    grid.innerHTML = repos.map((r) => `
      <a class="repo-card reveal" href="${escapeHtml(r.url)}" target="_blank" rel="noopener">
        <span class="repo-name">${escapeHtml(r.name)} ${ARROW}</span>
        <span class="repo-desc">${escapeHtml(r.description) || 'No description'}</span>
        <span class="repo-meta">
          ${r.language ? `<span class="repo-lang"><span class="lang-dot" style="background:${langColor(r.language)}"></span>${escapeHtml(r.language)}</span>` : ''}
          ${r.stars > 0 ? `<span>${r.stars} stars</span>` : ''}
        </span>
      </a>
    `).join('');

    observeReveals();
  } catch (e) {
    grid.innerHTML = '<p class="repo-status">Could not load repositories. See <a href="https://github.com/kevindar" style="color:var(--accent)">github.com/kevindar</a>.</p>';
  }
}

// Scroll reveal via IntersectionObserver (no scroll listeners)
let io;
function observeReveals() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!io) {
    io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      }
    }, { threshold: 0.15 });
  }
  document.querySelectorAll('.reveal:not(.in)').forEach((el) => io.observe(el));
}

// Tag major blocks for reveal
document.querySelectorAll('section, .work-lead, .work-item').forEach((el) => el.classList.add('reveal'));

loadRepos();
observeReveals();
