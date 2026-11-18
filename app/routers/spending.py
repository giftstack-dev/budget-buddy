"""Spending log routes: add, no-spend, filter, paginate, edit, delete, CSV export."""

from __future__ import annotations

import csv
import io
from datetime import date
from urllib.parse import quote

from fastapi import APIRouter, Depends, Form, HTTPException, Query, Request
from fastapi.responses import HTMLResponse, RedirectResponse, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import today_lagos
from app.database import get_db
from app.deps import enforce_csrf, require_onboarded_user, template_context, templates
from app.engine.normalize import (
    FIXED_CATEGORIES,
    VARIABLE_CATEGORIES,
    category_label,
    normalize_to_monthly_kobo,
)
from app.engine.tracker import compute_tracker_state
from app.models import Expense, FixedCost, IncomeSource, Profile, User
from app.money import format_naira, parse_naira
from app.services.plan_service import create_plan_version, get_latest_plan

router = APIRouter(prefix="/spending")

PAGE_SIZE = 25
ALLOWED_LOG_CATEGORIES = set(VARIABLE_CATEGORIES) | set(FIXED_CATEGORIES) | {"no_spend"}


def _safe_next_url(next_url: str | None, default: str = "/spending") -> str:
    if next_url and next_url.startswith("/") and not next_url.startswith("//"):
        return next_url
    return default


def _sanitize_csv_cell(value: str) -> str:
    """Prevent spreadsheet formula injection when exporting user notes to CSV."""
    if value and value[0] in ("=", "+", "-", "@"):
        return "'" + value
    return value


def _parse_optional_date(raw: str | None) -> date | None:
    if not raw or not raw.strip():
        return None
    try:
        return date.fromisoformat(raw.strip())
    except ValueError:
        return None


