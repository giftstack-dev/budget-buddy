import type {
  BudgetUser,
  CostCategory,
  CostFrequency,
  ExpenseCategory,
  IncomeFrequency,
} from './types';

export const CATEGORY_LABELS: Record<string, string> = {
  rent: 'Rent & housing',
  food: 'Food',
  transport: 'Transport',
  data_airtime: 'Data & airtime',
  utilities: 'Utilities',
  household: 'Home supplies',
  health: 'Health',
  school_fees: 'School fees',
  family_support: 'Family support',
  debt_payments: 'Loan payments',
  giving: 'Giving',
  insurance_subscriptions: 'Insurance & subscriptions',
  eating_out: 'Eating out',
  entertainment: 'Entertainment',
  personal_care: 'Personal care',
  clothing_shopping: 'Clothing',
  gifts: 'Gifts',
  other: 'Other spending',
  no_spend: 'No spending today',
  buffer: 'Cushion for surprises',
  emergency_fund: 'Emergency savings (for surprises)',
  festive_fund: 'December & festive savings',
};

export const VARIABLE_CATEGORIES: ExpenseCategory[] = [
  'food',
  'transport',
  'data_airtime',
  'household',
  'health',
  'eating_out',
  'entertainment',
  'personal_care',
  'clothing_shopping',
  'gifts',
  'other',
];

const ESSENTIAL_CATEGORIES = new Set<string>(['food', 'rent', 'health', 'school_fees']);

const DEFAULT_WANTS_WEIGHTS: Record<string, number> = {
  eating_out: 30,
  entertainment: 20,
  personal_care: 20,
  clothing_shopping: 20,
  gifts: 10,
};

export function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category;
}

export function todayLagosISO(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Lagos',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === 'year')?.value ?? '2026';
  const m = parts.find((p) => p.type === 'month')?.value ?? '01';
  const d = parts.find((p) => p.type === 'day')?.value ?? '01';
  return `${y}-${m}-${d}`;
}

export function parseNaira(raw: string): number {
  const cleaned = raw.trim().replace(/^₦\s*/, '');
  if (!cleaned) {
    throw new Error('Please enter an amount in Naira, for example 250,000.');
  }
  if (cleaned.startsWith('-')) {
    throw new Error('Amount cannot be negative.');
  }
  if (!/^(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?$/.test(cleaned)) {
    throw new Error('Please enter a valid Naira amount like 250,000 or 1,250.50.');
  }
  const plain = cleaned.replace(/,/g, '');
  const [nairaPart, koboPart = ''] = plain.split('.');
  const paddedKobo = (koboPart + '00').slice(0, 2);
  return Number(nairaPart) * 100 + Number(paddedKobo);
}

export function formatNaira(kobo: number): string {
  const value = Math.trunc(kobo);
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  const naira = Math.floor(abs / 100);
  const rem = abs % 100;
  const formattedNaira = naira.toLocaleString('en-NG');
  if (rem === 0) {
    return `${sign}₦${formattedNaira}`;
  }
  return `${sign}₦${formattedNaira}.${String(rem).padStart(2, '0')}`;
}

export function koboToInputValue(kobo: number): string {
  if (kobo <= 0) return '';
  const naira = Math.floor(kobo / 100);
  const rem = kobo % 100;
  if (rem === 0) return naira.toLocaleString('en-NG');
  return `${naira.toLocaleString('en-NG')}.${String(rem).padStart(2, '0')}`;
}

export function normalizeToMonthlyKobo(
  amountKobo: number,
  frequency: IncomeFrequency | CostFrequency,
): number {
  if (frequency === 'monthly') return amountKobo;
  if (frequency === 'weekly') return Math.floor((amountKobo * 52 + 6) / 12);
  if (frequency === 'biweekly') return Math.floor((amountKobo * 26 + 6) / 12);
  if (frequency === 'yearly') return Math.floor((amountKobo + 6) / 12);
  return Math.floor((amountKobo * 3 + 6) / 12); // termly
}

export function scaleMonthlyToCycleKobo(monthlyKobo: number, frequency: IncomeFrequency): number {
  if (frequency === 'monthly') return monthlyKobo;
  if (frequency === 'weekly') return Math.floor((monthlyKobo * 12 + 26) / 52);
  return Math.floor((monthlyKobo * 12 + 13) / 26);
}

export function allocateLargestRemainder(
  total: number,
  weightMap: Record<string, number>,
): Record<string, number> {
  const keys = Object.keys(weightMap);
  if (keys.length === 0) return {};
  if (total <= 0) {
    return Object.fromEntries(keys.map((k) => [k, 0]));
  }
  const weights = keys.map((k) => Math.max(0, Math.trunc(weightMap[k])));
  const rawSum = weights.reduce((a, b) => a + b, 0);
  const effective = rawSum === 0 ? weights.map(() => 1) : weights;
  const effectiveSum = effective.reduce((a, b) => a + b, 0);

  const bases = effective.map((w) => Math.floor((total * w) / effectiveSum));
  const rems = effective.map((w, idx) => ({rem: (total * w) % effectiveSum, idx}));
  const leftover = total - bases.reduce((a, b) => a + b, 0);
  rems.sort((a, b) => b.rem - a.rem || a.idx - b.idx);
  for (let i = 0; i < leftover; i += 1) {
    bases[rems[i].idx] += 1;
  }
  return Object.fromEntries(keys.map((k, i) => [k, bases[i]]));
}

function pctRoundHalfUp(amountKobo: number, pct: number): number {
  return Math.floor((amountKobo * pct + 50) / 100);
}

function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1));
}

