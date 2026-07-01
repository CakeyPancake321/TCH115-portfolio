# CLAUDE.md

Guidance for Claude Code instances working in this repo.

## What this is

Jonathan Mejia-Vanegas's TCH115 (Network Security) course portfolio — a single
static page (`index.html`, no build step, no framework) covering: home/intro,
degree objectives, RSA journey (currently "Time Management"), and a projects
section. Deployed via GitHub Pages from `main`.

## Structure

- `index.html` — the entire site. All styling is either in a `<style>` block
  (CSS custom properties for theming) or inline `style=""` attributes,
  depending on which redesign pass touched that section last. No JS framework;
  one small inline `<script>` handles the dark/light theme toggle
  (`localStorage`-persisted, defaults to dark).
- `scripts/lib/render.mjs` + `.test.mjs` — pure functions that turn a GitHub
  repo object into an HTML card string. No fs/network access.
- `scripts/lib/splice.mjs` + `.test.mjs` — pure function that replaces the
  region between `<!-- PROJECTS:START -->` / `<!-- PROJECTS:END -->` marker
  comments in an HTML string. No fs/network access.
- `scripts/sync-projects.mjs` — the only file with real side effects: fetches
  tagged repos from the GitHub API, calls the two pure modules above, reads
  and rewrites `index.html`.
- `.github/workflows/sync-projects.yml` — runs the sync script daily (cron)
  and on manual dispatch, commits `index.html` back to `main` if changed.
- `docs/superpowers/specs/` and `docs/superpowers/plans/` — design spec and
  implementation plan for the projects-sync automation. Read these before
  changing how that automation works.

## Projects auto-sync automation

**How it works:** tag any GitHub repo with the topic `portfolio`, and within
a day (or immediately via manual workflow dispatch) it appears as a card in
the Projects section, pulling `name`, `description`, `topics` (minus the
`portfolio` topic itself), and a `→ view project` link to the repo. A
"more projects coming soon" placeholder always renders after the real cards.

**Manual trigger:**
```bash
gh workflow run sync-projects.yml
gh run list --workflow=sync-projects.yml --limit 1   # check result
```

**Tagging a repo:**
```bash
gh repo edit OWNER/REPO --add-topic portfolio
```

**The marker-comment contract:** `sync-projects.mjs` only knows how to find
and replace the HTML between `<!-- PROJECTS:START -->` and
`<!-- PROJECTS:END -->` in `index.html` — it does not care what markup lives
there. **If you redesign the projects section, update the template literals
in `scripts/lib/render.mjs` (`renderCard` / `renderEmptyState`) to match the
new styling, and keep the two marker comments in `index.html` intact.**
Nothing else needs to change. Verify with:
```bash
node --test scripts/lib/*.test.mjs
node scripts/sync-projects.mjs   # then `git diff` and revert before committing
                                  # unless you intend to keep the live-synced result
```

**Known gotcha:** `node --test scripts/lib/` (directory form) fails to find
tests on some Node versions — use the glob form
`node --test scripts/lib/*.test.mjs` instead.

**Known gotcha:** GitHub only registers `workflow_dispatch`/`schedule`
triggers for workflow files that exist on the repo's **default branch**
(`main`). A workflow file added on a feature branch cannot be manually
dispatched via `--ref <feature-branch>` until it's merged — this isn't a bug,
it's a platform constraint. Verify live runs only after merging to `main`.

**GitHub Actions billing:** this account has previously hit a billing lock
that silently no-ops workflow runs (job shows "not started... billing issue"
in the run's annotations, not in the step logs). If a triggered run
completes with conclusion `failure` in under ~5 seconds, check
`gh run view <run-id>` (not `--log`) for annotations before assuming the
script itself is broken.

## Known issues / open work

- **Mobile responsiveness is not implemented.** The current design (inline
  `style=""` attributes, fixed pixel values like `padding:96px 52px`,
  `font-size:88px` hero text, 3-column and 2-column CSS grids with no media
  queries) does not scale down for small viewports. This is planned but not
  yet started — don't assume responsive behavior exists when reasoning about
  the layout.
- The RSA section's "Outcome" is intentionally incomplete — the user pivoted
  from a "Biblical Self-Control" RSA skill to "Time Management" partway
  through the course and has a schedule to follow over the following months;
  the outcome will be filled in later once that plays out. Don't treat this
  as a placeholder to "fix" — it's accurate as-is.

## Working conventions established in this repo

- **Feature branches for anything non-trivial.** Small copy/config tweaks
  have gone straight to `main`; anything that's a multi-file feature (the
  sync automation, the visual redesign) went through a `feature/*` or
  `redesign/*` branch, merged via fast-forward after tests pass.
- **Tests are Node's built-in `node:test` + `node:assert/strict`** — no test
  framework dependency. Keep it that way; this project intentionally has
  zero npm dependencies.
- Past implementation work in this repo was done via the
  `superpowers:subagent-driven-development` skill (spec written and approved
  first via `superpowers:brainstorming`, then a task-by-task plan via
  `superpowers:writing-plans`, then implemented with a fresh subagent per
  task plus spec-compliance + code-quality review). If picking up
  similarly-sized new work, that workflow is a reasonable default here.
