"""Monthly Plan view and non-destructive What-If scenario calculator."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Form, Request
from fastapi.responses import HTMLResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import today_lagos
from app.database import get_db
from app.deps import enforce_csrf, require_onboarded_user, template_context, templates
from app.engine.whatif import WhatIfComparison, run_whatif
from app.models import PlanItem, Profile, User
from app.money import parse_naira
from app.services.plan_service import (
    build_plan_input_for_user,
    create_plan_version,
    get_latest_plan,
)

router = APIRouter(prefix="/plan")


def _render_plan_page(
    request: Request,
    db: Session,
    user: User,
    whatif_result: WhatIfComparison | None = None,
    whatif_error: str | None = None,
    selected_scenario: str = "income_drop",
    value_input: str = "",
    status_code: int = 200,
):
    today = today_lagos()
    profile = db.scalar(select(Profile).where(Profile.user_id == user.id))
    plan = get_latest_plan(db, user.id)
    if plan is None:
        plan = create_plan_version(db, user.id, effective_from=today)

    items = db.scalars(
        select(PlanItem).where(PlanItem.plan_id == plan.id).order_by(PlanItem.id.asc())
    ).all()

    grouped = {
        "needs": [i for i in items if i.group == "needs"],
        "savings": [i for i in items if i.group == "savings"],
        "wants": [i for i in items if i.group == "wants"],
        "buffer": [i for i in items if i.group == "buffer"],
    }

    return templates.TemplateResponse(
        request,
        "pages/plan.html",
        template_context(
            request,
            user=user,
            active_nav="plan",
            profile=profile,
            plan=plan,
            summary=plan.summary or {},
            grouped=grouped,
            whatif_result=whatif_result,
            whatif_error=whatif_error,
            selected_scenario=selected_scenario,
            value_input=value_input,
        ),
        status_code=status_code,
    )


@router.get("", response_class=HTMLResponse)
def plan_view(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_onboarded_user),
):
    return _render_plan_page(request, db, user)


@router.post("/whatif", response_class=HTMLResponse, dependencies=[Depends(enforce_csrf)])
def plan_whatif(
    request: Request,
    scenario: str = Form("income_drop"),
    value: str = Form(""),
    db: Session = Depends(get_db),
    user: User = Depends(require_onboarded_user),
):
    base_input = build_plan_input_for_user(db, user.id, as_of_date=today_lagos())
    error: str | None = None
    parsed_val = 0

    if scenario in {"income_drop", "rent_rise"}:
        try:
            parsed_val = int(value.strip())
            if parsed_val < 0 or (scenario == "income_drop" and parsed_val > 100):
                error = "Please enter a percentage between 0 and 100."
        except ValueError:
            error = "Please enter a whole-number percentage, for example 20."
    elif scenario in {"add_dependent", "add_loan"}:
        try:
            parsed_val = parse_naira(value)
        except ValueError as exc:
            error = str(exc)
    else:
        error = "Please pick one of the four scenarios."

    if error:
        return _render_plan_page(
            request,
            db,
            user,
            whatif_error=error,
            selected_scenario=scenario,
            value_input=value,
            status_code=400,
        )

    comparison = run_whatif(base_input, scenario, parsed_val)
    return _render_plan_page(
        request,
        db,
        user,
        whatif_result=comparison,
        selected_scenario=scenario,
        value_input=value,
    )
