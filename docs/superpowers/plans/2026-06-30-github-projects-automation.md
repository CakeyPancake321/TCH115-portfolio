# GitHub Projects Auto-Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically regenerate the Projects section of `index.html` from GitHub repos tagged with the `portfolio` topic, via a scheduled + manually-dispatchable GitHub Action, without disturbing any hand-authored part of the page.

**Architecture:** A Node script (`scripts/sync-projects.mjs`) calls the GitHub Search API for repos owned by `CakeyPancake321` tagged `portfolio`, renders each as an HTML card using pure, independently-testable functions, and splices the result into `index.html` between two marker comments (`<!-- PROJECTS:START -->` / `<!-- PROJECTS:END -->`). A GitHub Actions workflow (`.github/workflows/sync-projects.yml`) runs the script on a daily schedule and on manual dispatch, then commits `index.html` back to `main` only if it changed.

**Tech Stack:** Node.js 20 (native `fetch`, native `node:test` runner — no npm dependencies needed), GitHub REST/Search API, GitHub Actions.

---

## File Structure

- `index.html` — modified: projects grid content wrapped in marker comments, initial content set to a single placeholder card.
- `scripts/lib/render.mjs` — create: pure functions that turn repo data into HTML card strings (`escapeHtml`, `renderCard`, `renderEmptyState`, `buildSection`). No network or filesystem access — fully unit-testable.
- `scripts/lib/render.test.mjs` — create: tests for `render.mjs`.
- `scripts/lib/splice.mjs` — create: pure function `spliceIntoIndex(html, section)` that finds the markers and replaces the content between them, throwing a descriptive error if markers are missing.
- `scripts/lib/splice.test.mjs` — create: tests for `splice.mjs`.
- `scripts/sync-projects.mjs` — create: entry point. Fetches tagged repos from the GitHub API, calls into `render.mjs` and `splice.mjs`, reads/writes `index.html`. Not unit-tested (network + fs side effects) — verified via manual smoke test in Task 5.
- `.github/workflows/sync-projects.yml` — create: the scheduled/dispatchable Action.

---

## Task 1: Mark the projects grid for automation

**Files:**
- Modify: `index.html:1009-1058`

- [ ] **Step 1: Replace the hardcoded projects-grid content with markers around a single placeholder**

Replace lines 1009–1058 (the full contents of `<div class="projects-grid">` through its closing `</div>`) with:

```html
      <div class="projects-grid">
<!-- PROJECTS:START -->
        <div class="proj-placeholder">
          <div class="plus">+</div>
          <span>more projects coming soon</span>
        </div>
<!-- PROJECTS:END -->
      </div>
```

This removes the two hardcoded placeholder project cards (name/description are still unfilled `[Project Name]` placeholders anyway) and the two "coming soon" tiles, replacing them with the marker-bounded region the sync script will own. Once you tag a real repo with the `portfolio` topic and the Action runs, this placeholder is replaced automatically.

- [ ] **Step 2: Verify markers are present and unique**

