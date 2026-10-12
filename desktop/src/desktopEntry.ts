import fs from 'node:fs';
import path from 'node:path';

/**
 * Quotes a path for the Exec key of a .desktop file as the Desktop Entry Specification asks: `%` is doubled (field
 * codes), inside the quotes `"`, backtick, `$` and backslash get a backslash, and on top of that the escapes of string
 * values apply (every backslash doubled again, line breaks and tabs written as \n, \r and \t).
 */
export function quoteExec(file: string): string {
  const quoted = `"${file.replace(/%/g, '%%').replace(/(["`$\\])/g, '\\$1')}"`;
  return quoted.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
}

/** The menu entry of the AppImage: starts exactly this file */
export function desktopEntry(appImage: string): string {
  return [
    '[Desktop Entry]',
    'Type=Application',
    'Name=Cognatio',
    'Comment=Family tree software',
    `Exec=${quoteExec(appImage)}`,
    'Icon=cognatio',
    'Terminal=false',
    'Categories=Office;',
    'StartupWMClass=cognatio',
    '',
  ].join('\n');
}

function writeIfChanged(file: string, content: string | Buffer): boolean {
  try {
    if (fs.readFileSync(file).equals(Buffer.from(content))) {
      return false;
    }
  } catch {
    // does not exist yet
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  return true;
}

/**
 * Puts the AppImage into the application menu of the user (a .desktop file and the icon below XDG_DATA_HOME, no
 * administrator rights). Started again from another place, the entry follows the file. Returns true if something was written.
 */
export function integrateAppImage(options: { appImage: string; iconFile: string; dataHome: string }): boolean {
  const icon = fs.readFileSync(options.iconFile);
  const wroteIcon = writeIfChanged(path.join(options.dataHome, 'icons', 'hicolor', '256x256', 'apps', 'cognatio.png'), icon);
  const wroteEntry = writeIfChanged(path.join(options.dataHome, 'applications', 'cognatio.desktop'), desktopEntry(options.appImage));
  return wroteIcon || wroteEntry;
}
