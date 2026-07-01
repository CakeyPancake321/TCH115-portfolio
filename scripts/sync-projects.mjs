import { readFileSync, writeFileSync } from 'node:fs';
import { buildSection } from './lib/render.mjs';
import { spliceIntoIndex } from './lib/splice.mjs';

const USERNAME = 'CakeyPancake321';
const TOPIC = 'portfolio';
const INDEX_PATH = 'index.html';

async function fetchTaggedRepos() {
  const url = `https://api.github.com/search/repositories?q=user:${USERNAME}+topic:${TOPIC}&sort=updated`;
  const headers = { Accept: 'application/vnd.github+json' };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`GitHub API request failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return data.items;
}

async function main() {
  const repos = await fetchTaggedRepos();
  const section = buildSection(repos);

  const html = readFileSync(INDEX_PATH, 'utf8');
  const updated = spliceIntoIndex(html, section);
  writeFileSync(INDEX_PATH, updated);

  console.log(`sync-projects: wrote ${repos.length} project card(s) to ${INDEX_PATH}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
