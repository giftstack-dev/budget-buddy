"""Savings goals management routes."""

from __future__ import annotations

from datetime import date
from urllib.parse import quote

from fastapi import APIRouter, Depends, Form, HTTPException, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import today_lagos
from app.database import get_db
from app.deps import enforce_csrf, require_onboarded_user, template_context, templates
from app.engine.planner import compute_plan
from app.models import Goal, User
from app.money import parse_naira
from app.services.plan_service import build_plan_input_for_user, create_plan_version

router = APIRouter(prefix="/goals")


@router.get("", response_class=HTMLResponse)
def goals_page(
    request: Request,
    saved: str | None = None,
    error: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_onboarded_user),
):
    today = today_lagos()
    goals = db.scalars(
        select(Goal).where(Goal.user_id == user.id).order_by(Goal.deadline.asc(), Goal.id.asc())
    ).all()
    plan_input = build_plan_input_for_user(db, user.id, as_of_date=today)
    plan_output = compute_plan(plan_input)
    results_by_id = {g.goal_id: g for g in plan_output.goal_results}

    goal_cards = []
    for g in goals:
        res = results_by_id.get(g.id)
        pct = min(100, (g.saved_kobo * 100) // max(1, g.target_kobo))
        goal_cards.append(
            {
                "goal": g,
                "result": res,
                "pct": pct,
            }
        )

    return templates.TemplateResponse(
        request,
        "pages/goals.html",
        template_context(
            request,
            user=user,
            active_nav="goals",
            goal_cards=goal_cards,
            saved_notice=saved,
            error_notice=error,
        ),
    )


@router.post("/add", dependencies=[Depends(enforce_csrf)])
def add_goal(
    name: str = Form(""),
    target: str = Form(""),
    saved: str = Form("0"),
    deadline: str = Form(""),
    db: Session = Depends(get_db),
    user: User = Depends(require_onboarded_user),
):
    clean_name = name.strip()
    if not clean_name:
        return RedirectResponse(f"/goals?error={quote('Please give your goal a name.')}", status_code=303)

    try:
        target_kobo = parse_naira(target)
        if target_kobo <= 0:
            raise ValueError("Target must be greater than ₦0.")
        saved_kobo = parse_naira(saved or "0")
    except ValueError as exc:
        return RedirectResponse(f"/goals?error={quote(str(exc))}", status_code=303)

    try:
        parsed_deadline = date.fromisoformat(deadline.strip())
    except ValueError:
        return RedirectResponse(f"/goals?error={quote('Please enter a valid target date.')}", status_code=303)

    db.add(
        Goal(
            user_id=user.id,
            name=clean_name[:120],
            target_kobo=target_kobo,
            saved_kobo=saved_kobo,
            deadline=parsed_deadline,
        )
    )
    db.commit()
    create_plan_version(db, user.id, effective_from=today_lagos())
    return RedirectResponse(f"/goals?saved={quote('Goal added and plan updated.')}", status_code=303)


@router.post("/{goal_id}/update", dependencies=[Depends(enforce_csrf)])
def update_goal(
    goal_id: int,
    name: str = Form(""),
    target: str = Form(""),
    saved: str = Form("0"),
    deadline: str = Form(""),
    db: Session = Depends(get_db),
    user: User = Depends(require_onboarded_user),
):
    goal = db.scalar(select(Goal).where(Goal.id == goal_id, Goal.user_id == user.id))
    if goal is None:
        raise HTTPException(status_code=404, detail="Goal not found.")

    clean_name = name.strip()
    if not clean_name:
        return RedirectResponse(f"/goals?error={quote('Goal name cannot be empty.')}", status_code=303)

    try:
        target_kobo = parse_naira(target)
        if target_kobo <= 0:
            raise ValueError("Target must be greater than ₦0.")
        saved_kobo = parse_naira(saved or "0")
    except ValueError as exc:
        return RedirectResponse(f"/goals?error={quote(str(exc))}", status_code=303)

    try:
        parsed_deadline = date.fromisoformat(deadline.strip())
    except ValueError:
        return RedirectResponse(f"/goals?error={quote('Please enter a valid target date.')}", status_code=303)

    goal.name = clean_name[:120]
    goal.target_kobo = target_kobo
    goal.saved_kobo = saved_kobo
    goal.deadline = parsed_deadline
    db.commit()
    create_plan_version(db, user.id, effective_from=today_lagos())
    return RedirectResponse(f"/goals?saved={quote('Goal updated.')}", status_code=303)


@router.post("/{goal_id}/delete", dependencies=[Depends(enforce_csrf)])
def delete_goal(
    goal_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_onboarded_user),
):
    goal = db.scalar(select(Goal).where(Goal.id == goal_id, Goal.user_id == user.id))
    if goal is None:
        raise HTTPException(status_code=404, detail="Goal not found.")

    db.delete(goal)
    db.commit()
    create_plan_version(db, user.id, effective_from=today_lagos())
    return RedirectResponse(f"/goals?saved={quote('Goal removed.')}", status_code=303)
