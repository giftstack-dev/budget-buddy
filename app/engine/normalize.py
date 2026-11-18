"""Frequency normalization and spending category definitions."""

from __future__ import annotations

NEEDS_CATEGORIES: tuple[str, ...] = (
    "rent",
    "food",
    "transport",
    "data_airtime",
    "utilities",
    "household",
    "health",
    "school_fees",
    "family_support",
    "debt_payments",
    "giving",
    "insurance_subscriptions",
)

WANTS_CATEGORIES: tuple[str, ...] = (
    "eating_out",
    "entertainment",
    "personal_care",
    "clothing_shopping",
    "gifts",
    "other",
)

VARIABLE_CATEGORIES: tuple[str, ...] = (
    "food",
    "transport",
    "data_airtime",
    "household",
    "health",
    "eating_out",
    "entertainment",
    "personal_care",
    "clothing_shopping",
    "gifts",
    "other",
)

FIXED_CATEGORIES: tuple[str, ...] = (
    "rent",
    "utilities",
    "school_fees",
    "family_support",
    "debt_payments",
    "giving",
    "insurance_subscriptions",
)

# Protected essentials: feedback must never tell a user to cut these below need.
ESSENTIAL_CATEGORIES: frozenset[str] = frozenset(
    {"food", "rent", "health", "school_fees"}
)

# Needs ranked by how realistic it is to review/adjust them first in a deficit.
FLEXIBLE_NEED_ORDER: tuple[str, ...] = (
    "insurance_subscriptions",
    "giving",
    "family_support",
    "data_airtime",
    "utilities",
    "transport",
    "household",
    "debt_payments",
    "food",
    "rent",
    "school_fees",
    "health",
)

DEFAULT_WANTS_WEIGHTS: dict[str, int] = {
    "eating_out": 30,
    "entertainment": 20,
    "personal_care": 20,
    "clothing_shopping": 20,
    "gifts": 10,
}

CATEGORY_LABELS: dict[str, str] = {
    "rent": "Rent",
    "food": "Food & groceries",
    "transport": "Transport",
    "data_airtime": "Data & airtime",
    "utilities": "Power, water & gas",
    "household": "Household items",
    "health": "Health & medicine",
    "school_fees": "School fees",
    "family_support": "Family support",
    "debt_payments": "Loan & debt payments",
    "giving": "Giving & tithe",
    "insurance_subscriptions": "Insurance & subscriptions",
    "eating_out": "Eating out & snacks",
    "entertainment": "Entertainment & outings",
    "personal_care": "Personal care",
    "clothing_shopping": "Clothing & shopping",
    "gifts": "Gifts & occasions",
    "other": "Other wants",
    "no_spend": "No spending today",
}


def category_label(category: str) -> str:
    """Return a plain-English display label for any category code."""
    return CATEGORY_LABELS.get(category, category.replace("_", " ").title())


def normalize_to_monthly_kobo(amount_kobo: int, frequency: str) -> int:
    """Convert any supported recurring kobo amount to a monthly kobo amount (round half up)."""
    if amount_kobo < 0:
        raise ValueError("Amount cannot be negative.")

    freq = frequency.strip().lower()
    if freq == "monthly":
        return amount_kobo
    if freq == "weekly":
        return (amount_kobo * 52 + 6) // 12
    if freq == "biweekly":
        return (amount_kobo * 26 + 6) // 12
    if freq == "yearly":
        return (amount_kobo + 6) // 12
    if freq == "termly":
        # Three school terms per year: amount * 3 / 12 = amount / 4 (round half up).
        return (amount_kobo * 3 + 6) // 12
    raise ValueError(f"Unsupported frequency: {frequency}")


def scale_monthly_to_cycle_kobo(monthly_kobo: int, frequency: str) -> int:
    """Scale a monthly kobo pool back to one pay cycle (monthly, weekly, or biweekly)."""
    if monthly_kobo < 0:
        raise ValueError("Monthly amount cannot be negative.")

    freq = frequency.strip().lower()
    if freq == "monthly":
        return monthly_kobo
    if freq == "weekly":
        return (monthly_kobo * 12 + 26) // 52
    if freq == "biweekly":
        return (monthly_kobo * 12 + 13) // 26
    raise ValueError(f"Unsupported pay cycle frequency: {frequency}")
