"""Pay cycle date math and 7-day block splitting."""

from __future__ import annotations

import calendar
from dataclasses import dataclass
from datetime import date, timedelta


@dataclass(frozen=True)
class PayCycle:
    """One pay cycle running from payday to the day before the next payday."""

    start: date
    end: date
    next_pay_date: date
    length_days: int
    day_number: int


@dataclass(frozen=True)
class CycleBlock:
    """A 7-day review block inside a pay cycle (the final block may be shorter)."""

    index: int
    start: date
    end: date
    length_days: int


def add_months(base: date, months: int, anchor_day: int | None = None) -> date:
    """Add `months` calendar months, clamping to the last day of shorter months."""
    target_day = anchor_day if anchor_day is not None else base.day
    total_months = (base.year * 12 + (base.month - 1)) + months
    new_year, month_zero = divmod(total_months, 12)
    new_month = month_zero + 1
    last_day = calendar.monthrange(new_year, new_month)[1]
    return date(new_year, new_month, min(target_day, last_day))


def months_between(start: date, end: date) -> int:
    """Return calendar months from `start` to `end`, minimum 1."""
    diff = (end.year - start.year) * 12 + (end.month - start.month)
    return max(1, diff)


def next_payday(payday: date, frequency: str, anchor_day: int | None = None) -> date:
    """Compute the payday immediately following `payday`."""
    freq = frequency.strip().lower()
    if freq == "monthly":
        return add_months(payday, 1, anchor_day=anchor_day or payday.day)
    if freq == "weekly":
        return payday + timedelta(days=7)
    if freq == "biweekly":
        return payday + timedelta(days=14)
    raise ValueError(f"Unsupported pay frequency: {frequency}")


def get_cycle_for_date(target_date: date, anchor_pay_date: date, frequency: str) -> PayCycle:
    """Find the pay cycle containing `target_date` using `anchor_pay_date` and `frequency`."""
    freq = frequency.strip().lower()

    if freq in {"weekly", "biweekly"}:
        step = 7 if freq == "weekly" else 14
        delta_days = (target_date - anchor_pay_date).days
        cycle_idx = delta_days // step
        start = anchor_pay_date + timedelta(days=cycle_idx * step)
        nxt = start + timedelta(days=step)
    elif freq == "monthly":
        anchor_day = anchor_pay_date.day
        month_offset = (target_date.year - anchor_pay_date.year) * 12 + (
            target_date.month - anchor_pay_date.month
        )
        candidate = add_months(anchor_pay_date, month_offset, anchor_day=anchor_day)
        if candidate > target_date:
            month_offset -= 1
            start = add_months(anchor_pay_date, month_offset, anchor_day=anchor_day)
        else:
            start = candidate
        nxt = add_months(anchor_pay_date, month_offset + 1, anchor_day=anchor_day)
    else:
        raise ValueError(f"Unsupported pay frequency: {frequency}")

    end = nxt - timedelta(days=1)
    length_days = (end - start).days + 1
    day_number = (target_date - start).days + 1
    return PayCycle(
        start=start,
        end=end,
        next_pay_date=nxt,
        length_days=length_days,
        day_number=day_number,
    )


def split_cycle_into_blocks(cycle: PayCycle) -> list[CycleBlock]:
    """Split a pay cycle into 7-day review blocks (last block may be shorter than 7 days)."""
    blocks: list[CycleBlock] = []
    cursor = cycle.start
    idx = 1
    while cursor <= cycle.end:
        block_end = min(cycle.end, cursor + timedelta(days=6))
        blocks.append(
            CycleBlock(
                index=idx,
                start=cursor,
                end=block_end,
                length_days=(block_end - cursor).days + 1,
            )
        )
        cursor = block_end + timedelta(days=1)
        idx += 1
    return blocks
