"""Account settings, plan inputs editing, password change, data export, and account deletion."""

from __future__ import annotations

import csv
import io
import json
from datetime import date
from urllib.parse import quote

from fastapi import APIRouter, Depends, Form, Request
from fastapi.responses import HTMLResponse, RedirectResponse, Response
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.config import today_lagos
from app.database import get_db
from app.deps import enforce_csrf, require_onboarded_user, template_context, templates
from app.engine.normalize import DEFAULT_WANTS_WEIGHTS, NEEDS_CATEGORIES, category_label
from app.models import Expense, FixedCost, Goal, IncomeSource, Plan, Profile, Review, User
from app.money import parse_naira
from app.routers.onboarding import EMPLOYMENT_OPTIONS, HOUSEHOLD_OPTIONS, HOUSING_OPTIONS
from app.security import hash_password, verify_password
from app.services.plan_service import create_plan_version

router = APIRouter(prefix="/settings")


def _kobo_str(kobo: int) -> str:
    naira, rem = divmod(kobo, 100)
    return f"{naira:,}" if rem == 0 else f"{naira:,}.{rem:02d}"


def _sanitize_csv_cell(value: str) -> str:
    if value and value[0] in ("=", "+", "-", "@"):
        return "'" + value
    return value


@router.get("", response_class=HTMLResponse)
def settings_page(
    request: Request,
    saved: str | None = None,
    error: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_onboarded_user),
):
    profile = db.scalar(select(Profile).where(Profile.user_id == user.id))
    incomes = db.scalars(
        select(IncomeSource)
        .where(IncomeSource.user_id == user.id)
        .order_by(IncomeSource.is_primary.desc(), IncomeSource.id.asc())
    ).all()
    costs = db.scalars(
        select(FixedCost).where(FixedCost.user_id == user.id).order_by(FixedCost.id.asc())
    ).all()
    wants_weights = (
        dict(profile.wants_weights)
        if profile and profile.wants_weights
        else dict(DEFAULT_WANTS_WEIGHTS)
    )

    return templates.TemplateResponse(
        request,
        "pages/settings.html",
        template_context(
            request,
            user=user,
            active_nav="settings",
            profile=profile,
            incomes=incomes,
            costs=costs,
            wants_weights=wants_weights,
            household_options=HOUSEHOLD_OPTIONS,
            housing_options=HOUSING_OPTIONS,
            employment_options=EMPLOYMENT_OPTIONS,
            needs_categories=NEEDS_CATEGORIES,
            kobo_str=_kobo_str,
            saved_notice=saved,
            error_notice=error,
        ),
    )


@router.post("/profile", dependencies=[Depends(enforce_csrf)])
def update_profile(
    display_name: str = Form(""),
    city: str = Form(""),
    household_type: str = Form("alone"),
    dependents_count: str = Form("0"),
    housing_type: str = Form("rent"),
    employment_type: str = Form("salary"),
    mode: str = Form("planner"),
    emergency_months: str = Form("3"),
    emergency_savings: str = Form("0"),
    festive_fund_enabled: str = Form(""),
    savings_rate_pct: str = Form("10"),
    db: Session = Depends(get_db),
    user: User = Depends(require_onboarded_user),
):
    profile = db.scalar(select(Profile).where(Profile.user_id == user.id))
    if profile is None:
        return RedirectResponse("/onboarding", status_code=303)

    clean_name = display_name.strip()
    if not clean_name:
        return RedirectResponse(f"/settings?error={quote('Display name is required.')}", status_code=303)

    try:
        deps = max(0, min(30, int(dependents_count or "0")))
        em_months = max(1, min(12, int(emergency_months or "3")))
        s_rate = max(0, min(80, int(savings_rate_pct or "10")))
        em_saved_kobo = parse_naira(emergency_savings or "0")
    except ValueError as exc:
        return RedirectResponse(f"/settings?error={quote(str(exc))}", status_code=303)

    profile.display_name = clean_name[:100]
    profile.city = city.strip()[:100]
    if household_type in {k for k, _ in HOUSEHOLD_OPTIONS}:
        profile.household_type = household_type
    if housing_type in {k for k, _ in HOUSING_OPTIONS}:
        profile.housing_type = housing_type
    if employment_type in {k for k, _ in EMPLOYMENT_OPTIONS}:
        profile.employment_type = employment_type
    if mode in {"planner", "log_only"}:
        profile.mode = mode
    profile.dependents_count = deps
    profile.emergency_months = em_months
    profile.emergency_savings_kobo = em_saved_kobo
    profile.festive_fund_enabled = festive_fund_enabled.lower() in {"1", "true", "on", "yes"}
    profile.savings_rate_pct = s_rate
    db.commit()

    create_plan_version(db, user.id, effective_from=today_lagos())
    return RedirectResponse(f"/settings?saved={quote('Profile updated and new plan saved.')}", status_code=303)


