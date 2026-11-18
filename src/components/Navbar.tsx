import {useState} from 'react';
import {Icon, type IconName} from './Icons';
import type {BudgetUser, RoutePath} from '../types';

interface NavbarProps {
  user: BudgetUser | null;
  currentRoute: RoutePath;
  onNavigate: (path: RoutePath) => void;
  onLogout: () => void;
  onOpenQuickAdd?: () => void;
}

const DESKTOP_LINKS: Array<{path: RoutePath; label: string; icon: IconName}> = [
  {path: '/dashboard', label: 'Dashboard', icon: 'layout-dashboard'},
  {path: '/expenses', label: 'Expenses', icon: 'receipt'},
  {path: '/savings', label: 'Savings', icon: 'piggy-bank'},
  {path: '/plan', label: 'Plan', icon: 'file-spreadsheet'},
  {path: '/year', label: 'Year', icon: 'calendar'},
  {path: '/reviews', label: 'Reviews', icon: 'message-square'},
];

const MOBILE_TABS: Array<{path: RoutePath; label: string; icon: IconName}> = [
  {path: '/dashboard', label: 'Home', icon: 'home'},
  {path: '/expenses', label: 'Add', icon: 'plus'},
  {path: '/plan', label: 'Plan', icon: 'file-spreadsheet'},
  {path: '/reviews', label: 'Reviews', icon: 'message-square'},
];

