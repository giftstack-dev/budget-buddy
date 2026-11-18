"""5-step resumable server-side onboarding wizard."""

from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.config import today_lagos
from app.database import get_db
from app.deps import enforce_csrf, require_user, template_context, templates
from app.engine.normalize import NEEDS_CATEGORIES
from app.models import FixedCost, Goal, IncomeSource, Profile, User
from app.money import format_naira, parse_naira
from app.services.plan_service import create_plan_version

router = APIRouter(prefix="/onboarding")

HOUSEHOLD_OPTIONS = [
    ("alone", "Living alone"),
    ("partner", "With a partner"),
    ("family", "Family with dependents"),
    ("roommates", "Sharing with roommates"),
]

HOUSING_OPTIONS = [
    ("rent", "Renting"),
    ("own", "Own home"),
    ("family_house", "Family house"),
    ("company_housing", "Company or official housing"),
]

EMPLOYMENT_OPTIONS = [
    ("salary", "Monthly salary earner"),
    ("corps_member", "NYSC corps member"),
    ("student_allowance", "Student allowance"),
    ("wages", "Weekly or daily wages"),
    ("business_irregular", "Irregular business or freelance"),
]

DEFAULT_COST_ROWS: list[dict[str, str]] = [
    {"category": "rent", "label": "Rent", "frequency": "yearly", "example": "For example: 480,000 a year"},
    {"category": "utilities", "label": "Power, water & cooking gas", "frequency": "monthly", "example": "For example: 12,000 a month"},
    {"category": "data_airtime", "label": "Data & airtime", "frequency": "monthly", "example": "For example: 10,000 a month"},
    {"category": "transport", "label": "Transport & fuel", "frequency": "monthly", "example": "For example: 25,000 a month"},
    {"category": "food", "label": "Food & groceries", "frequency": "monthly", "example": "For example: 60,000 a month"},
    {"category": "school_fees", "label": "School fees (per term)", "frequency": "termly", "example": "For example: 90,000 per term"},
    {"category": "family_support", "label": "Family support", "frequency": "monthly", "example": "For example: 15,000 a month"},
    {"category": "debt_payments", "label": "Loan payments", "frequency": "monthly", "example": "For example: 20,000 a month"},
    {"category": "giving", "label": "Giving & tithe", "frequency": "monthly", "example": "For example: 10,000 a month"},
    {"category": "insurance_subscriptions", "label": "Insurance & subscriptions", "frequency": "monthly", "example": "For example: 5,000 a month"},
]


def _get_or_create_profile(db: Session, user: User) -> Profile:
    profile = db.scalar(select(Profile).where(Profile.user_id == user.id))
    if profile is None:
        profile = Profile(user_id=user.id, display_name="Friend", onboarding_step=1)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


def _kobo_to_input_str(kobo: int) -> str:
    if kobo <= 0:
        return ""
    naira, rem = divmod(kobo, 100)
    if rem == 0:
        return f"{naira:,}"
    return f"{naira:,}.{rem:02d}"


def _build_cost_rows_for_user(db: Session, user_id: int) -> list[dict[str, str]]:
    existing = db.scalars(select(FixedCost).where(FixedCost.user_id == user_id).order_by(FixedCost.id.asc())).all()
    if not existing:
        return [
            {
                "category": row["category"],
                "label": row["label"],
                "amount": "",
                "frequency": row["frequency"],
                "due_month": "",
                "example": row["example"],
            }
            for row in DEFAULT_COST_ROWS
        ]

    example_map = {r["category"]: r["example"] for r in DEFAULT_COST_ROWS}
    return [
        {
            "category": c.category,
            "label": c.label,
            "amount": _kobo_to_input_str(c.amount_kobo),
            "frequency": c.frequency,
            "due_month": str(c.due_month) if c.due_month else "",
            "example": example_map.get(c.category, "For example: 10,000 a month"),
        }
        for c in existing
    ]


def _render_step(
    request: Request,
    db: Session,
    user: User,
    profile: Profile,
    step: int,
    errors: list[str] | None = None,
    override_data: dict | None = None,
    status_code: int = 200,
):
    incomes = db.scalars(
        select(IncomeSource).where(IncomeSource.user_id == user.id).order_by(IncomeSource.is_primary.desc(), IncomeSource.id.asc())
    ).all()
    primary_inc = next((i for i in incomes if i.is_primary), incomes[0] if incomes else None)
    extra_inc = next((i for i in incomes if not i.is_primary), None)
    goals = db.scalars(select(Goal).where(Goal.user_id == user.id).order_by(Goal.deadline.asc(), Goal.id.asc())).all()

    ctx = {
        "step": step,
        "profile": profile,
        "errors": errors or [],
        "household_options": HOUSEHOLD_OPTIONS,
        "housing_options": HOUSING_OPTIONS,
        "employment_options": EMPLOYMENT_OPTIONS,
        "primary_income": primary_inc,
        "extra_income": extra_inc,
        "cost_rows": _build_cost_rows_for_user(db, user.id),
        "needs_categories": NEEDS_CATEGORIES,
        "goals": goals,
        "kobo_to_input": _kobo_to_input_str,
    }
    if override_data:
        ctx.update(override_data)
    return templates.TemplateResponse(
        request,
        "pages/onboarding.html",
        template_context(request, user=user, **ctx),
        status_code=status_code,
    )