@router.post("/income", dependencies=[Depends(enforce_csrf)])
async def update_incomes(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_onboarded_user),
):
    form = await request.form()
    labels = [str(v).strip() for v in form.getlist("inc_label")]
    amounts = [str(v).strip() for v in form.getlist("inc_amount")]
    freqs = [str(v).strip() for v in form.getlist("inc_frequency")]
    pay_dates = [str(v).strip() for v in form.getlist("inc_next_pay_date")]

    new_sources: list[IncomeSource] = []
    for idx in range(max(len(labels), len(amounts))):
        lbl = labels[idx] if idx < len(labels) else ""
        amt_raw = amounts[idx] if idx < len(amounts) else ""
        freq = freqs[idx] if idx < len(freqs) else "monthly"
        pd_raw = pay_dates[idx] if idx < len(pay_dates) else ""
        if not lbl and not amt_raw:
            continue
        if not amt_raw:
            continue
        try:
            amt_kobo = parse_naira(amt_raw)
            if amt_kobo <= 0:
                continue
        except ValueError as exc:
            return RedirectResponse(f"/settings?error={quote(str(exc))}", status_code=303)

        if freq not in {"monthly", "weekly", "biweekly"}:
            return RedirectResponse(f"/settings?error={quote('Invalid pay frequency.')}", status_code=303)
        try:
            pd_val = date.fromisoformat(pd_raw) if pd_raw else today_lagos()
        except ValueError:
            return RedirectResponse(f"/settings?error={quote('Invalid next pay date.')}", status_code=303)

        new_sources.append(
            IncomeSource(
                user_id=user.id,
                label=(lbl or "Income")[:120],
                amount_kobo=amt_kobo,
                frequency=freq,
                next_pay_date=pd_val,
                is_primary=(len(new_sources) == 0),
            )
        )

    if not new_sources:
        return RedirectResponse(
            f"/settings?error={quote('Keep at least one active income source.')}", status_code=303
        )

    db.execute(delete(IncomeSource).where(IncomeSource.user_id == user.id))
    for src in new_sources:
        db.add(src)
    db.commit()
    create_plan_version(db, user.id, effective_from=today_lagos())
    return RedirectResponse(f"/settings?saved={quote('Income updated and new plan saved.')}", status_code=303)


