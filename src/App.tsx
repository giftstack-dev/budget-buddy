/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {useEffect, useState} from 'react';
import {
  DashboardPage,
  ExpensesPage,
  PlanPage,
  ReviewsPage,
  SavingsPage,
  YearPage,
} from './components/AppPages';
import {Icon, SvgSprite} from './components/Icons';
import {Navbar} from './components/Navbar';
import {OnboardingWizard} from './components/OnboardingWizard';
import {LandingPage, LoginPage, RegisterPage} from './components/PublicPages';
import {QuickAddExpense} from './components/QuickAddExpense';
import {createDemoVisitorUser} from './demo';
import {todayLagosISO} from './engine';
import {
  loadActiveUserId,
  loadRegisteredUsers,
  saveActiveUserId,
  saveRegisteredUsers,
} from './storage';
import type {BudgetUser, ExpenseItem, GoalItem, RoutePath} from './types';

const VALID_ROUTES = new Set<RoutePath>([
  '/',
  '/register',
  '/login',
  '/onboarding',
  '/dashboard',
  '/expenses',
  '/savings',
  '/plan',
  '/year',
  '/reviews',
]);

const PUBLIC_ROUTES = new Set<RoutePath>(['/', '/register', '/login']);

function parseRouteFromLocation(): RoutePath {
  const path = window.location.pathname as RoutePath;
  return VALID_ROUTES.has(path) ? path : '/';
}

function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, '');
}

function resolveAllowedRoute(requested: RoutePath, user: BudgetUser | null): RoutePath {
  if (!user) {
    return PUBLIC_ROUTES.has(requested) ? requested : '/';
  }
  if (!user.onboardingDone) {
    return '/onboarding';
  }
  if (PUBLIC_ROUTES.has(requested) || requested === '/onboarding') {
    return '/dashboard';
  }
  return requested;
}

