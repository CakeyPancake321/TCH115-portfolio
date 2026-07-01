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

test('renderCard escapes double quotes in html_url so they cannot break out of the href attribute', () => {
  const repo = {
    name: 'quoted-url-repo',
    description: 'A repo with a crafted URL',
    topics: ['portfolio'],
    html_url: 'https://github.com/x/repo?query="quoted"',
  };
  const html = renderCard(repo);

  assert.match(html, /href="https:\/\/github\.com\/x\/repo\?query=&quot;quoted&quot;"/);
  assert.doesNotMatch(html, /href="https:\/\/github\.com\/x\/repo\?query="quoted""/);
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

test('buildSection appends a trailing "coming soon" placeholder after real repo cards', () => {
  const repos = [
    { name: 'repo-one', description: 'first', topics: ['portfolio'], html_url: 'https://github.com/x/repo-one' },
  ];
  const html = buildSection(repos);
  assert.match(html, /proj-placeholder/);
  assert.match(html, /more projects coming soon/);

  const placeholderIndex = html.indexOf('proj-placeholder');
  const cardIndex = html.indexOf('project-card');
  assert.ok(cardIndex < placeholderIndex, 'placeholder should come after the project card');
});
