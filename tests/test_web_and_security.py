"""Integration, security, and migration tests for the Budget Buddy web application."""

from __future__ import annotations

import re
import subprocess
from datetime import date, timedelta
from pathlib import Path

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import now_lagos, today_lagos
from app.models import Expense, Goal, IncomeSource, Plan, Profile, User
from app.security import hash_password
from app.services.demo_service import cleanup_expired_demo_users, create_demo_user
from app.services.plan_service import create_plan_version
from app.services.review_service import ensure_due_reviews

_CSRF_RE = re.compile(r'name="csrf_token"\s+value="([^"]+)"')


def _extract_csrf(html: str) -> str:
    match = _CSRF_RE.search(html)
    assert match is not None, "CSRF token missing from HTML page"
    return match.group(1)


def _register_and_onboard(
    client: TestClient,
    email: str,
    name: str = "Ada",
    password: str = "StrongPass123!",
) -> None:
    reg_page = client.get("/register")
    csrf = _extract_csrf(reg_page.text)
    resp = client.post(
        "/register",
        data={
            "csrf_token": csrf,
            "display_name": name,
            "email": email,
            "phone": "",
            "password": password,
            "confirm_password": password,
        },
        follow_redirects=True,
    )
    assert resp.status_code == 200
    assert "About you" in resp.text

    # Step 1
    csrf = _extract_csrf(resp.text)
    r1 = client.post(
        "/onboarding/step/1",
        data={
            "csrf_token": csrf,
            "display_name": name,
            "city": "Lagos",
            "household_type": "alone",
            "dependents_count": "0",
            "housing_type": "rent",
            "employment_type": "salary",
        },
        follow_redirects=True,
    )
    assert "What you earn" in r1.text

    # Step 2
    csrf = _extract_csrf(r1.text)
    pay_date = (today_lagos() + timedelta(days=12)).isoformat()
    r2 = client.post(
        "/onboarding/step/2",
        data={
            "csrf_token": csrf,
            "primary_label": "Salary",
            "primary_amount": "250,000",
            "primary_frequency": "monthly",
            "next_pay_date": pay_date,
        },
        follow_redirects=True,
    )
    assert "What you must pay" in r2.text

    # Step 3 (also exercise Add 3 more rows first)
    csrf = _extract_csrf(r2.text)
    r3_add = client.post(
        "/onboarding/step/3",
        data={
            "csrf_token": csrf,
            "action": "add_rows",
            "cost_category": ["rent", "food"],
            "cost_label": ["Rent", "Food"],
            "cost_amount": ["480,000", "60,000"],
            "cost_frequency": ["yearly", "monthly"],
            "cost_due_month": ["12", ""],
        },
    )
    assert r3_add.status_code == 200
    assert "480,000" in r3_add.text

    csrf = _extract_csrf(r3_add.text)
    r3 = client.post(
        "/onboarding/step/3",
        data={
            "csrf_token": csrf,
            "action": "continue",
            "cost_category": ["rent", "food", "transport"],
            "cost_label": ["Rent", "Food", "Transport"],
            "cost_amount": ["480,000", "60,000", "25,000"],
            "cost_frequency": ["yearly", "monthly", "monthly"],
            "cost_due_month": ["12", "", ""],
        },
        follow_redirects=True,
    )
    assert "Safety net" in r3.text

    # Step 4
    csrf = _extract_csrf(r3.text)
    r4 = client.post(
        "/onboarding/step/4",
        data={
            "csrf_token": csrf,
            "emergency_months": "3",
            "emergency_savings": "50,000",
            "festive_fund_enabled": "true",
            "goal_name": ["Laptop", "", ""],
            "goal_target": ["300,000", "", ""],
            "goal_saved": ["50,000", "", ""],
            "goal_deadline": [(today_lagos() + timedelta(days=240)).isoformat(), "", ""],
        },
        follow_redirects=True,
    )
    assert "Choose how you want to use Budget Buddy" in r4.text

    # Step 5
    csrf = _extract_csrf(r4.text)
    r5 = client.post(
        "/onboarding/step/5",
        data={"csrf_token": csrf, "mode": "planner", "savings_rate_pct": "10"},
        follow_redirects=True,
    )
    assert r5.status_code == 200
    assert "Safe to spend today" in r5.text


