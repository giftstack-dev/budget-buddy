"""Exact Nigerian Naira parsing and formatting using integer kobo."""

from __future__ import annotations

import re
from decimal import Decimal, InvalidOperation

# Accept optional Naira symbol, digits with standard comma grouping or plain digits, and <=2 decimals.
_VALID_AMOUNT_RE = re.compile(r"^(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?$")


def parse_naira(text: str) -> int:
    """Convert a Naira string like '₦250,000' or '1250.50' into integer kobo.

    Using integer kobo everywhere prevents floating-point rounding drift in budgets.
    """
    if not isinstance(text, str):
        raise ValueError("Please enter an amount in Naira, for example 250,000.")

    cleaned = text.strip()
    if not cleaned:
        raise ValueError("Please enter an amount in Naira, for example 250,000.")

    if cleaned.startswith("-"):
        raise ValueError("Amount cannot be negative.")

    if cleaned.startswith("₦"):
        cleaned = cleaned[1:].strip()

    if cleaned.startswith("-"):
        raise ValueError("Amount cannot be negative.")

    if not _VALID_AMOUNT_RE.match(cleaned):
        raise ValueError(
            "Please enter a valid Naira amount like 250,000 or 1,250.50 (up to 2 decimal places)."
        )

    numeric_str = cleaned.replace(",", "")
    try:
        amount_naira = Decimal(numeric_str)
    except InvalidOperation as exc:
        raise ValueError("Please enter a valid Naira amount.") from exc

    kobo = int(amount_naira * 100)
    if kobo < 0:
        raise ValueError("Amount cannot be negative.")
    return kobo


def format_naira(kobo: int) -> str:
    """Format integer kobo as Nigerian Naira (e.g. '₦250,000' or '₦1,250.50')."""
    if kobo is None:
        return "₦0"

    value = int(kobo)
    sign = "-" if value < 0 else ""
    abs_kobo = abs(value)
    naira, rem_kobo = divmod(abs_kobo, 100)

    if rem_kobo == 0:
        return f"{sign}₦{naira:,}"
    return f"{sign}₦{naira:,}.{rem_kobo:02d}"