@router.get("", response_class=HTMLResponse)
def onboarding_view(
    request: Request,
    step: int | None = Query(default=None),
    db: Session = Depends(get_db),
    user: User = Depends(require_user),
):
    profile = _get_or_create_profile(db, user)
    if profile.onboarding_done and step is None:
        return RedirectResponse("/home", status_code=303)
    target_step = profile.onboarding_step if step is None else max(1, min(5, step))
    if not profile.onboarding_done:
        target_step = min(target_step, max(1, profile.onboarding_step))
    return _render_step(request, db, user, profile, target_step)


@router.post("/step/1", response_class=HTMLResponse, dependencies=[Depends(enforce_csrf)])
async def onboarding_step_1(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_user),
):
    profile = _get_or_create_profile(db, user)
    form = await request.form()
    display_name = str(form.get("display_name", "")).strip()
    city = str(form.get("city", "")).strip()
    household_type = str(form.get("household_type", "alone")).strip()
    dependents_raw = str(form.get("dependents_count", "0")).strip()
    housing_type = str(form.get("housing_type", "rent")).strip()
    employment_type = str(form.get("employment_type", "salary")).strip()

    errors: list[str] = []
    if not display_name:
        errors.append("Please tell us what name to call you.")
    try:
        dependents_count = int(dependents_raw or "0")
        if dependents_count < 0 or dependents_count > 30:
            errors.append("Dependents count must be between 0 and 30.")
    except ValueError:
        dependents_count = 0
        errors.append("Please enter a whole number for dependents.")

    if household_type not in {k for k, _ in HOUSEHOLD_OPTIONS}:
        errors.append("Please choose a valid household type.")
    if housing_type not in {k for k, _ in HOUSING_OPTIONS}:
        errors.append("Please choose a valid housing option.")
    if employment_type not in {k for k, _ in EMPLOYMENT_OPTIONS}:
        errors.append("Please choose a valid income type.")

    if errors:
        return _render_step(
            request,
            db,
            user,
            profile,
            1,
            errors=errors,
            override_data={
                "form_step1": {
                    "display_name": display_name,
                    "city": city,
                    "household_type": household_type,
                    "dependents_count": dependents_raw,
                    "housing_type": housing_type,
                    "employment_type": employment_type,
                }
            },
            status_code=400,
        )

    profile.display_name = display_name[:100]
    profile.city = city[:100]
    profile.household_type = household_type
    profile.dependents_count = dependents_count
    profile.housing_type = housing_type
    profile.employment_type = employment_type
    profile.onboarding_step = max(profile.onboarding_step, 2)
    db.commit()
    return RedirectResponse("/onboarding?step=2", status_code=303)


