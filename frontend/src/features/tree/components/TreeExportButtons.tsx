import { useState, type RefObject } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useTranslation } from 'react-i18next';
import { FileDown, Image, Printer } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { printImage, renderTree, visibleArea, type ExportFormat } from '@/features/tree/lib/treeExport';
import { saveDataUrl } from '@/lib/platform';
import { useSettingsStore } from '@/stores/settingsStore';

interface TreeExportButtonsProps {
  /** Container of the graph (family tree) */
  containerRef: RefObject<HTMLDivElement>;
  /** Heading when printing */
  title: string;
  /** File name without date and extension */
  fileBase: string;
}

/** Export of the graph (complete or visible area) as PNG, SVG or via the print dialog (PDF). Must be inside the ReactFlowProvider. */
export function TreeExportButtons({ containerRef, title, fileBase }: TreeExportButtonsProps) {
  const { t } = useTranslation();
  const { getNodes, getNodesBounds, getViewport } = useReactFlow();
  // Stored like the other family tree settings
  const visibleOnly = useSettingsStore((s) => s.treeExportVisibleOnly);
  const setVisibleOnly = useSettingsStore((s) => s.setTreeExportVisibleOnly);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const handleExport = async (format: ExportFormat) => {
    const container = containerRef.current;
    const flow = container?.querySelector<HTMLElement>('.react-flow');
    const viewport = container?.querySelector<HTMLElement>('.react-flow__viewport');
    const nodes = getNodes();
    if (!container || !flow || !viewport || nodes.length === 0) {
      return;
    }

    setBusy(true);
    setFailed(false);
    try {
      const background = getComputedStyle(container).backgroundColor;
      const imageFormat = format === 'svg' ? 'svg' : 'png';
      const dataUrl = visibleOnly
        ? await renderTree(viewport, visibleArea(getViewport(), flow.clientWidth, flow.clientHeight), imageFormat, background, 0)
        : await renderTree(viewport, getNodesBounds(nodes), imageFormat, background);
      if (format === 'pdf') {
        printImage(dataUrl, title);
      } else {
        const date = new Date().toISOString().slice(0, 10);
        await saveDataUrl(dataUrl, `${fileBase}-${date}.${format}`);
      }
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap items-center justify-end gap-1" role="group" aria-label={t('tree.export.label')}>
        <label className="mr-2 flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" className="h-4 w-4 accent-primary" checked={visibleOnly} onChange={(e) => setVisibleOnly(e.target.checked)} />
          {t('tree.export.visibleOnly')}
        </label>
        <Button variant="outline" disabled={busy} onClick={() => handleExport('png')}>
          <Image className="h-4 w-4" />
          {t('tree.export.png')}
        </Button>
        <Button variant="outline" disabled={busy} onClick={() => handleExport('svg')}>
          <FileDown className="h-4 w-4" />
          {t('tree.export.svg')}
        </Button>
        <Button variant="outline" disabled={busy} onClick={() => handleExport('pdf')}>
          <Printer className="h-4 w-4" />
          {t('tree.export.pdf')}
        </Button>
      </div>
      {failed && (
        <p className="text-sm text-destructive" role="alert">
          {t('tree.export.failed')}
        </p>
      )}
    </div>
  );
}
