"""Needs-first monthly waterfall planner (pure functions, integer kobo)."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date

from app.config import today_lagos
from app.engine.allocate import allocate_dict
from app.engine.normalize import (
    DEFAULT_WANTS_WEIGHTS,
    ESSENTIAL_CATEGORIES,
    FLEXIBLE_NEED_ORDER,
    VARIABLE_CATEGORIES,
    category_label,
    normalize_to_monthly_kobo,
)
from app.engine.periods import add_months, months_between
from app.money import format_naira


@dataclass(frozen=True)
class IncomeInput:
    """Single recurring income source."""

    label: str
    amount_kobo: int
    frequency: str
    is_primary: bool = False


@dataclass(frozen=True)
class CostInput:
    """Single recurring cost item (monthly, weekly, termly, or yearly)."""

    category: str
    label: str
    amount_kobo: int
    frequency: str
    due_month: int | None = None
    is_need: bool = True


@dataclass(frozen=True)
class GoalInput:
    """User savings goal."""

    id: int | None
    name: str
    target_kobo: int
    saved_kobo: int
    deadline: date


@dataclass(frozen=True)
class PlanInput:
    """All inputs needed to compute a monthly Budget Buddy plan."""

    income_sources: list[IncomeInput]
    fixed_costs: list[CostInput]
    goals: list[GoalInput] = field(default_factory=list)
    emergency_months: int = 3
    emergency_savings_kobo: int = 0
    festive_fund_enabled: bool = True
    wants_weights: dict[str, int] = field(default_factory=lambda: dict(DEFAULT_WANTS_WEIGHTS))
    as_of_date: date | None = None
    mode: str = "planner"
    savings_rate_pct: int = 10


@dataclass(frozen=True)
class PlanItemOutput:
    """One line item in the generated plan."""

    category: str
    group: str
    amount_kobo: int
    note: str
    label: str = ""


@dataclass(frozen=True)
class GoalPlanResult:
    """Computed monthly allocation and projection for one goal."""

    goal_id: int | None
    name: str
    target_kobo: int
    saved_kobo: int
    deadline: date
    monthly_needed_kobo: int
    allocated_kobo: int
    on_track: bool
    estimated_completion: date | None


@dataclass(frozen=True)
class PlanOutput:
    """Complete deterministic monthly plan output."""

    status: str  # BALANCED, TIGHT, DEFICIT
    status_message: str
    income_monthly_kobo: int
    needs_total_kobo: int
    savings_total_kobo: int
    wants_total_kobo: int
    buffer_kobo: int
    emergency_target_kobo: int
    emergency_contribution_kobo: int
    festive_contribution_kobo: int
    deficit_kobo: int
    breakeven_income_kobo: int
    monthly_variable_pool_kobo: int
    items: list[PlanItemOutput]
    goal_results: list[GoalPlanResult]
    suggestions: list[str]
    category_allowances_kobo: dict[str, int]


def _pct_round_half_up(amount_kobo: int, pct: int) -> int:
    return (amount_kobo * pct + 50) // 100


def _cost_note(cost: CostInput) -> str:
    freq = cost.frequency.strip().lower()
    if freq == "yearly":
        return f"Monthly set-aside for yearly {cost.label.lower()}"
    if freq == "termly":
        return f"3-term average set-aside for {cost.label.lower()}"
    if freq == "weekly":
        return f"Monthly equivalent of weekly {cost.label.lower()}"
    return f"Monthly essential: {cost.label}"


def _build_deficit_suggestions(need_entries: list[tuple[CostInput, int]]) -> list[str]:
    """Suggest reviewing the three largest flexible needs without ever cutting below essentials."""
    non_essential = [
        (cost, amt)
        for cost, amt in need_entries
        if amt > 0 and cost.category not in ESSENTIAL_CATEGORIES
    ]
    order_rank = {cat: idx for idx, cat in enumerate(FLEXIBLE_NEED_ORDER)}
    non_essential.sort(key=lambda pair: (-pair[1], order_rank.get(pair[0].category, 99)))

    chosen: list[tuple[CostInput, int]] = non_essential[:3]

    if len(chosen) < 3:
        already = {id(c) for c, _ in chosen}
        remaining = [
            (cost, amt)
            for cost, amt in need_entries
            if amt > 0 and id(cost) not in already
        ]
        remaining.sort(key=lambda pair: (-pair[1], order_rank.get(pair[0].category, 99)))
        chosen.extend(remaining[: 3 - len(chosen)])

    suggestions: list[str] = []
    for cost, amt in chosen:
        label = cost.label or category_label(cost.category)
        suggestions.append(
            f"Review what you spend on {label} (currently {format_naira(amt)}/month)."
        )
    return suggestions


def compute_plan(plan_input: PlanInput) -> PlanOutput:
    """Run the 8-step needs-first waterfall plan in integer kobo."""
    as_of = plan_input.as_of_date or today_lagos()

    income_monthly = sum(
        normalize_to_monthly_kobo(src.amount_kobo, src.frequency)
        for src in plan_input.income_sources
    )

    need_entries: list[tuple[CostInput, int]] = []
    items: list[PlanItemOutput] = []
    category_allowances: dict[str, int] = {}

    for cost in plan_input.fixed_costs:
        if not cost.is_need:
            continue
        monthly_amt = normalize_to_monthly_kobo(cost.amount_kobo, cost.frequency)
        need_entries.append((cost, monthly_amt))
        items.append(
            PlanItemOutput(
                category=cost.category,
                group="needs",
                amount_kobo=monthly_amt,
                note=_cost_note(cost),
                label=cost.label or category_label(cost.category),
            )
        )
        category_allowances[cost.category] = (
            category_allowances.get(cost.category, 0) + monthly_amt
        )

    needs_total = sum(amt for _, amt in need_entries)
    emergency_target = max(0, plan_input.emergency_months) * needs_total

    # Step 2: Deficit branch
    if needs_total > income_monthly:
        deficit = needs_total - income_monthly
        suggestions = _build_deficit_suggestions(need_entries)
        variable_pool = sum(
            amt for cat, amt in category_allowances.items() if cat in VARIABLE_CATEGORIES
        )
        goal_results = [
            GoalPlanResult(
                goal_id=g.id,
                name=g.name,
                target_kobo=g.target_kobo,
                saved_kobo=g.saved_kobo,
                deadline=g.deadline,
                monthly_needed_kobo=max(
                    0,
                    (max(0, g.target_kobo - g.saved_kobo) + months_between(as_of, g.deadline) - 1)
                    // months_between(as_of, g.deadline),
                ),
                allocated_kobo=0,
                on_track=(g.saved_kobo >= g.target_kobo),
                estimated_completion=as_of if g.saved_kobo >= g.target_kobo else None,
            )
            for g in sorted(plan_input.goals, key=lambda x: (x.deadline, x.id or 0))
        ]
        return PlanOutput(
            status="DEFICIT",
            status_message=(
                f"Your essential costs exceed your monthly income by {format_naira(deficit)}. "
                f"You need {format_naira(needs_total)}/month to break even."
            ),
            income_monthly_kobo=income_monthly,
            needs_total_kobo=needs_total,
            savings_total_kobo=0,
            wants_total_kobo=0,
            buffer_kobo=0,
            emergency_target_kobo=emergency_target,
            emergency_contribution_kobo=0,
            festive_contribution_kobo=0,
            deficit_kobo=deficit,
            breakeven_income_kobo=needs_total,
            monthly_variable_pool_kobo=variable_pool,
            items=items,
            goal_results=goal_results,
            suggestions=suggestions,
            category_allowances_kobo=category_allowances,
        )

    # Step 3: Leftover & 5% buffer
    leftover = income_monthly - needs_total
    buffer_kobo = min(leftover, _pct_round_half_up(income_monthly, 5))
    remaining = leftover - buffer_kobo

    if buffer_kobo > 0:
        items.append(
            PlanItemOutput(
                category="buffer",
                group="buffer",
                amount_kobo=buffer_kobo,
                note="5% cushion for unexpected small expenses",
                label="Monthly buffer",
            )
        )

    # Step 4: Emergency fund (up to 10% of income, capped by remaining target & leftover)
    emergency_gap = max(0, emergency_target - max(0, plan_input.emergency_savings_kobo))
    emergency_cap = _pct_round_half_up(income_monthly, 10)
    emergency_contrib = min(emergency_gap, emergency_cap, remaining)
    remaining -= emergency_contrib

    if emergency_contrib > 0:
        items.append(
            PlanItemOutput(
                category="emergency_fund",
                group="savings",
                amount_kobo=emergency_contrib,
                note=f"Building towards {plan_input.emergency_months}-month emergency target",
                label="Emergency fund",
            )
        )

    # Step 5: Festive fund (if enabled, up to 3% of income)
    festive_contrib = 0
    if plan_input.festive_fund_enabled and remaining > 0:
        festive_contrib = min(_pct_round_half_up(income_monthly, 3), remaining)
        remaining -= festive_contrib
        if festive_contrib > 0:
            items.append(
                PlanItemOutput(
                    category="festive_fund",
                    group="savings",
                    amount_kobo=festive_contrib,
                    note="3% monthly set-aside for December and family celebrations",
                    label="Festive fund",
                )
            )

    # Step 6: Goals sorted by earliest deadline, preserving at least 15% of leftover for wants
    wants_floor = _pct_round_half_up(leftover, 15)
    available_for_goals = max(0, remaining - wants_floor)

    goal_results: list[GoalPlanResult] = []
    goals_total_allocated = 0

    for goal in sorted(plan_input.goals, key=lambda g: (g.deadline, g.id or 0)):
        goal_rem = max(0, goal.target_kobo - goal.saved_kobo)
        m_rem = months_between(as_of, goal.deadline)
        if goal_rem == 0:
            monthly_needed = 0
            allocated = 0
            on_track = True
            est_date = as_of
        else:
            monthly_needed = (goal_rem + m_rem - 1) // m_rem
            allocated = min(monthly_needed, available_for_goals)
            available_for_goals -= allocated
            remaining -= allocated
            goals_total_allocated += allocated
            on_track = allocated >= monthly_needed
            if allocated > 0:
                months_needed = (goal_rem + allocated - 1) // allocated
                est_date = add_months(as_of, months_needed)
            else:
                est_date = None

        if allocated > 0:
            items.append(
                PlanItemOutput(
                    category="goal",
                    group="savings",
                    amount_kobo=allocated,
                    note=f"Saving towards {goal.name}",
                    label=f"Goal: {goal.name}",
                )
            )

        goal_results.append(
            GoalPlanResult(
                goal_id=goal.id,
                name=goal.name,
                target_kobo=goal.target_kobo,
                saved_kobo=goal.saved_kobo,
                deadline=goal.deadline,
                monthly_needed_kobo=monthly_needed,
                allocated_kobo=allocated,
                on_track=on_track,
                estimated_completion=est_date,
            )
        )

    # Step 7: Wants get everything remaining, split with largest-remainder method
    wants_total = remaining
    weights = dict(DEFAULT_WANTS_WEIGHTS)
    if plan_input.wants_weights:
        cleaned_weights = {
            k: max(0, int(v))
            for k, v in plan_input.wants_weights.items()
            if k in DEFAULT_WANTS_WEIGHTS or k == "other"
        }
        if cleaned_weights:
            weights = cleaned_weights

    wants_split = allocate_dict(wants_total, weights)
    for cat, amt in wants_split.items():
        if amt > 0 or wants_total == 0:
            items.append(
                PlanItemOutput(
                    category=cat,
                    group="wants",
                    amount_kobo=amt,
                    note="Flexible personal spending allowance",
                    label=category_label(cat),
                )
            )
            category_allowances[cat] = category_allowances.get(cat, 0) + amt

    savings_total = emergency_contrib + festive_contrib + goals_total_allocated

    # Step 8: Status classification
    all_goals_on_track = all(g.on_track for g in goal_results)
    if wants_total >= wants_floor and all_goals_on_track:
        status = "BALANCED"
        status_message = (
            "Your income covers all essentials, keeps savings on track, "
            "and leaves comfortable room for day-to-day spending."
        )
    else:
        status = "TIGHT"
        status_message = (
            "Your essentials are covered, though your wants or goals are stretched thin this month."
        )

    monthly_variable_pool = sum(
        amt for cat, amt in category_allowances.items() if cat in VARIABLE_CATEGORIES
    )

    return PlanOutput(
        status=status,
        status_message=status_message,
        income_monthly_kobo=income_monthly,
        needs_total_kobo=needs_total,
        savings_total_kobo=savings_total,
        wants_total_kobo=wants_total,
        buffer_kobo=buffer_kobo,
        emergency_target_kobo=emergency_target,
        emergency_contribution_kobo=emergency_contrib,
        festive_contribution_kobo=festive_contrib,
        deficit_kobo=0,
        breakeven_income_kobo=needs_total,
        monthly_variable_pool_kobo=monthly_variable_pool,
        items=items,
        goal_results=goal_results,
        suggestions=[],
        category_allowances_kobo=category_allowances,
    )