@router.get("", response_class=HTMLResponse)
def spending_list(
    request: Request,
    start_date: str | None = Query(default=None),
    end_date: str | None = Query(default=None),
    category: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    saved: str | None = Query(default=None),
    error: str | None = Query(default=None),
    db: Session = Depends(get_db),
    user: User = Depends(require_onboarded_user),
):
    today = today_lagos()
    parsed_start = _parse_optional_date(start_date)
    parsed_end = _parse_optional_date(end_date)
    filter_cat = category.strip() if category and category.strip() in ALLOWED_LOG_CATEGORIES else ""

    query = select(Expense).where(Expense.user_id == user.id)
    if parsed_start:
        query = query.where(Expense.spent_on >= parsed_start)
    if parsed_end:
        query = query.where(Expense.spent_on <= parsed_end)
    if filter_cat:
        query = query.where(Expense.category == filter_cat)

    matching = db.scalars(
        query.order_by(Expense.spent_on.desc(), Expense.id.desc())
    ).all()

    total_count = len(matching)
    total_pages = max(1, (total_count + PAGE_SIZE - 1) // PAGE_SIZE)
    current_page = min(page, total_pages)
    offset = (current_page - 1) * PAGE_SIZE
    page_items = matching[offset : offset + PAGE_SIZE]

    # Cycle totals by category using <meter>
    profile = db.scalar(select(Profile).where(Profile.user_id == user.id))
    incomes = db.scalars(
        select(IncomeSource)
        .where(IncomeSource.user_id == user.id)
        .order_by(IncomeSource.is_primary.desc(), IncomeSource.id.asc())
    ).all()
    costs = db.scalars(select(FixedCost).where(FixedCost.user_id == user.id)).all()
    plan = get_latest_plan(db, user.id) or create_plan_version(db, user.id, effective_from=today)

    all_expenses = db.scalars(select(Expense).where(Expense.user_id == user.id)).all()
    anchor_pay_date = incomes[0].next_pay_date if incomes else today
    pay_freq = incomes[0].frequency if incomes else "monthly"
    summary = plan.summary or {}
    monthly_var_pool = int(summary.get("monthly_variable_pool_kobo", 0))
    fixed_monthly = sum(normalize_to_monthly_kobo(c.amount_kobo, c.frequency) for c in costs)

    tracker = compute_tracker_state(
        today=today,
        anchor_pay_date=anchor_pay_date,
        pay_frequency=pay_freq,
        mode=profile.mode if profile else "planner",
        monthly_variable_pool_kobo=monthly_var_pool,
        expenses=[(e.spent_on, e.amount_kobo, e.category) for e in all_expenses],
        income_monthly_kobo=plan.income_monthly_kobo,
        fixed_costs_monthly_kobo=fixed_monthly,
        savings_rate_pct=profile.savings_rate_pct if profile else 10,
    )

    cat_allowances = summary.get("category_allowances_kobo") or {}
    cycle_category_bars: list[dict] = []
    all_cycle_cats = sorted(
        set(tracker.category_totals_kobo.keys())
        | {c for c in cat_allowances if c in VARIABLE_CATEGORIES}
    )
    for cat in all_cycle_cats:
        spent = tracker.category_totals_kobo.get(cat, 0)
        planned = int(cat_allowances.get(cat, 0))
        meter_max = max(planned, spent, 1)
        cycle_category_bars.append(
            {
                "category": cat,
                "label": category_label(cat),
                "spent_kobo": spent,
                "planned_kobo": planned,
                "meter_max": meter_max,
                "meter_high": planned if planned > 0 else meter_max,
            }
        )

    return templates.TemplateResponse(
        request,
        "pages/spending.html",
        template_context(
            request,
            user=user,
            active_nav="spending",
            expenses=page_items,
            total_count=total_count,
            current_page=current_page,
            total_pages=total_pages,
            start_date=parsed_start.isoformat() if parsed_start else "",
            end_date=parsed_end.isoformat() if parsed_end else "",
            selected_category=filter_cat,
            variable_categories=VARIABLE_CATEGORIES,
            tracker=tracker,
            cycle_category_bars=cycle_category_bars,
            saved_notice=saved,
            error_notice=error,
        ),
    )


@router.post("/add", dependencies=[Depends(enforce_csrf)])
def add_expense(
    request: Request,
    action: str = Form("add"),
    amount: str = Form(""),
    category: str = Form("food"),
    spent_on: str = Form(""),
    note: str = Form(""),
    next_url: str = Form("/spending"),
    db: Session = Depends(get_db),
    user: User = Depends(require_onboarded_user),
):
    target_redirect = _safe_next_url(next_url, "/spending")
    today = today_lagos()

    try:
        parsed_date = date.fromisoformat(spent_on.strip()) if spent_on.strip() else today
    except ValueError:
        msg = quote("Please enter a valid spending date.")
        return RedirectResponse(f"{target_redirect}?error={msg}", status_code=303)

    if action == "no_spend" or category == "no_spend":
        db.add(
            Expense(
                user_id=user.id,
                spent_on=parsed_date,
                amount_kobo=0,
                category="no_spend",
                note=(note.strip() or "No spending today")[:255],
            )
        )
        db.commit()
        msg = quote("No-spend day logged. Nice work keeping track.")
        return RedirectResponse(f"{target_redirect}?saved={msg}", status_code=303)

    if category not in VARIABLE_CATEGORIES and category not in FIXED_CATEGORIES:
        msg = quote("Please choose a valid category.")
        return RedirectResponse(f"{target_redirect}?error={msg}", status_code=303)

    try:
        amount_kobo = parse_naira(amount)
        if amount_kobo <= 0:
            raise ValueError("Please enter an amount greater than ₦0, or tap 'No spending today'.")
    except ValueError as exc:
        msg = quote(str(exc))
        return RedirectResponse(f"{target_redirect}?error={msg}", status_code=303)

    db.add(
        Expense(
            user_id=user.id,
            spent_on=parsed_date,
            amount_kobo=amount_kobo,
            category=category,
            note=note.strip()[:255],
        )
    )
    db.commit()
    msg = quote(f"Saved {format_naira(amount_kobo)} for {category_label(category)}.")
    return RedirectResponse(f"{target_redirect}?saved={msg}", status_code=303)


@router.get("/{expense_id}/edit", response_class=HTMLResponse)
def edit_expense_page(
    expense_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_onboarded_user),
):
    expense = db.scalar(
        select(Expense).where(Expense.id == expense_id, Expense.user_id == user.id)
    )
    if expense is None:
        raise HTTPException(status_code=404, detail="Spending entry not found.")

    naira, rem = divmod(expense.amount_kobo, 100)
    amount_display = f"{naira}" if rem == 0 else f"{naira}.{rem:02d}"

    return templates.TemplateResponse(
        request,
        "pages/expense_edit.html",
        template_context(
            request,
            user=user,
            active_nav="spending",
            expense=expense,
            amount_display=amount_display,
            variable_categories=VARIABLE_CATEGORIES,
            error=None,
        ),
    )


