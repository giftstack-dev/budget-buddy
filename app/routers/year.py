"""12-month Year View route with sinking funds and emergency milestones."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session

from app.config import today_lagos
from app.database import get_db
from app.deps import require_onboarded_user, template_context, templates
from app.engine.planner import compute_plan
from app.engine.year import build_year_view
from app.models import User
from app.services.plan_service import build_plan_input_for_user

router = APIRouter()


@router.get("/year", response_class=HTMLResponse)
def year_view(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_onboarded_user),
):
    today = today_lagos()
    plan_input = build_plan_input_for_user(db, user.id, as_of_date=today)
    plan_output = compute_plan(plan_input)
    months = build_year_view(plan_input, plan_output, start_date=today)

    return templates.TemplateResponse(
        request,
        "pages/year.html",
        template_context(
            request,
            user=user,
            active_nav="year",
            plan_output=plan_output,
            months=months,
        ),
    )
