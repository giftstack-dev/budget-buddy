import {useState, type FormEvent} from 'react';
import {koboToInputValue, parseNaira, todayLagosISO} from '../engine';
import type {
  BudgetUser,
  CostCategory,
  CostFrequency,
  EmploymentType,
  FixedCostItem,
  GoalItem,
  HouseholdType,
  HousingType,
  IncomeFrequency,
  PlanMode,
} from '../types';

interface CostRowDraft {
  category: CostCategory;
  label: string;
  amount: string;
  frequency: CostFrequency;
  dueMonth: string;
  hint: string;
  allowYearlyOnly?: boolean;
}

const DEFAULT_STEP3_ROWS: Array<{
  category: CostCategory;
  label: string;
  frequency: CostFrequency;
  hint: string;
}> = [
  {category: 'rent', label: 'Rent', frequency: 'yearly', hint: 'For example: 480,000 a year'},
  {
    category: 'utilities',
    label: 'Utilities (power, water & gas)',
    frequency: 'monthly',
    hint: 'For example: 12,000 a month',
  },
  {
    category: 'data_airtime',
    label: 'Data & airtime',
    frequency: 'monthly',
    hint: 'For example: 10,000 a month',
  },
  {
    category: 'transport',
    label: 'Transport',
    frequency: 'monthly',
    hint: 'For example: 25,000 a month',
  },
  {
    category: 'food',
    label: 'Food & groceries',
    frequency: 'monthly',
    hint: 'For example: 60,000 a month',
  },
  {
    category: 'school_fees',
    label: 'School fees (per term)',
    frequency: 'termly',
    hint: 'For example: 90,000 a term',
  },
  {
    category: 'family_support',
    label: 'Family support',
    frequency: 'monthly',
    hint: 'For example: 15,000 a month',
  },
  {
    category: 'debt_payments',
    label: 'Loan payments',
    frequency: 'monthly',
    hint: 'For example: 20,000 a month',
  },
  {
    category: 'giving',
    label: 'Giving',
    frequency: 'monthly',
    hint: 'For example: 10,000 a month',
  },
  {
    category: 'insurance_subscriptions',
    label: 'Insurance or subscriptions',
    frequency: 'monthly',
    hint: 'For example: 5,000 a month',
  },
];

function buildInitialCostDrafts(existing: FixedCostItem[]): CostRowDraft[] {
  const byCategory = new Map<CostCategory, FixedCostItem>();
  for (const item of existing) {
    byCategory.set(item.category, item);
  }
  return DEFAULT_STEP3_ROWS.map((def) => {
    const saved = byCategory.get(def.category);
    return {
      category: def.category,
      label: def.label,
      amount: saved ? koboToInputValue(saved.amountKobo) : '',
      frequency: saved ? saved.frequency : def.frequency,
      dueMonth: saved && saved.dueMonth ? String(saved.dueMonth) : '',
      hint: def.hint,
    };
  });
}

interface GoalDraft {
  name: string;
  target: string;
  saved: string;
  deadline: string;
}

function buildInitialGoalDrafts(existing: GoalItem[]): GoalDraft[] {
  return [0, 1, 2].map((idx) => {
    const g = existing[idx];
    return {
      name: g ? g.name : '',
      target: g ? koboToInputValue(g.targetKobo) : '',
      saved: g ? koboToInputValue(g.savedKobo) : '',
      deadline: g ? g.deadline : '',
    };
  });
}

