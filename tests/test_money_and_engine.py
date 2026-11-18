"""Unit tests for money helpers and the pure Budget Buddy planning engine."""

from __future__ import annotations

import random
from datetime import date

import pytest

from app.engine.allocate import allocate_dict, allocate_largest_remainder
from app.engine.normalize import normalize_to_monthly_kobo
from app.engine.periods import get_cycle_for_date, split_cycle_into_blocks
from app.engine.planner import (
    CostInput,
    GoalInput,
    IncomeInput,
    PlanInput,
    compute_plan,
)
from app.engine.review import (
    compute_four_week_trend,
    compute_monthly_review,
    compute_weekly_review,
)
from app.engine.tips import TIPS, get_weekly_tip
from app.engine.tracker import compute_tracker_state
from app.engine.whatif import run_whatif
from app.engine.year import build_year_view
from app.money import format_naira, parse_naira


def test_parse_naira_valid_inputs() -> None:
    assert parse_naira("250,000") == 25_000_000
    assert parse_naira("250000.50") == 25_000_050
    assert parse_naira("₦250,000") == 25_000_000
    assert parse_naira(" ₦ 1,250.5 ") == 125_050
    assert parse_naira("0") == 0


@pytest.mark.parametrize(
    "bad_input",
    ["", "   ", "-500", "₦-100", "abc", "12.345", "250,,000", "NaN", "1,23"],
)
def test_parse_naira_invalid_inputs(bad_input: str) -> None:
    with pytest.raises(ValueError):
        parse_naira(bad_input)


def test_format_naira() -> None:
    assert format_naira(25_000_000) == "₦250,000"
    assert format_naira(125_050) == "₦1,250.50"
    assert format_naira(125_005) == "₦1,250.05"
    assert format_naira(0) == "₦0"
    assert format_naira(-50_000) == "-₦500"


def test_normalize_every_frequency_half_up() -> None:
    assert normalize_to_monthly_kobo(100_000, "monthly") == 100_000
    # 1,000 kobo/week * 52 / 12 = 4333.33 -> 4333
    assert normalize_to_monthly_kobo(1_000, "weekly") == 4_333
    # 300 kobo/week * 52 / 12 = 1300 exact
    assert normalize_to_monthly_kobo(300, "weekly") == 1_300
    # Half-up check on weekly: 3 * 52 / 12 = 13; 6 * 52 / 12 = 26; 1 * 52 / 12 = 4.33 -> 4; 2 * 52 / 12 = 8.66 -> 9
    assert normalize_to_monthly_kobo(2, "weekly") == 9
    # Biweekly: 1 * 26 / 12 = 2.16 -> 2; 3 * 26 / 12 = 6.5 -> 7 (half up!)
    assert normalize_to_monthly_kobo(3, "biweekly") == 7
    # Yearly: 480,000 Naira -> 40,000 Naira; 6 kobo / 12 = 0.5 -> 1 (half up!)
    assert normalize_to_monthly_kobo(48_000_000, "yearly") == 4_000_000
    assert normalize_to_monthly_kobo(6, "yearly") == 1
    # Termly: 3/12 = 1/4; 2 kobo / 4 = 0.5 -> 1 (half up!)
    assert normalize_to_monthly_kobo(9_000_000, "termly") == 2_250_000
    assert normalize_to_monthly_kobo(2, "termly") == 1


def test_largest_remainder_exact_sum_random() -> None:
    rng = random.Random(42)
    for _ in range(100):
        total = rng.randint(0, 50_000_000)
        weights = [rng.randint(0, 100) for _ in range(rng.randint(1, 10))]
        parts = allocate_largest_remainder(total, weights)
        assert sum(parts) == total
        assert all(p >= 0 for p in parts)


def _example_250k_input() -> PlanInput:
    return PlanInput(
        income_sources=[IncomeInput("Monthly salary", 250_000_00, "monthly", is_primary=True)],
        fixed_costs=[
            CostInput("rent", "Apartment rent", 480_000_00, "yearly", due_month=12, is_need=True),
            CostInput("food", "Food & groceries", 60_000_00, "monthly", is_need=True),
            CostInput("transport", "Transport", 25_000_00, "monthly", is_need=True),
            CostInput("data_airtime", "Data & airtime", 10_000_00, "monthly", is_need=True),
            CostInput("utilities", "Utilities", 12_000_00, "monthly", is_need=True),
            CostInput("family_support", "Family support", 15_000_00, "monthly", is_need=True),
        ],
        as_of_date=date(2026, 11, 16),
    )


