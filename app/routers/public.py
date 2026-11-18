"""Public landing, help FAQ, and privacy pages."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_optional_user, template_context, templates
from app.models import Profile, User

router = APIRouter()

FAQ_ITEMS: list[tuple[str, str]] = [
    (
        "What is Budget Buddy?",
        "Budget Buddy is a personal money planner built for salary and wage earners in Nigeria. It turns your income, bills, and goals into a clear monthly plan and gives kind weekly feedback on your daily spending.",
    ),
    (
        "How does the needs-first plan work?",
        "First, Budget Buddy sets aside money for essentials like food, rent (divided across 12 months), transport, utilities, and family support. From what remains, it funds a 5% buffer, your emergency safety net, an optional December festive fund, your goals, and finally your everyday wants.",
    ),
    (
        "Why does the app ask about yearly rent and school fees?",
        "Large bills like annual rent or termly school fees often cause stress when they arrive all at once. Budget Buddy spreads yearly costs over 12 months and termly fees over 4 months so the money is waiting when due.",
    ),
    (
        "What is 'Safe to spend today'?",
        "It takes your remaining variable spending allowance for the current pay cycle and divides it by the days left until your next payday (including today). If you spend less today, tomorrow's safe amount rises slightly.",
    ),
    (
        "What if I have a day where I spend nothing?",
        "Tap the 'No spending today' button on your Home dashboard. It records a ₦0 log so your weekly review knows you tracked that day and rewards your streak.",
    ),
    (
        "What does 'Low data' mean in a weekly review?",
        "If fewer than 3 days in a 7-day block have a log, Budget Buddy avoids guessing or judging your week and gently reminds you to log daily.",
    ),
    (
        "What is the difference between 'Build my plan' and 'Just track my spending'?",
        "'Build my plan' creates the full needs-first monthly budget and category allowances. 'Just track my spending' subtracts your optional fixed costs and a chosen savings percentage from income, then tracks your daily spending against the rest.",
    ),
    (
        "Can I use Budget Buddy if my business or wage income varies?",
        "Yes. Choose 'Irregular business or freelance' during setup and enter a realistic average monthly income. Version one plans using that average month.",
    ),
    (
        "Does Budget Buddy connect to my bank or ask for my BVN?",
        "No. We never ask for bank account numbers, debit card details, BVN, or NIN. You stay in complete control of what you enter.",
    ),
    (
        "How do I save or delete my data?",
        "Visit Settings at any time to download your full data as CSV or JSON, or permanently delete your account and all records.",
    ),
]


@router.get("/", response_class=HTMLResponse)
def landing(
    request: Request,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_optional_user),
):
    if user is not None:
        profile = db.query(Profile).filter(Profile.user_id == user.id).first()
        if profile and profile.onboarding_done:
            return RedirectResponse("/home", status_code=303)
        return RedirectResponse("/onboarding", status_code=303)
    return templates.TemplateResponse(
        request,
        "pages/landing.html",
        template_context(request, user=None),
    )


@router.get("/help", response_class=HTMLResponse)
def help_page(
    request: Request,
    user: User | None = Depends(get_optional_user),
):
    return templates.TemplateResponse(
        request,
        "pages/help.html",
        template_context(request, user=user, active_nav="help", faqs=FAQ_ITEMS),
    )


@router.get("/privacy", response_class=HTMLResponse)
def privacy_page(
    request: Request,
    user: User | None = Depends(get_optional_user),
):
    return templates.TemplateResponse(
        request,
        "pages/privacy.html",
        template_context(request, user=user, active_nav="privacy"),
    )