@router.post("/step/2", response_class=HTMLResponse, dependencies=[Depends(enforce_csrf)])
async def onboarding_step_2(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_user),
):
    profile = _get_or_create_profile(db, user)
    form = await request.form()

    label = str(form.get("primary_label", "Main pay")).strip() or "Main pay"
    amount_raw = str(form.get("primary_amount", "")).strip()
    frequency = str(form.get("primary_frequency", "monthly")).strip()
    next_pay_raw = str(form.get("next_pay_date", "")).strip()

    extra_label = str(form.get("extra_label", "")).strip()
    extra_amount_raw = str(form.get("extra_amount", "")).strip()
    extra_freq = str(form.get("extra_frequency", "monthly")).strip()

    errors: list[str] = []
    primary_kobo = 0
    try:
        primary_kobo = parse_naira(amount_raw)
        if primary_kobo <= 0:
            errors.append("Your main income must be greater than ₦0.")
    except ValueError as exc:
        errors.append(f"Main income: {exc}")

    if frequency not in {"monthly", "weekly", "biweekly"}:
        errors.append("Please choose monthly, weekly, or every 2 weeks.")

    try:
        next_pay_date = date.fromisoformat(next_pay_raw)
    except ValueError:
        next_pay_date = today_lagos()
        errors.append("Please enter a valid next payday date.")

    extra_kobo = 0
    if extra_amount_raw:
        try:
            extra_kobo = parse_naira(extra_amount_raw)
        except ValueError as exc:
            errors.append(f"Other regular income: {exc}")
        if extra_freq not in {"monthly", "weekly", "biweekly"}:
            errors.append("Please choose a valid frequency for your other income.")

    if errors:
        return _render_step(
            request,
            db,
            user,
            profile,
            2,
            errors=errors,
            override_data={
                "form_step2": {
                    "primary_label": label,
                    "primary_amount": amount_raw,
                    "primary_frequency": frequency,
                    "next_pay_date": next_pay_raw,
                    "extra_label": extra_label,
                    "extra_amount": extra_amount_raw,
                    "extra_frequency": extra_freq,
                }
            },
            status_code=400,
        )

    db.execute(delete(IncomeSource).where(IncomeSource.user_id == user.id))
    db.add(
        IncomeSource(
            user_id=user.id,
            label=label[:120],
            amount_kobo=primary_kobo,
            frequency=frequency,
            next_pay_date=next_pay_date,
            is_primary=True,
        )
    )
    if extra_kobo > 0:
        db.add(
            IncomeSource(
                user_id=user.id,
                label=(extra_label or "Side income")[:120],
                amount_kobo=extra_kobo,
                frequency=extra_freq,
                next_pay_date=next_pay_date,
                is_primary=False,
            )
        )
    profile.onboarding_step = max(profile.onboarding_step, 3)
    db.commit()
    return RedirectResponse("/onboarding?step=3", status_code=303)


@router.post("/step/3", response_class=HTMLResponse, dependencies=[Depends(enforce_csrf)])
async def onboarding_step_3(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_user),
):
    profile = _get_or_create_profile(db, user)
    form = await request.form()
    action = str(form.get("action", "continue")).strip()

    categories = [str(v) for v in form.getlist("cost_category")]
    labels = [str(v).strip() for v in form.getlist("cost_label")]
    amounts = [str(v).strip() for v in form.getlist("cost_amount")]
    frequencies = [str(v).strip() for v in form.getlist("cost_frequency")]
    due_months = [str(v).strip() for v in form.getlist("cost_due_month")]

    submitted_rows: list[dict[str, str]] = []
    errors: list[str] = []
    parsed_costs: list[FixedCost] = []

    row_count = max(len(categories), len(labels), len(amounts), len(frequencies), len(due_months))
    for idx in range(row_count):
        cat = categories[idx] if idx < len(categories) else "household"
        lbl = labels[idx] if idx < len(labels) else ""
        amt_raw = amounts[idx] if idx < len(amounts) else ""
        freq = frequencies[idx] if idx < len(frequencies) else "monthly"
        due_raw = due_months[idx] if idx < len(due_months) else ""

        submitted_rows.append(
            {
                "category": cat,
                "label": lbl,
                "amount": amt_raw,
                "frequency": freq,
                "due_month": due_raw,
                "example": "For example: 15,000 a month",
            }
        )

        if action == "continue" and amt_raw:
            if cat not in NEEDS_CATEGORIES:
                cat = "household"
            if freq not in {"weekly", "monthly", "termly", "yearly"}:
                errors.append(f"Row {idx + 1}: please pick a valid frequency.")
                continue
            try:
                amt_kobo = parse_naira(amt_raw)
            except ValueError as exc:
                errors.append(f"{lbl or f'Row {idx + 1}'}: {exc}")
                continue

            due_month_val: int | None = None
            if due_raw:
                try:
                    due_month_val = int(due_raw)
                    if not (1 <= due_month_val <= 12):
                        errors.append(f"{lbl or f'Row {idx + 1}'}: due month must be 1 to 12.")
                        continue
                except ValueError:
                    errors.append(f"{lbl or f'Row {idx + 1}'}: due month must be 1 to 12.")
                    continue

            if amt_kobo > 0:
                parsed_costs.append(
                    FixedCost(
                        user_id=user.id,
                        category=cat,
                        label=(lbl or cat.replace("_", " ").title())[:120],
                        amount_kobo=amt_kobo,
                        frequency=freq,
                        due_month=due_month_val,
                        is_need=True,
                    )
                )

    if action == "add_rows":
        for _ in range(3):
            submitted_rows.append(
                {
                    "category": "household",
                    "label": "",
                    "amount": "",
                    "frequency": "monthly",
                    "due_month": "",
                    "example": "For example: 10,000 a month",
                }
            )
        return _render_step(
            request,
            db,
            user,
            profile,
            3,
            errors=[],
            override_data={"cost_rows": submitted_rows},
        )

    if errors:
        return _render_step(
            request,
            db,
            user,
            profile,
            3,
            errors=errors,
            override_data={"cost_rows": submitted_rows},
            status_code=400,
        )

    db.execute(delete(FixedCost).where(FixedCost.user_id == user.id))
    for cost in parsed_costs:
        db.add(cost)
    profile.onboarding_step = max(profile.onboarding_step, 4)
    db.commit()
    return RedirectResponse("/onboarding?step=4", status_code=303)