def test_security_headers_and_no_js_or_inline_styles(client: TestClient) -> None:
    resp = client.get("/")
    assert resp.status_code == 200
    assert "default-src 'self'" in resp.headers["Content-Security-Policy"]
    assert resp.headers["X-Content-Type-Options"] == "nosniff"
    assert resp.headers["X-Frame-Options"] == "DENY"
    assert resp.headers["Referrer-Policy"] == "same-origin"
    assert "<script" not in resp.text.lower()
    assert 'style="' not in resp.text.lower()


def test_registration_login_and_lockout(client: TestClient) -> None:
    _register_and_onboard(client, "user1@example.com", name="Tunde")

    # Logout first
    home = client.get("/home")
    csrf = _extract_csrf(home.text)
    client.post("/logout", data={"csrf_token": csrf}, follow_redirects=True)

    # 5 failed logins -> locked out on 6th attempt
    for _ in range(5):
        login_page = client.get("/login")
        csrf = _extract_csrf(login_page.text)
        bad = client.post(
            "/login",
            data={"csrf_token": csrf, "identifier": "user1@example.com", "password": "WrongPassword!"},
        )
        assert bad.status_code == 400
        assert "could not sign you in" in bad.text.lower()

    login_page = client.get("/login")
    csrf = _extract_csrf(login_page.text)
    locked = client.post(
        "/login",
        data={"csrf_token": csrf, "identifier": "user1@example.com", "password": "StrongPass123!"},
    )
    assert locked.status_code == 429
    assert "15 minutes" in locked.text


def test_csrf_rejection(client: TestClient) -> None:
    resp = client.post(
        "/register",
        data={
            "csrf_token": "invalid-token",
            "display_name": "Ada",
            "email": "csrf@example.com",
            "password": "StrongPass123!",
            "confirm_password": "StrongPass123!",
        },
    )
    assert resp.status_code == 403


def test_xss_escaping_in_display_name(client: TestClient) -> None:
    _register_and_onboard(client, "xss@example.com", name="<script>alert(1)</script>")
    home = client.get("/home")
    assert home.status_code == 200
    assert "<script>alert(1)</script>" not in home.text
    assert "&lt;script&gt;alert(1)&lt;/script&gt;" in home.text


def test_expense_crud_filter_pagination_and_csv(client: TestClient, db_session: Session) -> None:
    _register_and_onboard(client, "spender@example.com", name="Chisom")
    user = db_session.scalar(select(User).where(User.email == "spender@example.com"))
    assert user is not None

    # Add 28 expenses via DB + 1 via POST form + 1 no_spend via POST
    today = today_lagos()
    for i in range(28):
        db_session.add(
            Expense(
                user_id=user.id,
                spent_on=today - timedelta(days=i % 5),
                amount_kobo=1_000_00 + i * 100,
                category="food" if i % 2 == 0 else "transport",
                note=f"Item {i}",
            )
        )
    db_session.commit()

    home = client.get("/home")
    csrf = _extract_csrf(home.text)
    add_res = client.post(
        "/spending/add",
        data={
            "csrf_token": csrf,
            "action": "add",
            "amount": "2,500",
            "category": "eating_out",
            "spent_on": today.isoformat(),
            "note": "=SUM(A1:A2)",
            "next_url": "/spending",
        },
        follow_redirects=True,
    )
    assert add_res.status_code == 200
    assert "Page 1 of 2" in add_res.text

    page2 = client.get("/spending?page=2")
    assert page2.status_code == 200
    assert "Page 2 of 2" in page2.text

    filtered = client.get("/spending?category=eating_out")
    assert filtered.status_code == 200
    assert "Entries (1)" in filtered.text

    csv_resp = client.get("/spending/export.csv")
    assert csv_resp.status_code == 200
    assert "Date,Category,Amount (NGN),Note" in csv_resp.text
    # Formula injection neutralized
    assert "'=SUM(A1:A2)" in csv_resp.text

    # Edit & delete the eating_out expense
    exp = db_session.scalar(
        select(Expense).where(Expense.user_id == user.id, Expense.category == "eating_out")
    )
    assert exp is not None
    edit_page = client.get(f"/spending/{exp.id}/edit")
    assert edit_page.status_code == 200
    csrf = _extract_csrf(edit_page.text)
    edited = client.post(
        f"/spending/{exp.id}/edit",
        data={
            "csrf_token": csrf,
            "amount": "3,000",
            "category": "eating_out",
            "spent_on": today.isoformat(),
            "note": "Updated suya",
        },
        follow_redirects=True,
    )
    assert "Updated suya" in edited.text

    csrf = _extract_csrf(edited.text)
    deleted = client.post(
        f"/spending/{exp.id}/delete",
        data={"csrf_token": csrf, "next_url": "/spending"},
        follow_redirects=True,
    )
    assert "Updated suya" not in deleted.text