export default function App() {
  const [users, setUsers] = useState<BudgetUser[]>(() => loadRegisteredUsers());
  const [activeUser, setActiveUser] = useState<BudgetUser | null>(() => {
    const savedId = loadActiveUserId();
    if (!savedId) return null;
    const storedUsers = loadRegisteredUsers();
    return storedUsers.find((u) => u.id === savedId) ?? null;
  });
  const [route, setRoute] = useState<RoutePath>(() => parseRouteFromLocation());
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  const effectiveRoute = resolveAllowedRoute(route, activeUser);
  const isFullySignedIn = Boolean(activeUser && activeUser.onboardingDone);

  useEffect(() => {
    if (window.location.pathname !== effectiveRoute) {
      window.history.replaceState(null, '', effectiveRoute);
    }
    if (route !== effectiveRoute) {
      setRoute(effectiveRoute);
    }
  }, [effectiveRoute, route]);

  useEffect(() => {
    function handlePopState() {
      const next = parseRouteFromLocation();
      setRoute(resolveAllowedRoute(next, activeUser));
    }
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeUser]);

  function navigate(target: RoutePath) {
    const allowed = resolveAllowedRoute(target, activeUser);
    if (window.location.pathname !== allowed) {
      window.history.pushState(null, '', allowed);
    }
    setRoute(allowed);
    window.scrollTo({top: 0, behavior: 'auto'});
  }

  function commitUserUpdate(updated: BudgetUser, targetRoute?: RoutePath) {
    setActiveUser(updated);
    if (!updated.isDemo) {
      setUsers((prev) => {
        const next = prev.map((u) => (u.id === updated.id ? updated : u));
        saveRegisteredUsers(next);
        return next;
      });
    }
    if (targetRoute) {
      const allowed = resolveAllowedRoute(targetRoute, updated);
      if (window.location.pathname !== allowed) {
        window.history.pushState(null, '', allowed);
      }
      setRoute(allowed);
      window.scrollTo({top: 0, behavior: 'auto'});
    }
  }

  function handleRegister(data: {
    displayName: string;
    email: string;
    phone: string;
    password: string;
  }): string | null {
    const cleanEmail = data.email.trim().toLowerCase();
    const cleanPhoneDigits = normalizePhone(data.phone);

    const duplicate = users.some((u) => {
      if (cleanEmail && u.email && u.email.toLowerCase() === cleanEmail) return true;
      if (cleanPhoneDigits && u.phone && normalizePhone(u.phone) === cleanPhoneDigits) return true;
      return false;
    });

    if (duplicate) {
      return 'An account with that email address or phone number already exists. Please log in instead.';
    }

    const newUser: BudgetUser = {
      id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      displayName: data.displayName,
      email: cleanEmail,
      phone: data.phone.trim(),
      password: data.password,
      isDemo: false,
      onboardingStep: 1,
      onboardingDone: false,
      profile: {
        city: '',
        householdType: 'alone',
        dependentsCount: 0,
        housingType: 'rent',
        employmentType: 'salary',
        emergencyMonths: 3,
        emergencySavingsKobo: 0,
        festiveFundEnabled: true,
        mode: 'planner',
        savingsRatePct: 10,
      },
      income: {
        label: 'Primary income',
        amountKobo: 0,
        frequency: 'monthly',
        nextPayDate: todayLagosISO(),
      },
      costs: [],
      goals: [],
      expenses: [],
    };

    const nextUsers = [...users, newUser];
    setUsers(nextUsers);
    saveRegisteredUsers(nextUsers);
    setActiveUser(newUser);
    saveActiveUserId(newUser.id);

    window.history.pushState(null, '', '/onboarding');
    setRoute('/onboarding');
    window.scrollTo({top: 0, behavior: 'auto'});
    return null;
  }

  function handleLogin(identifier: string, password: string): boolean {
    const trimmed = identifier.trim();
    const emailLookup = trimmed.toLowerCase();
    const phoneLookup = normalizePhone(trimmed);

    const matched = users.find((u) => {
      const emailMatch = Boolean(u.email) && u.email.toLowerCase() === emailLookup;
      const phoneMatch =
        Boolean(phoneLookup) && Boolean(u.phone) && normalizePhone(u.phone) === phoneLookup;
      return (emailMatch || phoneMatch) && u.password === password;
    });

    if (!matched) {
      return false;
    }

    setActiveUser(matched);
    saveActiveUserId(matched.id);
    const nextRoute: RoutePath = matched.onboardingDone ? '/dashboard' : '/onboarding';
    window.history.pushState(null, '', nextRoute);
    setRoute(nextRoute);
    window.scrollTo({top: 0, behavior: 'auto'});
    return true;
  }

  function handleTryDemo() {
    const demoUser = createDemoVisitorUser();
    setActiveUser(demoUser);
    saveActiveUserId(null);
    window.history.pushState(null, '', '/dashboard');
    setRoute('/dashboard');
    window.scrollTo({top: 0, behavior: 'auto'});
  }

  function handleLogout() {
    setQuickAddOpen(false);
    setActiveUser(null);
    saveActiveUserId(null);
    window.history.pushState(null, '', '/');
    setRoute('/');
    window.scrollTo({top: 0, behavior: 'auto'});
  }

  function handleSaveOnboardingStep(updated: BudgetUser, finish?: boolean) {
    commitUserUpdate(updated, finish ? '/dashboard' : undefined);
  }

  function handleAddExpense(entry: Omit<ExpenseItem, 'id'>) {
    if (!activeUser) return;
    const created: ExpenseItem = {
      ...entry,
      id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };
    commitUserUpdate({
      ...activeUser,
      expenses: [created, ...activeUser.expenses],
    });
  }

  function handleDeleteExpense(id: string) {
    if (!activeUser) return;
    commitUserUpdate({
      ...activeUser,
      expenses: activeUser.expenses.filter((e) => e.id !== id),
    });
  }

  function handleAddGoal(goal: Omit<GoalItem, 'id'>) {
    if (!activeUser) return;
    const created: GoalItem = {
      ...goal,
      id: `goal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };
    commitUserUpdate({
      ...activeUser,
      goals: [...activeUser.goals, created],
    });
  }

  function handleUpdateGoalSaved(goalId: string, savedKobo: number) {
    if (!activeUser) return;
    commitUserUpdate({
      ...activeUser,
      goals: activeUser.goals.map((g) => (g.id === goalId ? {...g, savedKobo} : g)),
    });
  }

  function handleDeleteGoal(goalId: string) {
    if (!activeUser) return;
    commitUserUpdate({
      ...activeUser,
      goals: activeUser.goals.filter((g) => g.id !== goalId),
    });
  }

  return (
    <div className="min-h-screen text-[#12201B]">
      <SvgSprite />

      <Navbar
        user={activeUser}
        currentRoute={effectiveRoute}
        onNavigate={navigate}
        onLogout={handleLogout}
        onOpenQuickAdd={() => setQuickAddOpen(true)}
      />

      <main>
        {effectiveRoute === '/' && (
          <LandingPage onNavigate={navigate} onTryDemo={handleTryDemo} />
        )}

        {effectiveRoute === '/register' && (
          <RegisterPage onRegister={handleRegister} onNavigate={navigate} />
        )}

        {effectiveRoute === '/login' && (
          <LoginPage onLogin={handleLogin} onNavigate={navigate} />
        )}

        {effectiveRoute === '/onboarding' && activeUser && (
          <OnboardingWizard user={activeUser} onSaveStep={handleSaveOnboardingStep} />
        )}

        {effectiveRoute === '/dashboard' && activeUser && (
          <DashboardPage
            user={activeUser}
            onAddExpense={handleAddExpense}
            onDeleteExpense={handleDeleteExpense}
            onNavigate={navigate}
            onOpenQuickAdd={() => setQuickAddOpen(true)}
          />
        )}

        {effectiveRoute === '/expenses' && activeUser && (
          <ExpensesPage
            user={activeUser}
            onAddExpense={handleAddExpense}
            onDeleteExpense={handleDeleteExpense}
            onOpenQuickAdd={() => setQuickAddOpen(true)}
          />
        )}

        {effectiveRoute === '/savings' && activeUser && (
          <SavingsPage
            user={activeUser}
            onAddGoal={handleAddGoal}
            onUpdateGoalSaved={handleUpdateGoalSaved}
            onDeleteGoal={handleDeleteGoal}
          />
        )}

        {effectiveRoute === '/plan' && activeUser && <PlanPage user={activeUser} />}

        {effectiveRoute === '/year' && activeUser && <YearPage user={activeUser} />}

        {effectiveRoute === '/reviews' && activeUser && (
          <ReviewsPage
            user={activeUser}
            onNavigate={navigate}
            onOpenQuickAdd={() => setQuickAddOpen(true)}
          />
        )}
      </main>

      {isFullySignedIn && (
        <button
          type="button"
          onClick={() => setQuickAddOpen(true)}
          className="bb-btn fixed right-4 bottom-[82px] z-30 inline-flex min-h-[52px] items-center gap-2 rounded-full bg-[#0E7C66] px-5 py-3 text-base font-extrabold text-white shadow-lg hover:bg-[#0A5A4A] md:hidden">
          <Icon name="plus" className="h-5 w-5" />
          <span>Add spending</span>
        </button>
      )}

      {isFullySignedIn && quickAddOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-[#12201B]/45 p-0 backdrop-blur-xs sm:items-center sm:p-4"
          onClick={() => setQuickAddOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-add-modal-title"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-[24px] border border-[#DCEAE3] bg-white p-6 shadow-xl sm:rounded-[20px]">
            <div className="mb-4 flex items-center justify-between gap-2">
              <div>
                <h2 id="quick-add-modal-title" className="text-xl font-extrabold text-[#12201B]">
                  Add spending
                </h2>
                <p className="text-sm text-[#43564F]">3 quick taps to log and update your day.</p>
              </div>
              <button
                type="button"
                onClick={() => setQuickAddOpen(false)}
                aria-label="Close"
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[#DCEAE3] text-[#12201B] hover:bg-[#F3FAF7]">
                <Icon name="x" className="h-5 w-5" />
              </button>
            </div>
            <QuickAddExpense
              compact
              onAddExpense={handleAddExpense}
              onDone={() => setQuickAddOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
