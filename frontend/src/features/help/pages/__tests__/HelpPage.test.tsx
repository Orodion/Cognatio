import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { HelpPage } from '../HelpPage';
import helpDefault from '@/features/help/content/en';
import i18n from '@/i18n';

// Tests run in cimode – the help texts then come in the default language (English)
function Location() {
  const { pathname, hash } = useLocation();
  return <p data-testid="location">{pathname + hash}</p>;
}

function setup(url = '/help') {
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="*" element={<HelpPage />} />
      </Routes>
      <Location />
    </MemoryRouter>,
  );
}

const sectionHeadings = () => screen.getAllByRole('heading', { level: 2 }).filter((h) => h.id.startsWith('help-'));

describe('HelpPage', () => {
  it('shows all sections with a table of contents', () => {
    setup();
    expect(screen.getByRole('heading', { name: 'help.title', level: 1 })).toBeInTheDocument();
    expect(sectionHeadings()).toHaveLength(helpDefault.length);
    const contents = screen.getByRole('navigation', { name: 'help.contents' });
    expect(contents.querySelectorAll('a')).toHaveLength(helpDefault.length);
    expect(screen.getByRole('region', { name: 'Import/Export' })).toHaveTextContent('Merge – newer wins');
    expect(screen.getAllByRole('link', { name: /Go to Import\/Export/ })[0]).toHaveAttribute('href', '/import-export');
  });

  it('focuses the section named in the address', async () => {
    setup('/help#backup');
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Backup', level: 2 })).toHaveFocus());
  });

  it('filters the sections and reports when nothing matches', () => {
    setup();
    const search = screen.getByRole('searchbox', { name: 'help.search' });
    fireEvent.change(search, { target: { value: 'recycle bin restore' } });
    expect(sectionHeadings().map((h) => h.textContent)).toContain('Recycle bin');
    expect(sectionHeadings().map((h) => h.textContent)).not.toContain('Search');
    expect(screen.getByRole('status')).toHaveTextContent('help.results');
    fireEvent.change(search, { target: { value: 'xyzxyz' } });
    expect(sectionHeadings()).toHaveLength(0);
    expect(screen.getByText('help.noResults')).toBeInTheDocument();
  });

  it('jumps to a section from the table of contents and clears the search', async () => {
    setup();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'xyzxyz' } });
    const contents = screen.getByRole('navigation', { name: 'help.contents' });
    fireEvent.click(contents.querySelector('a[href="#trash"]')!);
    expect(screen.getByTestId('location')).toHaveTextContent('/help#trash');
    expect(screen.getByRole('searchbox')).toHaveValue('');
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Recycle bin', level: 2 })).toHaveFocus());
  });

  describe('version history', () => {
    afterEach(() => i18n.changeLanguage('cimode'));

    it('lists the releases with links to the help chapters', async () => {
      setup('/help#versions');
      const history = screen.getByRole('region', { name: 'Version history' });
      expect(within(history).getByRole('heading', { name: /^help\.version/, level: 3 })).toBeInTheDocument();
      fireEvent.click(within(history).getByRole('link', { name: 'Recycle bin' }));
      expect(screen.getByTestId('location')).toHaveTextContent('/help#trash');
      await waitFor(() => expect(screen.getByRole('heading', { name: 'Recycle bin', level: 2 })).toHaveFocus());
    });

    it('shows the entries in the language of the app and switches to the original', async () => {
      await i18n.changeLanguage('de');
      setup('/help');
      const history = screen.getByRole('region', { name: 'Versionsverlauf' });
      expect(within(history).getByRole('link', { name: 'Papierkorb' })).toBeInTheDocument();
      fireEvent.click(within(history).getByRole('button', { name: 'Original anzeigen (Englisch)' }));
      expect(within(history).getByRole('link', { name: 'Recycle bin' })).toBeInTheDocument();
      expect(history.querySelector('[lang="en"]')).not.toBeNull();
      fireEvent.click(within(history).getByRole('button', { name: 'Übersetzung anzeigen' }));
      expect(within(history).getByRole('link', { name: 'Papierkorb' })).toBeInTheDocument();
    });

    it('offers no switch in English', async () => {
      await i18n.changeLanguage('en');
      setup('/help');
      const history = screen.getByRole('region', { name: 'Version history' });
      expect(within(history).queryByRole('button')).toBeNull();
      expect(within(history).getByRole('link', { name: 'Recycle bin' })).toBeInTheDocument();
    });
  });
});
