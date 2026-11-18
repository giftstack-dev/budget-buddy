"""Non-destructive what-if scenario calculator."""

from __future__ import annotations

from dataclasses import dataclass, replace

from app.engine.planner import (
    CostInput,
    IncomeInput,
    PlanInput,
    PlanOutput,
    compute_plan,
)
from app.money import format_naira


@dataclass(frozen=True)
class WhatIfComparison:
    """Before-and-after comparison for a hypothetical life or price change."""

    scenario: str
    description: str
    before: PlanOutput
    after: PlanOutput


def run_whatif(base_input: PlanInput, scenario: str, value: int) -> WhatIfComparison:
    """Simulate a scenario without persisting changes and compare before/after groups.

    `value` is a percentage (0-100) for `income_drop` / `rent_rise`,
    or integer kobo per month for `add_dependent` / `add_loan`.
    """
    if value < 0:
        raise ValueError("Scenario value cannot be negative.")

    before = compute_plan(base_input)
    incomes = list(base_input.income_sources)
    costs = list(base_input.fixed_costs)

    if scenario == "income_drop":
        pct = min(100, value)
        factor_num = 100 - pct
        incomes = [
            IncomeInput(
                label=inc.label,
                amount_kobo=(inc.amount_kobo * factor_num + 50) // 100,
                frequency=inc.frequency,
                is_primary=inc.is_primary,
            )
            for inc in incomes
        ]
        description = f"If income falls by {pct}%"
    elif scenario == "rent_rise":
        pct = value
        factor_num = 100 + pct
        updated_costs: list[CostInput] = []
        has_rent = False
        for c in costs:
            if c.category == "rent":
                has_rent = True
                updated_costs.append(
                    CostInput(
                        category=c.category,
                        label=c.label,
                        amount_kobo=(c.amount_kobo * factor_num + 50) // 100,
                        frequency=c.frequency,
                        due_month=c.due_month,
                        is_need=c.is_need,
                    )
                )
            else:
                updated_costs.append(c)
        if not has_rent:
            description = f"If rent rises by {pct}% (no rent item set yet)"
        else:
            description = f"If rent rises by {pct}%"
        costs = updated_costs
    elif scenario == "add_dependent":
        costs.append(
            CostInput(
                category="family_support",
                label="New dependent cost",
                amount_kobo=value,
                frequency="monthly",
                is_need=True,
            )
        )
        description = f"If you add a dependent costing {format_naira(value)}/month"
    elif scenario == "add_loan":
        costs.append(
            CostInput(
                category="debt_payments",
                label="New loan repayment",
                amount_kobo=value,
                frequency="monthly",
                is_need=True,
            )
        )
        description = f"If you add a loan payment of {format_naira(value)}/month"
    else:
        raise ValueError(f"Unknown what-if scenario: {scenario}")

    modified_input = replace(base_input, income_sources=incomes, fixed_costs=costs)
    after = compute_plan(modified_input)
    return WhatIfComparison(
        scenario=scenario,
        description=description,
        before=before,
        after=after,
    )