def test_user_isolation_across_routes(client: TestClient, db_session: Session) -> None:
    # Create User A
    _register_and_onboard(client, "usera@example.com", name="UserA")
    user_a = db_session.scalar(select(User).where(User.email == "usera@example.com"))
    assert user_a is not None
    exp_a = Expense(
        user_id=user_a.id,
        spent_on=today_lagos(),
        amount_kobo=5_000_00,
        category="food",
        note="User A secret expense",
    )
    db_session.add(exp_a)
    db_session.commit()
    goal_a = db_session.scalar(select(Goal).where(Goal.user_id == user_a.id))
    assert goal_a is not None

    # Logout User A, create and login User B
    home_a = client.get("/home")
    client.post("/logout", data={"csrf_token": _extract_csrf(home_a.text)})

    _register_and_onboard(client, "userb@example.com", name="UserB")
    home_b = client.get("/home")
    csrf_b = _extract_csrf(home_b.text)

    # User B tries to read/edit/delete User A's expense and goals
    assert client.get(f"/spending/{exp_a.id}/edit").status_code == 404
    assert (
        client.post(
            f"/spending/{exp_a.id}/edit",
            data={
                "csrf_token": csrf_b,
                "amount": "100",
                "category": "food",
                "spent_on": today_lagos().isoformat(),
                "note": "Hacked",
            },
        ).status_code
        == 404
    )
    assert (
        client.post(
            f"/spending/{exp_a.id}/delete",
            data={"csrf_token": csrf_b},
        ).status_code
        == 404
    )
    assert (
        client.post(
            f"/goals/{goal_a.id}/update",
            data={
                "csrf_token": csrf_b,
                "name": "Stolen",
                "target": "1000",
                "saved": "0",
                "deadline": today_lagos().isoformat(),
            },
        ).status_code
        == 404
    )
    assert (
        client.post(
            f"/goals/{goal_a.id}/delete",
            data={"csrf_token": csrf_b},
        ).status_code
        == 404
    )
    assert "User A secret expense" not in client.get("/spending").text


def test_plan_versioning_and_idempotent_reviews(db_session: Session) -> None:
    user = User(email="version@example.com", password_hash=hash_password("StrongPass123!"))
    db_session.add(user)
    db_session.flush()
    db_session.add(Profile(user_id=user.id, display_name="Kemi", onboarding_done=True, onboarding_step=5))

    start_date = date(2026, 10, 1)
    db_session.add(
        IncomeSource(
            user_id=user.id,
            label="Salary",
            amount_kobo=200_000_00,
            frequency="monthly",
            next_pay_date=date(2026, 11, 1),
            is_primary=True,
        )
    )
    db_session.commit()

    plan_v1 = create_plan_version(db_session, user.id, effective_from=start_date)
    for d in range(5):
        db_session.add(
            Expense(
                user_id=user.id,
                spent_on=start_date + timedelta(days=d),
                amount_kobo=2_000_00,
                category="food",
                note="Meal",
            )
        )
    db_session.commit()

    # Generate reviews on Oct 10 (week 1 Oct 1..Oct 7 completed)
    reviews_1 = ensure_due_reviews(db_session, user.id, today=date(2026, 10, 10))
    assert len(reviews_1) == 1
    assert reviews_1[0].plan_id == plan_v1.id

    # Create a newer plan version effective Oct 12
    plan_v2 = create_plan_version(db_session, user.id, effective_from=date(2026, 10, 12))
    assert plan_v2.id != plan_v1.id

    # Re-run review generation: idempotent, and past review keeps original plan_v1.id!
    reviews_2 = ensure_due_reviews(db_session, user.id, today=date(2026, 10, 10))
    assert len(reviews_2) == 1
    assert reviews_2[0].plan_id == plan_v1.id