def test_plan_250k_example_sums_exactly_to_income() -> None:
    out = compute_plan(_example_250k_input())
    assert out.status == "BALANCED"
    assert out.income_monthly_kobo == 250_000_00
    assert out.needs_total_kobo == 162_000_00
    assert out.buffer_kobo == 12_500_00
    assert out.emergency_contribution_kobo == 25_000_00
    assert out.festive_contribution_kobo == 7_500_00
    assert out.wants_total_kobo == 43_000_00
    total_allocated = (
        out.needs_total_kobo + out.savings_total_kobo + out.wants_total_kobo + out.buffer_kobo
    )
    assert total_allocated == out.income_monthly_kobo
    assert sum(item.amount_kobo for item in out.items) == out.income_monthly_kobo


def test_deficit_plan_suggestions() -> None:
    plan_in = PlanInput(
        income_sources=[IncomeInput("Salary", 100_000_00, "monthly", is_primary=True)],
        fixed_costs=[
            CostInput("rent", "Rent", 40_000_00, "monthly", is_need=True),
            CostInput("food", "Food", 50_000_00, "monthly", is_need=True),
            CostInput("family_support", "Family support", 20_000_00, "monthly", is_need=True),
            CostInput("utilities", "Power & gas", 15_000_00, "monthly", is_need=True),
            CostInput("data_airtime", "Data", 10_000_00, "monthly", is_need=True),
            CostInput("transport", "Transport", 8_000_00, "monthly", is_need=True),
        ],
        as_of_date=date(2026, 11, 16),
    )
    out = compute_plan(plan_in)
    assert out.status == "DEFICIT"
    assert out.deficit_kobo == 43_000_00
    assert out.breakeven_income_kobo == 143_000_00
    assert out.savings_total_kobo == 0
    assert out.wants_total_kobo == 0
    assert out.buffer_kobo == 0
    assert len(out.suggestions) == 3
    for s in out.suggestions:
        assert "Review what you spend on" in s
        assert "to zero" not in s.lower()


def test_tight_plan_when_wants_below_15_percent_floor() -> None:
    # Income 100k, needs 84k -> leftover 16k.
    # Buffer 5% (5k) + Emergency 10% (10k) + Festive 3% (capped at 1k) -> wants = 0 < 15% of 16k.
    plan_in = PlanInput(
        income_sources=[IncomeInput("Salary", 100_000_00, "monthly", is_primary=True)],
        fixed_costs=[CostInput("food", "Essentials", 84_000_00, "monthly", is_need=True)],
        as_of_date=date(2026, 11, 16),
    )
    out = compute_plan(plan_in)
    assert out.status == "TIGHT"
    assert out.wants_total_kobo == 0
    assert out.needs_total_kobo + out.savings_total_kobo + out.wants_total_kobo + out.buffer_kobo == 100_000_00


def test_emergency_fund_cap_when_target_already_met() -> None:
    base = _example_250k_input()
    # Target is 3 * 162,000 = 486,000. Already saved 500,000.
    capped_in = PlanInput(
        income_sources=base.income_sources,
        fixed_costs=base.fixed_costs,
        emergency_months=3,
        emergency_savings_kobo=500_000_00,
        as_of_date=date(2026, 11, 16),
    )
    out = compute_plan(capped_in)
    assert out.emergency_contribution_kobo == 0
    assert out.festive_contribution_kobo == 7_500_00


