"""FastAPI application entry point for Budget Buddy."""

from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.sessions import SessionMiddleware

from app.config import settings
from app.deps import RedirectTo, template_context, templates
from app.routers import (
    auth,
    dashboard,
    demo,
    goals,
    onboarding,
    plan,
    public,
    reviews,
    spending,
    year,
)
from app.routers import settings as settings_router
from app.security import SecurityHeadersMiddleware

STATIC_DIR = Path(__file__).resolve().parent / "static"


def create_app() -> FastAPI:
    """Create and configure the Budget Buddy FastAPI application."""
    application = FastAPI(
        title="Budget Buddy",
        description="Personal money planner for salary and wage earners in Nigeria.",
        docs_url=None if settings.app_env == "production" else "/docs",
        redoc_url=None,
    )

    application.add_middleware(
        SessionMiddleware,
        secret_key=settings.secret_key,
        session_cookie="bb_session",
        same_site="lax",
        https_only=settings.cookie_secure,
        max_age=60 * 60 * 24 * 14,
    )
    application.add_middleware(SecurityHeadersMiddleware)

    application.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

    application.include_router(public.router)
    application.include_router(auth.router)
    application.include_router(demo.router)
    application.include_router(onboarding.router)
    application.include_router(dashboard.router)
    application.include_router(spending.router)
    application.include_router(plan.router)
    application.include_router(year.router)
    application.include_router(reviews.router)
    application.include_router(goals.router)
    application.include_router(settings_router.router)

    @application.exception_handler(RedirectTo)
    async def _handle_redirect(_request: Request, exc: RedirectTo) -> RedirectResponse:
        return RedirectResponse(exc.url, status_code=303)

    @application.exception_handler(StarletteHTTPException)
    async def _handle_http_error(request: Request, exc: StarletteHTTPException) -> HTMLResponse:
        if exc.status_code == 404:
            return templates.TemplateResponse(
                request,
                "errors/404.html",
                template_context(request, detail=exc.detail),
                status_code=404,
            )
        return templates.TemplateResponse(
            request,
            "errors/500.html",
            template_context(
                request,
                status_code=exc.status_code,
                detail=exc.detail if exc.status_code < 500 else "Something went wrong.",
            ),
            status_code=exc.status_code,
        )

    @application.exception_handler(HTTPException)
    async def _handle_fastapi_http_error(request: Request, exc: HTTPException) -> HTMLResponse:
        if exc.status_code == 404:
            return templates.TemplateResponse(
                request,
                "errors/404.html",
                template_context(request, detail=exc.detail),
                status_code=404,
            )
        return templates.TemplateResponse(
            request,
            "errors/500.html",
            template_context(request, status_code=exc.status_code, detail=exc.detail),
            status_code=exc.status_code,
        )

    @application.exception_handler(Exception)
    async def _handle_unexpected_error(request: Request, _exc: Exception) -> HTMLResponse:
        return templates.TemplateResponse(
            request,
            "errors/500.html",
            template_context(
                request,
                status_code=500,
                detail="An unexpected error happened. Your saved data is safe.",
            ),
            status_code=500,
        )

    return application


app = create_app()