def test_account_deletion_removes_all_data(client: TestClient, db_session: Session) -> None:
    _register_and_onboard(client, "delete@example.com", name="Bola")
    user = db_session.scalar(select(User).where(User.email == "delete@example.com"))
    assert user is not None
    uid = user.id

    settings_page = client.get("/settings")
    csrf = _extract_csrf(settings_page.text)

    # Wrong confirmation fails safely
    bad_del = client.post(
        "/settings/delete-account",
        data={"csrf_token": csrf, "confirm_text": "delete"},
        follow_redirects=True,
    )
    assert "DELETE in capital letters" in bad_del.text
    assert db_session.get(User, uid) is not None

    # Correct confirmation removes user and cascaded rows
    csrf = _extract_csrf(bad_del.text)
    ok_del = client.post(
        "/settings/delete-account",
        data={"csrf_token": csrf, "confirm_text": "DELETE"},
        follow_redirects=False,
    )
    assert ok_del.status_code == 303
    db_session.expire_all()
    assert db_session.get(User, uid) is None
    assert db_session.scalars(select(Plan).where(Plan.user_id == uid)).all() == []


def test_demo_user_creation_and_expiry_cleanup(client: TestClient, db_session: Session) -> None:
    landing = client.get("/")
    csrf = _extract_csrf(landing.text)
    resp = client.post("/demo", data={"csrf_token": csrf}, follow_redirects=True)
    assert resp.status_code == 200
    assert "Chidi" in resp.text

    # Check pages render cleanly without JS or inline styles for demo user
    for path in ["/home", "/spending", "/plan", "/year", "/reviews", "/goals", "/settings", "/help", "/privacy"]:
        page = client.get(path)
        assert page.status_code == 200, f"Failed page {path}"
        assert "<script" not in page.text.lower()
        assert 'style="' not in page.text.lower()

    # Check plan and review disclaimers
    assert "Budgeting guidance, not professional financial advice." in client.get("/plan").text
    assert "Budgeting guidance, not professional financial advice." in client.get("/reviews").text

    # Verify expiry cleanup deletes expired demo users
    expired_demo = create_demo_user(db_session)
    expired_demo.demo_expires_at = now_lagos() - timedelta(minutes=5)
    db_session.commit()
    removed = cleanup_expired_demo_users(db_session)
    assert removed >= 1
    assert db_session.get(User, expired_demo.id) is None


