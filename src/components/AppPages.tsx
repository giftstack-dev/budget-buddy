import {useRef, useState, type FormEvent} from 'react';
import {
  buildYearViewForUser,
  categoryLabel,
  computePlanForUser,
  computeReviewsForUser,
  computeTrackerForUser,
  formatNaira,
  parseNaira,
  simulateWhatIf,
  todayLagosISO,
  VARIABLE_CATEGORIES,
} from '../engine';
import {CategoryCircle, getCategoryStyle, Icon, TermHelp} from './Icons';
import {
  CalendarPlanIllustration,
  PiggyBankIllustration,
  ProgressBar,
  ProgressRing,
  WalletCoinsIllustration,
} from './Illustrations';
import {QuickAddExpense} from './QuickAddExpense';
import type {BudgetUser, ExpenseItem, GoalItem, RoutePath} from '../types';

function GuidanceDisclaimer() {
  return (
    <p className="mt-8 rounded-2xl border border-[#DCEAE3] bg-white/80 px-5 py-3.5 text-sm text-[#43564F]">
      Budgeting guidance only, not professional financial advice. Your numbers are calculated
      directly from what you entered.
    </p>
  );
}

function DashboardStatusCard({
  status,
  statusMessage,
  mode,
  onNavigate,
}: {
  status: 'BALANCED' | 'TIGHT' | 'DEFICIT';
  statusMessage: string;
  mode: BudgetUser['profile']['mode'];
  onNavigate: (path: RoutePath) => void;
}) {
  if (mode === 'log_only' && status !== 'DEFICIT') {
    return (
      <section className="bb-card-in mb-6 rounded-[20px] border border-[#BFE6D2] bg-[#E9F8EF] p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#16A34A] text-white">
              <Icon name="check-circle" className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-xl font-extrabold text-[#12201B]">You&apos;re on track</h2>
              <p className="mt-1 text-base text-[#1E3B2B]">
                Simple tracking mode is active. Keep logging your daily spending to stay steady.
              </p>
            </div>
          </div>
          <a
            href="/plan"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('/plan');
            }}
            className="bb-btn inline-flex min-h-[48px] items-center gap-2 whitespace-nowrap rounded-2xl border border-[#A5D8BE] bg-white px-4 py-2.5 text-base font-bold text-[#0A5A4A] hover:bg-[#F3FAF7]">
            <span>See my plan</span>
            <Icon name="arrow-right" className="h-4 w-4" />
          </a>
        </div>
      </section>
    );
  }

  const config =
    status === 'BALANCED'
      ? {
          wrap: 'border-[#BFE6D2] bg-[#E9F8EF]',
          circle: 'bg-[#16A34A] text-white',
          icon: 'check-circle' as const,
          headline: "You're on track",
          btnBorder: 'border-[#A5D8BE] text-[#0A5A4A]',
        }
      : status === 'TIGHT'
        ? {
            wrap: 'border-[#F3D79B] bg-[#FEF5E4]',
            circle: 'bg-[#D97706] text-white',
            icon: 'alert-triangle' as const,
            headline: 'Be a little careful this week',
            btnBorder: 'border-[#E6C37B] text-[#7A4F00]',
          }
        : {
            wrap: 'border-[#F4C2C2] bg-[#FFF0F0]',
            circle: 'bg-[#DC2626] text-white',
            icon: 'heart' as const,
            headline: "Let's adjust your plan",
            btnBorder: 'border-[#EAB3B3] text-[#9B1C1C]',
          };

  return (
    <section className={`bb-card-in mb-6 rounded-[20px] border p-5 shadow-xs ${config.wrap}`}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <span
            className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${config.circle}`}>
            <Icon name={config.icon} className="h-6 w-6" />
          </span>
          <div>
            <p className="text-sm font-bold text-[#43564F]">Am I okay?</p>
            <h2 className="text-xl font-extrabold text-[#12201B]">{config.headline}</h2>
            <p className="mt-1 text-base text-[#12201B]">{statusMessage}</p>
          </div>
        </div>
        <a
          href="/plan"
          onClick={(e) => {
            e.preventDefault();
            onNavigate('/plan');
          }}
          className={`bb-btn inline-flex min-h-[48px] items-center gap-2 whitespace-nowrap rounded-2xl border bg-white px-4 py-2.5 text-base font-bold hover:bg-[#FAFDFB] ${config.btnBorder}`}>
          <span>Check your plan</span>
          <Icon name="arrow-right" className="h-4 w-4" />
        </a>
      </div>
    </section>
  );
}

