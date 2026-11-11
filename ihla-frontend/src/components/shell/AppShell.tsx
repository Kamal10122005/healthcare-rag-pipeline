import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Menu, Moon, Sun, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { appConfig } from '@/config/env';
import { useApp } from '@/state/AppProvider';
import { Button } from '@/components/ui/Button';
import { GROUP_LABELS, NAV_ITEMS, type NavItem } from './navigation';
import { ModeIndicator } from './ModeIndicator';
import { ProductMark } from './ProductMark';

/**
 * Application shell: a fixed navigation rail on desktop, a slide-over drawer
 * below `lg`. The rail uses the inverse surface so the working area reads as
 * the document and the navigation reads as chrome.
 */
export function AppShell() {
  const location = useLocation();
  const { theme, setTheme } = useApp();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const current =
    NAV_ITEMS.find((item) => location.pathname.startsWith(item.to)) ?? NAV_ITEMS[0];

  // Close the mobile drawer on navigation.
  useEffect(() => setDrawerOpen(false), [location.pathname]);

  useEffect(() => {
    document.title = `${current.label} · ${appConfig.appShortName}`;
  }, [current.label]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDrawerOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-canvas">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-md focus:bg-brand focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-brand-contrast"
      >
        Skip to main content
      </a>

      {/* Desktop rail */}
      <aside className="hidden h-full w-68 shrink-0 flex-col border-r border-line bg-surface-inverse lg:flex">
        <RailContent />
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 animate-fade-in bg-surface-inverse/50"
            onClick={() => setDrawerOpen(false)}
            aria-hidden
          />
          <aside
            className="relative flex h-full w-72 max-w-[85vw] animate-slide-in-right flex-col border-r border-line bg-surface-inverse"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
          >
            <RailContent onClose={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="z-30 shrink-0 border-b border-line bg-canvas/85 backdrop-blur-md">
          <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              className="lg:hidden"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="h-4 w-4" aria-hidden />
            </Button>

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-md font-semibold tracking-tight">
                {current.label}
              </h1>
              <p className="hidden truncate text-xs text-ink-muted sm:block">
                {current.blurb}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <ModeIndicator />
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
              >
                {theme === 'dark' ? (
                  <Sun className="h-4 w-4" aria-hidden />
                ) : (
                  <Moon className="h-4 w-4" aria-hidden />
                )}
              </Button>
            </div>
          </div>
        </header>

        <main id="main-content" className="min-h-0 min-w-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function RailContent({ onClose }: { onClose?: () => void }) {
  const groups: Array<NavItem['group']> = ['work', 'knowledge', 'system'];

  return (
    <>
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-4">
        <ProductMark />
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="rounded p-1 text-ink-inverse/70 transition-colors hover:text-ink-inverse"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4" aria-label="Main">
        {groups.map((group) => (
          <div key={group} className="space-y-1">
            <p className="px-2 pb-1 text-2xs font-semibold uppercase tracking-[0.08em] text-ink-inverse/40">
              {GROUP_LABELS[group]}
            </p>
            {NAV_ITEMS.filter((item) => item.group === group).map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors duration-150',
                    isActive
                      ? 'bg-white/[0.11] text-ink-inverse'
                      : 'text-ink-inverse/65 hover:bg-white/[0.06] hover:text-ink-inverse',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon
                      className={cn(
                        'h-4 w-4 shrink-0',
                        isActive ? 'text-accent' : 'text-ink-inverse/50',
                      )}
                      aria-hidden
                    />
                    <span className="truncate">{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 px-4 py-3">
        <p className="text-2xs leading-relaxed text-ink-inverse/45">
          Health information, not medical advice. Always consult a qualified clinician about
          your own care.
        </p>
      </div>
    </>
  );
}
