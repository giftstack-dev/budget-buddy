"""Demo user creation route."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.deps import enforce_csrf
from app.security import get_csrf_token
from app.services.demo_service import create_demo_user

router = APIRouter()


@router.post("/demo", dependencies=[Depends(enforce_csrf)])
def start_demo(request: Request, db: Session = Depends(get_db)):
    if not settings.demo_enabled:
        raise HTTPException(status_code=404, detail="Demo mode is disabled.")

    demo_user = create_demo_user(db)
    request.session.clear()
    request.session["user_id"] = demo_user.id
    get_csrf_token(request)
    return RedirectResponse("/home", status_code=303)