def test_goal_allocation_order_wants_floor_and_estimated_dates() -> None:
    as_of = date(2026, 11, 16)
    g1 = GoalInput(id=1, name="Earlier Laptop", target_kobo=60_000_00, saved_kobo=0, deadline=date(2027, 1, 16))
    g2 = GoalInput(id=2, name="Later Phone", target_kobo=120_000_00, saved_kobo=0, deadline=date(2027, 5, 16))
    base = _example_250k_input()
    # Leftover 88k - 12.5k buffer - 25k emergency - 7.5k festive = 43k remaining.
    # 15% wants floor of 88k = 13.2k -> max available for goals = 29.8k/month.
    # g1 needs 60k / 2 months = 30k/month -> gets 29.8k (behind!), g2 gets 0 (behind!).
    plan_in = PlanInput(
        income_sources=base.income_sources,
        fixed_costs=base.fixed_costs,
        goals=[g2, g1],  # Deliberately unsorted to verify sorting by earliest deadline
        as_of_date=as_of,
    )
    out = compute_plan(plan_in)
    assert out.status == "TIGHT"
    assert out.goal_results[0].name == "Earlier Laptop"
    assert out.goal_results[0].allocated_kobo == 29_800_00
    assert out.goal_results[0].on_track is False
    assert out.goal_results[0].estimated_completion == date(2027, 2, 16)  # ceil(60k/29.8k)=3 months
    assert out.goal_results[1].name == "Later Phone"
    assert out.goal_results[1].allocated_kobo == 0
    assert out.goal_results[1].estimated_completion is None
    assert out.wants_total_kobo == 13_200_00


def test_pay_cycle_dates_28th_31st_feb29_weekly_biweekly() -> None:
    # Monthly on 28th
    c28 = get_cycle_for_date(date(2026, 3, 5), date(2026, 2, 28), "monthly")
    assert c28.start == date(2026, 2, 28)
    assert c28.end == date(2026, 3, 27)
    assert c28.next_pay_date == date(2026, 3, 28)

    # Monthly on 31st across Feb (non-leap) and Mar
    c31_feb = get_cycle_for_date(date(2025, 2, 15), date(2025, 1, 31), "monthly")
    assert c31_feb.start == date(2025, 1, 31)
    assert c31_feb.end == date(2025, 2, 27)
    assert c31_feb.next_pay_date == date(2025, 2, 28)

    c31_mar = get_cycle_for_date(date(2025, 3, 10), date(2025, 1, 31), "monthly")
    assert c31_mar.start == date(2025, 2, 28)
    assert c31_mar.end == date(2025, 3, 30)
    assert c31_mar.next_pay_date == date(2025, 3, 31)

    # Leap year Feb 29 -> 2025 Feb 28 -> 2028 Feb 29
    c_leap = get_cycle_for_date(date(2024, 3, 1), date(2024, 2, 29), "monthly")
    assert c_leap.start == date(2024, 2, 29)
    assert c_leap.next_pay_date == date(2024, 3, 29)

    c_nonleap = get_cycle_for_date(date(2025, 2, 28), date(2024, 2, 29), "monthly")
    assert c_nonleap.start == date(2025, 2, 28)
    assert c_nonleap.next_pay_date == date(2025, 3, 29)

    c_next_leap = get_cycle_for_date(date(2028, 2, 29), date(2024, 2, 29), "monthly")
    assert c_next_leap.start == date(2028, 2, 29)

    # Weekly & Biweekly
    cw = get_cycle_for_date(date(2026, 11, 18), date(2026, 11, 16), "weekly")
    assert cw.start == date(2026, 11, 16)
    assert cw.end == date(2026, 11, 22)
    assert cw.length_days == 7

    cb = get_cycle_for_date(date(2026, 11, 20), date(2026, 11, 16), "biweekly")
    assert cb.start == date(2026, 11, 16)
    assert cb.end == date(2026, 11, 29)
    assert cb.length_days == 14


def test_split_cycle_into_7_day_blocks() -> None:
    cyc = get_cycle_for_date(date(2026, 3, 10), date(2026, 3, 1), "monthly")
    blocks = split_cycle_into_blocks(cyc)
    assert len(blocks) == 5
    assert [b.length_days for b in blocks] == [7, 7, 7, 7, 3]
    assert blocks[0].start == date(2026, 3, 1)
    assert blocks[-1].end == date(2026, 3, 31)