Run: `grep -n "PROJECTS:START\|PROJECTS:END" "index.html"`
Expected: exactly one line for each marker, both inside the `projects-grid` div (around what was previously line 1009-1058).

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "chore: mark projects grid for automated sync"
```

---

## Task 2: Pure rendering functions

**Files:**
- Create: `scripts/lib/render.mjs`
- Test: `scripts/lib/render.test.mjs`

- [ ] **Step 1: Write the failing tests**

Create `scripts/lib/render.test.mjs`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml, renderCard, renderEmptyState, buildSection } from './render.mjs';

test('escapeHtml escapes &, <, >, and "', () => {
  assert.equal(
    escapeHtml(`Tom & Jerry <3 "friends"`),
    'Tom &amp; Jerry &lt;3 &quot;friends&quot;'
  );
});

test('escapeHtml passes through null/undefined as empty string', () => {
  assert.equal(escapeHtml(null), '');
  assert.equal(escapeHtml(undefined), '');
});

test('renderCard includes name, description, topics (excluding "portfolio"), and a labeled link', () => {
  const repo = {
    name: 'network-scanner',
    description: 'A simple <script> port scanner',
    topics: ['portfolio', 'python', 'networking'],
    html_url: 'https://github.com/CakeyPancake321/network-scanner',
  };
  const html = renderCard(repo);

  assert.match(html, /network-scanner/);
  assert.match(html, /A simple &lt;script&gt; port scanner/);
  assert.match(html, /<span class="proj-tag">python<\/span>/);
  assert.match(html, /<span class="proj-tag">networking<\/span>/);
  assert.doesNotMatch(html, /<span class="proj-tag">portfolio<\/span>/);
  assert.match(html, /<a href="https:\/\/github\.com\/CakeyPancake321\/network-scanner" class="proj-link">&rarr; view project<\/a>/);
  assert.doesNotMatch(html, /github\.com\/CakeyPancake321\/network-scanner<\/a>\s*<\/a>/);
});

test('renderCard falls back to a default description when repo has none', () => {
  const repo = {
    name: 'no-desc-repo',
    description: null,
    topics: ['portfolio'],
    html_url: 'https://github.com/CakeyPancake321/no-desc-repo',
  };
  const html = renderCard(repo);
  assert.match(html, /No description provided\./);
});

test('renderEmptyState renders the coming-soon placeholder', () => {
  const html = renderEmptyState();
  assert.match(html, /proj-placeholder/);
  assert.match(html, /more projects coming soon/);
});

test('buildSection renders the empty state when given no repos', () => {
  const html = buildSection([]);
  assert.match(html, /proj-placeholder/);
});

test('buildSection renders one card per repo when given repos', () => {
  const repos = [
    { name: 'repo-one', description: 'first', topics: ['portfolio'], html_url: 'https://github.com/x/repo-one' },
    { name: 'repo-two', description: 'second', topics: ['portfolio'], html_url: 'https://github.com/x/repo-two' },
  ];
  const html = buildSection(repos);
  assert.match(html, /repo-one/);
  assert.match(html, /repo-two/);
  assert.equal((html.match(/project-card/g) || []).length, 2);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test scripts/lib/render.test.mjs`