function toISODate(dt: Date): string {
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dt.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDaysISO(iso: string, days: number): string {
  const dt = parseISODate(iso);
  dt.setUTCDate(dt.getUTCDate() + days);
  return toISODate(dt);
}

export function addMonthsISO(iso: string, months: number, anchorDay?: number): string {
  const dt = parseISODate(iso);
  const targetDay = anchorDay ?? dt.getUTCDate();
  const totalMonths = dt.getUTCFullYear() * 12 + dt.getUTCMonth() + months;
  const newYear = Math.floor(totalMonths / 12);
  const newMonth = ((totalMonths % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(newYear, newMonth + 1, 0)).getUTCDate();
  return toISODate(new Date(Date.UTC(newYear, newMonth, Math.min(targetDay, lastDay))));
}

function daysBetweenISO(startIso: string, endIso: string): number {
  const ms = parseISODate(endIso).getTime() - parseISODate(startIso).getTime();
  return Math.round(ms / 86_400_000);
}

function monthsBetweenISO(startIso: string, endIso: string): number {
  const s = parseISODate(startIso);
  const e = parseISODate(endIso);
  const diff = (e.getUTCFullYear() - s.getUTCFullYear()) * 12 + (e.getUTCMonth() - s.getUTCMonth());
  return Math.max(1, diff);
}

export interface PlanLineItem {
  category: string;
  label: string;
  group: 'needs' | 'savings' | 'wants' | 'buffer';
  amountKobo: number;
  note: string;
}

export interface GoalProjection {
  id: string;
  name: string;
  targetKobo: number;
  savedKobo: number;
  deadline: string;
  monthlyNeededKobo: number;
  allocatedKobo: number;
  onTrack: boolean;
  estimatedCompletion: string | null;
}

export interface ComputedPlan {
  status: 'BALANCED' | 'TIGHT' | 'DEFICIT';
  statusMessage: string;
  incomeMonthlyKobo: number;
  needsTotalKobo: number;
  savingsTotalKobo: number;
  wantsTotalKobo: number;
  bufferKobo: number;
  emergencyTargetKobo: number;
  emergencyContributionKobo: number;
  festiveContributionKobo: number;
  deficitKobo: number;
  monthlyVariablePoolKobo: number;
  items: PlanLineItem[];
  goalResults: GoalProjection[];
  suggestions: string[];
  categoryAllowances: Record<string, number>;
}

export function computePlanForUser(user: BudgetUser, asOfISO = todayLagosISO()): ComputedPlan {
  const incomeMonthly = normalizeToMonthlyKobo(user.income.amountKobo, user.income.frequency);
  const items: PlanLineItem[] = [];
  const categoryAllowances: Record<string, number> = {};

  const needEntries = user.costs
    .filter((c) => c.amountKobo > 0)
    .map((c) => {
      const monthly = normalizeToMonthlyKobo(c.amountKobo, c.frequency);
      const note =
        c.frequency === 'yearly'
          ? `Set aside each month for yearly ${c.label.toLowerCase()}`
          : c.frequency === 'termly'
            ? `Spread evenly for each term's ${c.label.toLowerCase()}`
            : c.frequency === 'weekly'
              ? `Monthly total for weekly ${c.label.toLowerCase()}`
              : `Essential bill each month`;
      items.push({
        category: c.category,
        label: c.label || categoryLabel(c.category),
        group: 'needs',
        amountKobo: monthly,
        note,
      });
      categoryAllowances[c.category] = (categoryAllowances[c.category] ?? 0) + monthly;
      return {cost: c, monthly};
    });

  const needsTotal = needEntries.reduce((acc, row) => acc + row.monthly, 0);
  const emergencyTarget = Math.max(0, user.profile.emergencyMonths) * needsTotal;

  if (needsTotal > incomeMonthly) {
    const deficit = needsTotal - incomeMonthly;
    const flexible = needEntries
      .filter((e) => !ESSENTIAL_CATEGORIES.has(e.cost.category))
      .sort((a, b) => b.monthly - a.monthly);
    const chosen = flexible.slice(0, 3);
    if (chosen.length < 3) {
      const used = new Set(chosen.map((c) => c.cost.id));
      const rest = needEntries
        .filter((e) => !used.has(e.cost.id))
        .sort((a, b) => b.monthly - a.monthly);
      chosen.push(...rest.slice(0, 3 - chosen.length));
    }
    const suggestions = chosen.map(
      (c) => `Take another look at ${c.cost.label || categoryLabel(c.cost.category)} (${formatNaira(c.monthly)} a month).`,
    );
    const variablePool = Object.entries(categoryAllowances)
      .filter(([cat]) => VARIABLE_CATEGORIES.includes(cat as ExpenseCategory))
      .reduce((acc, [, amt]) => acc + amt, 0);

    return {
      status: 'DEFICIT',
      statusMessage: `Your bills are ${formatNaira(deficit)} more than your income. You need ${formatNaira(needsTotal)} a month to cover everything.`,
      incomeMonthlyKobo: incomeMonthly,
      needsTotalKobo: needsTotal,
      savingsTotalKobo: 0,
      wantsTotalKobo: 0,
      bufferKobo: 0,
      emergencyTargetKobo: emergencyTarget,
      emergencyContributionKobo: 0,
      festiveContributionKobo: 0,
      deficitKobo: deficit,
      monthlyVariablePoolKobo: variablePool,
      items,
      goalResults: user.goals.map((g) => ({
        id: g.id,
        name: g.name,
        targetKobo: g.targetKobo,
        savedKobo: g.savedKobo,
        deadline: g.deadline,
        monthlyNeededKobo: Math.ceil(
          Math.max(0, g.targetKobo - g.savedKobo) / monthsBetweenISO(asOfISO, g.deadline),
        ),
        allocatedKobo: 0,
        onTrack: g.savedKobo >= g.targetKobo,
        estimatedCompletion: g.savedKobo >= g.targetKobo ? asOfISO : null,
      })),
      suggestions,
      categoryAllowances,
    };
  }

  const leftover = incomeMonthly - needsTotal;
  const bufferKobo = Math.min(leftover, pctRoundHalfUp(incomeMonthly, 5));
  let remaining = leftover - bufferKobo;
  if (bufferKobo > 0) {
    items.push({
      category: 'buffer',
      label: 'Cushion for surprises',
      group: 'buffer',
      amountKobo: bufferKobo,
      note: 'A 5% cushion for unexpected small things',
    });
  }

  const emergencyGap = Math.max(0, emergencyTarget - Math.max(0, user.profile.emergencySavingsKobo));
  const emergencyContrib = Math.min(emergencyGap, pctRoundHalfUp(incomeMonthly, 10), remaining);
  remaining -= emergencyContrib;
  if (emergencyContrib > 0) {
    items.push({
      category: 'emergency_fund',
      label: 'Emergency savings (for surprises)',
      group: 'savings',
      amountKobo: emergencyContrib,
      note: `Building up to ${user.profile.emergencyMonths} months of your bills`,
    });
  }

  let festiveContrib = 0;
  if (user.profile.festiveFundEnabled && remaining > 0) {
    festiveContrib = Math.min(pctRoundHalfUp(incomeMonthly, 3), remaining);
    remaining -= festiveContrib;
    if (festiveContrib > 0) {
      items.push({
        category: 'festive_fund',
        label: 'December & festive savings',
        group: 'savings',
        amountKobo: festiveContrib,
        note: '3% put aside every month for December celebrations',
      });
    }
  }

  const wantsFloor = pctRoundHalfUp(leftover, 15);
  let availableForGoals = Math.max(0, remaining - wantsFloor);
  let goalsTotalAllocated = 0;

  const sortedGoals = [...user.goals].sort((a, b) => a.deadline.localeCompare(b.deadline));
  const goalResults: GoalProjection[] = sortedGoals.map((goal) => {
    const goalRem = Math.max(0, goal.targetKobo - goal.savedKobo);
    const mRem = monthsBetweenISO(asOfISO, goal.deadline);
    if (goalRem === 0) {
      return {
        id: goal.id,
        name: goal.name,
        targetKobo: goal.targetKobo,
        savedKobo: goal.savedKobo,
        deadline: goal.deadline,
        monthlyNeededKobo: 0,
        allocatedKobo: 0,
        onTrack: true,
        estimatedCompletion: asOfISO,
      };
    }
    const monthlyNeeded = Math.ceil(goalRem / mRem);
    const allocated = Math.min(monthlyNeeded, availableForGoals);
    availableForGoals -= allocated;
    remaining -= allocated;
    goalsTotalAllocated += allocated;
    const onTrack = allocated >= monthlyNeeded;
    const estDate =
      allocated > 0 ? addMonthsISO(asOfISO, Math.ceil(goalRem / allocated)) : null;

    if (allocated > 0) {
      items.push({
        category: 'goal',
        label: `Goal: ${goal.name}`,
        group: 'savings',
        amountKobo: allocated,
        note: `Steady monthly step towards ${goal.name}`,
      });
    }
    return {
      id: goal.id,
      name: goal.name,
      targetKobo: goal.targetKobo,
      savedKobo: goal.savedKobo,
      deadline: goal.deadline,
      monthlyNeededKobo: monthlyNeeded,
      allocatedKobo: allocated,
      onTrack,
      estimatedCompletion: estDate,
    };
  });

  const wantsTotal = remaining;
  const wantsSplit = allocateLargestRemainder(wantsTotal, DEFAULT_WANTS_WEIGHTS);
  for (const [cat, amt] of Object.entries(wantsSplit)) {
    if (amt > 0 || wantsTotal === 0) {
      items.push({
        category: cat,
        label: categoryLabel(cat),
        group: 'wants',
        amountKobo: amt,
        note: 'Flexible money for things you enjoy',
      });
      categoryAllowances[cat] = (categoryAllowances[cat] ?? 0) + amt;
    }
  }

  const savingsTotal = emergencyContrib + festiveContrib + goalsTotalAllocated;
  const allGoalsOnTrack = goalResults.every((g) => g.onTrack);
  const status = wantsTotal >= wantsFloor && allGoalsOnTrack ? 'BALANCED' : 'TIGHT';
  const statusMessage =
    status === 'BALANCED'
      ? 'Your income covers the things you must pay, builds your savings, and leaves healthy daily spending money.'
      : 'Your bills are covered, though your enjoyment money or goals are a little tight this month.';

  const monthlyVariablePool = Object.entries(categoryAllowances)
    .filter(([cat]) => VARIABLE_CATEGORIES.includes(cat as ExpenseCategory))
    .reduce((acc, [, amt]) => acc + amt, 0);

  return {
    status,
    statusMessage,
    incomeMonthlyKobo: incomeMonthly,
    needsTotalKobo: needsTotal,
    savingsTotalKobo: savingsTotal,
    wantsTotalKobo: wantsTotal,
    bufferKobo,
    emergencyTargetKobo: emergencyTarget,
    emergencyContributionKobo: emergencyContrib,
    festiveContributionKobo: festiveContrib,
    deficitKobo: 0,
    monthlyVariablePoolKobo: monthlyVariablePool,
    items,
    goalResults,
    suggestions: [],
    categoryAllowances,
  };
}

export interface PayCycleInfo {
  start: string;
  end: string;
  nextPayDate: string;
  lengthDays: number;
  dayNumber: number;
}

export function getCycleForDate(
  targetISO: string,
  anchorPayISO: string,
  frequency: IncomeFrequency,
): PayCycleInfo {
  let start = anchorPayISO;
  let nextPay = anchorPayISO;

  if (frequency === 'weekly' || frequency === 'biweekly') {
    const step = frequency === 'weekly' ? 7 : 14;
    const delta = daysBetweenISO(anchorPayISO, targetISO);
    const idx = Math.floor(delta / step);
    start = addDaysISO(anchorPayISO, idx * step);
    nextPay = addDaysISO(start, step);
  } else {
    const anchorDt = parseISODate(anchorPayISO);
    const targetDt = parseISODate(targetISO);
    const anchorDay = anchorDt.getUTCDate();
    let offset =
      (targetDt.getUTCFullYear() - anchorDt.getUTCFullYear()) * 12 +
      (targetDt.getUTCMonth() - anchorDt.getUTCMonth());
    const cand = addMonthsISO(anchorPayISO, offset, anchorDay);
    if (cand > targetISO) {
      offset -= 1;
      start = addMonthsISO(anchorPayISO, offset, anchorDay);
    } else {
      start = cand;
    }
    nextPay = addMonthsISO(anchorPayISO, offset + 1, anchorDay);
  }

  const end = addDaysISO(nextPay, -1);
  return {
    start,
    end,
    nextPayDate: nextPay,
    lengthDays: daysBetweenISO(start, end) + 1,
    dayNumber: daysBetweenISO(start, targetISO) + 1,
  };
}

export interface TrackerSummary {
  cycle: PayCycleInfo;
  cyclePoolKobo: number;
  dailyAllowanceKobo: number;
  spentThisCycleKobo: number;
  remainingPoolKobo: number;
  daysLeftIncludingToday: number;
  daysToNextPayday: number;
  safeToSpendTodayKobo: number;
  categoryTotals: Record<string, number>;
}

export function computeTrackerForUser(
  user: BudgetUser,
  plan: ComputedPlan,
  todayISO = todayLagosISO(),
): TrackerSummary {
  const cycle = getCycleForDate(todayISO, user.income.nextPayDate, user.income.frequency);

  let monthlyPool = plan.monthlyVariablePoolKobo;
  if (user.profile.mode === 'log_only') {
    const savingsTarget = pctRoundHalfUp(plan.incomeMonthlyKobo, user.profile.savingsRatePct);
    monthlyPool = Math.max(0, plan.incomeMonthlyKobo - plan.needsTotalKobo - savingsTarget);
  }
  const cyclePool = scaleMonthlyToCycleKobo(monthlyPool, user.income.frequency);
  const dailyAllowance = Math.floor((cyclePool + Math.floor(cycle.lengthDays / 2)) / cycle.lengthDays);

  let spentThisCycle = 0;
  const categoryTotals: Record<string, number> = {};
  for (const exp of user.expenses) {
    if (exp.spentOn >= cycle.start && exp.spentOn <= cycle.end && exp.category !== 'no_spend') {
      if (
        user.profile.mode === 'log_only' ||
        VARIABLE_CATEGORIES.includes(exp.category as ExpenseCategory)
      ) {
        spentThisCycle += exp.amountKobo;
        categoryTotals[exp.category] = (categoryTotals[exp.category] ?? 0) + exp.amountKobo;
      }
    }
  }

  const daysLeft = Math.max(1, daysBetweenISO(todayISO, cycle.end) + 1);
  const daysToPayday = Math.max(0, daysBetweenISO(todayISO, cycle.nextPayDate));
  const remainingPool = Math.max(0, cyclePool - spentThisCycle);
  const safeToday = Math.floor(remainingPool / daysLeft);

  return {
    cycle,
    cyclePoolKobo: cyclePool,
    dailyAllowanceKobo: dailyAllowance,
    spentThisCycleKobo: spentThisCycle,
    remainingPoolKobo: remainingPool,
    daysLeftIncludingToday: daysLeft,
    daysToNextPayday: daysToPayday,
    safeToSpendTodayKobo: safeToday,
    categoryTotals,
  };
}

export interface ReviewEntry {
  id: string;
  kind: 'weekly' | 'monthly';
  periodStart: string;
  periodEnd: string;
  spentKobo: number;
  allowanceKobo: number;
  status: 'on_track' | 'close' | 'over' | 'low_data';
  daysLogged: number;
  message: string;
}

export function computeReviewsForUser(
  user: BudgetUser,
  plan: ComputedPlan,
  tracker: TrackerSummary,
  todayISO = todayLagosISO(),
): ReviewEntry[] {
  if (user.expenses.length === 0) {
    return [];
  }

  const sortedDates = [...user.expenses].map((e) => e.spentOn).sort();
  const earliest = sortedDates[0];

  const cycles: PayCycleInfo[] = [];
  let cursor = earliest;
  while (cycles.length < 12) {
    const cyc = getCycleForDate(cursor, user.income.nextPayDate, user.income.frequency);
    cycles.push(cyc);
    if (cyc.end >= todayISO) break;
    cursor = cyc.nextPayDate;
  }

  const results: ReviewEntry[] = [];
  for (const cyc of cycles) {
    let blockStart = cyc.start;
    while (blockStart <= cyc.end) {
      const rawEnd = addDaysISO(blockStart, 6);
      const blockEnd = rawEnd < cyc.end ? rawEnd : cyc.end;
      if (blockEnd >= todayISO) break;

      const blockDays = daysBetweenISO(blockStart, blockEnd) + 1;
      const allowance = Math.floor(
        (tracker.cyclePoolKobo * blockDays + Math.floor(cyc.lengthDays / 2)) / cyc.lengthDays,
      );
      const inBlock = user.expenses.filter(
        (e) => e.spentOn >= blockStart && e.spentOn <= blockEnd,
      );
      const loggedDays = new Set(inBlock.map((e) => e.spentOn)).size;
      const spent = inBlock
        .filter((e) => e.category !== 'no_spend')
        .reduce((acc, e) => acc + e.amountKobo, 0);

      let status: ReviewEntry['status'];
      let message: string;
      if (loggedDays < 3) {
        status = 'low_data';
        message = 'Log a few more days to get your first review.';
      } else if (allowance > 0 && spent * 100 < allowance * 90) {
        status = 'on_track';
        message = `Great job. You kept ${formatNaira(allowance - spent)} aside this week (${formatNaira(spent)} spent of ${formatNaira(allowance)}).`;
      } else if (spent <= allowance) {
        status = 'close';
        message = `You're close to what you can spend this week (${formatNaira(spent)} of ${formatNaira(allowance)}). Taking it gently for a couple of days keeps you on track.`;
      } else {
        status = 'over';
        message = `You went a bit over this week (${formatNaira(spent - allowance)} extra). Here's an easy way to adjust: trim one small treat next week or update your plan.`;
      }

      results.push({
        id: `weekly-${blockStart}`,
        kind: 'weekly',
        periodStart: blockStart,
        periodEnd: blockEnd,
        spentKobo: spent,
        allowanceKobo: allowance,
        status,
        daysLogged: loggedDays,
        message,
      });

      blockStart = addDaysISO(blockEnd, 1);
    }

    if (cyc.end < todayISO) {
      const cycSpent = user.expenses
        .filter((e) => e.spentOn >= cyc.start && e.spentOn <= cyc.end && e.category !== 'no_spend')
        .reduce((acc, e) => acc + e.amountKobo, 0);
      const diff = tracker.cyclePoolKobo - cycSpent;
      results.push({
        id: `monthly-${cyc.start}`,
        kind: 'monthly',
        periodStart: cyc.start,
        periodEnd: cyc.end,
        spentKobo: cycSpent,
        allowanceKobo: tracker.cyclePoolKobo,
        status: cycSpent <= tracker.cyclePoolKobo ? 'on_track' : 'over',
        daysLogged: new Set(
          user.expenses
            .filter((e) => e.spentOn >= cyc.start && e.spentOn <= cyc.end)
            .map((e) => e.spentOn),
        ).size,
        message:
          diff >= 0
            ? `Great job. You spent ${formatNaira(cycSpent)} of ${formatNaira(tracker.cyclePoolKobo)} this pay period and kept ${formatNaira(diff)} aside.`
            : `You went ${formatNaira(Math.abs(diff))} over what you could spend this pay period (${formatNaira(cycSpent)} spent of ${formatNaira(tracker.cyclePoolKobo)}). Here's an easy way to adjust next payday.`,
      });
    }
  }

  return results.sort((a, b) => b.periodEnd.localeCompare(a.periodEnd));
}

export interface YearMonthProjection {
  monthLabel: string;
  incomeKobo: number;
  needsKobo: number;
  savingsKobo: number;
  emergencyBalanceKobo: number;
  emergencyTargetKobo: number;
  sinkingFundBalanceKobo: number;
  markers: string[];
}

export function buildYearViewForUser(
  user: BudgetUser,
  plan: ComputedPlan,
  todayISO = todayLagosISO(),
): YearMonthProjection[] {
  const startMonthISO = `${todayISO.slice(0, 7)}-01`;
  const firstMonthNum = Number(todayISO.slice(5, 7));

  const sinkingCosts = user.costs.filter(
    (c) => c.amountKobo > 0 && (c.frequency === 'yearly' || c.frequency === 'termly'),
  );
  const monthlySinkingInflow = sinkingCosts.reduce(
    (acc, c) => acc + normalizeToMonthlyKobo(c.amountKobo, c.frequency),
    0,
  );

  let emergencyBalance = Math.max(0, user.profile.emergencySavingsKobo);
  let sinkingBalance = 0;
  const rows: YearMonthProjection[] = [];

  for (let i = 0; i < 12; i += 1) {
    const mISO = addMonthsISO(startMonthISO, i, 1);
    const dt = parseISODate(mISO);
    const monthNum = dt.getUTCMonth() + 1;
    const monthLabel = dt.toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    });

    if (plan.emergencyTargetKobo > 0) {
      emergencyBalance = Math.min(
        plan.emergencyTargetKobo,
        emergencyBalance + plan.emergencyContributionKobo,
      );
    }

    sinkingBalance += monthlySinkingInflow;
    const markers: string[] = [];
    for (const c of sinkingCosts) {
      const anchor = c.dueMonth ?? firstMonthNum;
      const isDue =
        c.frequency === 'yearly'
          ? monthNum === anchor
          : monthNum === anchor ||
            monthNum === ((anchor - 1 + 4) % 12) + 1 ||
            monthNum === ((anchor - 1 + 8) % 12) + 1;
      if (isDue) {
        markers.push(`${c.label || categoryLabel(c.category)} due (${formatNaira(c.amountKobo)})`);
        sinkingBalance = Math.max(0, sinkingBalance - c.amountKobo);
      }
    }

    for (const g of plan.goalResults) {
      if (g.estimatedCompletion && g.estimatedCompletion.slice(0, 7) === mISO.slice(0, 7)) {
        markers.push(`Goal ready: ${g.name}`);
      }
    }

    rows.push({
      monthLabel,
      incomeKobo: plan.incomeMonthlyKobo,
      needsKobo: plan.needsTotalKobo,
      savingsKobo: plan.savingsTotalKobo,
      emergencyBalanceKobo: emergencyBalance,
      emergencyTargetKobo: plan.emergencyTargetKobo,
      sinkingFundBalanceKobo: sinkingBalance,
      markers,
    });
  }

  return rows;
}