export function OnboardingWizard({
  user,
  onSaveStep,
}: {
  user: BudgetUser;
  onSaveStep: (updated: BudgetUser, finish?: boolean) => void;
}) {
  const [step, setStep] = useState<number>(Math.max(1, Math.min(5, user.onboardingStep)));
  const [errors, setErrors] = useState<string[]>([]);

  // Step 1
  const [city, setCity] = useState(user.profile.city);
  const [householdType, setHouseholdType] = useState<HouseholdType>(user.profile.householdType);
  const [dependentsCount, setDependentsCount] = useState(String(user.profile.dependentsCount));
  const [housingType, setHousingType] = useState<HousingType>(user.profile.housingType);
  const [employmentType, setEmploymentType] = useState<EmploymentType>(user.profile.employmentType);

  // Step 2
  const [incomeAmount, setIncomeAmount] = useState(koboToInputValue(user.income.amountKobo));
  const [incomeFreq, setIncomeFreq] = useState<IncomeFrequency>(user.income.frequency);
  const [nextPayDate, setNextPayDate] = useState(user.income.nextPayDate || todayLagosISO());

  // Step 3
  const [costDrafts, setCostDrafts] = useState<CostRowDraft[]>(() =>
    buildInitialCostDrafts(user.costs),
  );

  // Step 4
  const [emergencyMonths, setEmergencyMonths] = useState(String(user.profile.emergencyMonths));
  const [emergencySaved, setEmergencySaved] = useState(
    koboToInputValue(user.profile.emergencySavingsKobo),
  );
  const [festiveEnabled, setFestiveEnabled] = useState(user.profile.festiveFundEnabled);
  const [goalDrafts, setGoalDrafts] = useState<GoalDraft[]>(() =>
    buildInitialGoalDrafts(user.goals),
  );

  // Step 5
  const [mode, setMode] = useState<PlanMode>(user.profile.mode);
  const [savingsRatePct, setSavingsRatePct] = useState(String(user.profile.savingsRatePct));

  function goBack() {
    setErrors([]);
    setStep((prev) => Math.max(1, prev - 1));
  }

  function handleStep1(e: FormEvent) {
    e.preventDefault();
    const errs: string[] = [];
    const deps = Number(dependentsCount);
    if (!Number.isInteger(deps) || deps < 0 || deps > 30) {
      errs.push('Number of dependents must be a whole number between 0 and 30.');
    }
    if (errs.length > 0) {
      setErrors(errs);
      return;
    }
    setErrors([]);
    const updated: BudgetUser = {
      ...user,
      onboardingStep: Math.max(user.onboardingStep, 2),
      profile: {
        ...user.profile,
        city: city.trim(),
        householdType,
        dependentsCount: deps,
        housingType,
        employmentType,
      },
    };
    onSaveStep(updated);
    setStep(2);
  }

  function handleStep2(e: FormEvent) {
    e.preventDefault();
    const errs: string[] = [];
    let amountKobo = 0;
    try {
      amountKobo = parseNaira(incomeAmount);
      if (amountKobo <= 0) {
        errs.push('Income amount must be greater than ₦0.');
      }
    } catch (err) {
      errs.push(err instanceof Error ? err.message : 'Please enter a valid income amount.');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(nextPayDate)) {
      errs.push('Please select your next payday.');
    }
    if (errs.length > 0) {
      setErrors(errs);
      return;
    }
    setErrors([]);
    const updated: BudgetUser = {
      ...user,
      onboardingStep: Math.max(user.onboardingStep, 3),
      income: {
        label: 'Primary income',
        amountKobo,
        frequency: incomeFreq,
        nextPayDate,
      },
    };
    onSaveStep(updated);
    setStep(3);
  }

  function handleStep3(e: FormEvent) {
    e.preventDefault();
    const errs: string[] = [];
    const parsedCosts: FixedCostItem[] = [];

    costDrafts.forEach((row) => {
      if (!row.amount.trim()) return;
      try {
        const kobo = parseNaira(row.amount);
        let dueMonth: number | null = null;
        if (row.dueMonth.trim()) {
          const dm = Number(row.dueMonth.trim());
          if (!Number.isInteger(dm) || dm < 1 || dm > 12) {
            errs.push(`${row.label}: due month must be between 1 and 12.`);
            return;
          }
          dueMonth = dm;
        }
        if (kobo > 0) {
          parsedCosts.push({
            id: `cost-${row.category}`,
            category: row.category,
            label: row.label,
            amountKobo: kobo,
            frequency: row.frequency,
            dueMonth,
          });
        }
      } catch (err) {
        errs.push(`${row.label}: ${err instanceof Error ? err.message : 'Invalid amount.'}`);
      }
    });

    if (errs.length > 0) {
      setErrors(errs);
      return;
    }
    setErrors([]);
    const updated: BudgetUser = {
      ...user,
      onboardingStep: Math.max(user.onboardingStep, 4),
      costs: parsedCosts,
    };
    onSaveStep(updated);
    setStep(4);
  }

  function handleStep4(e: FormEvent) {
    e.preventDefault();
    const errs: string[] = [];
    const emMonths = Number(emergencyMonths);
    if (!Number.isInteger(emMonths) || emMonths < 1 || emMonths > 12) {
      errs.push('Emergency fund months must be between 1 and 12.');
    }

    let emSavedKobo = 0;
    if (emergencySaved.trim()) {
      try {
        emSavedKobo = parseNaira(emergencySaved);
      } catch (err) {
        errs.push(
          `Emergency saved: ${err instanceof Error ? err.message : 'Enter a valid Naira amount.'}`,
        );
      }
    }

    const parsedGoals: GoalItem[] = [];
    goalDrafts.forEach((g, idx) => {
      const hasAny = g.name.trim() || g.target.trim() || g.deadline.trim();
      if (!hasAny) return;
      if (!g.name.trim()) {
        errs.push(`Goal ${idx + 1}: please enter a goal name.`);
        return;
      }
      let targetKobo = 0;
      try {
        targetKobo = parseNaira(g.target);
        if (targetKobo <= 0) {
          errs.push(`${g.name}: target must be greater than ₦0.`);
          return;
        }
      } catch (err) {
        errs.push(`${g.name} target: ${err instanceof Error ? err.message : 'Invalid amount.'}`);
        return;
      }
      let savedKobo = 0;
      if (g.saved.trim()) {
        try {
          savedKobo = parseNaira(g.saved);
        } catch (err) {
          errs.push(`${g.name} saved: ${err instanceof Error ? err.message : 'Invalid amount.'}`);
          return;
        }
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(g.deadline)) {
        errs.push(`${g.name}: please choose a deadline date.`);
        return;
      }
      parsedGoals.push({
        id: `goal-${idx + 1}-${Date.now()}`,
        name: g.name.trim(),
        targetKobo,
        savedKobo,
        deadline: g.deadline,
      });
    });

    if (errs.length > 0) {
      setErrors(errs);
      return;
    }
    setErrors([]);
    const updated: BudgetUser = {
      ...user,
      onboardingStep: Math.max(user.onboardingStep, 5),
      profile: {
        ...user.profile,
        emergencyMonths: emMonths,
        emergencySavingsKobo: emSavedKobo,
        festiveFundEnabled: festiveEnabled,
      },
      goals: parsedGoals,
    };
    onSaveStep(updated);
    setStep(5);
  }

  function handleStep5(e: FormEvent) {
    e.preventDefault();
    const rate = Number(savingsRatePct);
    const cleanRate = Number.isFinite(rate) ? Math.max(0, Math.min(80, Math.trunc(rate))) : 10;
    setErrors([]);
    const updated: BudgetUser = {
      ...user,
      onboardingStep: 5,
      onboardingDone: true,
      profile: {
        ...user.profile,
        mode,
        savingsRatePct: cleanRate,
      },
    };
    onSaveStep(updated, true);
  }

  const progressPct = Math.round((step / 5) * 100);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="rounded-[14px] border border-[#E1E8E4] bg-white p-6 shadow-xs">
        <div className="mb-1 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#5A6B64]">
          <span>Step {step} of 5</span>
          <span>{progressPct}%</span>
        </div>
        <progress
          value={step}
          max={5}
          aria-label={`Onboarding progress: step ${step} of 5`}
          className="h-3 w-full overflow-hidden rounded-full accent-[#0E7C66]"
        />

        {errors.length > 0 && (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-[#F4C2C2] bg-[#FDECEC] p-3.5 text-sm text-[#9B1C1C]">
            <ul className="list-disc pl-5">
              {errors.map((err) => (
                <li key={err}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        {step === 1 && (
          <form onSubmit={handleStep1} className="mt-6 space-y-4">
            <div>
              <h1 className="text-2xl font-extrabold text-[#12201B]">About you</h1>
              <p className="mt-1 text-sm text-[#5A6B64]">
                Help us understand your household so your plan fits your reality.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="ob-city" className="mb-1 block text-sm font-semibold">
                  City or town
                </label>
                <input
                  id="ob-city"
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="For example: Lagos, Abuja, or Ibadan"
                  className="min-h-12 w-full rounded-xl border border-[#C9D5CF] px-3 py-2.5 text-sm"
                />
              </div>

              <div>
                <label htmlFor="ob-household" className="mb-1 block text-sm font-semibold">
                  Household type
                </label>
                <select
                  id="ob-household"
                  value={householdType}
                  onChange={(e) => setHouseholdType(e.target.value as HouseholdType)}
                  className="min-h-12 w-full rounded-xl border border-[#C9D5CF] bg-white px-3 py-2.5 text-sm">
                  <option value="alone">Alone</option>
                  <option value="partner">Partner</option>
                  <option value="family">Family</option>
                  <option value="roommates">Roommates</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="ob-deps" className="mb-1 block text-sm font-semibold">
                  Number of dependents
                </label>
                <input
                  id="ob-deps"
                  type="number"
                  min={0}
                  max={30}
                  value={dependentsCount}
                  onChange={(e) => setDependentsCount(e.target.value)}
                  className="min-h-12 w-full rounded-xl border border-[#C9D5CF] px-3 py-2.5 text-sm"
                />
              </div>

              <div>
                <label htmlFor="ob-housing" className="mb-1 block text-sm font-semibold">
                  Housing type
                </label>
                <select
                  id="ob-housing"
                  value={housingType}
                  onChange={(e) => setHousingType(e.target.value as HousingType)}
                  className="min-h-12 w-full rounded-xl border border-[#C9D5CF] bg-white px-3 py-2.5 text-sm">
                  <option value="rent">Renting</option>
                  <option value="own">Own home</option>
                  <option value="family_house">Family house</option>
                  <option value="company_housing">Company housing</option>
                </select>
              </div>

              <div>
                <label htmlFor="ob-emp" className="mb-1 block text-sm font-semibold">
                  Employment type
                </label>
                <select
                  id="ob-emp"
                  value={employmentType}
                  onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}
                  className="min-h-12 w-full rounded-xl border border-[#C9D5CF] bg-white px-3 py-2.5 text-sm">
                  <option value="salary">Monthly salary</option>
                  <option value="corps_member">NYSC corps member</option>
                  <option value="student_allowance">Student allowance</option>
                  <option value="wages">Weekly / daily wages</option>
                  <option value="business_irregular">Irregular business</option>
                </select>
              </div>
            </div>

            {employmentType === 'business_irregular' && (
              <p className="rounded-xl border border-[#C3E6DC] bg-[#E8F5F1] p-3 text-xs text-[#0A5A4A]">
                Note: For irregular business income, version one plans using your average monthly
                take-home amount.
              </p>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="min-h-12 rounded-xl bg-[#0E7C66] px-6 py-3 text-sm font-bold text-white hover:bg-[#0A5A4A]">
                Next
              </button>
            </div>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleStep2} className="mt-6 space-y-4">
            <div>
              <h1 className="text-2xl font-extrabold text-[#12201B]">Income</h1>
              <p className="mt-1 text-sm text-[#5A6B64]">
                Enter your regular take-home pay in Naira and when your next payday lands.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="ob-inc-amt" className="mb-1 block text-sm font-semibold">
                  Amount (₦)
                </label>
                <input
                  id="ob-inc-amt"
                  type="text"
                  value={incomeAmount}
                  onChange={(e) => setIncomeAmount(e.target.value)}
                  placeholder="For example: 180,000"
                  className="min-h-12 w-full rounded-xl border border-[#C9D5CF] px-3 py-2.5 text-sm"
                />
              </div>

              <div>
                <label htmlFor="ob-inc-freq" className="mb-1 block text-sm font-semibold">
                  How often paid
                </label>
                <select
                  id="ob-inc-freq"
                  value={incomeFreq}
                  onChange={(e) => setIncomeFreq(e.target.value as IncomeFrequency)}
                  className="min-h-12 w-full rounded-xl border border-[#C9D5CF] bg-white px-3 py-2.5 text-sm">
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Every two weeks</option>
                </select>
              </div>

              <div>
                <label htmlFor="ob-pay-date" className="mb-1 block text-sm font-semibold">
                  Next pay date
                </label>
                <input
                  id="ob-pay-date"
                  type="date"
                  value={nextPayDate}
                  onChange={(e) => setNextPayDate(e.target.value)}
                  className="min-h-12 w-full rounded-xl border border-[#C9D5CF] px-3 py-2.5 text-sm"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={goBack}
                className="min-h-12 rounded-xl border border-[#C9D5CF] bg-white px-5 py-3 text-sm font-bold text-[#12201B] hover:bg-[#F5F7F4]">
                Back
              </button>
              <button
                type="submit"
                className="min-h-12 rounded-xl bg-[#0E7C66] px-6 py-3 text-sm font-bold text-white hover:bg-[#0A5A4A]">
                Next
              </button>
            </div>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handleStep3} className="mt-6 space-y-4">
            <div>
              <h1 className="text-2xl font-extrabold text-[#12201B]">What you must pay</h1>
              <p className="mt-1 text-sm text-[#5A6B64]">
                Enter your essential costs. Leave blank any item that does not apply to you.
              </p>
            </div>

            <div className="space-y-3">
              {costDrafts.map((row, idx) => (
                <div
                  key={row.category}
                  className="grid gap-3 rounded-xl border border-[#E1E8E4] bg-[#F5F7F4] p-3.5 sm:grid-cols-12 sm:items-end">
                  <div className="sm:col-span-4">
                    <span className="block text-sm font-semibold text-[#12201B]">{row.label}</span>
                    <span className="text-xs text-[#5A6B64]">{row.hint}</span>
                  </div>

                  <div className="sm:col-span-4">
                    <label
                      htmlFor={`cost-amt-${idx}`}
                      className="mb-1 block text-xs font-semibold text-[#5A6B64]">
                      Amount (₦)
                    </label>
                    <input
                      id={`cost-amt-${idx}`}
                      type="text"
                      value={row.amount}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCostDrafts((prev) =>
                          prev.map((item, i) => (i === idx ? {...item, amount: val} : item)),
                        );
                      }}
                      placeholder={row.hint}
                      className="min-h-12 w-full rounded-xl border border-[#C9D5CF] bg-white px-3 py-2 text-sm"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label
                      htmlFor={`cost-freq-${idx}`}
                      className="mb-1 block text-xs font-semibold text-[#5A6B64]">
                      Frequency
                    </label>
                    {row.category === 'rent' ? (
                      <select
                        id={`cost-freq-${idx}`}
                        value={row.frequency === 'yearly' ? 'yearly' : 'monthly'}
                        onChange={(e) => {
                          const val = e.target.value as CostFrequency;
                          setCostDrafts((prev) =>
                            prev.map((item, i) => (i === idx ? {...item, frequency: val} : item)),
                          );
                        }}
                        className="min-h-12 w-full rounded-xl border border-[#C9D5CF] bg-white px-2.5 py-2 text-sm">
                        <option value="yearly">Yearly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    ) : (
                      <select
                        id={`cost-freq-${idx}`}
                        value={row.frequency}
                        onChange={(e) => {
                          const val = e.target.value as CostFrequency;
                          setCostDrafts((prev) =>
                            prev.map((item, i) => (i === idx ? {...item, frequency: val} : item)),
                          );
                        }}
                        className="min-h-12 w-full rounded-xl border border-[#C9D5CF] bg-white px-2.5 py-2 text-sm">
                        <option value="monthly">Monthly</option>
                        <option value="termly">Per term</option>
                        <option value="yearly">Yearly</option>
                        <option value="weekly">Weekly</option>
                      </select>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <label
                      htmlFor={`cost-due-${idx}`}
                      className="mb-1 block text-xs font-semibold text-[#5A6B64]">
                      Due month
                    </label>
                    <input
                      id={`cost-due-${idx}`}
                      type="number"
                      min={1}
                      max={12}
                      placeholder="1–12"
                      value={row.dueMonth}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCostDrafts((prev) =>
                          prev.map((item, i) => (i === idx ? {...item, dueMonth: val} : item)),
                        );
                      }}
                      className="min-h-12 w-full rounded-xl border border-[#C9D5CF] bg-white px-2.5 py-2 text-sm"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={goBack}
                className="min-h-12 rounded-xl border border-[#C9D5CF] bg-white px-5 py-3 text-sm font-bold text-[#12201B] hover:bg-[#F5F7F4]">
                Back
              </button>
              <button
                type="submit"
                className="min-h-12 rounded-xl bg-[#0E7C66] px-6 py-3 text-sm font-bold text-white hover:bg-[#0A5A4A]">
                Next
              </button>
            </div>
          </form>
        )}

        {step === 4 && (
          <form onSubmit={handleStep4} className="mt-6 space-y-4">
            <div>
              <h1 className="text-2xl font-extrabold text-[#12201B]">Goals</h1>
              <p className="mt-1 text-sm text-[#5A6B64]">
                Set your emergency fund cushion and up to 3 personal savings goals.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="ob-em-months" className="mb-1 block text-sm font-semibold">
                  Emergency fund months
                </label>
                <input
                  id="ob-em-months"
                  type="number"
                  min={1}
                  max={12}
                  value={emergencyMonths}
                  onChange={(e) => setEmergencyMonths(e.target.value)}
                  className="min-h-12 w-full rounded-xl border border-[#C9D5CF] px-3 py-2.5 text-sm"
                />
                <span className="mt-1 block text-xs text-[#5A6B64]">
                  For example: 3 months of essential costs.
                </span>
              </div>

              <div>
                <label htmlFor="ob-em-saved" className="mb-1 block text-sm font-semibold">
                  Emergency amount already saved (₦)
                </label>
                <input
                  id="ob-em-saved"
                  type="text"
                  value={emergencySaved}
                  onChange={(e) => setEmergencySaved(e.target.value)}
                  placeholder="For example: 50,000"
                  className="min-h-12 w-full rounded-xl border border-[#C9D5CF] px-3 py-2.5 text-sm"
                />
              </div>
            </div>

            <label className="flex min-h-12 cursor-pointer items-center gap-2.5 text-sm font-medium text-[#12201B]">
              <input
                type="checkbox"
                checked={festiveEnabled}
                onChange={(e) => setFestiveEnabled(e.target.checked)}
                className="h-5 w-5 accent-[#0E7C66]"
              />
              <span>Set aside 3% monthly for December &amp; festive expenses</span>
            </label>

            <div className="space-y-3 pt-2">
              <h2 className="text-base font-bold text-[#12201B]">Savings goals (up to 3, optional)</h2>
              {goalDrafts.map((g, idx) => (
                <div
                  key={idx}
                  className="grid gap-3 rounded-xl border border-[#E1E8E4] bg-[#F5F7F4] p-3.5 sm:grid-cols-4">
                  <div>
                    <label
                      htmlFor={`goal-name-${idx}`}
                      className="mb-1 block text-xs font-semibold text-[#5A6B64]">
                      Goal {idx + 1} name
                    </label>
                    <input
                      id={`goal-name-${idx}`}
                      type="text"
                      value={g.name}
                      onChange={(e) => {
                        const val = e.target.value;
                        setGoalDrafts((prev) =>
                          prev.map((item, i) => (i === idx ? {...item, name: val} : item)),
                        );
                      }}
                      placeholder="For example: Solar power"
                      className="min-h-12 w-full rounded-xl border border-[#C9D5CF] bg-white px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`goal-target-${idx}`}
                      className="mb-1 block text-xs font-semibold text-[#5A6B64]">
                      Target (₦)
                    </label>
                    <input
                      id={`goal-target-${idx}`}
                      type="text"
                      value={g.target}
                      onChange={(e) => {
                        const val = e.target.value;
                        setGoalDrafts((prev) =>
                          prev.map((item, i) => (i === idx ? {...item, target: val} : item)),
                        );
                      }}
                      placeholder="For example: 300,000"
                      className="min-h-12 w-full rounded-xl border border-[#C9D5CF] bg-white px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`goal-saved-${idx}`}
                      className="mb-1 block text-xs font-semibold text-[#5A6B64]">
                      Saved so far (₦)
                    </label>
                    <input
                      id={`goal-saved-${idx}`}
                      type="text"
                      value={g.saved}
                      onChange={(e) => {
                        const val = e.target.value;
                        setGoalDrafts((prev) =>
                          prev.map((item, i) => (i === idx ? {...item, saved: val} : item)),
                        );
                      }}
                      placeholder="For example: 40,000"
                      className="min-h-12 w-full rounded-xl border border-[#C9D5CF] bg-white px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`goal-deadline-${idx}`}
                      className="mb-1 block text-xs font-semibold text-[#5A6B64]">
                      Deadline
                    </label>
                    <input
                      id={`goal-deadline-${idx}`}
                      type="date"
                      value={g.deadline}
                      onChange={(e) => {
                        const val = e.target.value;
                        setGoalDrafts((prev) =>
                          prev.map((item, i) => (i === idx ? {...item, deadline: val} : item)),
                        );
                      }}
                      className="min-h-12 w-full rounded-xl border border-[#C9D5CF] bg-white px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={goBack}
                className="min-h-12 rounded-xl border border-[#C9D5CF] bg-white px-5 py-3 text-sm font-bold text-[#12201B] hover:bg-[#F5F7F4]">
                Back
              </button>
              <button
                type="submit"
                className="min-h-12 rounded-xl bg-[#0E7C66] px-6 py-3 text-sm font-bold text-white hover:bg-[#0A5A4A]">
                Next
              </button>
            </div>
          </form>
        )}

        {step === 5 && (
          <form onSubmit={handleStep5} className="mt-6 space-y-4">
            <div>
              <h1 className="text-2xl font-extrabold text-[#12201B]">Choose a mode</h1>
              <p className="mt-1 text-sm text-[#5A6B64]">
                Pick how you want Budget Buddy to guide your month.
              </p>
            </div>

            <label className="flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border border-[#E1E8E4] p-4 hover:bg-[#F5F7F4]">
              <input
                type="radio"
                name="ob-mode"
                checked={mode === 'planner'}
                onChange={() => setMode('planner')}
                className="mt-1 h-5 w-5 accent-[#0E7C66]"
              />
              <span>
                <strong className="block text-sm font-bold text-[#12201B]">Build my plan</strong>
                <span className="text-sm text-[#5A6B64]">
                  Full needs-first monthly budget, emergency &amp; goal allocations, and category
                  allowances.
                </span>
              </span>
            </label>

            <label className="flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border border-[#E1E8E4] p-4 hover:bg-[#F5F7F4]">
              <input
                type="radio"
                name="ob-mode"
                checked={mode === 'log_only'}
                onChange={() => setMode('log_only')}
                className="mt-1 h-5 w-5 accent-[#0E7C66]"
              />
              <span>
                <strong className="block text-sm font-bold text-[#12201B]">
                  Just track my spending
                </strong>
                <span className="text-sm text-[#5A6B64]">
                  Subtract your bills and a fixed savings rate, then track your daily spending
                  against the rest.
                </span>
              </span>
            </label>

            {mode === 'log_only' && (
              <div>
                <label htmlFor="ob-sav-rate" className="mb-1 block text-sm font-semibold">
                  Savings percentage (%)
                </label>
                <input
                  id="ob-sav-rate"
                  type="number"
                  min={0}
                  max={80}
                  value={savingsRatePct}
                  onChange={(e) => setSavingsRatePct(e.target.value)}
                  className="min-h-12 w-full max-w-xs rounded-xl border border-[#C9D5CF] px-3 py-2.5 text-sm"
                />
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={goBack}
                className="min-h-12 rounded-xl border border-[#C9D5CF] bg-white px-5 py-3 text-sm font-bold text-[#12201B] hover:bg-[#F5F7F4]">
                Back
              </button>
              <button
                type="submit"
                className="min-h-12 rounded-xl bg-[#0E7C66] px-6 py-3 text-sm font-bold text-white hover:bg-[#0A5A4A]">
                Finish &amp; open Dashboard
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
