import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { forbiddenWordsIn, pointAtProject, withoutRevisions } from './lib/snapshot.mjs';

const OLD = 'gitlab.com/private-group/Cognatio';

describe('pointAtProject', () => {
  it('turns the GitLab release permalink into the GitHub form', () => {
    const yml = `publish:\n  provider: generic\n  url: https://${OLD}/-/releases/permalink/latest/downloads\n`;
    assert.equal(
      pointAtProject(yml, OLD, 'github.com/someone/Cognatio'),
      'publish:\n  provider: generic\n  url: https://github.com/someone/Cognatio/releases/latest/download\n',
    );
  });

  it('keeps the permalink form for a public project on GitLab', () => {
    const text = `https://${OLD}/-/releases/permalink/latest/downloads`;
    assert.equal(pointAtProject(text, OLD, 'gitlab.com/public/Cognatio'), 'https://gitlab.com/public/Cognatio/-/releases/permalink/latest/downloads');
  });

  it('replaces every other mention of the project address', () => {
    const ts = `export const PROJECT_URL = 'https://${OLD}';\n"homepage": "https://${OLD}"`;
    assert.equal(
      pointAtProject(ts, OLD, 'github.com/someone/Cognatio'),
      'export const PROJECT_URL = \'https://github.com/someone/Cognatio\';\n"homepage": "https://github.com/someone/Cognatio"',
    );
  });
});

describe('withoutRevisions', () => {
  it('drops the commit hashes and keeps the comments', () => {
    assert.equal(withoutRevisions('# Prettier\n90c3d84aa1\n# more\n'), '# Prettier\n# more\n');
  });
});

describe('forbiddenWordsIn', () => {
  it('finds the words regardless of case', () => {
    assert.deepEqual(forbiddenWordsIn('Mail: Someone@Example.org', ['someone@example.org', 'other']), ['someone@example.org']);
  });
});