@router.post("/costs", dependencies=[Depends(enforce_csrf)])
async def update_costs(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_onboarded_user),
):
    form = await request.form()
    cats = [str(v).strip() for v in form.getlist("cost_category")]
    labels = [str(v).strip() for v in form.getlist("cost_label")]
    amounts = [str(v).strip() for v in form.getlist("cost_amount")]
    freqs = [str(v).strip() for v in form.getlist("cost_frequency")]
    due_months = [str(v).strip() for v in form.getlist("cost_due_month")]

    new_costs: list[FixedCost] = []
    for idx in range(max(len(cats), len(amounts))):
        cat = cats[idx] if idx < len(cats) else "household"
        lbl = labels[idx] if idx < len(labels) else ""
        amt_raw = amounts[idx] if idx < len(amounts) else ""
        freq = freqs[idx] if idx < len(freqs) else "monthly"
        due_raw = due_months[idx] if idx < len(due_months) else ""

        if not amt_raw:
            continue
        try:
            amt_kobo = parse_naira(amt_raw)
        except ValueError as exc:
            return RedirectResponse(f"/settings?error={quote(str(exc))}", status_code=303)

        if amt_kobo <= 0:
            continue
        if cat not in NEEDS_CATEGORIES:
            cat = "household"
        if freq not in {"weekly", "monthly", "termly", "yearly"}:
            return RedirectResponse(f"/settings?error={quote('Invalid cost frequency.')}", status_code=303)

        due_val: int | None = None
        if due_raw:
            try:
                due_val = int(due_raw)
                if not (1 <= due_val <= 12):
                    raise ValueError()
            except ValueError:
                return RedirectResponse(
                    f"/settings?error={quote('Due month must be between 1 and 12.')}", status_code=303
                )

        new_costs.append(
            FixedCost(
                user_id=user.id,
                category=cat,
                label=(lbl or category_label(cat))[:120],
                amount_kobo=amt_kobo,
                frequency=freq,
                due_month=due_val,
                is_need=True,
            )
        )

    db.execute(delete(FixedCost).where(FixedCost.user_id == user.id))
    for c in new_costs:
        db.add(c)
    db.commit()
    create_plan_version(db, user.id, effective_from=today_lagos())
    return RedirectResponse(f"/settings?saved={quote('Costs updated and new plan saved.')}", status_code=303)


@router.post("/wants", dependencies=[Depends(enforce_csrf)])
def update_wants_weights(
    eating_out: str = Form("30"),
    entertainment: str = Form("20"),
    personal_care: str = Form("20"),
    clothing_shopping: str = Form("20"),
    gifts: str = Form("10"),
    db: Session = Depends(get_db),
    user: User = Depends(require_onboarded_user),
):
    profile = db.scalar(select(Profile).where(Profile.user_id == user.id))
    if profile is None:
        return RedirectResponse("/onboarding", status_code=303)

    raw_map = {
        "eating_out": eating_out,
        "entertainment": entertainment,
        "personal_care": personal_care,
        "clothing_shopping": clothing_shopping,
        "gifts": gifts,
    }
    weights: dict[str, int] = {}
    for key, raw in raw_map.items():
        try:
            val = int(raw.strip())
            if val < 0 or val > 1000:
                raise ValueError()
            weights[key] = val
        except ValueError:
            return RedirectResponse(
                f"/settings?error={quote('Wants weights must be non-negative whole numbers.')}",
                status_code=303,
            )

    if sum(weights.values()) == 0:
        return RedirectResponse(
            f"/settings?error={quote('At least one wants weight must be above 0.')}",
            status_code=303,
        )

    profile.wants_weights = weights
    db.commit()
    create_plan_version(db, user.id, effective_from=today_lagos())
    return RedirectResponse(f"/settings?saved={quote('Wants split updated.')}", status_code=303)


@router.post("/password", dependencies=[Depends(enforce_csrf)])
def change_password(
    current_password: str = Form(""),
    new_password: str = Form(""),
    confirm_password: str = Form(""),
    db: Session = Depends(get_db),
    user: User = Depends(require_onboarded_user),
):
    if not verify_password(current_password, user.password_hash):
        return RedirectResponse(
            f"/settings?error={quote('Current password is incorrect.')}", status_code=303
        )
    if len(new_password) < 8:
        return RedirectResponse(
            f"/settings?error={quote('New password must be at least 8 characters.')}", status_code=303
        )
    if new_password != confirm_password:
        return RedirectResponse(
            f"/settings?error={quote('New passwords do not match.')}", status_code=303
        )

    user.password_hash = hash_password(new_password)
    db.commit()
    return RedirectResponse(f"/settings?saved={quote('Password updated.')}", status_code=303)


