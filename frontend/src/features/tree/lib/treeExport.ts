import { toPng, toSvg } from 'html-to-image';
import type { Rect } from '@xyflow/react';
import { exportFontCss } from './exportFonts';
import { FONT_FACE_FAMILY } from '@/lib/appearance';
import { useAppearanceStore } from '@/stores/appearanceStore';

export type ExportFormat = 'png' | 'svg' | 'pdf';

const PADDING = 40;
/** Upper limit for the edge length of the image; larger trees are scaled down (browser canvas limits). */
const MAX_SIZE = 8000;

/**
 * Renders an area of the graph as an image – independent of the current zoom.
 * `viewport` is the element `.react-flow__viewport`, `bounds` the area in graph coordinates
 * (outline of all nodes or the visible area), `padding` the margin around this area.
 */
export async function renderTree(viewport: HTMLElement, bounds: Rect, format: 'png' | 'svg', backgroundColor: string, padding = PADDING): Promise<string> {
  const scale = Math.min(1, MAX_SIZE / Math.max(bounds.width + 2 * padding, bounds.height + 2 * padding));
  const width = Math.ceil((bounds.width + 2 * padding) * scale);
  const height = Math.ceil((bounds.height + 2 * padding) * scale);
  // Only embed the character-set parts of the app font that occur in the family tree
  const { font, treeFont } = useAppearanceStore.getState();
  const family = FONT_FACE_FAMILY[treeFont === 'app' ? font : treeFont];
  const fontEmbedCSS = family ? await exportFontCss(viewport.textContent ?? '', family) : undefined;
  const options = {
    backgroundColor,
    fontEmbedCSS,
    // Without an embedded font (e.g. the request failed) the fallback font applies
    skipFonts: !fontEmbedCSS,
    // Controls (focus buttons, handles) do not belong in the image
    filter: (el: HTMLElement) => !el.classList?.contains('react-flow__handle') && !el.dataset?.exportHidden,
    width,
    height,
    style: {
      width: `${width}px`,
      height: `${height}px`,
      transform: `translate(${(padding - bounds.x) * scale}px, ${(padding - bounds.y) * scale}px) scale(${scale})`,
    },
  };
  return format === 'svg' ? toSvg(viewport, options) : toPng(viewport, { ...options, pixelRatio: 2 });
}

/** Visible area in graph coordinates from the current viewport (translation + zoom) and the size of the area. */
export function visibleArea(viewport: { x: number; y: number; zoom: number }, width: number, height: number): Rect {
  return {
    x: -viewport.x / viewport.zoom,
    y: -viewport.y / viewport.zoom,
    width: width / viewport.zoom,
    height: height / viewport.zoom,
  };
}

/**
 * Opens the print dialog with the image (where "Save as PDF" can be chosen).
 * Printing happens from an invisible iframe so navigation and toolbar are not printed.
 */
export function printImage(dataUrl: string, title: string) {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText = 'position:fixed;width:0;height:0;border:0;right:0;bottom:0';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    iframe.remove();
    throw new Error('print not available');
  }

  doc.open();
  doc.write(
    '<!doctype html><html><head><meta charset="utf-8"><title></title><style>' +
      '@page{size:landscape;margin:10mm}html,body{margin:0;height:100%}' +
      'body{display:flex;flex-direction:column;font-family:sans-serif}' +
      'h1{font-size:14pt;margin:0 0 6mm}' +
      'img{flex:1;min-height:0;max-width:100%;object-fit:contain}' +
      '</style></head><body><h1></h1><img alt=""></body></html>',
  );
  doc.close();
  // Set the title as text (not as HTML) so names are not interpreted
  doc.title = title;
  doc.querySelector('h1')!.textContent = title;

  const img = doc.querySelector('img')!;
  const cleanup = () => setTimeout(() => iframe.remove(), 1000);
  img.onload = () => {
    win.addEventListener('afterprint', cleanup, { once: true });
    win.focus();
    win.print();
    // Browsers without an afterprint event: clean up after one minute at the latest
    setTimeout(cleanup, 60_000);
  };
  img.src = dataUrl;
}
