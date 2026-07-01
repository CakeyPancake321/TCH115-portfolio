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
