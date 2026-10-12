import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRef } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { printImage, renderTree } from '@/features/tree/lib/treeExport';
import { saveDataUrl } from '@/lib/platform';
import { useSettingsStore } from '@/stores/settingsStore';
import { TreeExportButtons } from '../TreeExportButtons';

const flow = {
  getNodes: vi.fn(() => [{ id: 'a' }]),
  getNodesBounds: vi.fn(() => ({ x: 0, y: 0, width: 300, height: 200 })),
  getViewport: vi.fn(() => ({ x: -50, y: -20, zoom: 2 })),
};
vi.mock('@xyflow/react', () => ({ useReactFlow: () => flow }));
vi.mock('@/features/tree/lib/treeExport', async (original) => ({
  ...(await original<typeof import('@/features/tree/lib/treeExport')>()),
  renderTree: vi.fn(async () => 'data:image/png;base64,AAA'),
  printImage: vi.fn(),
}));
vi.mock('@/lib/platform', async (original) => ({
  ...(await original<typeof import('@/lib/platform')>()),
  saveDataUrl: vi.fn(),
}));

/** Container with the DOM structure of React Flow */
function setup() {
  const ref = createRef<HTMLDivElement>();
  render(
    <>
      <div ref={ref}>
        <div className="react-flow">
          <div className="react-flow__viewport" />
        </div>
      </div>
      <TreeExportButtons containerRef={ref} title="Stammbaum Muster" fileBase="family-tree-muster" />
    </>,
  );
}

beforeEach(() => vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-09-29T12:00:00Z') }));
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
  useSettingsStore.setState({ treeExportVisibleOnly: false });
});

describe('TreeExportButtons', () => {
  it('exports the whole tree as PNG or SVG with a dated file name', async () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /tree.export.png/ }));
    await waitFor(() => expect(saveDataUrl).toHaveBeenCalledWith('data:image/png;base64,AAA', 'family-tree-muster-2026-09-29.png'));
    expect(renderTree).toHaveBeenLastCalledWith(expect.any(HTMLElement), { x: 0, y: 0, width: 300, height: 200 }, 'png', expect.any(String));

    fireEvent.click(screen.getByRole('button', { name: /tree.export.svg/ }));
    await waitFor(() => expect(saveDataUrl).toHaveBeenLastCalledWith(expect.any(String), 'family-tree-muster-2026-09-29.svg'));
    expect(renderTree).toHaveBeenLastCalledWith(expect.any(HTMLElement), expect.any(Object), 'svg', expect.any(String));
  });

  it('exports only the visible part on request and prints for PDF', async () => {
    setup();
    fireEvent.click(screen.getByLabelText('tree.export.visibleOnly'));
    fireEvent.click(screen.getByRole('button', { name: /tree.export.pdf/ }));
    await waitFor(() => expect(printImage).toHaveBeenCalledWith('data:image/png;base64,AAA', 'Stammbaum Muster'));
    // Visible area from the current zoom instead of all nodes, without margin
    expect(flow.getViewport).toHaveBeenCalled();
    expect(renderTree).toHaveBeenLastCalledWith(expect.any(HTMLElement), expect.objectContaining({ x: 25, y: 10 }), 'png', expect.any(String), 0);
    // Stored like the other family tree settings
    expect(useSettingsStore.getState().treeExportVisibleOnly).toBe(true);
  });

  it('reports a failed export', async () => {
    vi.mocked(renderTree).mockRejectedValueOnce(new Error('canvas'));
    setup();
    fireEvent.click(screen.getByRole('button', { name: /tree.export.png/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('tree.export.failed');
    expect(screen.getByRole('button', { name: /tree.export.png/ })).toBeEnabled();
  });

  it('does nothing without nodes', () => {
    flow.getNodes.mockReturnValueOnce([]);
    setup();
    fireEvent.click(screen.getByRole('button', { name: /tree.export.png/ }));
    expect(renderTree).not.toHaveBeenCalled();
  });
});
