import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CircleHelp, Moon, Sun, Search } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { buttonVariants } from '@/components/ui/buttonVariants';
import { helpSectionFor } from '@/features/help/sections';
import { useThemeStore } from '@/stores/themeStore';

export function Header() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { pathname } = useLocation();
  // Help for the current page: jumps directly to the matching section
  const helpSection = helpSectionFor(pathname);
  const { resolved, toggleTheme } = useThemeStore();
  const [search, setSearch] = useState(searchParams.get('q') ?? '');

  useEffect(() => {
    setSearch(searchParams.get('q') ?? '');
  }, [searchParams]);

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const query = search.trim();
    if (query) {
      navigate(`/persons?q=${encodeURIComponent(query)}`);
    } else {
      navigate('/persons');
    }
  };

  return (
    <header className="flex h-16 items-center gap-4 border-b bg-card px-6">
      <form onSubmit={handleSearch} className="relative mx-auto w-full max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('header.searchPlaceholder')}
          className="pl-10"
          aria-label={t('header.searchPlaceholder')}
        />
      </form>

      <div className="flex shrink-0 items-center gap-2">
        <Link
          to={helpSection ? `/help#${helpSection}` : '/help'}
          className={buttonVariants({ variant: 'outline', size: 'icon' })}
          aria-label={t('header.help')}
          title={t('header.help')}
        >
          <CircleHelp className="h-4 w-4" />
        </Link>
        <Button variant="outline" size="icon" onClick={toggleTheme} aria-label={resolved === 'light' ? t('header.darkMode') : t('header.lightMode')}>
          {resolved === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </Button>
      </div>
    </header>
  );
}
