// Makes the update feed file of the beta channel from the one electron-builder wrote (latest.yml of a release,
// beta.yml of a pre-release): the file addresses become absolute, so the feed file can live in a different place than
// the installer. Every release job uploads the result as `beta.yml` to the package `cognatio-channel/beta`; apps on
// the beta channel read it there (desktop/src/feeds.ts) and so always see the newest build of either kind.
//
//   node desktop/scripts/channel-feed.mjs <feed.yml> <address of the folder with the installer> <output file>
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

/** `url:` and `path:` entries of the feed file that are not absolute yet get the address of the folder */
export function channelFeed(yml, baseUrl) {
  const base = baseUrl.replace(/\/+$/, '');
  return yml.replace(/^(\s*(?:-\s+)?(?:url|path):\s*)(['"]?)([^'"\r\n]+)\2(\s*)$/gm, (line, key, _quote, value, trailing) =>
    /^https?:\/\//i.test(value) ? line : `${key}${base}/${encodeURI(value.trim())}${trailing}`,
  );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === fs.realpathSync(process.argv[1])) {
  const [input, baseUrl, output] = process.argv.slice(2);
  if (!input || !baseUrl || !output) {
    console.error('Usage: node desktop/scripts/channel-feed.mjs <feed.yml> <address of the installer folder> <output file>');
    process.exit(2);
  }
  fs.writeFileSync(output, channelFeed(fs.readFileSync(input, 'utf8'), baseUrl));
  console.log(`${output}: file addresses relative to ${baseUrl}`);
}