def test_daily_allowance_and_safe_to_spend_never_negative() -> None:
    # Overspent pool -> safe_to_spend_today_kobo == 0, never negative
    state = compute_tracker_state(
        today=date(2026, 11, 20),
        anchor_pay_date=date(2026, 11, 1),
        pay_frequency="monthly",
        mode="planner",
        monthly_variable_pool_kobo=30_000_00,
        expenses=[(date(2026, 11, 5), 45_000_00, "food")],
    )
    assert state.daily_allowance_kobo == 1_000_00
    assert state.remaining_pool_kobo == 0
    assert state.safe_to_spend_today_kobo == 0


def test_weekly_review_exact_thresholds_and_low_data() -> None:
    cyc = get_cycle_for_date(date(2026, 11, 5), date(2026, 11, 1), "monthly")
    block = split_cycle_into_blocks(cyc)[0]  # Nov 1..Nov 7
    allowance = 10_000_00  # ₦10,000

    def _expenses_for_total(total_kobo: int) -> list[tuple[date, int, str]]:
        return [
            (date(2026, 11, 1), total_kobo, "eating_out"),
            (date(2026, 11, 2), 0, "no_spend"),
            (date(2026, 11, 3), 0, "no_spend"),
        ]

    # 89.99% -> on_track
    r_8999 = compute_weekly_review(block, allowance, 1_500_00, _expenses_for_total(8_999_00))
    assert r_8999.status == "on_track"
    assert r_8999.ratio_bp == 8999

    # 90.00% -> close
    r_9000 = compute_weekly_review(block, allowance, 1_500_00, _expenses_for_total(9_000_00))
    assert r_9000.status == "close"
    assert r_9000.ratio_bp == 9000

    # 100.00% -> close
    r_10000 = compute_weekly_review(block, allowance, 1_500_00, _expenses_for_total(10_000_00))
    assert r_10000.status == "close"
    assert r_10000.ratio_bp == 10000

    # 100.01% -> over
    r_10001 = compute_weekly_review(block, allowance, 1_500_00, _expenses_for_total(10_001_00))
    assert r_10001.status == "over"
    assert r_10001.ratio_bp == 10001

    # < 3 days logged -> low_data
    r_low = compute_weekly_review(
        block,
        allowance,
        1_500_00,
        [(date(2026, 11, 1), 2_000_00, "food"), (date(2026, 11, 2), 0, "no_spend")],
    )
    assert r_low.status == "low_data"


def test_weekly_review_streaks_trend_and_never_cut_need() -> None:
    cyc = get_cycle_for_date(date(2026, 11, 5), date(2026, 11, 1), "monthly")
    block = split_cycle_into_blocks(cyc)[0]  # Nov 1..Nov 7
    expenses = [
        (date(2026, 11, 4), 5_000_00, "food"),  # over daily limit
        (date(2026, 11, 5), 1_000_00, "food"),
        (date(2026, 11, 6), 0, "no_spend"),
        (date(2026, 11, 7), 8_000_00, "food"),  # Wait: > daily limit, let's check streak with under-limit end
    ]
    r_break = compute_weekly_review(block, 10_000_00, 2_000_00, expenses)
    assert r_break.streak_days == 0

    streak_expenses = [
        (date(2026, 11, 4), 10_000_00, "food"),  # over daily limit
        (date(2026, 11, 5), 1_500_00, "food"),   # under
        (date(2026, 11, 6), 0, "no_spend"),      # under
        (date(2026, 11, 7), 1_000_00, "food"),   # under -> 3-day streak, total 12,500 > 10,000 (over, food!)
    ]
    r_food_over = compute_weekly_review(block, 10_000_00, 2_000_00, streak_expenses)
    assert r_food_over.streak_days == 3
    assert r_food_over.status == "over"
    assert "cut" not in r_food_over.message.lower()
    assert "trim" not in r_food_over.message.lower()

    assert compute_four_week_trend([7000, 7200, 8500, 8800]) == "rising"
    assert compute_four_week_trend([9000, 8800, 7400, 7200]) == "improving"
    assert compute_four_week_trend([8000, 8100, 8200, 8000]) == "steady"


