/** Update channel: "stable" gets the releases, "beta" also the pre-releases (v1.2.0-beta.1) before them */
export type UpdateChannel = 'stable' | 'beta';

/**
 * Address of the project. The development repository is on GitLab; the public repository on GitHub has its own
 * address: scripts/public-snapshot.mjs replaces this one (the feed addresses below are derived from it).
 */
export const PROJECT_URL = 'https://github.com/Orodion/Cognatio';

/**
 * GitHub: the release that holds the feed files of the beta channel (`beta.yml`, `beta-linux.yml`). Every release
 * workflow replaces them (see .github/workflows/release.yml); it is a pre-release, so it is never "latest".
 */
export const BETA_CHANNEL_TAG = 'beta-channel';

/** The newest release (`latest.yml` and the installer are its assets, see .github/workflows/release.yml and .gitlab-ci.yml) */
function stableFeed(project: URL): string {
  const base = project.href.replace(/\/+$/, '');
  return project.hostname === 'github.com' ? `${base}/releases/latest/download` : `${base}/-/releases/permalink/latest/downloads`;
}

/**
 * The newest build of either kind: every release job uploads its `beta.yml` (with absolute installer addresses) to
 * a fixed place – on GitHub the release `beta-channel`, on GitLab the generic package `cognatio-channel/beta`.
 */
function betaFeed(project: URL): string {
  const path = project.pathname.replace(/^\/|\/$/g, '');
  return project.hostname === 'github.com'
    ? `${project.origin}/${path}/releases/download/${BETA_CHANNEL_TAG}`
    : `${project.origin}/api/v4/projects/${encodeURIComponent(path)}/packages/generic/cognatio-channel/beta`;
}

/**
 * Where each channel looks for updates. COGNATIO_UPDATE_URL replaces the feed (own server, tests); with it the
 * beta channel reads `beta.yml` from the same place unless COGNATIO_BETA_UPDATE_URL names another one.
 */
export function updateFeeds(env: NodeJS.ProcessEnv = process.env, projectUrl = PROJECT_URL): Record<UpdateChannel, string> {
  const project = new URL(projectUrl);
  const own = env.COGNATIO_UPDATE_URL?.trim();
  return {
    stable: own || stableFeed(project),
    beta: env.COGNATIO_BETA_UPDATE_URL?.trim() || own || betaFeed(project),
  };
}
