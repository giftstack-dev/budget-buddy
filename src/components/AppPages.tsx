import {useState, type FormEvent} from 'react';
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
import type {BudgetUser, ExpenseCategory, ExpenseItem, GoalItem, RoutePath} from '../types';

function GuidanceDisclaimer() {
  return (
    <p className="mt-6 rounded-xl border border-[#E1E8E4] bg-white px-4 py-3 text-xs text-[#5A6B64]">
      Budgeting guidance, not professional financial advice.
    </p>
  );
}

export function DashboardPage({
  user,
  onAddExpense,
  onDeleteExpense,
  onNavigate,
}: {
  user: BudgetUser;
  onAddExpense: (entry: Omit<ExpenseItem, 'id'>) => void;
  onDeleteExpense: (id: string) => void;
  onNavigate: (path: RoutePath) => void;
}) {
  const today = todayLagosISO();
  const plan = computePlanForUser(user, today);
  const tracker = computeTrackerForUser(user, plan, today);
  const reviews = computeReviewsForUser(user, plan, tracker, today);
  const latestReview = reviews[0] ?? null;

  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('food');
  const [spentOn, setSpentOn] = useState(today);
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formNotice, setFormNotice] = useState<string | null>(null);

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

  function handleAdd(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFormNotice(null);
    try {
      const kobo = parseNaira(amount);
      if (kobo <= 0) {
        setFormError("Amount must be greater than ₦0, or tap 'No spending today'.");
        return;
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(spentOn)) {
        setFormError('Please pick a valid date.');
        return;
      }
      onAddExpense({
        spentOn,
        amountKobo: kobo,
        category,
        note: note.trim(),
      });
      setAmount('');
      setNote('');
      setFormNotice(`Saved ${formatNaira(kobo)} for ${categoryLabel(category)}.`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Please enter a valid amount.');
    }
  }

  function handleNoSpend() {
    setFormError(null);
    onAddExpense({
      spentOn: today,
      amountKobo: 0,
      category: 'no_spend',
      note: 'No spending today',
    });
    setFormNotice('Logged a no-spend day for today.');
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-5">
        <h1 className="text-2xl font-extrabold text-[#12201B] md:text-3xl">
          Good morning, {user.displayName}
        </h1>
        <p className="mt-1 text-sm text-[#5A6B64]">
          Cycle: {tracker.cycle.start} to {tracker.cycle.end} (Day {tracker.cycle.dayNumber} of{' '}
          {tracker.cycle.lengthDays})
        </p>
      </div>

      <section
        className={`mb-5 rounded-[14px] border p-5 ${
          plan.status === 'DEFICIT'
            ? 'border-[#F4C2C2] bg-[#FDECEC]'
            : plan.status === 'TIGHT'
              ? 'border-[#F4DAA3] bg-[#FEF5E4]'
              : 'border-[#BDE7CF] bg-[#E9F8EF]'
        }`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[#12201B]">
              {user.profile.mode === 'log_only'
                ? 'Tracking mode active'
                : `Plan status: ${plan.status}`}
            </h2>
            <p className="mt-1 text-sm text-[#12201B]">{plan.statusMessage}</p>
          </div>
          <a
            href="/plan"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('/plan');
            }}
            className="inline-flex min-h-12 items-center rounded-xl border border-[#C9D5CF] bg-white px-4 py-2 text-sm font-bold text-[#0A5A4A] hover:bg-[#F5F7F4]">
            View Plan
          </a>
        </div>
      </section>

      <section className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-[14px] border border-[#E1E8E4] bg-white p-5 shadow-xs">
          <div className="text-xs font-bold uppercase tracking-wider text-[#5A6B64]">
            Safe to spend today
          </div>
          <div className="mt-1 text-2xl font-extrabold text-[#12201B]">
            {formatNaira(tracker.safeToSpendTodayKobo)}
          </div>
          <progress value={safeRatio} max={100} className="mt-3 h-2.5 w-full accent-[#0E7C66]" />
          <p className="mt-2 text-xs text-[#5A6B64]">
            Daily baseline: {formatNaira(tracker.dailyAllowanceKobo)}/day
          </p>
        </div>

        <div className="rounded-[14px] border border-[#E1E8E4] bg-white p-5 shadow-xs">
          <div className="text-xs font-bold uppercase tracking-wider text-[#5A6B64]">
            Left this cycle
          </div>
          <div className="mt-1 text-2xl font-extrabold text-[#12201B]">
            {formatNaira(tracker.remainingPoolKobo)}
          </div>
          <progress
            value={remainingRatio}
            max={100}
            className="mt-3 h-2.5 w-full accent-[#0E7C66]"
          />
          <p className="mt-2 text-xs text-[#5A6B64]">
            Spent {formatNaira(tracker.spentThisCycleKobo)} of {formatNaira(tracker.cyclePoolKobo)}
          </p>
        </div>

        <div className="rounded-[14px] border border-[#E1E8E4] bg-white p-5 shadow-xs">
          <div className="text-xs font-bold uppercase tracking-wider text-[#5A6B64]">
            Days to next payday
          </div>
          <div className="mt-1 text-2xl font-extrabold text-[#12201B]">
            {tracker.daysToNextPayday} day(s)
          </div>
          <progress value={elapsedRatio} max={100} className="mt-3 h-2.5 w-full accent-[#0E7C66]" />
          <p className="mt-2 text-xs text-[#5A6B64]">Next payday: {tracker.cycle.nextPayDate}</p>
        </div>
      </section>

      <div className="grid gap-5 md:grid-cols-2">
        <section className="rounded-[14px] border border-[#E1E8E4] bg-white p-5 shadow-xs">
          <h2 className="text-lg font-bold text-[#12201B]">Add spending</h2>
          {formError && (
            <p className="mt-2 rounded-xl border border-[#F4C2C2] bg-[#FDECEC] p-3 text-sm text-[#9B1C1C]">
              {formError}
            </p>
          )}
          {formNotice && (
            <p className="mt-2 rounded-xl border border-[#BDE7CF] bg-[#E9F8EF] p-3 text-sm text-[#125832]">
              {formNotice}
            </p>
          )}

          <form onSubmit={handleAdd} className="mt-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="dash-amt" className="mb-1 block text-xs font-semibold">
                  Amount (₦)
                </label>
                <input
                  id="dash-amt"
                  type="text"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="For example: 2,500"
                  className="min-h-12 w-full rounded-xl border border-[#C9D5CF] px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="dash-cat" className="mb-1 block text-xs font-semibold">
                  Category
                </label>
                <select
                  id="dash-cat"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                  className="min-h-12 w-full rounded-xl border border-[#C9D5CF] bg-white px-3 py-2 text-sm">
                  {VARIABLE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {categoryLabel(cat)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="dash-date" className="mb-1 block text-xs font-semibold">
                  Date
                </label>
                <input
                  id="dash-date"
                  type="date"
                  value={spentOn}
                  onChange={(e) => setSpentOn(e.target.value)}
                  className="min-h-12 w-full rounded-xl border border-[#C9D5CF] px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="dash-note" className="mb-1 block text-xs font-semibold">
                  Note (optional)
                </label>
                <input
                  id="dash-note"
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="For example: Lunch & transport"
                  className="min-h-12 w-full rounded-xl border border-[#C9D5CF] px-3 py-2 text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              className="min-h-12 w-full rounded-xl bg-[#0E7C66] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#0A5A4A]">
              Save spending
            </button>
          </form>

          <button
            type="button"
            onClick={handleNoSpend}
            className="mt-2.5 min-h-12 w-full rounded-xl border border-[#C9D5CF] bg-white px-4 py-2.5 text-sm font-bold text-[#12201B] hover:bg-[#F5F7F4]">
            No spending today
          </button>
        </section>

        <div className="space-y-5">
          <section className="rounded-[14px] border border-[#E1E8E4] bg-white p-5 shadow-xs">
            <h2 className="text-lg font-bold text-[#12201B]">Today&apos;s entries</h2>
            {todayEntries.length > 0 ? (
              <div className="mt-3 divide-y divide-[#E1E8E4]">
                {todayEntries.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between gap-2 py-2.5">
                    <div>
                      <div className="text-sm font-semibold text-[#12201B]">
                        {categoryLabel(entry.category)}
                      </div>
                      {entry.note && <div className="text-xs text-[#5A6B64]">{entry.note}</div>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#12201B]">
                        {formatNaira(entry.amountKobo)}
                      </span>
                      <button
                        type="button"
                        onClick={() => onDeleteExpense(entry.id)}
                        className="min-h-10 rounded-lg border border-[#F4C2C2] bg-[#FDECEC] px-2.5 py-1 text-xs font-semibold text-[#9B1C1C]">
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-[#5A6B64]">
                Nothing logged for today yet. Add an entry or tap &quot;No spending today&quot;.
              </p>
            )}
          </section>

          <section className="rounded-[14px] border border-[#E1E8E4] bg-white p-5 shadow-xs">
            <h2 className="text-lg font-bold text-[#12201B]">Latest review</h2>
            {latestReview ? (
              <div className="mt-2">
                <p className="text-xs font-semibold text-[#5A6B64]">
                  {latestReview.periodStart} to {latestReview.periodEnd}
                </p>
                <p className="mt-1.5 text-sm text-[#12201B]">{latestReview.message}</p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-[#5A6B64]">
                Log a few more days to get your first review
              </p>
            )}
            <a
              href="/reviews"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('/reviews');
              }}
              className="mt-3 inline-block text-sm font-semibold text-[#0A5A4A] underline">
              Open Reviews
            </a>
          </section>
        </div>
      </div>

      <GuidanceDisclaimer />
    </div>
  );
}

export function ExpensesPage({
  user,
  onAddExpense,
  onDeleteExpense,
}: {
  user: BudgetUser;
  onAddExpense: (entry: Omit<ExpenseItem, 'id'>) => void;
  onDeleteExpense: (id: string) => void;
}) {
  const today = todayLagosISO();
  const plan = computePlanForUser(user, today);
  const tracker = computeTrackerForUser(user, plan, today);

  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('food');
  const [spentOn, setSpentOn] = useState(today);
  const [note, setNote] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleAdd(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const kobo = parseNaira(amount);
      if (kobo <= 0) {
        setError("Amount must be greater than ₦0, or tap 'No spending today'.");
        return;
      }
      onAddExpense({spentOn, amountKobo: kobo, category, note: note.trim()});
      setAmount('');
      setNote('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Please enter a valid Naira amount.');
    }
  }

  const filtered = [...user.expenses]
    .filter((e) => (!filterCat ? true : e.category === filterCat))
    .sort((a, b) => b.spentOn.localeCompare(a.spentOn));

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-5">
        <h1 className="text-2xl font-extrabold text-[#12201B]">Expenses</h1>
        <p className="mt-1 text-sm text-[#5A6B64]">
          Log daily spending and see how each category compares with your cycle allowance.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <section className="rounded-[14px] border border-[#E1E8E4] bg-white p-5 shadow-xs">
          <h2 className="text-lg font-bold text-[#12201B]">Add an expense</h2>
          {error && (
            <p className="mt-2 rounded-xl border border-[#F4C2C2] bg-[#FDECEC] p-3 text-sm text-[#9B1C1C]">
              {error}
            </p>
          )}
          <form onSubmit={handleAdd} className="mt-3 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="exp-amt" className="mb-1 block text-xs font-semibold">
                  Amount (₦)
                </label>
                <input
                  id="exp-amt"
                  type="text"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="For example: 3,500"
                  className="min-h-12 w-full rounded-xl border border-[#C9D5CF] px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="exp-cat" className="mb-1 block text-xs font-semibold">
                  Category
                </label>
                <select
                  id="exp-cat"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                  className="min-h-12 w-full rounded-xl border border-[#C9D5CF] bg-white px-3 py-2 text-sm">
                  {VARIABLE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {categoryLabel(cat)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="exp-date" className="mb-1 block text-xs font-semibold">
                  Date
                </label>
                <input
                  id="exp-date"
                  type="date"
                  value={spentOn}
                  onChange={(e) => setSpentOn(e.target.value)}
                  className="min-h-12 w-full rounded-xl border border-[#C9D5CF] px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="exp-note" className="mb-1 block text-xs font-semibold">
                  Note (optional)
                </label>
                <input
                  id="exp-note"
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="For example: Market run"
                  className="min-h-12 w-full rounded-xl border border-[#C9D5CF] px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                className="min-h-12 rounded-xl bg-[#0E7C66] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#0A5A4A]">
                Save spending
              </button>
              <button
                type="button"
                onClick={() =>
                  onAddExpense({
                    spentOn: today,
                    amountKobo: 0,
                    category: 'no_spend',
                    note: 'No spending today',
                  })
                }
                className="min-h-12 rounded-xl border border-[#C9D5CF] bg-white px-4 py-2.5 text-sm font-bold text-[#12201B] hover:bg-[#F5F7F4]">
                No spending today
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-[14px] border border-[#E1E8E4] bg-white p-5 shadow-xs">
          <h2 className="text-lg font-bold text-[#12201B]">This cycle by category</h2>
          <p className="mt-1 text-sm text-[#5A6B64]">
            Spent {formatNaira(tracker.spentThisCycleKobo)} of {formatNaira(tracker.cyclePoolKobo)}
          </p>
          <div className="mt-3 space-y-2.5">
            {Object.keys(tracker.categoryTotals).length > 0 ? (
              Object.entries(tracker.categoryTotals).map(([cat, spent]) => {
                const planned = plan.categoryAllowances[cat] ?? 0;
                const max = Math.max(planned, spent, 1);
                return (
                  <div key={cat}>
                    <div className="flex justify-between text-xs font-semibold">
                      <span>{categoryLabel(cat)}</span>
                      <span>
                        {formatNaira(spent)}
                        {planned > 0 ? ` / ${formatNaira(planned)}` : ''}
                      </span>
                    </div>
                    <meter
                      value={spent}
                      min={0}
                      max={max}
                      high={planned > 0 ? planned : max}
                      optimum={0}
                      className="mt-1 h-2.5 w-full"
                    />
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-[#5A6B64]">No cycle spending recorded yet.</p>
            )}
          </div>
        </section>
      </div>

      <section className="mt-5 rounded-[14px] border border-[#E1E8E4] bg-white p-5 shadow-xs">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-[#12201B]">Entries ({filtered.length})</h2>
          <select
            aria-label="Filter by category"
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value)}
            className="min-h-12 rounded-xl border border-[#C9D5CF] bg-white px-3 py-2 text-sm">
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
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#E1E8E4] text-left text-xs uppercase text-[#5A6B64]">
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 pr-3">Category</th>
                  <th className="py-2 pr-3">Note</th>
                  <th className="py-2 pr-3 text-right">Amount</th>
                  <th className="py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id} className="border-b border-[#E1E8E4]">
                    <td className="py-2.5 pr-3">{item.spentOn}</td>
                    <td className="py-2.5 pr-3">{categoryLabel(item.category)}</td>
                    <td className="py-2.5 pr-3 text-[#5A6B64]">{item.note || '—'}</td>
                    <td className="py-2.5 pr-3 text-right font-bold">
                      {formatNaira(item.amountKobo)}
                    </td>
                    <td className="py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => onDeleteExpense(item.id)}
                        className="rounded-lg border border-[#F4C2C2] bg-[#FDECEC] px-2.5 py-1 text-xs font-semibold text-[#9B1C1C]">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="rounded-xl border border-[#E1E8E4] bg-[#F5F7F4] p-4 text-sm text-[#5A6B64]">
            No spending logged yet. Add your first one above.
          </p>
        )}
      </section>
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
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-5">
        <h1 className="text-2xl font-extrabold text-[#12201B]">Savings &amp; goals</h1>
        <p className="mt-1 text-sm text-[#5A6B64]">
          Calculated from your emergency target, festive fund preference, and personal goals.
        </p>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <section className="rounded-[14px] border border-[#E1E8E4] bg-white p-5 shadow-xs">
          <h2 className="text-lg font-bold text-[#12201B]">Emergency safety net</h2>
          <p className="mt-1 text-sm text-[#5A6B64]">
            Target ({user.profile.emergencyMonths} months of essentials):{' '}
            <strong>{formatNaira(plan.emergencyTargetKobo)}</strong>
          </p>
          <p className="mt-1 text-sm text-[#12201B]">
            Saved so far: <strong>{formatNaira(user.profile.emergencySavingsKobo)}</strong> &bull;
            Monthly plan contribution: <strong>{formatNaira(plan.emergencyContributionKobo)}</strong>
          </p>
          <progress value={emPct} max={100} className="mt-3 h-2.5 w-full accent-[#0E7C66]" />
        </section>

        <section className="rounded-[14px] border border-[#E1E8E4] bg-white p-5 shadow-xs">
          <h2 className="text-lg font-bold text-[#12201B]">Festive fund</h2>
          <p className="mt-1 text-sm text-[#5A6B64]">
            {user.profile.festiveFundEnabled
              ? `Active: setting aside ${formatNaira(plan.festiveContributionKobo)}/month for December celebrations.`
              : 'Currently turned off in your setup.'}
          </p>
        </section>
      </div>

      <section className="mb-6 rounded-[14px] border border-[#E1E8E4] bg-white p-5 shadow-xs">
        <h2 className="text-lg font-bold text-[#12201B]">Add a savings goal</h2>
        {error && (
          <p className="mt-2 rounded-xl border border-[#F4C2C2] bg-[#FDECEC] p-3 text-sm text-[#9B1C1C]">
            {error}
          </p>
        )}
        <form onSubmit={handleAddGoal} className="mt-3 grid gap-3 sm:grid-cols-4 sm:items-end">
          <div>
            <label htmlFor="sg-name" className="mb-1 block text-xs font-semibold">
              Goal name
            </label>
            <input
              id="sg-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="For example: Inverter"
              className="min-h-12 w-full rounded-xl border border-[#C9D5CF] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="sg-target" className="mb-1 block text-xs font-semibold">
              Target (₦)
            </label>
            <input
              id="sg-target"
              type="text"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="For example: 250,000"
              className="min-h-12 w-full rounded-xl border border-[#C9D5CF] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="sg-saved" className="mb-1 block text-xs font-semibold">
              Saved so far (₦)
            </label>
            <input
              id="sg-saved"
              type="text"
              value={saved}
              onChange={(e) => setSaved(e.target.value)}
              className="min-h-12 w-full rounded-xl border border-[#C9D5CF] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="sg-date" className="mb-1 block text-xs font-semibold">
              Deadline
            </label>
            <input
              id="sg-date"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="min-h-12 w-full rounded-xl border border-[#C9D5CF] px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-4">
            <button
              type="submit"
              className="min-h-12 rounded-xl bg-[#0E7C66] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#0A5A4A]">
              Add goal
            </button>
          </div>
        </form>
      </section>

      {plan.goalResults.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {plan.goalResults.map((g) => {
            const pct =
              g.targetKobo > 0 ? Math.min(100, Math.round((g.savedKobo * 100) / g.targetKobo)) : 100;
            return (
              <article
                key={g.id}
                className="rounded-[14px] border border-[#E1E8E4] bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-lg font-bold text-[#12201B]">{g.name}</h3>
                  <span
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
                      g.onTrack
                        ? 'bg-[#E9F8EF] text-[#146C3C]'
                        : 'bg-[#FEF5E4] text-[#7A4F00]'
                    }`}>
                    {g.onTrack ? 'On track' : 'Behind'}
                  </span>
                </div>
                <p className="mt-2 text-sm">
                  Saved <strong>{formatNaira(g.savedKobo)}</strong> of{' '}
                  <strong>{formatNaira(g.targetKobo)}</strong>
                </p>
                <progress value={pct} max={100} className="mt-2 h-2.5 w-full accent-[#0E7C66]" />
                <p className="mt-2 text-xs text-[#5A6B64]">
                  Deadline: {g.deadline} &bull; Allocated: {formatNaira(g.allocatedKobo)}/month
                  {g.estimatedCompletion ? ` • Est. ready: ${g.estimatedCompletion}` : ''}
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onUpdateGoalSaved(g.id, g.savedKobo + 10_000_00)}
                    className="min-h-10 rounded-lg border border-[#C9D5CF] bg-white px-3 py-1.5 text-xs font-semibold hover:bg-[#F5F7F4]">
                    + ₦10,000 saved
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteGoal(g.id)}
                    className="min-h-10 rounded-lg border border-[#F4C2C2] bg-[#FDECEC] px-3 py-1.5 text-xs font-semibold text-[#9B1C1C]">
                    Delete goal
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-[14px] border border-[#E1E8E4] bg-white p-5 text-sm text-[#5A6B64]">
          No goals added yet. Add one above to allocate monthly savings towards it.
        </div>
      )}

      <GuidanceDisclaimer />
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

  function handleWhatIf(e: FormEvent) {
    e.preventDefault();
    setWhatIfErr(null);
    if (scenario === 'income_drop' || scenario === 'rent_rise') {
      const num = Number(whatIfValue.trim());
      if (!Number.isInteger(num) || num < 0 || (scenario === 'income_drop' && num > 100)) {
        setWhatIfErr('Enter a whole-number percentage, for example 20.');
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

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-5">
        <h1 className="text-2xl font-extrabold text-[#12201B]">Monthly plan</h1>
        <p className="mt-1 text-sm text-[#5A6B64]">
          Monthly income: <strong>{formatNaira(plan.incomeMonthlyKobo)}</strong> &bull; Total
          allocated: <strong>{formatNaira(totalAllocated)}</strong>
        </p>
      </div>

      <section
        className={`mb-5 rounded-[14px] border p-5 ${
          plan.status === 'DEFICIT'
            ? 'border-[#F4C2C2] bg-[#FDECEC]'
            : plan.status === 'TIGHT'
              ? 'border-[#F4DAA3] bg-[#FEF5E4]'
              : 'border-[#BDE7CF] bg-[#E9F8EF]'
        }`}>
        <h2 className="text-lg font-bold text-[#12201B]">Status: {plan.status}</h2>
        <p className="mt-1 text-sm text-[#12201B]">{plan.statusMessage}</p>
        {plan.suggestions.length > 0 && (
          <ul className="mt-2 list-disc pl-5 text-sm text-[#12201B]">
            {plan.suggestions.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-5 md:grid-cols-2">
        <section className="rounded-[14px] border border-[#E1E8E4] bg-white p-5 shadow-xs">
          <h2 className="text-lg font-bold text-[#12201B]">
            What you must pay ({formatNaira(plan.needsTotalKobo)})
          </h2>
          {needsItems.length > 0 ? (
            <div className="mt-3 divide-y divide-[#E1E8E4]">
              {needsItems.map((item, idx) => (
                <div key={`${item.category}-${idx}`} className="flex justify-between gap-2 py-2.5">
                  <div>
                    <div className="text-sm font-semibold">{item.label}</div>
                    <div className="text-xs text-[#5A6B64]">{item.note}</div>
                  </div>
                  <strong className="text-sm">{formatNaira(item.amountKobo)}</strong>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-[#5A6B64]">No essential costs entered.</p>
          )}
        </section>

        <section className="rounded-[14px] border border-[#E1E8E4] bg-white p-5 shadow-xs">
          <h2 className="text-lg font-bold text-[#12201B]">
            What you save ({formatNaira(plan.savingsTotalKobo)})
          </h2>
          {savingsItems.length > 0 ? (
            <div className="mt-3 divide-y divide-[#E1E8E4]">
              {savingsItems.map((item, idx) => (
                <div key={`${item.category}-${idx}`} className="flex justify-between gap-2 py-2.5">
                  <div>
                    <div className="text-sm font-semibold">{item.label}</div>
                    <div className="text-xs text-[#5A6B64]">{item.note}</div>
                  </div>
                  <strong className="text-sm">{formatNaira(item.amountKobo)}</strong>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-[#5A6B64]">No savings allocation in this plan.</p>
          )}

          <h2 className="mt-5 text-lg font-bold text-[#12201B]">
            Buffer ({formatNaira(plan.bufferKobo)})
          </h2>
          {bufferItems.length > 0 ? (
            <div className="mt-2 flex justify-between gap-2 py-1.5">
              <div>
                <div className="text-sm font-semibold">{bufferItems[0].label}</div>
                <div className="text-xs text-[#5A6B64]">{bufferItems[0].note}</div>
              </div>
              <strong className="text-sm">{formatNaira(bufferItems[0].amountKobo)}</strong>
            </div>
          ) : (
            <p className="mt-1 text-sm text-[#5A6B64]">No buffer available.</p>
          )}
        </section>
      </div>

      <section className="mt-5 rounded-[14px] border border-[#E1E8E4] bg-white p-5 shadow-xs">
        <h2 className="text-lg font-bold text-[#12201B]">
          What you can spend ({formatNaira(plan.wantsTotalKobo)})
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {wantsItems.map((item) => (
            <div
              key={item.category}
              className="flex justify-between gap-2 rounded-xl border border-[#E1E8E4] bg-[#F5F7F4] p-3">
              <div>
                <div className="text-sm font-semibold">{item.label}</div>
                <div className="text-xs text-[#5A6B64]">{item.note}</div>
              </div>
              <strong className="text-sm">{formatNaira(item.amountKobo)}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-5 rounded-[14px] border border-[#E1E8E4] bg-white p-5 shadow-xs">
        <h2 className="text-lg font-bold text-[#12201B]">What if?</h2>
        <p className="mt-1 text-sm text-[#5A6B64]">
          Test a change without altering your saved plan.
        </p>

        {whatIfErr && (
          <p className="mt-2 rounded-xl border border-[#F4C2C2] bg-[#FDECEC] p-3 text-sm text-[#9B1C1C]">
            {whatIfErr}
          </p>
        )}

        <form onSubmit={handleWhatIf} className="mt-3 grid gap-3 sm:grid-cols-3 sm:items-end">
          <div>
            <label htmlFor="wi-scen" className="mb-1 block text-xs font-semibold">
              Scenario
            </label>
            <select
              id="wi-scen"
              value={scenario}
              onChange={(e) => setScenario(e.target.value as typeof scenario)}
              className="min-h-12 w-full rounded-xl border border-[#C9D5CF] bg-white px-3 py-2 text-sm">
              <option value="income_drop">Income falls by X%</option>
              <option value="rent_rise">Rent rises by X%</option>
              <option value="add_dependent">Add a dependent (₦X/month)</option>
              <option value="add_loan">Add a loan payment (₦X/month)</option>
            </select>
          </div>
          <div>
            <label htmlFor="wi-val" className="mb-1 block text-xs font-semibold">
              Value (% or ₦/month)
            </label>
            <input
              id="wi-val"
              type="text"
              value={whatIfValue}
              onChange={(e) => setWhatIfValue(e.target.value)}
              placeholder="For example: 20 or 25,000"
              className="min-h-12 w-full rounded-xl border border-[#C9D5CF] px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="min-h-12 rounded-xl bg-[#0E7C66] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#0A5A4A]">
            Compare before &amp; after
          </button>
        </form>

        {comparison && (
          <div className="mt-4 overflow-x-auto">
            <h3 className="mb-2 text-sm font-bold text-[#12201B]">{comparison.description}</h3>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#E1E8E4] text-left text-xs uppercase text-[#5A6B64]">
                  <th className="py-2">Group</th>
                  <th className="py-2 text-right">Current</th>
                  <th className="py-2 text-right">After</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-[#E1E8E4]">
                  <td className="py-2">Status</td>
                  <td className="py-2 text-right font-bold">{comparison.before.status}</td>
                  <td className="py-2 text-right font-bold">{comparison.after.status}</td>
                </tr>
                <tr className="border-b border-[#E1E8E4]">
                  <td className="py-2">Needs</td>
                  <td className="py-2 text-right">
                    {formatNaira(comparison.before.needsTotalKobo)}
                  </td>
                  <td className="py-2 text-right">
                    {formatNaira(comparison.after.needsTotalKobo)}
                  </td>
                </tr>
                <tr className="border-b border-[#E1E8E4]">
                  <td className="py-2">Savings</td>
                  <td className="py-2 text-right">
                    {formatNaira(comparison.before.savingsTotalKobo)}
                  </td>
                  <td className="py-2 text-right">
                    {formatNaira(comparison.after.savingsTotalKobo)}
                  </td>
                </tr>
                <tr className="border-b border-[#E1E8E4]">
                  <td className="py-2">Wants</td>
                  <td className="py-2 text-right">
                    {formatNaira(comparison.before.wantsTotalKobo)}
                  </td>
                  <td className="py-2 text-right">
                    {formatNaira(comparison.after.wantsTotalKobo)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2">Buffer</td>
                  <td className="py-2 text-right">{formatNaira(comparison.before.bufferKobo)}</td>
                  <td className="py-2 text-right">{formatNaira(comparison.after.bufferKobo)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </section>

      <GuidanceDisclaimer />
    </div>
  );
}

export function YearPage({user}: {user: BudgetUser}) {
  const plan = computePlanForUser(user);
  const rows = buildYearViewForUser(user, plan);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-5">
        <h1 className="text-2xl font-extrabold text-[#12201B]">12-month year view</h1>
        <p className="mt-1 text-sm text-[#5A6B64]">
          Projected from your monthly income, sinking funds, emergency target, and goal deadlines.
        </p>
      </div>

      <section className="overflow-x-auto rounded-[14px] border border-[#E1E8E4] bg-white p-5 shadow-xs">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-[#E1E8E4] text-left text-xs uppercase text-[#5A6B64]">
              <th className="py-2 pr-3">Month</th>
              <th className="py-2 pr-3 text-right">Income</th>
              <th className="py-2 pr-3 text-right">Needs</th>
              <th className="py-2 pr-3 text-right">Savings</th>
              <th className="py-2 pr-3 text-right">Sinking fund</th>
              <th className="py-2 pr-3">Emergency fund</th>
              <th className="py-2">Due &amp; milestones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.monthLabel} className="border-b border-[#E1E8E4]">
                <td className="py-2.5 pr-3 font-bold">{r.monthLabel}</td>
                <td className="py-2.5 pr-3 text-right">{formatNaira(r.incomeKobo)}</td>
                <td className="py-2.5 pr-3 text-right">{formatNaira(r.needsKobo)}</td>
                <td className="py-2.5 pr-3 text-right">{formatNaira(r.savingsKobo)}</td>
                <td className="py-2.5 pr-3 text-right">
                  {formatNaira(r.sinkingFundBalanceKobo)}
                </td>
                <td className="py-2.5 pr-3 text-xs">
                  {formatNaira(r.emergencyBalanceKobo)} / {formatNaira(r.emergencyTargetKobo)}
                </td>
                <td className="py-2.5 text-xs">
                  {r.markers.length > 0 ? r.markers.join(', ') : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <GuidanceDisclaimer />
    </div>
  );
}

export function ReviewsPage({user}: {user: BudgetUser}) {
  const plan = computePlanForUser(user);
  const tracker = computeTrackerForUser(user, plan);
  const reviews = computeReviewsForUser(user, plan, tracker);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-5">
        <h1 className="text-2xl font-extrabold text-[#12201B]">Reviews</h1>
        <p className="mt-1 text-sm text-[#5A6B64]">
          Calm weekly and pay-cycle check-ins calculated from your logged expenses.
        </p>
      </div>

      {reviews.length > 0 ? (
        <div className="space-y-3">
          {reviews.map((rev) => (
            <details
              key={rev.id}
              open
              className="rounded-[14px] border border-[#E1E8E4] bg-white p-5 shadow-xs">
              <summary className="flex cursor-pointer items-center justify-between gap-2 font-bold text-[#12201B]">
                <span>
                  {rev.kind === 'monthly' ? 'Pay-cycle review' : 'Weekly review'}: {rev.periodStart}{' '}
                  to {rev.periodEnd}
                </span>
                <span
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
                    rev.status === 'on_track'
                      ? 'bg-[#E9F8EF] text-[#146C3C]'
                      : rev.status === 'close'
                        ? 'bg-[#FEF5E4] text-[#7A4F00]'
                        : rev.status === 'over'
                          ? 'bg-[#FDECEC] text-[#9B1C1C]'
                          : 'bg-[#E8F5F1] text-[#0A5A4A]'
                  }`}>
                  {rev.status.replace('_', ' ')}
                </span>
              </summary>
              <div className="mt-3 border-t border-[#E1E8E4] pt-3">
                <p className="text-sm text-[#12201B]">{rev.message}</p>
                <p className="mt-2 text-xs text-[#5A6B64]">
                  Spent: <strong>{formatNaira(rev.spentKobo)}</strong> &bull; Allowance:{' '}
                  <strong>{formatNaira(rev.allowanceKobo)}</strong> &bull; Days logged:{' '}
                  <strong>{rev.daysLogged}</strong>
                </p>
              </div>
            </details>
          ))}
        </div>
      ) : (
        <div className="rounded-[14px] border border-[#E1E8E4] bg-white p-6 shadow-xs">
          <h2 className="text-lg font-bold text-[#12201B]">No completed review yet</h2>
          <p className="mt-1 text-sm text-[#5A6B64]">
            Log a few more days to get your first review
          </p>
        </div>
      )}

      <GuidanceDisclaimer />
    </div>
  );
}