export function Navbar({user, currentRoute, onNavigate, onLogout}: NavbarProps) {
  const [moreOpen, setMoreOpen] = useState(false);

  const isFullySignedIn = Boolean(user && user.onboardingDone);

  function go(path: RoutePath) {
    onNavigate(path);
    setMoreOpen(false);
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[#DFEAE4] bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <a
            href={isFullySignedIn ? '/dashboard' : '/'}
            onClick={(e) => {
              e.preventDefault();
              go(isFullySignedIn ? '/dashboard' : user ? '/onboarding' : '/');
            }}
            className="flex min-h-[48px] shrink-0 items-center gap-2.5 whitespace-nowrap text-lg font-extrabold tracking-tight text-[#0A5A4A]">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#0E7C66] to-[#17A589] text-white shadow-xs">
              <Icon name="wallet" className="h-5 w-5" />
            </span>
            <span>Budget Buddy</span>
          </a>

          {isFullySignedIn ? (
            <>
              <nav aria-label="Primary navigation" className="hidden items-center gap-5 md:flex">
                {DESKTOP_LINKS.map((item) => {
                  const isActive = currentRoute === item.path;
                  return (
                    <a
                      key={item.path}
                      href={item.path}
                      onClick={(e) => {
                        e.preventDefault();
                        go(item.path);
                      }}
                      aria-current={isActive ? 'page' : undefined}
                      className={`inline-flex min-h-[44px] shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-1 py-2 text-base font-semibold transition-colors ${
                        isActive
                          ? 'border-[#0E7C66] text-[#0A5A4A]'
                          : 'border-transparent text-[#31443D] hover:border-[#C5D8CF] hover:text-[#0A5A4A]'
                      }`}>
                      <Icon name={item.icon} className="h-4 w-4" />
                      <span>{item.label}</span>
                    </a>
                  );
                })}
              </nav>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMoreOpen(false);
                    onLogout();
                  }}
                  className="bb-btn inline-flex min-h-[44px] shrink-0 items-center gap-2 whitespace-nowrap rounded-xl border border-[#C9D8D1] bg-white px-4 py-2 text-base font-semibold text-[#12201B] hover:border-[#F0B8B8] hover:bg-[#FFF5F5] hover:text-[#9B1C1C]">
                  <Icon name="log-out" className="h-4 w-4" />
                  <span>Log out</span>
                </button>
              </div>
            </>
          ) : user ? (
            <nav aria-label="Setup navigation" className="flex items-center gap-2">
              <button
                type="button"
                onClick={onLogout}
                className="bb-btn inline-flex min-h-[44px] shrink-0 items-center gap-2 whitespace-nowrap rounded-xl border border-[#C9D8D1] bg-white px-4 py-2 text-base font-semibold text-[#12201B] hover:bg-[#FFF5F5] hover:text-[#9B1C1C]">
                <Icon name="log-out" className="h-4 w-4" />
                <span>Log out</span>
              </button>
            </nav>
          ) : (
            <nav aria-label="Public navigation" className="flex shrink-0 items-center gap-2">
              <a
                href="/login"
                onClick={(e) => {
                  e.preventDefault();
                  go('/login');
                }}
                className="inline-flex min-h-[44px] shrink-0 items-center whitespace-nowrap rounded-xl px-3.5 py-2 text-base font-semibold text-[#12201B] hover:bg-[#EEF6F2] hover:text-[#0A5A4A]">
                Log in
              </a>
              <a
                href="/register"
                onClick={(e) => {
                  e.preventDefault();
                  go('/register');
                }}
                className="bb-btn inline-flex min-h-[44px] shrink-0 items-center whitespace-nowrap rounded-xl bg-[#0E7C66] px-4 py-2 text-base font-bold text-white hover:bg-[#0A5A4A]">
                Create account
              </a>
            </nav>
          )}
        </div>
      </header>

      {isFullySignedIn && (
        <>
          {moreOpen && (
            <div
              className="fixed inset-0 z-40 bg-[#12201B]/40 backdrop-blur-xs md:hidden"
              onClick={() => setMoreOpen(false)}>
              <div
                role="dialog"
                aria-label="More pages"
                onClick={(e) => e.stopPropagation()}
                className="fixed right-0 bottom-[68px] left-0 rounded-t-[20px] border-t border-[#DFEAE4] bg-white p-4 shadow-xl">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-base font-bold text-[#12201B]">More options</span>
                  <button
                    type="button"
                    onClick={() => setMoreOpen(false)}
                    aria-label="Close menu"
                    className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[#DFEAE4] text-[#12201B]">
                    <Icon name="x" className="h-5 w-5" />
                  </button>
                </div>
                <div className="grid gap-2">
                  <button
                    type="button"
                    onClick={() => go('/savings')}
                    className={`flex min-h-[52px] w-full items-center gap-3 rounded-2xl px-4 text-left text-base font-semibold ${
                      currentRoute === '/savings'
                        ? 'bg-[#E6F5EF] text-[#0A5A4A]'
                        : 'bg-[#F6FAF8] text-[#12201B]'
                    }`}>
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#FEF3C7] text-[#B45309]">
                      <Icon name="piggy-bank" className="h-5 w-5" />
                    </span>
                    <span>Savings and goals</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => go('/year')}
                    className={`flex min-h-[52px] w-full items-center gap-3 rounded-2xl px-4 text-left text-base font-semibold ${
                      currentRoute === '/year'
                        ? 'bg-[#E6F5EF] text-[#0A5A4A]'
                        : 'bg-[#F6FAF8] text-[#12201B]'
                    }`}>
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#EBF3FF] text-[#1D4ED8]">
                      <Icon name="calendar" className="h-5 w-5" />
                    </span>
                    <span>12-month calendar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMoreOpen(false);
                      onLogout();
                    }}
                    className="flex min-h-[52px] w-full items-center gap-3 rounded-2xl border border-[#F4C2C2] bg-[#FFF5F5] px-4 text-left text-base font-semibold text-[#9B1C1C]">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#FEE2E2] text-[#B91C1C]">
                      <Icon name="log-out" className="h-5 w-5" />
                    </span>
                    <span>Log out</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          <nav
            aria-label="Mobile bottom tab bar"
            className="fixed right-0 bottom-0 left-0 z-40 grid h-[68px] grid-cols-5 border-t border-[#DFEAE4] bg-white/95 px-1 backdrop-blur-md md:hidden">
            {MOBILE_TABS.map((tab) => {
              const isActive = currentRoute === tab.path && !moreOpen;
              return (
                <a
                  key={tab.path}
                  href={tab.path}
                  onClick={(e) => {
                    e.preventDefault();
                    go(tab.path);
                  }}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex min-h-[48px] flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-xs font-semibold ${
                    isActive ? 'text-[#0E7C66]' : 'text-[#4A5C55]'
                  }`}>
                  <span
                    className={`flex h-7 w-11 items-center justify-center rounded-full ${
                      isActive ? 'bg-[#E6F5EF] text-[#0E7C66]' : ''
                    }`}>
                    <Icon name={tab.icon} className="h-5 w-5" />
                  </span>
                  <span className="whitespace-nowrap">{tab.label}</span>
                </a>
              );
            })}
            <button
              type="button"
              onClick={() => setMoreOpen((prev) => !prev)}
              aria-expanded={moreOpen}
              className={`flex min-h-[48px] flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-xs font-semibold ${
                moreOpen || currentRoute === '/savings' || currentRoute === '/year'
                  ? 'text-[#0E7C66]'
                  : 'text-[#4A5C55]'
              }`}>
              <span
                className={`flex h-7 w-11 items-center justify-center rounded-full ${
                  moreOpen || currentRoute === '/savings' || currentRoute === '/year'
                    ? 'bg-[#E6F5EF] text-[#0E7C66]'
                    : ''
                }`}>
                <Icon name="more-horizontal" className="h-5 w-5" />
              </span>
              <span className="whitespace-nowrap">More</span>
            </button>
          </nav>
        </>
      )}
    </>
  );
}
