// Text changes of scripts/public-snapshot.mjs (pure functions, tested in scripts/snapshot.test.mjs)

/** Hosts the public repository can live on; the release workflow of each is in the repository (.github, .gitlab-ci.yml) */
export const HOSTS = ['github.com', 'gitlab.com'];

/**
 * Points a text file at the new project: first the address of the newest release (GitLab permalink → GitHub
 * `releases/latest/download`, used by the update feed in desktop/electron-builder.yml), then every other mention of
 * the old project address (links, desktop/src/feeds.ts).
 */
export function pointAtProject(text, oldProject, newProject) {
  const newHost = newProject.split('/')[0];
  const oldRelease = `https://${oldProject}/-/releases/permalink/latest/downloads`;
  const newRelease =
    newHost === 'github.com' ? `https://${newProject}/releases/latest/download` : `https://${newProject}/-/releases/permalink/latest/downloads`;
  return text.split(oldRelease).join(newRelease).split(oldProject).join(newProject);
}

/** .git-blame-ignore-revs without its commits (they belong to the private history); the comments stay */
export const withoutRevisions = (text) =>
  text
    .split(/\r?\n/)
    .filter((line) => !/^[0-9a-f]{7,40}\s*$/i.test(line.trim()))
    .join('\n');

/** The words of the list that the text contains (case does not matter) */
export const forbiddenWordsIn = (text, words) => {
  const lower = text.toLowerCase();
  return words.filter((word) => lower.includes(word.toLowerCase()));
};
