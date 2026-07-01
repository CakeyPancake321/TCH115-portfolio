const TOPIC = 'portfolio';

export function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderCard(repo) {
  const description = repo.description
    ? escapeHtml(repo.description)
    : 'No description provided.';

  const tags = (repo.topics || [])
    .filter((t) => t !== TOPIC)
    .map((t) => `            <span class="proj-tag">${escapeHtml(t)}</span>`)
    .join('\n');

  return `        <div class="project-card">
          <div class="proj-tags">
${tags}
          </div>
          <div class="proj-title">${escapeHtml(repo.name)}</div>
          <p class="proj-desc">${description}</p>
          <div class="proj-links">
            <a href="${escapeHtml(repo.html_url)}" class="proj-link">&rarr; view project</a>
          </div>
        </div>`;
}

export function renderEmptyState() {
  return `        <div class="proj-placeholder">
          <div class="plus">+</div>
          <span>more projects coming soon</span>
        </div>`;
}

export function buildSection(repos) {
  if (!repos || repos.length === 0) {
    return renderEmptyState();
  }
  return repos.map(renderCard).join('\n\n');
}
