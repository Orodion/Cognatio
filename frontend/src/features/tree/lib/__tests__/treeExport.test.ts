import { describe, it, expect, vi, afterEach } from 'vitest';
import { printImage, renderTree, visibleArea } from '../treeExport';

vi.mock('html-to-image', () => ({
  toPng: vi.fn(async () => 'data:image/png;base64,AAA'),
  toSvg: vi.fn(async () => 'data:image/svg+xml;charset=utf-8,<svg/>'),
}));

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('renderTree', () => {
  it('renders the whole graph with padding, independent of the current zoom', async () => {
    const { toPng } = await import('html-to-image');
    const viewport = document.createElement('div');
    await renderTree(viewport, { x: -100, y: 50, width: 500, height: 300 }, 'png', 'rgb(255, 255, 255)');

    const options = vi.mocked(toPng).mock.calls[0][1]!;
    expect(options).toMatchObject({ width: 580, height: 380, backgroundColor: 'rgb(255, 255, 255)', skipFonts: true });
    expect(options.style?.transform).toBe('translate(140px, -10px) scale(1)');
  });

  it('scales very large trees down', async () => {
    const { toSvg } = await import('html-to-image');
    await renderTree(document.createElement('div'), { x: 0, y: 0, width: 15920, height: 100 }, 'svg', 'white');
    const options = vi.mocked(toSvg).mock.calls[0][1]!;
    expect(options.width).toBe(8000);
    expect(options.style?.transform).toContain('scale(0.5)');
  });

  it('leaves controls out of the image', async () => {
    const { toPng } = await import('html-to-image');
    await renderTree(document.createElement('div'), { x: 0, y: 0, width: 10, height: 10 }, 'png', 'white');
    const filter = vi.mocked(toPng).mock.calls.at(-1)![1]!.filter!;

    const handle = document.createElement('div');
    handle.className = 'react-flow__handle';
    const button = document.createElement('button');
    button.dataset.exportHidden = 'true';
    expect(filter(handle)).toBe(false);
    expect(filter(button)).toBe(false);
    expect(filter(document.createElement('div'))).toBe(true);
  });
});

describe('visibleArea', () => {
  it('converts the current viewport into graph coordinates', () => {
    // Moved by (100, 50) and scaled to 50 %: 800×600 pixels show 1600×1200 graph units
    expect(visibleArea({ x: 100, y: 50, zoom: 0.5 }, 800, 600)).toEqual({ x: -200, y: -100, width: 1600, height: 1200 });
  });

  it('is exported without extra padding', async () => {
    const { toPng } = await import('html-to-image');
    await renderTree(document.createElement('div'), { x: -200, y: -100, width: 1600, height: 1200 }, 'png', 'white', 0);
    const options = vi.mocked(toPng).mock.calls.at(-1)![1]!;
    expect(options).toMatchObject({ width: 1600, height: 1200 });
    expect(options.style?.transform).toBe('translate(200px, 100px) scale(1)');
  });
});

describe('printImage', () => {
  it('prints the image from a hidden frame once it has loaded; the title is text, not HTML', () => {
    printImage('data:image/png;base64,AAA', '<b>Vorfahrentafel</b> – Anna');
    const iframe = document.querySelector('iframe')!;
    const print = vi.spyOn(iframe.contentWindow!, 'print').mockImplementation(() => {});
    vi.spyOn(iframe.contentWindow!, 'focus').mockImplementation(() => {});
    const doc = iframe.contentDocument!;

    expect(doc.querySelector('h1')!.textContent).toBe('<b>Vorfahrentafel</b> – Anna');
    expect(doc.querySelector('b')).toBeNull();
    expect(print).not.toHaveBeenCalled();

    doc.querySelector('img')!.dispatchEvent(new Event('load'));
    expect(print).toHaveBeenCalled();
  });
});