@router.get("/export.json")
def export_all_json(
    db: Session = Depends(get_db),
    user: User = Depends(require_onboarded_user),
):
    profile = db.scalar(select(Profile).where(Profile.user_id == user.id))
    incomes = db.scalars(select(IncomeSource).where(IncomeSource.user_id == user.id)).all()
    costs = db.scalars(select(FixedCost).where(FixedCost.user_id == user.id)).all()
    goals = db.scalars(select(Goal).where(Goal.user_id == user.id)).all()
    expenses = db.scalars(select(Expense).where(Expense.user_id == user.id)).all()
    plans = db.scalars(select(Plan).where(Plan.user_id == user.id)).all()
    reviews = db.scalars(select(Review).where(Review.user_id == user.id)).all()

    payload = {
        "account": {
            "email": user.email,
            "phone": user.phone,
            "created_at": user.created_at.isoformat(),
        },
        "profile": {
            "display_name": profile.display_name if profile else "",
            "city": profile.city if profile else "",
            "household_type": profile.household_type if profile else "",
            "dependents_count": profile.dependents_count if profile else 0,
            "housing_type": profile.housing_type if profile else "",
            "employment_type": profile.employment_type if profile else "",
            "mode": profile.mode if profile else "planner",
            "emergency_months": profile.emergency_months if profile else 3,
            "emergency_savings_kobo": profile.emergency_savings_kobo if profile else 0,
            "festive_fund_enabled": profile.festive_fund_enabled if profile else True,
        },
        "income_sources": [
            {
                "label": i.label,
                "amount_kobo": i.amount_kobo,
                "frequency": i.frequency,
                "next_pay_date": i.next_pay_date.isoformat(),
                "is_primary": i.is_primary,
            }
            for i in incomes
        ],
        "fixed_costs": [
            {
                "category": c.category,
                "label": c.label,
                "amount_kobo": c.amount_kobo,
                "frequency": c.frequency,
                "due_month": c.due_month,
            }
            for c in costs
        ],
        "goals": [
            {
                "name": g.name,
                "target_kobo": g.target_kobo,
                "saved_kobo": g.saved_kobo,
                "deadline": g.deadline.isoformat(),
            }
            for g in goals
        ],
        "expenses": [
            {
                "spent_on": e.spent_on.isoformat(),
                "category": e.category,
                "amount_kobo": e.amount_kobo,
                "note": e.note,
            }
            for e in expenses
        ],
        "plans": [
            {
                "effective_from": p.effective_from.isoformat(),
                "status": p.status,
                "income_monthly_kobo": p.income_monthly_kobo,
                "needs_total_kobo": p.needs_total_kobo,
            }
            for p in plans
        ],
        "reviews": [
            {
                "kind": r.kind,
                "period_start": r.period_start.isoformat(),
                "period_end": r.period_end.isoformat(),
                "spent_kobo": r.spent_kobo,
                "allowance_kobo": r.allowance_kobo,
                "status": r.status,
                "message": r.message,
            }
            for r in reviews
        ],
    }

    return Response(
        content=json.dumps(payload, indent=2),
        media_type="application/json; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="budget-buddy-export.json"'},
    )


@router.get("/export.csv")
def export_all_csv(
    db: Session = Depends(get_db),
    user: User = Depends(require_onboarded_user),
):
    expenses = db.scalars(
        select(Expense).where(Expense.user_id == user.id).order_by(Expense.spent_on.desc())
    ).all()
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["Type", "Date", "Category", "Amount (NGN)", "Note"])
    for e in expenses:
        writer.writerow(
            [
                "Expense",
                e.spent_on.isoformat(),
                category_label(e.category),
                f"{e.amount_kobo / 100:.2f}",
                _sanitize_csv_cell(e.note),
            ]
        )
    return Response(
        content=buf.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="budget-buddy-export.csv"'},
    )


@router.post("/delete-account", dependencies=[Depends(enforce_csrf)])
def delete_account(
    request: Request,
    confirm_text: str = Form(""),
    db: Session = Depends(get_db),
    user: User = Depends(require_onboarded_user),
):
    if confirm_text.strip() != "DELETE":
        return RedirectResponse(
            f"/settings?error={quote('Please type DELETE in capital letters to delete your account.')}",
            status_code=303,
        )

    db.delete(user)
    db.commit()
    request.session.clear()
    return RedirectResponse("/", status_code=303)
