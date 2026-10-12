// electron-builder never copies a node_modules folder with extraResources (no filter changes that), so the
// production dependencies of the backend are put next to it after packing.
const fs = require('node:fs');
const path = require('node:path');

exports.default = async function afterPack(context) {
  const from = path.join(__dirname, '..', 'stage', 'backend', 'node_modules');
  const to = path.join(context.appOutDir, 'resources', 'backend', 'node_modules');
  if (!fs.existsSync(from)) {
    throw new Error(`${from} is missing – run "npm run stage -w desktop" first`);
  }
  fs.cpSync(from, to, { recursive: true });
};
