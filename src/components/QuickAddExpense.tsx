import {useState, type FormEvent, type RefObject} from 'react';
import {categoryLabel, formatNaira, parseNaira, todayLagosISO, VARIABLE_CATEGORIES} from '../engine';
import {CategoryCircle, Icon} from './Icons';
import type {ExpenseCategory, ExpenseItem} from '../types';

export function QuickAddExpense({
  onAddExpense,
  onDone,
  amountInputRef,
  compact = false,
}: {
  onAddExpense: (entry: Omit<ExpenseItem, 'id'>) => void;
  onDone?: () => void;
  amountInputRef?: RefObject<HTMLInputElement | null>;
  compact?: boolean;
}) {
  const today = todayLagosISO();
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('food');
  const [spentOn, setSpentOn] = useState(today);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    try {
      const kobo = parseNaira(amount);
      if (kobo <= 0) {
        setError("Enter more than ₦0, or tap 'No spending today' below.");
        return;
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(spentOn)) {
        setError('Please pick a valid date.');
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
      setNotice(`Saved ${formatNaira(kobo)} under ${categoryLabel(category)}.`);
      if (onDone) {
        onDone();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Please enter a valid Naira amount.');
    }
  }

  function handleNoSpend() {
    setError(null);
    onAddExpense({
      spentOn: today,
      amountKobo: 0,
      category: 'no_spend',
      note: 'No spending today',
    });
    setNotice('Great job. Logged a no-spend day for today.');
    if (onDone) {
      onDone();
    }
  }

  return (
    <div>
      {error && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2.5 rounded-2xl border border-[#F4C2C2] bg-[#FFF5F5] p-3.5 text-base text-[#9B1C1C]">
          <Icon name="alert-triangle" className="mt-0.5 h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {notice && (
        <div
          role="status"
          className="mb-4 flex items-start gap-2.5 rounded-2xl border border-[#BCE2D5] bg-[#E9F8EF] p-3.5 text-base text-[#125832]">
          <Icon name="check-circle" className="mt-0.5 h-5 w-5 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor={compact ? 'modal-amt' : 'quick-amt'}
            className="mb-1.5 block text-base font-bold text-[#12201B]">
            1. How much did you spend? (₦)
          </label>
          <input
            ref={amountInputRef}
            id={compact ? 'modal-amt' : 'quick-amt'}
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="For example: 2,500"
            className="min-h-[54px] w-full rounded-2xl border-2 border-[#C3D4CB] bg-white px-4 py-3 text-xl font-extrabold text-[#12201B] tabular-nums focus:border-[#0E7C66] focus:outline-none"
          />
        </div>

        <div>
          <span className="mb-2 block text-base font-bold text-[#12201B]">
            2. What did you buy?
          </span>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {VARIABLE_CATEGORIES.map((cat) => {
              const selected = category === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  aria-pressed={selected}
                  className={`flex min-h-[48px] items-center gap-2 rounded-2xl border px-2.5 py-2 text-left text-sm font-semibold transition-colors ${
                    selected
                      ? 'border-[#0E7C66] bg-[#E8F5F1] text-[#0A5A4A] ring-2 ring-[#0E7C66]/20'
                      : 'border-[#DCE6E0] bg-white text-[#12201B] hover:bg-[#F6FAF8]'
                  }`}>
                  <CategoryCircle category={cat} size="sm" />
                  <span className="leading-tight">{categoryLabel(cat)}</span>
                </button>
              );
            })}
          </div>
        </div>

        <details className="rounded-2xl border border-[#E2EAE6] bg-[#F8FBF9] px-4 py-2.5">
          <summary className="flex min-h-[36px] cursor-pointer list-none items-center justify-between text-base font-semibold text-[#31443D]">
            <span>Add date or short note (optional)</span>
            <Icon name="chevron-down" className="h-4 w-4 text-[#5A6B64]" />
          </summary>
          <div className="mt-3 grid gap-3 pb-1 sm:grid-cols-2">
            <div>
              <label
                htmlFor={compact ? 'modal-date' : 'quick-date'}
                className="mb-1 block text-sm font-semibold text-[#31443D]">
                Date
              </label>
              <input
                id={compact ? 'modal-date' : 'quick-date'}
                type="date"
                value={spentOn}
                onChange={(e) => setSpentOn(e.target.value)}
                className="min-h-[48px] w-full rounded-2xl border border-[#C3D4CB] bg-white px-3 py-2 text-base"
              />
            </div>
            <div>
              <label
                htmlFor={compact ? 'modal-note' : 'quick-note'}
                className="mb-1 block text-sm font-semibold text-[#31443D]">
                Short note
              </label>
              <input
                id={compact ? 'modal-note' : 'quick-note'}
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="For example: Lunch or bus fare"
                className="min-h-[48px] w-full rounded-2xl border border-[#C3D4CB] bg-white px-3 py-2 text-base"
              />
            </div>
          </div>
        </details>

        <div className="flex flex-col gap-2.5 sm:flex-row">
          <button
            type="submit"
            className="bb-btn inline-flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-2xl bg-[#0E7C66] px-5 py-3 text-base font-bold text-white shadow-xs hover:bg-[#0A5A4A]">
            <Icon name="check" className="h-5 w-5" />
            <span>3. Save spending</span>
          </button>
          <button
            type="button"
            onClick={handleNoSpend}
            className="bb-btn inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border border-[#C3D4CB] bg-white px-4 py-3 text-base font-bold text-[#12201B] hover:bg-[#F3FAF7]">
            <Icon name="check-circle" className="h-5 w-5 text-[#15803D]" />
            <span>No spending today</span>
          </button>
        </div>
      </form>
    </div>
  );
}
