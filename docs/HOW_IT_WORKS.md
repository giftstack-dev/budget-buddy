# How Budget Buddy Works

This guide walks through every part of the codebase in plain English, followed by a complete worked example.

---

## 1. File-by-File Walkthrough

### Application Core (`app/`)
- **`app/config.py`**: Loads environment variables (`DATABASE_URL`, `SECRET_KEY`, `COOKIE_SECURE`, `DEMO_ENABLED`, `APP_ENV`), enforces a strong `SECRET_KEY` when `APP_ENV=production`, and provides `today_lagos()` / `now_lagos()` using `ZoneInfo("Africa/Lagos")`.
- **`app/money.py`**: Converts human Naira strings (`"₦250,000"`, `"1,250.50"`) into integer kobo via `Decimal` (`parse_naira`) and formats kobo back into Naira strings (`format_naira`). Rejects negatives and invalid input cleanly.
- **`app/database.py`**: Configures SQLAlchemy 2.0 for either SQLite (with `PRAGMA foreign_keys=ON` so cascade deletes work) or PostgreSQL via `DATABASE_URL`.
- **`app/models.py`**: Defines all 10 tables (`users`, `profiles`, `income_sources`, `fixed_costs`, `goals`, `plans`, `plan_items`, `expenses`, `reviews`, `login_attempts`) using typed SQLAlchemy 2.0 `Mapped` columns.
- **`app/security.py`**: Handles Argon2id password hashing, per-session CSRF tokens, 15-minute login lockouts after 5 failed attempts (hashed keys so no raw emails/IPs leak), and strict HTTP security headers (`Content-Security-Policy`, `X-Frame-Options`, etc.).
- **`app/deps.py`**: Configures Jinja2 templates (with autoescaping and `format_naira` / `category_label` filters) and FastAPI dependencies (`require_user`, `require_onboarded_user`, `enforce_csrf`).
- **`app/main.py`**: Assembles the FastAPI app, attaches `SessionMiddleware` and `SecurityHeadersMiddleware`, mounts `/static`, registers all routers, and renders friendly `404` and `500` pages.
- **`app/cli.py`**: Provides `create-db`, `seed-demo`, and `cleanup-demo` CLI utilities.

### Pure Planning Engine (`app/engine/` — Zero DB or Web Code)
- **`app/engine/normalize.py`**: Defines all Nigerian spending categories, protected essential categories, default wants weights, and half-up normalization to monthly kobo (`weekly × 52/12`, `biweekly × 26/12`, `yearly / 12`, `termly × 3/12`).
- **`app/engine/allocate.py`**: Implements Hamilton's largest-remainder method so integer kobo splits always sum exactly to the input total.
- **`app/engine/periods.py`**: Computes pay cycles (`monthly` clamping to short months like Feb 28/29, `weekly`, `biweekly`) and splits each cycle into 7-day review blocks.
- **`app/engine/planner.py`**: Runs the 8-step needs-first waterfall (`DEFICIT` / `TIGHT` / `BALANCED`), emergency fund capping, deadline-sorted goals with a 15% wants floor, and wants splitting.
- **`app/engine/tracker.py`**: Computes `daily_allowance`, `spent_this_cycle`, and `safe_to_spend_today` (never negative) for both `planner` and `log_only` modes.
- **`app/engine/review.py`**: Evaluates completed 7-day blocks (`on_track`, `close`, `over`, `low_data`), computes streaks and 4-week trends, and generates kind, non-shaming messages that never suggest cutting essentials.
- **`app/engine/whatif.py`**: Simulates 4 life/price scenarios without writing anything to the database.
- **`app/engine/year.py`**: Builds a 12-month forward projection showing emergency fund growth, sinking-fund build-up and due-month drops, and goal completion dates.
- **`app/engine/tips.py`**: Holds 25 general Nigeria-relevant money tips rotated deterministically by week.

### Services & Routers (`app/services/`, `app/routers/`)
- **`app/services/plan_service.py`**: Saves new immutable `Plan` versions whenever user inputs change and finds the active plan for any past date.
- **`app/services/review_service.py`**: Idempotently generates weekly and pay-cycle reviews for completed periods, protected by the database unique constraint.
- **`app/services/demo_service.py`**: Creates a realistic 6-week Nigerian demo account and cleans up expired demo accounts.
- **`app/routers/*.py`**: Thin, readable route handlers for public pages, auth, onboarding, dashboard, spending CRUD + CSV export, plan + what-if, year view, reviews, goals, settings + data export/deletion, and demo launch.

---

## 2. Worked Example: Ada in Asaba

1. **Onboarding:**
   - Ada registers and completes the 5-step wizard: she earns **₦250,000/month** paid on the **28th**.
   - Her essential costs are: Rent **₦480,000/year** (normalized to **₦40,000/month**), Food **₦60,000**, Transport **₦25,000**, Data & airtime **₦10,000**, Utilities **₦12,000**, and Family support **₦15,000**.
   - Total monthly needs = **₦162,000**. Leftover = **₦88,000**.
2. **The Plan (`planner.py`):**
   - **Buffer (5% of income):** ₦12,500 (remaining: ₦75,500)
   - **Emergency fund (10% of income toward 3×₦162k = ₦486k):** ₦25,000 (remaining: ₦50,500)
   - **Festive fund (3% of income):** ₦7,500 (remaining: ₦43,000)
   - **Goals:** With no goals yet, all **₦43,000** flows to **Wants** (split 30/20/20/20/10 = ₦12,900 Eating out, ₦8,600 Entertainment, ₦8,600 Personal care, ₦8,600 Clothing, ₦4,300 Gifts).
   - **Check sum:** `₦162,000 + ₦12,500 + ₦25,000 + ₦7,500 + ₦43,000 = ₦250,000` (exact to the kobo).
   - **Status:** `BALANCED` (wants ₦43,000 ≥ 15% of ₦88,000 = ₦13,200).
   - **Variable spending pool:** `₦60,000 (food) + ₦25,000 (transport) + ₦10,000 (data) + ₦43,000 (wants) = ₦138,000/month`.
3. **Weekly Review (`review.py`):**
   - In a 30-day cycle, Ada's daily baseline is `₦138,000 / 30 = ₦4,600/day`, so a 7-day block allowance is `₦32,200`.
   - Suppose Ada logs on 5 days (including one `"No spending today"` entry) and spends **₦26,400** total (`81.9%`).
   - Because `days_logged >= 3` and `ratio < 90%`, the status is **`on_track`**, and she receives a warm message highlighting her **₦5,800** reserve and her streak.
