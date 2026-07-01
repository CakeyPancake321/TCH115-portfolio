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
