import {useState} from 'react';
import {
  Calendar,
  FileSpreadsheet,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  PiggyBank,
  Receipt,
  X,
} from 'lucide-react';
import type {BudgetUser, RoutePath} from '../types';

interface NavbarProps {
  user: BudgetUser | null;
  currentRoute: RoutePath;
  onNavigate: (path: RoutePath) => void;
  onLogout: () => void;
}

const APP_LINKS: Array<{path: RoutePath; label: string}> = [
  {path: '/dashboard', label: 'Dashboard'},
  {path: '/expenses', label: 'Expenses'},
  {path: '/savings', label: 'Savings'},
  {path: '/plan', label: 'Plan'},
  {path: '/year', label: 'Year'},
  {path: '/reviews', label: 'Reviews'},
];

function NavIcon({path}: {path: RoutePath}) {
  if (path === '/dashboard') return <LayoutDashboard className="h-4 w-4" aria-hidden="true" />;
  if (path === '/expenses') return <Receipt className="h-4 w-4" aria-hidden="true" />;
  if (path === '/savings') return <PiggyBank className="h-4 w-4" aria-hidden="true" />;
  if (path === '/plan') return <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />;
  if (path === '/year') return <Calendar className="h-4 w-4" aria-hidden="true" />;
  return <MessageSquareText className="h-4 w-4" aria-hidden="true" />;
}

export function Navbar({user, currentRoute, onNavigate, onLogout}: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const isFullySignedIn = Boolean(user && user.onboardingDone);

  function go(path: RoutePath) {
    onNavigate(path);
    setMobileOpen(false);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-[#E1E8E4] bg-white shadow-xs">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2.5">
        <a
          href={isFullySignedIn ? '/dashboard' : '/'}
          onClick={(e) => {
            e.preventDefault();
            go(isFullySignedIn ? '/dashboard' : user ? '/onboarding' : '/');
          }}
          className="flex min-h-12 items-center gap-2.5 text-lg font-extrabold tracking-tight text-[#0A5A4A]">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0E7C66] text-base font-extrabold text-white">
            ₦
          </span>
          <span>Budget Buddy</span>
        </a>

        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          aria-expanded={mobileOpen}
          aria-label="Toggle navigation menu"
          className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-xl border border-[#E1E8E4] bg-white px-3 text-sm font-semibold text-[#12201B] md:hidden">
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        {isFullySignedIn ? (
          <nav aria-label="Primary navigation" className="hidden items-center gap-1 md:flex">
            {APP_LINKS.map((item) => {
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
                  className={`inline-flex min-h-12 items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-[#E8F5F1] text-[#0A5A4A]'
                      : 'text-[#12201B] hover:bg-[#F5F7F4] hover:text-[#0A5A4A]'
                  }`}>
                  <NavIcon path={item.path} />
                  <span>{item.label}</span>
                </a>
              );
            })}
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                onLogout();
              }}
              className="ml-1 inline-flex min-h-12 items-center gap-1.5 rounded-xl border border-[#E1E8E4] bg-white px-3.5 py-2 text-sm font-semibold text-[#12201B] transition-colors hover:border-[#F4C2C2] hover:bg-[#FDECEC] hover:text-[#9B1C1C]">
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span>Log out</span>
            </button>
          </nav>
        ) : user ? (
          <nav aria-label="Onboarding navigation" className="hidden items-center gap-2 md:flex">
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                onLogout();
              }}
              className="inline-flex min-h-12 items-center gap-1.5 rounded-xl border border-[#E1E8E4] bg-white px-4 py-2 text-sm font-semibold text-[#12201B] hover:bg-[#FDECEC] hover:text-[#9B1C1C]">
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span>Log out</span>
            </button>
          </nav>
        ) : (
          <nav aria-label="Public navigation" className="hidden items-center gap-2 md:flex">
            <a
              href="/login"
              onClick={(e) => {
                e.preventDefault();
                go('/login');
              }}
              className="inline-flex min-h-12 items-center rounded-xl px-4 py-2 text-sm font-semibold text-[#12201B] hover:bg-[#F5F7F4] hover:text-[#0A5A4A]">
              Log in
            </a>
            <a
              href="/register"
              onClick={(e) => {
                e.preventDefault();
                go('/register');
              }}
              className="inline-flex min-h-12 items-center rounded-xl bg-[#0E7C66] px-4 py-2 text-sm font-bold text-white hover:bg-[#0A5A4A]">
              Create account
            </a>
          </nav>
        )}
      </div>

      {mobileOpen && (
        <nav
          aria-label="Mobile navigation"
          className="border-t border-[#E1E8E4] bg-white px-4 py-2 md:hidden">
          <div className="flex flex-col gap-1">
            {isFullySignedIn ? (
              <>
                {APP_LINKS.map((item) => {
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
                      className={`flex min-h-12 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold ${
                        isActive
                          ? 'bg-[#E8F5F1] text-[#0A5A4A]'
                          : 'text-[#12201B] hover:bg-[#F5F7F4]'
                      }`}>
                      <NavIcon path={item.path} />
                      <span>{item.label}</span>
                    </a>
                  );
                })}
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    onLogout();
                  }}
                  className="flex min-h-12 items-center gap-2.5 rounded-xl border border-[#E1E8E4] px-3.5 py-2.5 text-left text-sm font-semibold text-[#9B1C1C]">
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  <span>Log out</span>
                </button>
              </>
            ) : user ? (
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  onLogout();
                }}
                className="flex min-h-12 items-center gap-2.5 rounded-xl border border-[#E1E8E4] px-3.5 py-2.5 text-left text-sm font-semibold text-[#9B1C1C]">
                <LogOut className="h-4 w-4" aria-hidden="true" />
                <span>Log out</span>
              </button>
            ) : (
              <>
                <a
                  href="/login"
                  onClick={(e) => {
                    e.preventDefault();
                    go('/login');
                  }}
                  className="flex min-h-12 items-center rounded-xl px-3.5 py-2.5 text-sm font-semibold text-[#12201B] hover:bg-[#F5F7F4]">
                  Log in
                </a>
                <a
                  href="/register"
                  onClick={(e) => {
                    e.preventDefault();
                    go('/register');
                  }}
                  className="flex min-h-12 items-center justify-center rounded-xl bg-[#0E7C66] px-3.5 py-2.5 text-sm font-bold text-white">
                  Create account
                </a>
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