@router.post("/{expense_id}/edit", response_class=HTMLResponse, dependencies=[Depends(enforce_csrf)])
def edit_expense_submit(
    expense_id: int,
    request: Request,
    amount: str = Form(""),
    category: str = Form("food"),
    spent_on: str = Form(""),
    note: str = Form(""),
    db: Session = Depends(get_db),
    user: User = Depends(require_onboarded_user),
):
    expense = db.scalar(
        select(Expense).where(Expense.id == expense_id, Expense.user_id == user.id)
    )
    if expense is None:
        raise HTTPException(status_code=404, detail="Spending entry not found.")

    error: str | None = None
    try:
        parsed_date = date.fromisoformat(spent_on.strip())
    except ValueError:
        parsed_date = expense.spent_on
        error = "Please enter a valid date."

    amount_kobo = expense.amount_kobo
    if not error:
        if category == "no_spend":
            amount_kobo = 0
        else:
            if category not in ALLOWED_LOG_CATEGORIES:
                error = "Please select a valid category."
            else:
                try:
                    amount_kobo = parse_naira(amount)
                    if amount_kobo <= 0:
                        error = "Amount must be greater than ₦0."
                except ValueError as exc:
                    error = str(exc)

    if error:
        return templates.TemplateResponse(
            request,
            "pages/expense_edit.html",
            template_context(
                request,
                user=user,
                active_nav="spending",
                expense=expense,
                amount_display=amount,
                variable_categories=VARIABLE_CATEGORIES,
                error=error,
            ),
            status_code=400,
        )

    expense.spent_on = parsed_date
    expense.category = category
    expense.amount_kobo = amount_kobo
    expense.note = note.strip()[:255]
    db.commit()
    return RedirectResponse("/spending?saved=Updated+entry", status_code=303)


@router.post("/{expense_id}/delete", dependencies=[Depends(enforce_csrf)])
def delete_expense(
    expense_id: int,
    next_url: str = Form("/spending"),
    db: Session = Depends(get_db),
    user: User = Depends(require_onboarded_user),
):
    expense = db.scalar(
        select(Expense).where(Expense.id == expense_id, Expense.user_id == user.id)
    )
    if expense is None:
        raise HTTPException(status_code=404, detail="Spending entry not found.")

    db.delete(expense)
    db.commit()
    target_redirect = _safe_next_url(next_url, "/spending")
    return RedirectResponse(f"{target_redirect}?saved=Entry+deleted", status_code=303)


@router.get("/export.csv")
def export_spending_csv(
    start_date: str | None = Query(default=None),
    end_date: str | None = Query(default=None),
    category: str | None = Query(default=None),
    db: Session = Depends(get_db),
    user: User = Depends(require_onboarded_user),
):
    parsed_start = _parse_optional_date(start_date)
    parsed_end = _parse_optional_date(end_date)
    filter_cat = category.strip() if category and category.strip() in ALLOWED_LOG_CATEGORIES else ""

    query = select(Expense).where(Expense.user_id == user.id)
    if parsed_start:
        query = query.where(Expense.spent_on >= parsed_start)
    if parsed_end:
        query = query.where(Expense.spent_on <= parsed_end)
    if filter_cat:
        query = query.where(Expense.category == filter_cat)

    rows = db.scalars(query.order_by(Expense.spent_on.desc(), Expense.id.desc())).all()

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["Date", "Category", "Amount (NGN)", "Note"])
    for row in rows:
        naira_amount = f"{row.amount_kobo / 100:.2f}"
        writer.writerow(
            [
                row.spent_on.isoformat(),
                category_label(row.category),
                naira_amount,
                _sanitize_csv_cell(row.note),
            ]
        )

    return Response(
        content=buf.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="budget-buddy-spending.csv"'},
    )
