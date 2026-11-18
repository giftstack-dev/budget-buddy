"""Curated general money-saving tips tailored to everyday life in Nigeria."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date


@dataclass(frozen=True)
class WeeklyTip:
    """A single general budgeting tip shown on the dashboard."""

    number: int
    title: str
    body: str
    disclaimer: str = "General tip — not professional financial advice."


TIPS: tuple[tuple[str, str], ...] = (
    (
        "Buy dry staples in bulk",
        "Buying rice, garri, beans, or palm oil in larger measures once a month often costs less per plate than daily small packs.",
    ),
    (
        "Compare data bundles",
        "Check weekly versus monthly data plans across networks and turn off background app updates on mobile data.",
    ),
    (
        "Plan your transport routes",
        "Grouping errands into one trip or leaving 20 minutes earlier for BRT or regular buses helps avoid surge fares.",
    ),
    (
        "Cook in batches",
        "Preparing stews and soups in batches on weekends saves cooking gas, NEPA/fuel costs, and weekday takeaway spending.",
    ),
    (
        "Save on payday first",
        "Move your emergency and goal savings right after your salary lands before daily spending begins.",
    ),
    (
        "Keep emergency money separate",
        "Store your emergency fund in a separate account without a debit card so everyday transfers do not dip into it.",
    ),
    (
        "Skip credit for small daily items",
        "Avoid Buy-Now-Pay-Later or borrowing for snacks, outfits, or outings so next month's salary arrives unburdened.",
    ),
    (
        "Review recurring subscriptions",
        "Check cable TV, streaming, and auto-renewing data or cloud plans once a quarter and pause any you rarely use.",
    ),
    (
        "Shop seasonal market produce",
        "Tomatoes, peppers, and fruits drop sharply in peak harvest months; buying and blending extra stretches your food budget.",
    ),
    (
        "Carry lunch or snacks to work",
        "Packing lunch just three days a week can free up thousands of Naira every month without feeling restrictive.",
    ),
    (
        "Use a 24-hour pause for wants",
        "Wait a full day before buying non-essential clothes, gadgets, or impulse items online.",
    ),
    (
        "Set a family support cap",
        "Agree on a monthly family support amount in your plan so generosity stays sustainable and predictable.",
    ),
    (
        "Pre-fund yearly rent monthly",
        "Treating annual rent as 12 monthly set-asides prevents the year-end scramble and keeps your cash flow calm.",
    ),
    (
        "Track small transfer fees",
        "Grouping smaller transfers or using zero-fee transfer tiers adds up quietly over a whole year.",
    ),
    (
        "Check prepaid meter units early",
        "Buying electricity units in planned monthly chunks helps you spot unusual appliance drain early.",
    ),
    (
        "Share bulk buys with neighbours",
        "Splitting a bag of rice, crate of eggs, or carton of oil with a trusted neighbour unlocks wholesale prices.",
    ),
    (
        "Prepare for December early",
        "Setting aside 3% each month for festive travel and gifts means December celebrations do not wipe out January.",
    ),
    (
        "Keep a no-spend day each week",
        "Choosing one quiet day a week with zero discretionary spending resets habits and boosts your weekly reserve.",
    ),
    (
        "Write a market list before leaving",
        "A short written list keeps market runs focused and cuts down impulse extras.",
    ),
    (
        "Compare pharmacy generics",
        "Ask a licensed pharmacist whether an approved generic medicine works the same at a lower price.",
    ),
    (
        "Service generators and appliances on time",
        "Routine oil changes and filter cleaning prevent sudden expensive repairs later.",
    ),
    (
        "Separate business and personal cash",
        "If you earn irregular wages or side income, pay yourself a fixed monthly allowance into a personal account.",
    ),
    (
        "Check school fees a term ahead",
        "Dividing termly school fees by four months spreads the cost evenly across the year.",
    ),
    (
        "Drink water first on hot days",
        "Carrying a reusable water bottle saves daily bottled water and soft drink costs in traffic.",
    ),
    (
        "Update your plan when prices shift",
        "If transport or food prices rise, update your plan numbers instead of forcing an outdated budget.",
    ),
)


def get_weekly_tip(for_date: date) -> WeeklyTip:
    """Pick one deterministic general tip for the current ISO week."""
    iso_year, iso_week, _ = for_date.isocalendar()
    idx = ((iso_year * 53) + iso_week) % len(TIPS)
    title, body = TIPS[idx]
    return WeeklyTip(number=idx + 1, title=title, body=body)