@router.post("/step/4", response_class=HTMLResponse, dependencies=[Depends(enforce_csrf)])
async def onboarding_step_4(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_user),
):
    profile = _get_or_create_profile(db, user)
    form = await request.form()

    em_months_raw = str(form.get("emergency_months", "3")).strip()
    em_saved_raw = str(form.get("emergency_savings", "0")).strip() or "0"
    festive_enabled = str(form.get("festive_fund_enabled", "")).lower() in {"1", "true", "on", "yes"}

    errors: list[str] = []
    try:
        em_months = int(em_months_raw)
        if not (1 <= em_months <= 12):
            errors.append("Emergency fund target must be between 1 and 12 months.")
    except ValueError:
        em_months = 3
        errors.append("Please enter a valid number of emergency months.")

    try:
        em_saved_kobo = parse_naira(em_saved_raw)
    except ValueError as exc:
        em_saved_kobo = 0
        errors.append(f"Emergency savings so far: {exc}")

    goal_names = [str(v).strip() for v in form.getlist("goal_name")]
    goal_targets = [str(v).strip() for v in form.getlist("goal_target")]
    goal_saved = [str(v).strip() for v in form.getlist("goal_saved")]
    goal_deadlines = [str(v).strip() for v in form.getlist("goal_deadline")]

    parsed_goals: list[Goal] = []
    for idx in range(min(3, max(len(goal_names), len(goal_targets)))):
        name = goal_names[idx] if idx < len(goal_names) else ""
        t_raw = goal_targets[idx] if idx < len(goal_targets) else ""
        s_raw = (goal_saved[idx] if idx < len(goal_saved) else "") or "0"
        d_raw = goal_deadlines[idx] if idx < len(goal_deadlines) else ""

        if not name and not t_raw:
            continue
        if not name:
            errors.append(f"Goal {idx + 1}: please enter a goal name.")
            continue
        try:
            target_kobo = parse_naira(t_raw)
            if target_kobo <= 0:
                errors.append(f"{name}: target amount must be greater than ₦0.")
                continue
        except ValueError as exc:
            errors.append(f"{name} target: {exc}")
            continue
        try:
            saved_kobo = parse_naira(s_raw)
        except ValueError as exc:
            errors.append(f"{name} saved so far: {exc}")
            continue
        try:
            deadline = date.fromisoformat(d_raw)
        except ValueError:
            errors.append(f"{name}: please choose a valid target date.")
            continue

        parsed_goals.append(
            Goal(
                user_id=user.id,
                name=name[:120],
                target_kobo=target_kobo,
                saved_kobo=saved_kobo,
                deadline=deadline,
            )
        )

    if errors:
        return _render_step(
            request,
            db,
            user,
            profile,
            4,
            errors=errors,
            status_code=400,
        )

    profile.emergency_months = em_months
    profile.emergency_savings_kobo = em_saved_kobo
    profile.festive_fund_enabled = festive_enabled
    db.execute(delete(Goal).where(Goal.user_id == user.id))
    for g in parsed_goals:
        db.add(g)
    profile.onboarding_step = max(profile.onboarding_step, 5)
    db.commit()
    return RedirectResponse("/onboarding?step=5", status_code=303)


@router.post("/step/5", response_class=HTMLResponse, dependencies=[Depends(enforce_csrf)])
async def onboarding_step_5(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_user),
):
    profile = _get_or_create_profile(db, user)
    form = await request.form()
    mode = str(form.get("mode", "planner")).strip()
    savings_pct_raw = str(form.get("savings_rate_pct", "10")).strip() or "10"

    if mode not in {"planner", "log_only"}:
        return _render_step(
            request, db, user, profile, 5, errors=["Please pick one of the two modes."], status_code=400
        )

    try:
        savings_pct = max(0, min(80, int(savings_pct_raw)))
    except ValueError:
        savings_pct = 10

    profile.mode = mode
    profile.savings_rate_pct = savings_pct
    profile.onboarding_step = 5
    profile.onboarding_done = True
    db.commit()

    create_plan_version(db, user.id, effective_from=today_lagos())
    return RedirectResponse("/home", status_code=303)


def format_cost_hint(kobo: int) -> str:
    return format_naira(kobo)
