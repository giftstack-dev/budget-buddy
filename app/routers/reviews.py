"""Weekly and monthly reviews route with idempotent auto-generation."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session

from app.config import today_lagos
from app.database import get_db
from app.deps import require_onboarded_user, template_context, templates
from app.models import User
from app.services.review_service import ensure_due_reviews

router = APIRouter()


@router.get("/reviews", response_class=HTMLResponse)
def reviews_page(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_onboarded_user),
):
    reviews = ensure_due_reviews(db, user.id, today=today_lagos())
    return templates.TemplateResponse(
        request,
        "pages/reviews.html",
        template_context(
            request,
            user=user,
            active_nav="reviews",
            reviews=reviews,
        ),
    )
