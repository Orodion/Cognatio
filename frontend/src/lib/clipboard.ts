/**
 * Copies text into the clipboard. The Clipboard API needs a permission that a shell may refuse; then the text is
 * copied through a selection of a hidden field, as browsers did before. False if neither works.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return copyThroughSelection(text);
  }
}

function copyThroughSelection(text: string): boolean {
  const field = document.createElement('textarea');
  field.value = text;
  field.setAttribute('readonly', '');
  field.style.position = 'fixed';
  field.style.opacity = '0';
  document.body.appendChild(field);
  const focused = document.activeElement as HTMLElement | null;
  try {
    field.select();
    // Deprecated, but the only way without the permission of the Clipboard API
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    field.remove();
    focused?.focus();
  }
}