export function simulateWhatIf(
  user: BudgetUser,
  scenario: 'income_drop' | 'rent_rise' | 'add_dependent' | 'add_loan',
  value: number,
): {description: string; before: ComputedPlan; after: ComputedPlan} {
  const before = computePlanForUser(user);
  let modified: BudgetUser = user;
  let description = '';

  if (scenario === 'income_drop') {
    const pct = Math.max(0, Math.min(100, value));
    modified = {
      ...user,
      income: {
        ...user.income,
        amountKobo: Math.floor((user.income.amountKobo * (100 - pct) + 50) / 100),
      },
    };
    description = `If income falls by ${pct}%`;
  } else if (scenario === 'rent_rise') {
    modified = {
      ...user,
      costs: user.costs.map((c) =>
        c.category === ('rent' as CostCategory)
          ? {...c, amountKobo: Math.floor((c.amountKobo * (100 + value) + 50) / 100)}
          : c,
      ),
    };
    description = `If rent rises by ${value}%`;
  } else if (scenario === 'add_dependent') {
    modified = {
      ...user,
      costs: [
        ...user.costs,
        {
          id: 'whatif-dep',
          category: 'family_support',
          label: 'New dependent cost',
          amountKobo: value,
          frequency: 'monthly',
          dueMonth: null,
        },
      ],
    };
    description = `If you add a dependent costing ${formatNaira(value)}/month`;
  } else {
    modified = {
      ...user,
      costs: [
        ...user.costs,
        {
          id: 'whatif-loan',
          category: 'debt_payments',
          label: 'New loan payment',
          amountKobo: value,
          frequency: 'monthly',
          dueMonth: null,
        },
      ],
    };
    description = `If you add a loan payment of ${formatNaira(value)}/month`;
  }

  return {
    description,
    before,
    after: computePlanForUser(modified),
  };
}
