import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useActiveTreeStore } from '@/stores/activeTreeStore';
import { MediaOpenLink } from '../MediaOpenLink';

const media = (fileName: string, originalFileName: string, viewable: boolean) => ({ id: 'm1', fileName, originalFileName, viewable });

describe('MediaOpenLink', () => {
  it('opens a file the browser can show in a new window, named by its original name', () => {
    render(<MediaOpenLink media={media('abc.md', 'Brief an Anna.md', true)}>open</MediaOpenLink>);
    const link = screen.getByRole('link', { name: 'open' });
    expect(link).toHaveAttribute('href', '/uploads/abc.md?name=Brief%20an%20Anna.md');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).not.toHaveAttribute('download');
  });

  it('saves any other file right away under its original name, without a new window', () => {
    useActiveTreeStore.setState({ treeId: 't1' });
    render(<MediaOpenLink media={media('abc.zip', 'Fotos.zip', false)}>open</MediaOpenLink>);
    const link = screen.getByRole('link', { name: 'open' });
    expect(link).toHaveAttribute('href', '/api/v1/media/m1/download?familyTree=t1');
    expect(link).toHaveAttribute('download', 'Fotos.zip');
    expect(link).not.toHaveAttribute('target');
  });
});