def test_monthly_review_totals() -> None:
    cyc = get_cycle_for_date(date(2026, 11, 15), date(2026, 11, 1), "monthly")
    res = compute_monthly_review(
        cycle=cyc,
        cycle_allowance_kobo=100_000_00,
        expenses=[
            (date(2026, 11, 2), 40_000_00, "food"),
            (date(2026, 11, 10), 20_000_00, "transport"),
            (date(2026, 11, 11), 0, "no_spend"),
        ],
        category_allowances_cycle={"food": 50_000_00, "transport": 25_000_00},
        weekly_statuses=["on_track", "on_track", "close", "on_track"],
    )
    assert res.spent_kobo == 60_000_00
    assert res.leftover_kobo == 40_000_00
    assert res.weeks_on_track == 3
    assert res.total_weeks == 4
    assert res.status == "on_track"


def test_whatif_every_scenario() -> None:
    base = _example_250k_input()

    drop = run_whatif(base, "income_drop", 20)
    assert drop.after.income_monthly_kobo == 200_000_00
    assert drop.after.needs_total_kobo == 162_000_00

    rent_up = run_whatif(base, "rent_rise", 50)
    assert rent_up.after.needs_total_kobo == 182_000_00

    dep = run_whatif(base, "add_dependent", 30_000_00)
    assert dep.after.needs_total_kobo == 192_000_00

    loan = run_whatif(base, "add_loan", 100_000_00)
    assert loan.after.status == "DEFICIT"
    assert loan.after.deficit_kobo == 12_000_00


def test_year_view_sinking_fund_balances() -> None:
    base = _example_250k_input()  # yearly rent 480,000 due in month 12 (Dec) -> 40,000/month
    out = compute_plan(base)
    # Starting in January 2026: months 1..11 build 40k..440k, month 12 adds 40k (480k) and pays 480k -> 0!
    rows = build_year_view(base, out, start_date=date(2026, 1, 1))
    assert len(rows) == 12
    assert rows[0].sinking_fund_balance_kobo == 40_000_00
    assert rows[10].sinking_fund_balance_kobo == 440_000_00
    assert rows[11].sinking_fund_balance_kobo == 0
    assert any("rent" in marker.lower() for marker in rows[11].due_markers)


def test_weekly_tips_catalog() -> None:
    assert len(TIPS) == 25
    tip = get_weekly_tip(date(2026, 11, 16))
    assert "not professional financial advice" in tip.disclaimer.lower()


def test_format_naira_negative_with_kobo() -> None:
    assert format_naira(-125_050) == "-₦1,250.50"


def test_allocate_zero_total_and_zero_weights() -> None:
    assert allocate_largest_remainder(0, [10, 20, 30]) == [0, 0, 0]
    res = allocate_largest_remainder(100, [0, 0, 0])
    assert sum(res) == 100
    assert res == [34, 33, 33]


def test_allocate_dict_exact_sum() -> None:
    split = allocate_dict(10_003, {"a": 30, "b": 20, "c": 20, "d": 20, "e": 10})
    assert sum(split.values()) == 10_003


def test_normalize_rejects_negative_and_unknown() -> None:
    with pytest.raises(ValueError):
        normalize_to_monthly_kobo(-1, "monthly")
    with pytest.raises(ValueError):
        normalize_to_monthly_kobo(1000, "quarterly")


def test_plan_festive_fund_disabled() -> None:
    base = _example_250k_input()
    no_festive = PlanInput(
        income_sources=base.income_sources,
        fixed_costs=base.fixed_costs,
        festive_fund_enabled=False,
        as_of_date=date(2026, 11, 16),
    )
    out = compute_plan(no_festive)
    assert out.festive_contribution_kobo == 0
    assert out.wants_total_kobo == 50_500_00


def test_plan_wants_custom_weights() -> None:
    base = _example_250k_input()
    custom = PlanInput(
        income_sources=base.income_sources,
        fixed_costs=base.fixed_costs,
        wants_weights={"eating_out": 50, "entertainment": 50},
        as_of_date=date(2026, 11, 16),
    )
    out = compute_plan(custom)
    wants_items = {i.category: i.amount_kobo for i in out.items if i.group == "wants"}
    assert wants_items["eating_out"] == 21_500_00
    assert wants_items["entertainment"] == 21_500_00