export function DashboardPage({
  user,
  onAddExpense,
  onDeleteExpense,
  onNavigate,
  onOpenQuickAdd,
}: {
  user: BudgetUser;
  onAddExpense: (entry: Omit<ExpenseItem, 'id'>) => void;
  onDeleteExpense: (id: string) => void;
  onNavigate: (path: RoutePath) => void;
  onOpenQuickAdd?: () => void;
}) {
  const today = todayLagosISO();
  const plan = computePlanForUser(user, today);
  const tracker = computeTrackerForUser(user, plan, today);
  const reviews = computeReviewsForUser(user, plan, tracker, today);
  const latestReview = reviews[0] ?? null;

  const todayEntries = user.expenses.filter((e) => e.spentOn === today);
  const safeRatio =
    tracker.dailyAllowanceKobo > 0
      ? Math.min(100, Math.round((tracker.safeToSpendTodayKobo * 100) / tracker.dailyAllowanceKobo))
      : 0;
  const remainingRatio =
    tracker.cyclePoolKobo > 0
      ? Math.min(100, Math.round((tracker.remainingPoolKobo * 100) / tracker.cyclePoolKobo))
      : 0;
  const elapsedRatio = Math.min(
    100,
    Math.round((tracker.cycle.dayNumber * 100) / Math.max(1, tracker.cycle.lengthDays)),
  );

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#F3FAF7] py-6 pb-24 md:pb-10">
      <div className="mx-auto max-w-6xl px-4">
        <header className="bb-card-in mb-6 rounded-[20px] bg-gradient-to-br from-[#0E7C66] to-[#17A589] p-6 text-white shadow-sm sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold sm:text-3xl">
                Good morning, {user.displayName}
              </h1>
              <p className="mt-1.5 text-base text-[#E6F8F3]">
                Pay period (payday to payday): {tracker.cycle.start} to {tracker.cycle.end} &middot;{' '}
                {tracker.daysToNextPayday} days to payday
              </p>
            </div>
            {onOpenQuickAdd && (
              <button
                type="button"
                onClick={onOpenQuickAdd}
                className="bb-btn hidden min-h-[48px] items-center gap-2 whitespace-nowrap rounded-2xl bg-[#F4A81D] px-5 py-3 text-base font-extrabold text-[#12201B] shadow-xs hover:bg-[#E5980E] md:inline-flex">
                <Icon name="plus" className="h-5 w-5" />
                <span>Add spending</span>
              </button>
            )}
          </div>
        </header>

        <DashboardStatusCard
          status={plan.status}
          statusMessage={plan.statusMessage}
          mode={user.profile.mode}
          onNavigate={onNavigate}
        />

        <section className="mb-6 grid gap-5 md:grid-cols-3">
          <article className="bb-card-in flex items-center justify-between gap-4 rounded-[20px] border border-[#DCEAE3] bg-white p-6 shadow-xs">
            <div>
              <p className="text-base font-bold text-[#43564F]">Safe to spend today</p>
              <div className="mt-1 text-3xl font-extrabold tracking-tight text-[#0A5A4A] tabular-nums">
                {formatNaira(tracker.safeToSpendTodayKobo)}{' '}
                <span className="text-lg font-bold text-[#43564F]">a day</span>
              </div>
              <p className="mt-2 text-base text-[#43564F]">
                Spend up to this today and stay comfortable until payday.
              </p>
            </div>
            <ProgressRing
              percentage={safeRatio}
              color="#0E7C66"
              centerTop={`${safeRatio}%`}
              centerBottom="of day"
              size={88}
            />
          </article>

          <article className="bb-card-in flex items-center justify-between gap-4 rounded-[20px] border border-[#DCEAE3] bg-white p-6 shadow-xs">
            <div>
              <p className="text-base font-bold text-[#43564F]">Left until payday</p>
              <div className="mt-1 text-3xl font-extrabold tracking-tight text-[#12201B] tabular-nums">
                {formatNaira(tracker.remainingPoolKobo)}
              </div>
              <p className="mt-2 text-base text-[#43564F]">
                Spent {formatNaira(tracker.spentThisCycleKobo)} of{' '}
                {formatNaira(tracker.cyclePoolKobo)} you can spend.
              </p>
            </div>
            <ProgressRing
              percentage={remainingRatio}
              color="#F4A81D"
              centerTop={`${remainingRatio}%`}
              centerBottom="left"
              size={88}
            />
          </article>

          <article className="bb-card-in flex items-center justify-between gap-4 rounded-[20px] border border-[#DCEAE3] bg-white p-6 shadow-xs">
            <div>
              <p className="text-base font-bold text-[#43564F]">Payday countdown</p>
              <div className="mt-1 text-3xl font-extrabold tracking-tight text-[#12201B] tabular-nums">
                {tracker.daysToNextPayday} {tracker.daysToNextPayday === 1 ? 'day' : 'days'} to payday
              </div>
              <p className="mt-2 text-base text-[#43564F]">
                Day {tracker.cycle.dayNumber} of {tracker.cycle.lengthDays} &middot; Next payday{' '}
                {tracker.cycle.nextPayDate}
              </p>
            </div>
            <ProgressRing
              percentage={elapsedRatio}
              color="#1D4ED8"
              centerTop={`${elapsedRatio}%`}
              centerBottom="passed"
              size={88}
            />
          </article>
        </section>

        <TermHelp title="What's this? Safe to spend today">
          We take the flexible spending money left for this pay period (payday to payday) and
          divide it evenly by the days left until payday. Spend less today, and tomorrow&apos;s
          daily amount goes up.
        </TermHelp>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <section className="bb-card-in rounded-[20px] border border-[#DCEAE3] bg-white p-6 shadow-xs">
            <h2 className="text-xl font-extrabold text-[#12201B]">Add spending in 3 quick taps</h2>
            <p className="mt-1 mb-4 text-base text-[#43564F]">
              Type what you spent, tap a category, and save.
            </p>
            <QuickAddExpense onAddExpense={onAddExpense} />
          </section>

          <div className="space-y-6">
            <section className="bb-card-in rounded-[20px] border border-[#DCEAE3] bg-white p-6 shadow-xs">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-xl font-extrabold text-[#12201B]">Today&apos;s spending</h2>
                <a
                  href="/expenses"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate('/expenses');
                  }}
                  className="text-base font-bold text-[#0A5A4A] underline">
                  See all
                </a>
              </div>

              {todayEntries.length > 0 ? (
                <div className="mt-4 divide-y divide-[#E6EFEA]">
                  {todayEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between gap-3 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <CategoryCircle category={entry.category} size="md" />
                        <div className="min-w-0">
                          <div className="truncate text-base font-bold text-[#12201B]">
                            {categoryLabel(entry.category)}
                          </div>
                          {entry.note && (
                            <div className="truncate text-sm text-[#5A6B64]">{entry.note}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2.5">
                        <span className="text-base font-extrabold text-[#12201B] tabular-nums">
                          {formatNaira(entry.amountKobo)}
                        </span>
                        <button
                          type="button"
                          onClick={() => onDeleteExpense(entry.id)}
                          aria-label={`Delete ${categoryLabel(entry.category)}`}
                          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[#F4C2C2] bg-[#FFF5F5] text-[#9B1C1C] hover:bg-[#FEE2E2]">
                          <Icon name="trash" className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 flex flex-col items-center rounded-2xl bg-[#F8FBF9] p-5 text-center">
                  <WalletCoinsIllustration className="h-24 w-32" />
                  <p className="mt-2 text-base text-[#43564F]">
                    No spending logged for today yet. Add an entry on the left or tap No spending
                    today.
                  </p>
                </div>
              )}
            </section>

            <section className="bb-card-in rounded-[20px] border border-[#DCEAE3] bg-white p-6 shadow-xs">
              <h2 className="text-xl font-extrabold text-[#12201B]">Latest check-in</h2>
              {latestReview ? (
                <div className="mt-3">
                  <p className="text-sm font-semibold text-[#5A6B64]">
                    {latestReview.periodStart} to {latestReview.periodEnd}
                  </p>
                  <p className="mt-2 text-base leading-relaxed text-[#12201B]">
                    {latestReview.message}
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-base text-[#43564F]">
                  Log a few more days to get your first review
                </p>
              )}
              <a
                href="/reviews"
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate('/reviews');
                }}
                className="mt-4 inline-flex items-center gap-1.5 text-base font-bold text-[#0A5A4A] underline">
                <span>Open Reviews</span>
                <Icon name="arrow-right" className="h-4 w-4" />
              </a>
            </section>
          </div>
        </div>

        <GuidanceDisclaimer />
      </div>
    </div>
  );
}

export function ExpensesPage({
  user,
  onAddExpense,
  onDeleteExpense,
  onOpenQuickAdd,
}: {
  user: BudgetUser;
  onAddExpense: (entry: Omit<ExpenseItem, 'id'>) => void;
  onDeleteExpense: (id: string) => void;
  onOpenQuickAdd?: () => void;
}) {
  const today = todayLagosISO();
  const plan = computePlanForUser(user, today);
  const tracker = computeTrackerForUser(user, plan, today);
  const amountInputRef = useRef<HTMLInputElement | null>(null);
  const [filterCat, setFilterCat] = useState('');

  const filtered = [...user.expenses]
    .filter((e) => (!filterCat ? true : e.category === filterCat))
    .sort((a, b) => b.spentOn.localeCompare(a.spentOn));

  const remainingCyclePct =
    tracker.cyclePoolKobo > 0
      ? Math.max(0, Math.min(100, Math.round((tracker.spentThisCycleKobo * 100) / tracker.cyclePoolKobo)))
      : 0;

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#FDF9F0] py-6 pb-24 md:pb-10">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-[#12201B]">Spending tracker</h1>
            <p className="mt-1 text-base text-[#43564F]">
              Log everyday expenses in 3 taps and see where your money goes before payday.
            </p>
          </div>
          <div className="rounded-[20px] border border-[#E5DEC9] bg-white px-5 py-3 shadow-xs">
            <span className="block text-sm font-semibold text-[#5A6B64]">
              Spent this pay period
            </span>
            <span className="text-2xl font-extrabold text-[#12201B] tabular-nums">
              {formatNaira(tracker.spentThisCycleKobo)}
            </span>
            <span className="ml-1.5 text-sm text-[#5A6B64] tabular-nums">
              of {formatNaira(tracker.cyclePoolKobo)}
            </span>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <section className="bb-card-in rounded-[20px] border border-[#E5DEC9] bg-white p-6 shadow-xs">
            <h2 className="text-xl font-extrabold text-[#12201B]">Add spending</h2>
            <p className="mt-1 mb-4 text-base text-[#43564F]">
              Amount first, tap a category, then save.
            </p>
            <QuickAddExpense onAddExpense={onAddExpense} amountInputRef={amountInputRef} />
          </section>

          <section className="bb-card-in rounded-[20px] border border-[#E5DEC9] bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-extrabold text-[#12201B]">Where money went</h2>
                <p className="mt-1 text-base text-[#43564F]">
                  Pay period (payday to payday): {tracker.cycle.start} to {tracker.cycle.end}
                </p>
              </div>
              <ProgressRing
                percentage={remainingCyclePct}
                color="#0E7C66"
                centerTop={`${remainingCyclePct}%`}
                centerBottom="used"
                size={84}
              />
            </div>

            <div className="mt-5 space-y-4">
              {Object.keys(tracker.categoryTotals).length > 0 ? (
                Object.entries(tracker.categoryTotals).map(([cat, spent]) => {
                  const planned = plan.categoryAllowances[cat] ?? 0;
                  const max = Math.max(planned, spent, 1);
                  const pct = Math.min(100, Math.round((spent * 100) / max));
                  const style = getCategoryStyle(cat);
                  return (
                    <div key={cat}>
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <CategoryCircle category={cat} size="sm" />
                          <span className="text-base font-bold text-[#12201B]">
                            {categoryLabel(cat)}
                          </span>
                        </div>
                        <span className="text-base font-bold text-[#12201B] tabular-nums">
                          {formatNaira(spent)}
                          {planned > 0 ? (
                            <span className="text-sm font-normal text-[#5A6B64]">
                              {' '}
                              / {formatNaira(planned)}
                            </span>
                          ) : null}
                        </span>
                      </div>
                      <ProgressBar percentage={pct} color={style.barColor} heightClass="h-3" />
                    </div>
                  );
                })
              ) : (
                <p className="rounded-2xl bg-[#FAF6EC] p-4 text-base text-[#43564F]">
                  Your category bars will appear here as soon as you log your first item.
                </p>
              )}
            </div>
          </section>
        </div>

        <section className="bb-card-in mt-6 rounded-[20px] border border-[#E5DEC9] bg-white p-6 shadow-xs">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-extrabold text-[#12201B]">
              All spending ({filtered.length})
            </h2>
            <select
              aria-label="Filter by category"
              value={filterCat}
              onChange={(e) => setFilterCat(e.target.value)}
              className="min-h-[48px] rounded-2xl border border-[#C3D4CB] bg-white px-4 py-2 text-base font-medium text-[#12201B]">
              <option value="">All categories</option>
              {VARIABLE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {categoryLabel(cat)}
                </option>
              ))}
              <option value="no_spend">No spending today</option>
            </select>
          </div>

          {filtered.length > 0 ? (
            <div className="divide-y divide-[#EDE6D4]">
              {filtered.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3.5">
                  <div className="flex min-w-0 items-center gap-3">
                    <CategoryCircle category={item.category} size="md" />
                    <div className="min-w-0">
                      <div className="text-base font-bold text-[#12201B]">
                        {categoryLabel(item.category)}
                      </div>
                      <div className="text-sm text-[#5A6B64]">
                        {item.spentOn}
                        {item.note ? ` · ${item.note}` : ''}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-extrabold text-[#12201B] tabular-nums">
                      {formatNaira(item.amountKobo)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onDeleteExpense(item.id)}
                      aria-label={`Delete ${categoryLabel(item.category)} on ${item.spentOn}`}
                      className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[#F4C2C2] bg-[#FFF5F5] px-3 text-sm font-bold text-[#9B1C1C] hover:bg-[#FEE2E2]">
                      <Icon name="trash" className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center rounded-2xl bg-[#FAF6EC] p-7 text-center">
              <WalletCoinsIllustration className="h-32 w-40" />
              <p className="mt-3 text-lg font-bold text-[#12201B]">
                No spending yet. Tap Add spending to log your first one.
              </p>
              <button
                type="button"
                onClick={() => {
                  if (onOpenQuickAdd) {
                    onOpenQuickAdd();
                  } else {
                    amountInputRef.current?.focus();
                  }
                }}
                className="bb-btn mt-4 inline-flex min-h-[48px] items-center gap-2 rounded-2xl bg-[#0E7C66] px-6 py-3 text-base font-bold text-white hover:bg-[#0A5A4A]">
                <Icon name="plus" className="h-5 w-5" />
                <span>Add spending</span>
              </button>
            </div>
          )}
        </section>

        <GuidanceDisclaimer />
      </div>
    </div>
  );
}

export function SavingsPage({
  user,
  onAddGoal,
  onUpdateGoalSaved,
  onDeleteGoal,
}: {
  user: BudgetUser;
  onAddGoal: (goal: Omit<GoalItem, 'id'>) => void;
  onUpdateGoalSaved: (goalId: string, savedKobo: number) => void;
  onDeleteGoal: (goalId: string) => void;
}) {
  const plan = computePlanForUser(user);
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [saved, setSaved] = useState('0');
  const [deadline, setDeadline] = useState('');
  const [error, setError] = useState<string | null>(null);

  const emPct =
    plan.emergencyTargetKobo > 0
      ? Math.min(100, Math.round((user.profile.emergencySavingsKobo * 100) / plan.emergencyTargetKobo))
      : 100;

  function handleAddGoal(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('Please enter a goal name.');
      return;
    }
    try {
      const targetKobo = parseNaira(target);
      if (targetKobo <= 0) {
        setError('Goal target must be greater than ₦0.');
        return;
      }
      const savedKobo = saved.trim() ? parseNaira(saved) : 0;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(deadline)) {
        setError('Please pick a target date.');
        return;
      }
      onAddGoal({name: name.trim(), targetKobo, savedKobo, deadline});
      setName('');
      setTarget('');
      setSaved('0');
      setDeadline('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Please enter valid Naira amounts.');
    }
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#F4FAF6] py-6 pb-24 md:pb-10">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-extrabold text-[#12201B]">Savings &amp; goals</h1>
          <p className="mt-1 text-base text-[#43564F]">
            Watch your safety net grow and plan steadily for things you want to buy or build.
          </p>
        </div>

        <div className="mb-6 grid gap-5 md:grid-cols-2">
          <section className="bb-card-in flex items-center justify-between gap-4 rounded-[20px] border border-[#DCEAE3] bg-white p-6 shadow-xs">
            <div>
              <div className="flex items-center gap-2.5">
                <CategoryCircle category="emergency_fund" size="sm" />
                <h2 className="text-xl font-extrabold text-[#12201B]">
                  Emergency savings (for surprises)
                </h2>
              </div>
              <div className="mt-3 text-3xl font-extrabold text-[#0A5A4A] tabular-nums">
                {formatNaira(user.profile.emergencySavingsKobo)}
              </div>
              <p className="mt-1 text-base text-[#43564F] tabular-nums">
                Saved of {formatNaira(plan.emergencyTargetKobo)} target ({user.profile.emergencyMonths}{' '}
                months of essentials). Adding{' '}
                <strong>{formatNaira(plan.emergencyContributionKobo)}</strong> a month.
              </p>
              <TermHelp title="What's this? Emergency savings">
                Money reserved strictly for surprises like hospital bills or urgent repairs so you do
                not have to borrow.
              </TermHelp>
            </div>
            <ProgressRing
              percentage={emPct}
              color="#D97706"
              centerTop={`${emPct}%`}
              centerBottom="saved"
              size={96}
            />
          </section>

          <section className="bb-card-in rounded-[20px] border border-[#DCEAE3] bg-white p-6 shadow-xs">
            <div className="flex items-center gap-2.5">
              <CategoryCircle category="festive_fund" size="sm" />
              <h2 className="text-xl font-extrabold text-[#12201B]">December &amp; festive savings</h2>
            </div>
            <div className="mt-3 text-3xl font-extrabold text-[#12201B] tabular-nums">
              {user.profile.festiveFundEnabled
                ? `${formatNaira(plan.festiveContributionKobo)} a month`
                : 'Paused'}
            </div>
            <p className="mt-2 text-base text-[#43564F]">
              {user.profile.festiveFundEnabled
                ? 'Automatically putting 3% aside each month so December travels, food, and gifts feel easy.'
                : 'Currently turned off in your setup.'}
            </p>
          </section>
        </div>

        <section className="bb-card-in mb-6 rounded-[20px] border border-[#DCEAE3] bg-white p-6 shadow-xs">
          <h2 className="text-xl font-extrabold text-[#12201B]">Add a personal savings goal</h2>
          <p className="mt-1 text-base text-[#43564F]">
            Pick something you are saving towards and when you want it ready.
          </p>
          {error && (
            <div
              role="alert"
              className="mt-3 flex items-start gap-2.5 rounded-2xl border border-[#F4C2C2] bg-[#FFF5F5] p-3.5 text-base text-[#9B1C1C]">
              <Icon name="alert-triangle" className="mt-0.5 h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <form onSubmit={handleAddGoal} className="mt-4 grid gap-3 sm:grid-cols-4 sm:items-end">
            <div>
              <label htmlFor="sg-name" className="mb-1.5 block text-sm font-bold text-[#12201B]">
                Goal name
              </label>
              <input
                id="sg-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="For example: Inverter"
                className="min-h-[48px] w-full rounded-2xl border border-[#C3D4CB] px-3.5 py-2.5 text-base"
              />
            </div>
            <div>
              <label htmlFor="sg-target" className="mb-1.5 block text-sm font-bold text-[#12201B]">
                Target (₦)
              </label>
              <input
                id="sg-target"
                type="text"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="For example: 250,000"
                className="min-h-[48px] w-full rounded-2xl border border-[#C3D4CB] px-3.5 py-2.5 text-base"
              />
            </div>
            <div>
              <label htmlFor="sg-saved" className="mb-1.5 block text-sm font-bold text-[#12201B]">
                Saved so far (₦)
              </label>
              <input
                id="sg-saved"
                type="text"
                value={saved}
                onChange={(e) => setSaved(e.target.value)}
                placeholder="For example: 25,000"
                className="min-h-[48px] w-full rounded-2xl border border-[#C3D4CB] px-3.5 py-2.5 text-base"
              />
            </div>
            <div>
              <label htmlFor="sg-date" className="mb-1.5 block text-sm font-bold text-[#12201B]">
                Target date
              </label>
              <input
                id="sg-date"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="min-h-[48px] w-full rounded-2xl border border-[#C3D4CB] px-3.5 py-2.5 text-base"
              />
            </div>
            <div className="sm:col-span-4">
              <button
                type="submit"
                className="bb-btn inline-flex min-h-[48px] items-center gap-2 rounded-2xl bg-[#0E7C66] px-6 py-3 text-base font-bold text-white hover:bg-[#0A5A4A]">
                <Icon name="plus" className="h-5 w-5" />
                <span>Add goal</span>
              </button>
            </div>
          </form>
        </section>

        {plan.goalResults.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-2">
            {plan.goalResults.map((g) => {
              const pct =
                g.targetKobo > 0
                  ? Math.min(100, Math.round((g.savedKobo * 100) / g.targetKobo))
                  : 100;
              return (
                <article
                  key={g.id}
                  className="bb-card-in rounded-[20px] border border-[#DCEAE3] bg-white p-6 shadow-xs">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Icon
                          name={g.onTrack ? 'check-circle' : 'alert-triangle'}
                          className={`h-5 w-5 ${g.onTrack ? 'text-[#16A34A]' : 'text-[#D97706]'}`}
                        />
                        <span
                          className={`text-sm font-bold ${
                            g.onTrack ? 'text-[#146C3C]' : 'text-[#92400E]'
                          }`}>
                          {g.onTrack ? "You're on track" : 'Needs extra monthly room'}
                        </span>
                      </div>
                      <h3 className="mt-1.5 text-xl font-extrabold text-[#12201B]">{g.name}</h3>
                      <p className="mt-2 text-base text-[#43564F] tabular-nums">
                        Saved <strong>{formatNaira(g.savedKobo)}</strong> of{' '}
                        <strong>{formatNaira(g.targetKobo)}</strong>
                      </p>
                      <p className="mt-1 text-sm text-[#5A6B64] tabular-nums">
                        Target date: {g.deadline} &middot; Setting aside{' '}
                        {formatNaira(g.allocatedKobo)} a month
                        {g.estimatedCompletion ? ` · Ready around ${g.estimatedCompletion}` : ''}
                      </p>
                    </div>
                    <ProgressRing
                      percentage={pct}
                      color={g.onTrack ? '#0E7C66' : '#F4A81D'}
                      centerTop={`${pct}%`}
                      centerBottom="done"
                      size={88}
                    />
                  </div>

                  <div className="mt-4">
                    <ProgressBar
                      percentage={pct}
                      color={g.onTrack ? '#0E7C66' : '#F4A81D'}
                      heightClass="h-3"
                    />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2.5">
                    <button
                      type="button"
                      onClick={() => onUpdateGoalSaved(g.id, g.savedKobo + 10_000_00)}
                      className="bb-btn inline-flex min-h-[44px] items-center gap-1.5 rounded-2xl border border-[#C3D4CB] bg-white px-4 py-2 text-base font-bold text-[#12201B] hover:bg-[#F3FAF7]">
                      <Icon name="plus" className="h-4 w-4 text-[#0E7C66]" />
                      <span>Add ₦10,000</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteGoal(g.id)}
                      className="bb-btn inline-flex min-h-[44px] items-center gap-1.5 rounded-2xl border border-[#F4C2C2] bg-[#FFF5F5] px-4 py-2 text-base font-bold text-[#9B1C1C] hover:bg-[#FEE2E2]">
                      <Icon name="trash" className="h-4 w-4" />
                      <span>Remove</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center rounded-[20px] border border-[#DCEAE3] bg-white p-7 text-center shadow-xs">
            <PiggyBankIllustration className="h-32 w-40" />
            <p className="mt-3 text-lg font-bold text-[#12201B]">
              No savings goals yet. Add your first goal above to give your savings a clear target.
            </p>
          </div>
        )}

        <GuidanceDisclaimer />
      </div>
    </div>
  );
}

export function PlanPage({user}: {user: BudgetUser}) {
  const plan = computePlanForUser(user);
  const [scenario, setScenario] = useState<'income_drop' | 'rent_rise' | 'add_dependent' | 'add_loan'>(
    'income_drop',
  );
  const [whatIfValue, setWhatIfValue] = useState('');
  const [whatIfErr, setWhatIfErr] = useState<string | null>(null);
  const [comparison, setComparison] = useState<ReturnType<typeof simulateWhatIf> | null>(null);

  const needsItems = plan.items.filter((i) => i.group === 'needs');
  const savingsItems = plan.items.filter((i) => i.group === 'savings');
  const wantsItems = plan.items.filter((i) => i.group === 'wants');
  const bufferItems = plan.items.filter((i) => i.group === 'buffer');
  const totalAllocated =
    plan.needsTotalKobo + plan.savingsTotalKobo + plan.wantsTotalKobo + plan.bufferKobo;

  function pctOfIncome(amt: number): number {
    if (plan.incomeMonthlyKobo <= 0) return 0;
    return Math.min(100, Math.round((amt * 100) / plan.incomeMonthlyKobo));
  }

  function handleWhatIf(e: FormEvent) {
    e.preventDefault();
    setWhatIfErr(null);
    if (scenario === 'income_drop' || scenario === 'rent_rise') {
      const num = Number(whatIfValue.trim());
      if (!Number.isInteger(num) || num < 0 || (scenario === 'income_drop' && num > 100)) {
        setWhatIfErr('Enter a whole number, for example 20.');
        return;
      }
      setComparison(simulateWhatIf(user, scenario, num));
      return;
    }
    try {
      const kobo = parseNaira(whatIfValue);
      setComparison(simulateWhatIf(user, scenario, kobo));
    } catch (err) {
      setWhatIfErr(err instanceof Error ? err.message : 'Enter a valid Naira amount.');
    }
  }

  const statusMeta =
    plan.status === 'BALANCED'
      ? {
          wrap: 'border-[#BFE6D2] bg-[#E9F8EF]',
          icon: 'check-circle' as const,
          iconColor: 'text-[#16A34A]',
          label: "You're on track",
        }
      : plan.status === 'TIGHT'
        ? {
            wrap: 'border-[#F3D79B] bg-[#FEF5E4]',
            icon: 'alert-triangle' as const,
            iconColor: 'text-[#D97706]',
            label: 'Be a little careful this month',
          }
        : {
            wrap: 'border-[#F4C2C2] bg-[#FFF0F0]',
            icon: 'heart' as const,
            iconColor: 'text-[#DC2626]',
            label: 'Your bills are more than your income',
          };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#F2F8FC] py-6 pb-24 md:pb-10">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-[#12201B]">Monthly money plan</h1>
            <p className="mt-1 text-base text-[#43564F]">
              Every Naira of your monthly income given a clear job, starting with what must be paid.
            </p>
          </div>
          <div className="rounded-[20px] border border-[#D4E4F0] bg-white px-5 py-3 shadow-xs">
            <span className="block text-sm font-semibold text-[#5A6B64]">Monthly take-home</span>
            <span className="text-3xl font-extrabold text-[#0A5A4A] tabular-nums">
              {formatNaira(plan.incomeMonthlyKobo)}
            </span>
            <span className="block text-sm text-[#5A6B64] tabular-nums">
              Planned across all groups: {formatNaira(totalAllocated)}
            </span>
          </div>
        </div>

        <section className={`bb-card-in mb-6 rounded-[20px] border p-5 shadow-xs ${statusMeta.wrap}`}>
          <div className="flex items-start gap-3">
            <Icon name={statusMeta.icon} className={`mt-0.5 h-6 w-6 shrink-0 ${statusMeta.iconColor}`} />
            <div>
              <h2 className="text-xl font-extrabold text-[#12201B]">{statusMeta.label}</h2>
              <p className="mt-1 text-base text-[#12201B]">{plan.statusMessage}</p>
              {plan.suggestions.length > 0 && (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-base text-[#12201B]">
                  {plan.suggestions.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>

        <div className="grid gap-6 md:grid-cols-2">
          <section className="bb-card-in rounded-[20px] border border-[#D4E4F0] bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xl font-extrabold text-[#12201B]">Things you must pay</h2>
              <span className="text-xl font-extrabold text-[#12201B] tabular-nums">
                {formatNaira(plan.needsTotalKobo)}
              </span>
            </div>
            <p className="mt-1 text-base text-[#43564F]">
              Essential bills plus monthly slices saved for yearly or termly bills.
            </p>
            {needsItems.length > 0 ? (
              <div className="mt-4 space-y-4">
                {needsItems.map((item, idx) => {
                  const st = getCategoryStyle(item.category);
                  return (
                    <div key={`${item.category}-${idx}`}>
                      <div className="mb-1.5 flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <CategoryCircle category={item.category} size="sm" />
                          <div className="min-w-0">
                            <div className="truncate text-base font-bold text-[#12201B]">
                              {item.label}
                            </div>
                            <div className="text-sm text-[#5A6B64]">{item.note}</div>
                          </div>
                        </div>
                        <strong className="shrink-0 text-base text-[#12201B] tabular-nums">
                          {formatNaira(item.amountKobo)}
                        </strong>
                      </div>
                      <ProgressBar percentage={pctOfIncome(item.amountKobo)} color={st.barColor} heightClass="h-2.5" />
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mt-3 text-base text-[#5A6B64]">No essential bills entered yet.</p>
            )}
          </section>

          <section className="bb-card-in rounded-[20px] border border-[#D4E4F0] bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xl font-extrabold text-[#12201B]">What you save</h2>
              <span className="text-xl font-extrabold text-[#0A5A4A] tabular-nums">
                {formatNaira(plan.savingsTotalKobo)}
              </span>
            </div>
            <p className="mt-1 text-base text-[#43564F]">
              Money moving towards emergencies, celebrations, and your goals.
            </p>
            {savingsItems.length > 0 ? (
              <div className="mt-4 space-y-4">
                {savingsItems.map((item, idx) => {
                  const st = getCategoryStyle(item.category);
                  return (
                    <div key={`${item.category}-${idx}`}>
                      <div className="mb-1.5 flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <CategoryCircle category={item.category} size="sm" />
                          <div className="min-w-0">
                            <div className="truncate text-base font-bold text-[#12201B]">
                              {item.label}
                            </div>
                            <div className="text-sm text-[#5A6B64]">{item.note}</div>
                          </div>
                        </div>
                        <strong className="shrink-0 text-base text-[#12201B] tabular-nums">
                          {formatNaira(item.amountKobo)}
                        </strong>
                      </div>
                      <ProgressBar percentage={pctOfIncome(item.amountKobo)} color={st.barColor} heightClass="h-2.5" />
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mt-3 text-base text-[#5A6B64]">No savings allocation in this plan yet.</p>
            )}

            <div className="mt-6 border-t border-[#E6EFEA] pt-5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg font-extrabold text-[#12201B]">Cushion for surprises</h3>
                <strong className="text-lg text-[#0A5A4A] tabular-nums">
                  {formatNaira(plan.bufferKobo)}
                </strong>
              </div>
              {bufferItems.length > 0 ? (
                <div className="mt-3 flex items-center gap-3">
                  <CategoryCircle category="buffer" size="sm" />
                  <p className="text-base text-[#43564F]">{bufferItems[0].note}</p>
                </div>
              ) : (
                <p className="mt-2 text-base text-[#5A6B64]">No extra cushion room right now.</p>
              )}
              <TermHelp title="What's this? Cushion for surprises">
                A small 5% extra room kept separate so price increases or minor unexpected charges do
                not knock you off course.
              </TermHelp>
            </div>
          </section>
        </div>

        <section className="bb-card-in mt-6 rounded-[20px] border border-[#D4E4F0] bg-white p-6 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-xl font-extrabold text-[#12201B]">Things you enjoy</h2>
              <p className="mt-1 text-base text-[#43564F]">
                Guilt-free flexible money divided evenly across your everyday enjoyment categories.
              </p>
            </div>
            <span className="text-2xl font-extrabold text-[#0A5A4A] tabular-nums">
              {formatNaira(plan.wantsTotalKobo)}
            </span>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {wantsItems.map((item) => {
              const st = getCategoryStyle(item.category);
              return (
                <div
                  key={item.category}
                  className="rounded-2xl border border-[#E2ECE7] bg-[#F8FBF9] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <CategoryCircle category={item.category} size="md" />
                      <div>
                        <div className="text-base font-bold text-[#12201B]">{item.label}</div>
                        <div className="text-sm text-[#5A6B64]">{item.note}</div>
                      </div>
                    </div>
                    <strong className="text-lg text-[#12201B] tabular-nums">
                      {formatNaira(item.amountKobo)}
                    </strong>
                  </div>
                  <div className="mt-3">
                    <ProgressBar percentage={pctOfIncome(item.amountKobo)} color={st.barColor} heightClass="h-2.5" />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="bb-card-in mt-6 rounded-[20px] border border-[#D4E4F0] bg-white p-6 shadow-xs">
          <h2 className="text-xl font-extrabold text-[#12201B]">What if?</h2>
          <p className="mt-1 text-base text-[#43564F]">
            Test a life change safely without altering your saved plan.
          </p>
          <TermHelp title="What's this? Why test What if?">
            You can preview what happens if rent goes up or income drops before it happens, so you
            feel prepared rather than caught off guard.
          </TermHelp>

          {whatIfErr && (
            <div
              role="alert"
              className="mt-3 flex items-start gap-2 rounded-2xl border border-[#F4C2C2] bg-[#FFF5F5] p-3.5 text-base text-[#9B1C1C]">
              <Icon name="alert-triangle" className="mt-0.5 h-5 w-5 shrink-0" />
              <span>{whatIfErr}</span>
            </div>
          )}

          <form onSubmit={handleWhatIf} className="mt-4 grid gap-3 sm:grid-cols-3 sm:items-end">
            <div>
              <label htmlFor="wi-scen" className="mb-1.5 block text-sm font-bold text-[#12201B]">
                Choose a change
              </label>
              <select
                id="wi-scen"
                value={scenario}
                onChange={(e) => setScenario(e.target.value as typeof scenario)}
                className="min-h-[48px] w-full rounded-2xl border border-[#C3D4CB] bg-white px-3.5 py-2.5 text-base">
                <option value="income_drop">Income drops by a percentage</option>
                <option value="rent_rise">Rent rises by a percentage</option>
                <option value="add_dependent">Support one more person (₦ a month)</option>
                <option value="add_loan">Add a loan payment (₦ a month)</option>
              </select>
            </div>
            <div>
              <label htmlFor="wi-val" className="mb-1.5 block text-sm font-bold text-[#12201B]">
                {scenario === 'income_drop' || scenario === 'rent_rise'
                  ? 'Percentage (%)'
                  : 'Amount per month (₦)'}
              </label>
              <input
                id="wi-val"
                type="text"
                value={whatIfValue}
                onChange={(e) => setWhatIfValue(e.target.value)}
                placeholder={
                  scenario === 'income_drop' || scenario === 'rent_rise'
                    ? 'For example: 20'
                    : 'For example: 25,000'
                }
                className="min-h-[48px] w-full rounded-2xl border border-[#C3D4CB] px-3.5 py-2.5 text-base"
              />
            </div>
            <button
              type="submit"
              className="bb-btn inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-[#0E7C66] px-5 py-2.5 text-base font-bold text-white hover:bg-[#0A5A4A]">
              <span>Compare before &amp; after</span>
              <Icon name="arrow-right" className="h-4 w-4" />
            </button>
          </form>

          {comparison && (
            <div className="mt-5 rounded-2xl border border-[#DCEAE3] bg-[#F8FBF9] p-4">
              <h3 className="mb-3 text-lg font-extrabold text-[#12201B]">
                {comparison.description}
              </h3>
              <div className="divide-y divide-[#E2EAE6] text-base">
                <div className="grid grid-cols-3 py-2 font-bold text-[#5A6B64]">
                  <span>Part of your plan</span>
                  <span className="text-right">Now</span>
                  <span className="text-right">After change</span>
                </div>
                <div className="grid grid-cols-3 py-2.5">
                  <span className="font-semibold">Things you must pay</span>
                  <span className="text-right tabular-nums">
                    {formatNaira(comparison.before.needsTotalKobo)}
                  </span>
                  <span className="text-right font-bold tabular-nums">
                    {formatNaira(comparison.after.needsTotalKobo)}
                  </span>
                </div>
                <div className="grid grid-cols-3 py-2.5">
                  <span className="font-semibold">What you save</span>
                  <span className="text-right tabular-nums">
                    {formatNaira(comparison.before.savingsTotalKobo)}
                  </span>
                  <span className="text-right font-bold tabular-nums">
                    {formatNaira(comparison.after.savingsTotalKobo)}
                  </span>
                </div>
                <div className="grid grid-cols-3 py-2.5">
                  <span className="font-semibold">Things you enjoy</span>
                  <span className="text-right tabular-nums">
                    {formatNaira(comparison.before.wantsTotalKobo)}
                  </span>
                  <span className="text-right font-bold tabular-nums">
                    {formatNaira(comparison.after.wantsTotalKobo)}
                  </span>
                </div>
                <div className="grid grid-cols-3 py-2.5">
                  <span className="font-semibold">Cushion for surprises</span>
                  <span className="text-right tabular-nums">
                    {formatNaira(comparison.before.bufferKobo)}
                  </span>
                  <span className="text-right font-bold tabular-nums">
                    {formatNaira(comparison.after.bufferKobo)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </section>

        <GuidanceDisclaimer />
      </div>
    </div>
  );
}

export function YearPage({user}: {user: BudgetUser}) {
  const plan = computePlanForUser(user);
  const rows = buildYearViewForUser(user, plan);

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#F2F8FC] py-6 pb-24 md:pb-10">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-[#12201B]">12-month outlook</h1>
            <p className="mt-1 text-base text-[#43564F]">
              See how your money set aside for big bills and emergency savings grows month by month.
            </p>
          </div>
          <CalendarPlanIllustration className="hidden h-24 w-32 sm:block" />
        </div>

        <TermHelp title="What's this? Money set aside for big bills">
          Instead of scrambling when annual rent or school fees arrive, a fixed slice sits safely
          each month and rises until the month the bill is due.
        </TermHelp>

        {/* Mobile stacked cards (zero horizontal scroll at 360px) */}
        <div className="mt-5 grid gap-4 md:hidden">
          {rows.map((r) => (
            <article
              key={r.monthLabel}
              className="bb-card-in rounded-[20px] border border-[#D4E4F0] bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between border-b border-[#E6EFEA] pb-2.5">
                <h2 className="text-lg font-extrabold text-[#12201B]">{r.monthLabel}</h2>
                <span className="text-base font-bold text-[#0A5A4A] tabular-nums">
                  {formatNaira(r.incomeKobo)}
                </span>
              </div>
              <div className="mt-3 space-y-2 text-base">
                <div className="flex justify-between">
                  <span className="text-[#43564F]">Things you must pay</span>
                  <strong className="tabular-nums">{formatNaira(r.needsKobo)}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#43564F]">What you save</span>
                  <strong className="tabular-nums">{formatNaira(r.savingsKobo)}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#43564F]">Money set aside for big bills</span>
                  <strong className="tabular-nums">{formatNaira(r.sinkingFundBalanceKobo)}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#43564F]">Emergency savings</span>
                  <strong className="tabular-nums">{formatNaira(r.emergencyBalanceKobo)}</strong>
                </div>
              </div>
              {r.markers.length > 0 && (
                <p className="mt-3 rounded-xl bg-[#FEF5E4] px-3 py-2 text-sm font-semibold text-[#7A4F00]">
                  {r.markers.join(', ')}
                </p>
              )}
            </article>
          ))}
        </div>

        {/* Desktop full-width aligned view */}
        <section className="bb-card-in mt-5 hidden rounded-[20px] border border-[#D4E4F0] bg-white p-6 shadow-xs md:block">
          <table className="w-full border-collapse text-base">
            <thead>
              <tr className="border-b border-[#D4E4F0] text-left text-sm font-bold text-[#43564F]">
                <th className="py-3 pr-3">Month</th>
                <th className="py-3 pr-3 text-right">Take-home</th>
                <th className="py-3 pr-3 text-right">Things you must pay</th>
                <th className="py-3 pr-3 text-right">What you save</th>
                <th className="py-3 pr-3 text-right">Money set aside for big bills</th>
                <th className="py-3 pr-3">Emergency savings</th>
                <th className="py-3">Milestones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.monthLabel} className="border-b border-[#EDF2F7] hover:bg-[#F8FBFE]">
                  <td className="py-3 pr-3 font-extrabold text-[#12201B]">{r.monthLabel}</td>
                  <td className="py-3 pr-3 text-right tabular-nums">{formatNaira(r.incomeKobo)}</td>
                  <td className="py-3 pr-3 text-right tabular-nums">{formatNaira(r.needsKobo)}</td>
                  <td className="py-3 pr-3 text-right tabular-nums">{formatNaira(r.savingsKobo)}</td>
                  <td className="py-3 pr-3 text-right font-semibold tabular-nums">
                    {formatNaira(r.sinkingFundBalanceKobo)}
                  </td>
                  <td className="py-3 pr-3 text-sm tabular-nums">
                    {formatNaira(r.emergencyBalanceKobo)} of {formatNaira(r.emergencyTargetKobo)}
                  </td>
                  <td className="py-3 text-sm font-medium text-[#0A5A4A]">
                    {r.markers.length > 0 ? r.markers.join(', ') : 'Steady month'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <GuidanceDisclaimer />
      </div>
    </div>
  );
}

export function ReviewsPage({
  user,
  onNavigate,
  onOpenQuickAdd,
}: {
  user: BudgetUser;
  onNavigate: (path: RoutePath) => void;
  onOpenQuickAdd?: () => void;
}) {
  const plan = computePlanForUser(user);
  const tracker = computeTrackerForUser(user, plan);
  const reviews = computeReviewsForUser(user, plan, tracker);

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#FDF9F0] py-6 pb-24 md:pb-10">
      <div className="mx-auto max-w-4xl px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-extrabold text-[#12201B]">Weekly check-ins</h1>
          <p className="mt-1 text-base text-[#43564F]">
            Kind, honest summaries written in plain English from the spending you have logged.
          </p>
        </div>

        {reviews.length > 0 ? (
          <div className="space-y-4">
            {reviews.map((rev) => {
              const badge =
                rev.status === 'on_track'
                  ? {
                      wrap: 'bg-[#E9F8EF] text-[#146C3C]',
                      icon: 'check-circle' as const,
                      text: "You're on track",
                    }
                  : rev.status === 'close'
                    ? {
                        wrap: 'bg-[#FEF5E4] text-[#854D0E]',
                        icon: 'alert-triangle' as const,
                        text: 'Be a little careful',
                      }
                    : rev.status === 'over'
                      ? {
                          wrap: 'bg-[#FFF0F0] text-[#9B1C1C]',
                          icon: 'heart' as const,
                          text: 'Easy to adjust',
                        }
                      : {
                          wrap: 'bg-[#E8F5F1] text-[#0A5A4A]',
                          icon: 'calendar' as const,
                          text: 'Keep logging',
                        };

              const pct =
                rev.allowanceKobo > 0
                  ? Math.min(100, Math.round((rev.spentKobo * 100) / rev.allowanceKobo))
                  : 0;

              return (
                <details
                  key={rev.id}
                  open
                  className="bb-card-in rounded-[20px] border border-[#E5DEC9] bg-white p-6 shadow-xs">
                  <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 font-extrabold text-[#12201B]">
                    <span className="text-lg">
                      {rev.kind === 'monthly'
                        ? 'Pay period (payday to payday)'
                        : 'Weekly check-in'}
                      : {rev.periodStart} to {rev.periodEnd}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-bold ${badge.wrap}`}>
                      <Icon name={badge.icon} className="h-4 w-4" />
                      <span>{badge.text}</span>
                    </span>
                  </summary>
                  <div className="mt-4 border-t border-[#EDE6D4] pt-4">
                    <p className="text-base leading-relaxed text-[#12201B]">{rev.message}</p>
                    <div className="mt-3">
                      <ProgressBar
                        percentage={pct}
                        color={rev.status === 'over' ? '#DC2626' : '#0E7C66'}
                        heightClass="h-2.5"
                      />
                    </div>
                    <p className="mt-2.5 text-sm text-[#5A6B64] tabular-nums">
                      Spent <strong>{formatNaira(rev.spentKobo)}</strong> of{' '}
                      <strong>{formatNaira(rev.allowanceKobo)}</strong> what you could spend &middot;{' '}
                      <strong>{rev.daysLogged}</strong> days logged
                    </p>
                  </div>
                </details>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center rounded-[20px] border border-[#E5DEC9] bg-white p-8 text-center shadow-xs">
            <CalendarPlanIllustration className="h-32 w-40" />
            <h2 className="mt-3 text-xl font-extrabold text-[#12201B]">No completed review yet</h2>
            <p className="mt-1.5 max-w-md text-base text-[#43564F]">
              Log a few more days to get your first review
            </p>
            <button
              type="button"
              onClick={() => {
                if (onOpenQuickAdd) {
                  onOpenQuickAdd();
                } else {
                  onNavigate('/expenses');
                }
              }}
              className="bb-btn mt-5 inline-flex min-h-[48px] items-center gap-2 rounded-2xl bg-[#0E7C66] px-6 py-3 text-base font-bold text-white hover:bg-[#0A5A4A]">
              <Icon name="plus" className="h-5 w-5" />
              <span>Add spending</span>
            </button>
          </div>
        )}

        <GuidanceDisclaimer />
      </div>
    </div>
  );
}