def test_alembic_migration_on_empty_sqlite(tmp_path: Path) -> None:
    db_file = tmp_path / "fresh_mig.db"
    env = {"DATABASE_URL": f"sqlite:///{db_file}", "PATH": "/usr/local/bin:/usr/bin:/bin"}
    alembic_bin = str(Path(".venv/bin/alembic").resolve())
    result = subprocess.run(
        [alembic_bin, "upgrade", "head"],
        env=env,
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0, result.stderr
    assert db_file.exists()


def test_register_and_login_with_phone_only(client: TestClient) -> None:
    reg = client.get("/register")
    csrf = _extract_csrf(reg.text)
    resp = client.post(
        "/register",
        data={
            "csrf_token": csrf,
            "display_name": "Musa",
            "email": "",
            "phone": "0803 555 0199",
            "password": "StrongPass123!",
            "confirm_password": "StrongPass123!",
        },
        follow_redirects=True,
    )
    assert resp.status_code == 200
    assert "About you" in resp.text

    csrf = _extract_csrf(resp.text)
    client.post("/logout", data={"csrf_token": csrf})

    login_page = client.get("/login")
    csrf = _extract_csrf(login_page.text)
    logged = client.post(
        "/login",
        data={
            "csrf_token": csrf,
            "identifier": "08035550199",
            "password": "StrongPass123!",
        },
        follow_redirects=True,
    )
    assert logged.status_code == 200
    assert "About you" in logged.text


def test_unauthenticated_redirects_to_login(client: TestClient) -> None:
    for path in ["/home", "/spending", "/plan", "/year", "/reviews", "/goals", "/settings"]:
        res = client.get(path, follow_redirects=False)
        assert res.status_code == 303
        assert res.headers["location"] == "/login"


def test_plan_whatif_does_not_save_new_plan(client: TestClient, db_session: Session) -> None:
    _register_and_onboard(client, "whatif@example.com", name="Seyi")
    user = db_session.scalar(select(User).where(User.email == "whatif@example.com"))
    assert user is not None
    before_count = len(db_session.scalars(select(Plan).where(Plan.user_id == user.id)).all())

    plan_page = client.get("/plan")
    csrf = _extract_csrf(plan_page.text)
    resp = client.post(
        "/plan/whatif",
        data={"csrf_token": csrf, "scenario": "income_drop", "value": "30"},
    )
    assert resp.status_code == 200
    assert "If income falls by 30%" in resp.text
    after_count = len(db_session.scalars(select(Plan).where(Plan.user_id == user.id)).all())
    assert after_count == before_count


def test_settings_creates_plan_version_and_exports_json(
    client: TestClient, db_session: Session
) -> None:
    _register_and_onboard(client, "settings@example.com", name="Ngozi")
    user = db_session.scalar(select(User).where(User.email == "settings@example.com"))
    assert user is not None
    before_count = len(db_session.scalars(select(Plan).where(Plan.user_id == user.id)).all())

    settings_page = client.get("/settings")
    csrf = _extract_csrf(settings_page.text)
    upd = client.post(
        "/settings/profile",
        data={
            "csrf_token": csrf,
            "display_name": "Ngozi O.",
            "city": "Enugu",
            "household_type": "family",
            "dependents_count": "2",
            "housing_type": "rent",
            "employment_type": "salary",
            "mode": "planner",
            "emergency_months": "4",
            "emergency_savings": "100,000",
            "savings_rate_pct": "10",
            "festive_fund_enabled": "true",
        },
        follow_redirects=True,
    )
    assert upd.status_code == 200
    assert "Profile updated and new plan saved." in upd.text
    after_count = len(db_session.scalars(select(Plan).where(Plan.user_id == user.id)).all())
    assert after_count == before_count + 1

    export_json = client.get("/settings/export.json")
    assert export_json.status_code == 200
    assert export_json.json()["profile"]["city"] == "Enugu"


def test_goals_crud_routes(client: TestClient, db_session: Session) -> None:
    _register_and_onboard(client, "goals@example.com", name="Femi")
    goals_page = client.get("/goals")
    csrf = _extract_csrf(goals_page.text)
    added = client.post(
        "/goals/add",
        data={
            "csrf_token": csrf,
            "name": "Solar Inverter",
            "target": "400,000",
            "saved": "100,000",
            "deadline": (today_lagos() + timedelta(days=180)).isoformat(),
        },
        follow_redirects=True,
    )
    assert added.status_code == 200
    assert "Solar Inverter" in added.text

    goal = db_session.scalar(select(Goal).where(Goal.name == "Solar Inverter"))
    assert goal is not None
    csrf = _extract_csrf(added.text)
    updated = client.post(
        f"/goals/{goal.id}/update",
        data={
            "csrf_token": csrf,
            "name": "Solar Inverter Pro",
            "target": "450,000",
            "saved": "150,000",
            "deadline": goal.deadline.isoformat(),
        },
        follow_redirects=True,
    )
    assert "Solar Inverter Pro" in updated.text

    csrf = _extract_csrf(updated.text)
    deleted = client.post(
        f"/goals/{goal.id}/delete",
        data={"csrf_token": csrf},
        follow_redirects=True,
    )
    assert "Goal removed." in deleted.text


def test_404_page_friendly(client: TestClient) -> None:
    resp = client.get("/non-existent-route-12345")
    assert resp.status_code == 404
    assert "We could not find that page" in resp.text
    assert "<script" not in resp.text.lower()
