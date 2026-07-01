# GitHub Projects Auto-Sync — Design

## Purpose

Automatically keep the "Projects" section of `index.html` in sync with the
user's public GitHub repos, without manual editing, and without breaking as
the surrounding page design is reworked.

## Scope

Only the `.projects-grid` block inside `index.html` is generated/managed by
this automation. All other sections (hero, degree objectives, RSA journey,
nav, footer) are untouched and remain hand-authored.

## Trigger

A GitHub Actions workflow (`.github/workflows/sync-projects.yml`) runs:
- On a daily schedule (`cron`)
- On manual dispatch (`workflow_dispatch`) from the repo's Actions tab

The "Run workflow" button lives only in the GitHub web UI for this repo
(`.../actions`) — it is never exposed on the live site itself.

## Data source

GitHub REST API, querying the authenticated user's (or a configured
username's) public repositories, filtered to those tagged with the topic
`portfolio`. For each matching repo, pull:
- `name`
- `description`
- `topics` (rendered as tag pills, excluding the `portfolio` topic itself)
- `html_url` (repo link) — rendered as a labeled link reading "→ view project"
  (matching the existing card style), never the bare URL text

No README parsing, no language/star badges (kept out of scope per user
choice — can be added later without redesigning the pipeline).

## Generation mechanism

A Node script (`scripts/sync-projects.mjs`) run by the workflow:
1. Calls the GitHub API for topic-tagged repos.
2. Renders each into an HTML card using a template literal owned by the
   script (not scraped from the current page markup).
3. Reads `index.html`, replaces everything between two marker comments —
   `<!-- PROJECTS:START -->` and `<!-- PROJECTS:END -->` — with the
   generated cards.
4. Writes `index.html` back out.

If zero tagged repos are found, the script renders the existing
"more projects coming soon" placeholder card(s) so the section never goes
empty.

### Redesign resilience

The two marker comments are the only contract between the generator and the
hand-authored page. Restyling cards (colors, fonts, layout, class names)
only requires updating the template literal in `sync-projects.mjs` — the
rest of the page, and the workflow itself, are unaffected as long as the
marker comments remain present in `index.html`.

## Publishing

The workflow commits the regenerated `index.html` back to `main` if it
changed (diff-gated — no-op commits are skipped). This works regardless of
current or future hosting:
- GitHub Pages (current): serves directly off `main`.
- Future custom domain via Pages: unaffected, `CNAME` file is untouched by
  the script.
- Future migration to Netlify/Vercel/other git-based host: their own
  deploy hook fires off the Action's push like any other commit.
- Non-git-based hosting (manual upload): script still keeps `index.html`
  correct in the repo; publishing becomes a manual step outside this
  automation's scope.

## Error handling

- If the GitHub API call fails (rate limit, network), the workflow fails
  loudly (visible in the Actions tab) and does not commit — last known-good
  `index.html` stays live.
- If marker comments are missing from `index.html` (e.g. accidentally
  deleted during a redesign), the script exits with an explicit error
  stating that `PROJECTS:START`/`PROJECTS:END` markers were not found,
  rather than guessing where to inject content — so troubleshooting points
  straight at the cause instead of a generic failure.

## Out of scope (for this iteration)

- Language badges, star counts, README-derived descriptions.
- Webhook/real-time triggering (daily schedule + manual dispatch only).
- Repo allow/deny-listing beyond the `portfolio` topic filter.