def test_tracker_log_only_mode_pool() -> None:
    # Income 200k - fixed 80k - 10% savings (20k) = 100k pool over 30 days
    state = compute_tracker_state(
        today=date(2026, 11, 1),
        anchor_pay_date=date(2026, 11, 1),
        pay_frequency="monthly",
        mode="log_only",
        monthly_variable_pool_kobo=0,
        expenses=[(date(2026, 11, 1), 10_000_00, "food")],
        income_monthly_kobo=200_000_00,
        fixed_costs_monthly_kobo=80_000_00,
        savings_rate_pct=10,
    )
    assert state.cycle_pool_kobo == 100_000_00
    assert state.remaining_pool_kobo == 90_000_00
    assert state.safe_to_spend_today_kobo == 3_000_00


def test_tracker_safe_to_spend_adjusts_after_zero_spend_day() -> None:
    state = compute_tracker_state(
        today=date(2026, 11, 2),
        anchor_pay_date=date(2026, 11, 1),
        pay_frequency="monthly",
        mode="planner",
        monthly_variable_pool_kobo=30_000_00,
        expenses=[(date(2026, 11, 1), 0, "no_spend")],
    )
    # 30,000 left over 29 days (Nov 2..Nov 30) -> 1,034.48 -> 1,034 Naira/day > 1,000 baseline
    assert state.safe_to_spend_today_kobo > state.daily_allowance_kobo


def test_weekly_review_no_spend_day_counts_as_logged() -> None:
    cyc = get_cycle_for_date(date(2026, 11, 5), date(2026, 11, 1), "monthly")
    block = split_cycle_into_blocks(cyc)[0]
    res = compute_weekly_review(
        block=block,
        allowance_kobo=20_000_00,
        daily_allowance_kobo=3_000_00,
        expenses=[
            (date(2026, 11, 5), 0, "no_spend"),
            (date(2026, 11, 6), 0, "no_spend"),
            (date(2026, 11, 7), 0, "no_spend"),
        ],
    )
    assert res.days_logged == 3
    assert res.status == "on_track"
    assert res.streak_days == 3


def test_weekly_review_log_only_biggest_category() -> None:
    cyc = get_cycle_for_date(date(2026, 11, 5), date(2026, 11, 1), "monthly")
    block = split_cycle_into_blocks(cyc)[0]
    res = compute_weekly_review(
        block=block,
        allowance_kobo=10_000_00,
        daily_allowance_kobo=2_000_00,
        expenses=[
            (date(2026, 11, 1), 7_000_00, "entertainment"),
            (date(2026, 11, 2), 4_000_00, "transport"),
            (date(2026, 11, 3), 0, "no_spend"),
        ],
        mode="log_only",
    )
    assert res.status == "over"
    assert res.top_category == "entertainment"


def test_year_view_termly_school_fees_due_every_four_months() -> None:
    plan_in = PlanInput(
        income_sources=[IncomeInput("Salary", 300_000_00, "monthly", is_primary=True)],
        fixed_costs=[
            CostInput("school_fees", "School fees", 120_000_00, "termly", due_month=1, is_need=True),
        ],
        as_of_date=date(2026, 1, 1),
    )
    out = compute_plan(plan_in)
    rows = build_year_view(plan_in, out, start_date=date(2026, 1, 1))
    due_months = [r.month_date.month for r in rows if r.due_markers]
    assert due_months == [1, 5, 9]


def test_year_view_goal_milestone_appears() -> None:
    base = _example_250k_input()
    goal = GoalInput(1, "Phone", 50_000_00, 0, date(2026, 5, 1))
    plan_in = PlanInput(
        income_sources=base.income_sources,
        fixed_costs=base.fixed_costs,
        goals=[goal],
        as_of_date=date(2026, 1, 1),
    )
    out = compute_plan(plan_in)
    rows = build_year_view(plan_in, out, start_date=date(2026, 1, 1))
    all_milestones = [m for r in rows for m in r.goal_milestones]
    assert any("Phone" in m for m in all_milestones)


def test_whatif_rejects_negative_and_unknown() -> None:
    base = _example_250k_input()
    with pytest.raises(ValueError):
        run_whatif(base, "income_drop", -5)
    with pytest.raises(ValueError):
        run_whatif(base, "unknown_scenario", 10)