Expected: FAIL — `Cannot find module './render.mjs'` (file doesn't exist yet).

- [ ] **Step 3: Write the implementation**

Create `scripts/lib/render.mjs`:

```javascript
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
            <a href="${repo.html_url}" class="proj-link">&rarr; view project</a>
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test scripts/lib/render.test.mjs`
Expected: PASS — all 7 tests green.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/render.mjs scripts/lib/render.test.mjs
git commit -m "feat: add pure project-card rendering functions"
```

---

## Task 3: Marker splicing

**Files:**
- Create: `scripts/lib/splice.mjs`
- Test: `scripts/lib/splice.test.mjs`

- [ ] **Step 1: Write the failing tests**

Create `scripts/lib/splice.test.mjs`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spliceIntoIndex } from './splice.mjs';

test('spliceIntoIndex replaces content between markers', () => {
  const html = [
    '<div class="projects-grid">',
    '<!-- PROJECTS:START -->',
    '        <div class="proj-placeholder">old</div>',
    '<!-- PROJECTS:END -->',
    '</div>',
  ].join('\n');

  const result = spliceIntoIndex(html, '        <div class="project-card">new</div>');

  assert.match(result, /<!-- PROJECTS:START -->\n        <div class="project-card">new<\/div>\n\s*<!-- PROJECTS:END -->/);
  assert.doesNotMatch(result, /old/);
});

test('spliceIntoIndex leaves content outside the markers untouched', () => {
  const html = [
    '<h1>Hello</h1>',
    '<!-- PROJECTS:START -->',
    'old',
    '<!-- PROJECTS:END -->',
    '<footer>Bye</footer>',
  ].join('\n');

  const result = spliceIntoIndex(html, 'new');

  assert.match(result, /<h1>Hello<\/h1>/);
  assert.match(result, /<footer>Bye<\/footer>/);
});

test('spliceIntoIndex throws a descriptive error when markers are missing', () => {
  const html = '<div class="projects-grid"></div>';

  assert.throws(
    () => spliceIntoIndex(html, 'new'),
    /PROJECTS:START.*PROJECTS:END.*not found/s
  );
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test scripts/lib/splice.test.mjs`
Expected: FAIL — `Cannot find module './splice.mjs'`.

- [ ] **Step 3: Write the implementation**

Create `scripts/lib/splice.mjs`:

```javascript
const START_MARKER = '<!-- PROJECTS:START -->';
const END_MARKER = '<!-- PROJECTS:END -->';

export function spliceIntoIndex(html, section) {
  const startIdx = html.indexOf(START_MARKER);
  const endIdx = html.indexOf(END_MARKER);

  if (startIdx === -1 || endIdx === -1) {
    throw new Error(
      `sync-projects: markers "${START_MARKER}" / "${END_MARKER}" not found in index.html. ` +
      `Add both marker comments around the projects grid content and re-run.`
    );
  }

  const before = html.slice(0, startIdx + START_MARKER.length);
  const after = html.slice(endIdx);

  return `${before}\n${section}\n        ${after}`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test scripts/lib/splice.test.mjs`
Expected: PASS — all 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/splice.mjs scripts/lib/splice.test.mjs
git commit -m "feat: add marker-based HTML splicing for index.html"
```

---

## Task 4: Entry-point script

**Files:**
- Create: `scripts/sync-projects.mjs`

- [ ] **Step 1: Write the script**

Create `scripts/sync-projects.mjs`:

```javascript
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
```

- [ ] **Step 2: Commit**

```bash
git add scripts/sync-projects.mjs
git commit -m "feat: add sync-projects entry point"
```

---

## Task 5: Manual smoke test against the real GitHub API

**Files:** none (verification only)

- [ ] **Step 1: Run the script locally against the live repo**

Run: `node scripts/sync-projects.mjs`
Expected: prints `sync-projects: wrote 0 project card(s) to index.html` (no repos are tagged `portfolio` yet), and `git diff index.html` shows no change (placeholder in, placeholder out).

- [ ] **Step 2: Tag this repo itself with the `portfolio` topic to test the populated path**

Run: `gh repo edit CakeyPancake321/TCH115-portfolio --add-topic portfolio`

- [ ] **Step 3: Re-run the script and inspect the diff**

Run: `node scripts/sync-projects.mjs && git diff index.html`
Expected: the placeholder between the markers is replaced with a real card for `TCH115-portfolio`, showing its description, its other topics as tag pills (not including `portfolio`), and a `&rarr; view project` link to `https://github.com/CakeyPancake321/TCH115-portfolio`.

- [ ] **Step 4: Revert the local test change and remove the test topic**

```bash
git checkout -- index.html
gh repo edit CakeyPancake321/TCH115-portfolio --remove-topic portfolio
```

This confirms the pipeline works end-to-end without leaving the portfolio repo itself listed as a project. Tag your actual project repos with `portfolio` once you're ready for them to appear.

---

## Task 6: GitHub Actions workflow

**Files:**
- Create: `.github/workflows/sync-projects.yml`

- [ ] **Step 1: Write the workflow**

Create `.github/workflows/sync-projects.yml`:

```yaml
name: Sync Projects

on:
  schedule:
    - cron: '0 13 * * *'
  workflow_dispatch: {}

permissions:
  contents: write

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Run sync script
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: node scripts/sync-projects.mjs

      - name: Commit changes if any
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add index.html
          if git diff --cached --quiet; then
            echo "No changes to commit"
          else
            git commit -m "chore: sync projects from tagged GitHub repos"
            git push
          fi
```

- [ ] **Step 2: Commit and push**

```bash
git add .github/workflows/sync-projects.yml
git commit -m "feat: add scheduled GitHub Action to sync projects"
git push
```

- [ ] **Step 3: Trigger the workflow manually and verify it runs clean**

Run: `gh workflow run sync-projects.yml && sleep 15 && gh run list --workflow=sync-projects.yml --limit 1`
Expected: the most recent run shows status `completed` and conclusion `success`. Since no repos are tagged `portfolio` yet, it should log "No changes to commit" and not push anything.

- [ ] **Step 4: View the run log to confirm script output**

Run: `gh run view --workflow=sync-projects.yml --log | grep "sync-projects:"`
Expected: `sync-projects: wrote 0 project card(s) to index.html`

---

## Self-Review Notes

- **Spec coverage:** topic-tag filtering (Task 4), name/description/topics/link fields with labeled "→ view project" link (Task 2), scheduled + manual-dispatch trigger (Task 6), marker-comment injection leaving rest of page untouched (Task 3), diff-gated commit (Task 6), explicit missing-marker error (Task 3), empty-state placeholder (Task 2) — all covered.
- **Redesign resilience:** confirmed the only thing `sync-projects.mjs` depends on structurally is the two marker comments; card markup lives in `render.mjs`'s own template, not scraped from `index.html`.
- **No placeholders:** all code blocks are complete and runnable as written.
