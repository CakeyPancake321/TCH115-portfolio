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
    .map((t) => `            <span style="font-family:'DM Mono',monospace;font-size:11px;background:var(--toggle-bg);border:1px solid var(--toggle-border);color:var(--faint);padding:3px 10px;border-radius:4px;">${escapeHtml(t)}</span>`)
    .join('\n');

  return `        <div class="card" style="border-radius:12px;padding:32px;display:flex;flex-direction:column;">
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;">
${tags}
          </div>
          <div style="font-family:'Outfit',sans-serif;font-weight:600;font-size:18px;color:var(--heading);margin-bottom:10px;">${escapeHtml(repo.name)}</div>
          <p style="font-size:13px;line-height:1.75;margin-bottom:24px;flex:1;">${description}</p>
          <div style="display:flex;gap:20px;">
            <a href="${escapeHtml(repo.html_url)}" class="project-link">&rarr; view project</a>
          </div>
        </div>`;
}

export function renderEmptyState() {
  return `        <div class="dashed-card">
          <div style="font-size:28px;color:var(--dash-icon);line-height:1;">+</div>
          <span style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dash-label);letter-spacing:.06em;">more projects coming soon</span>
        </div>`;
}

export function buildSection(repos) {
  if (!repos || repos.length === 0) {
    return renderEmptyState();
  }
  return [...repos.map(renderCard), renderEmptyState()].join('\n\n');
}
