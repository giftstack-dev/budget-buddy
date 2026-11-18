# Budget Buddy

**Budget Buddy** is a personal money planner and daily spending tracker built for salary and wage earners in Nigeria. Answer a few plain questions about your income, household, and bills, and get a calm monthly plan, a 12-month forward view, and kind, specific feedback at the end of every week and pay cycle.

> **Disclaimer:** Budget Buddy provides budgeting guidance, not professional financial advice.

## Features

- **Naira-first, integer-kobo math:** All money is stored as integer kobo (`₦1 = 100 kobo`) so totals never drift due to floating-point rounding.
- **Needs-first monthly waterfall:** Covers essentials (including monthly set-asides for yearly rent and termly school fees), then funds a 5% buffer, an emergency safety net, an optional 3% December festive fund, prioritized goals, and day-to-day wants.
- **Exact largest-remainder allocation:** Splits wants categories so every group sums to the exact Naira and kobo of monthly income.
- **Daily safe-to-spend tracker:** Scales your variable spending pool to your pay cycle (monthly, weekly, or every 2 weeks) and updates "safe to spend today" using `Africa/Lagos` calendar dates.
- **Zero-spend days & kind reviews:** Log expenses or tap **"No spending today"**; receive non-shaming weekly and end-of-cycle reviews with streaks, category insights, and 4-week trends.
- **12-month year view & What-If simulator:** Watch sinking funds rise before rent/school-fee due months and test scenarios (income drop, rent rise, new dependent, new loan) without altering your real plan.
- **Dual planning modes:** Choose **"Build my plan"** for full category guidance, or **"Just track my spending"** with a custom savings percentage.
- **Instant interactive demo:** Click **"Try the demo"** to explore a seeded 6-week Nigerian salary earner account (auto-expires in 24 hours).
- **Zero JavaScript & strict security:** Server-rendered HTML5 + plain CSS3, Argon2id password hashing, signed HttpOnly sessions, CSRF tokens, login lockout, strict CSP headers, and full CSV/JSON export or account deletion.

## Screenshots

> _Placeholder:_ Add screenshots of the Landing page, Home dashboard, Monthly Plan, Year View, and Weekly Reviews after capturing them from your local run (for example in `docs/screenshots/`).

## Tech Stack & Dependencies

| Package | Role |
| --- | --- |
| `fastapi` | Web framework, routing, form handling, and dependency injection |
| `jinja2` | Server-rendered HTML5 templates with autoescaping enabled |
| `uvicorn` | ASGI server to run the FastAPI application |
| `python-multipart` | Parses HTML form submissions (`application/x-www-form-urlencoded`) |
| `sqlalchemy` | SQLAlchemy 2.0 ORM supporting both SQLite and PostgreSQL |
| `alembic` | Database schema migrations (`alembic upgrade head`) |
| `psycopg[binary]` | PostgreSQL database driver (used when `DATABASE_URL` points to Postgres) |
| `argon2-cffi` | Argon2id password hashing |
| `itsdangerous` | Cryptographic signing for Starlette session cookies |
| `python-dotenv` | Loads `.env` environment variables during local development |
| `tzdata` | IANA time zone database so `Africa/Lagos` works reliably on Windows |
| `pytest` | Automated unit, integration, and security test runner |
| `httpx` | HTTP client used by FastAPI's `TestClient` in tests |
| `ruff` | Fast Python linter and style checker |

## Local Setup

### Windows (PowerShell or Command Prompt)

```bat
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

Edit `.env` and set a strong `SECRET_KEY`, then run migrations and start the server:

```bat
alembic upgrade head
uvicorn app.main:app --reload
```

Open `http://127.0.0.1:8000` in your browser.

### macOS and Linux

```bash
python3.12 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Set a strong `SECRET_KEY` in `.env`, then run:

```bash
alembic upgrade head
uvicorn app.main:app --reload
```

Open `http://127.0.0.1:8000` in your browser.

### Management CLI Commands

```bash
python -m app.cli create-db      # Create tables directly without Alembic
python -m app.cli seed-demo      # Seed one temporary demo user
python -m app.cli cleanup-demo   # Remove expired demo accounts
```

## Running Tests & Linting

```bash
ruff check app tests
pytest -v
```

To run the test suite against PostgreSQL as well:

```bash
TEST_DATABASE_URL="postgresql+psycopg://user:password@localhost:5432/budget_test" pytest -v
```

## Switching to PostgreSQL

1. Provision a PostgreSQL database and obtain its connection string.
2. Set `DATABASE_URL` in your `.env` or hosting environment:
   ```env
   DATABASE_URL=postgresql+psycopg://user:password@host:5432/dbname
   APP_ENV=production
   COOKIE_SECURE=true
   SECRET_KEY=<long-random-secret-at-least-32-chars>
   ```
3. Run migrations against PostgreSQL:
   ```bash
   alembic upgrade head
   ```

> **Production Warning:** Free hosting platforms often restart or redeploy containers with ephemeral local filesystems, wiping local SQLite (`budget.db`) files. Never use SQLite for real users in production — always connect a managed PostgreSQL database via `DATABASE_URL`.

## Design Decisions

- **Integer kobo everywhere:** Floating-point arithmetic introduces `0.01` rounding drift. Storing `₦1 = 100 kobo` as integers keeps every budget line exact.
- **Largest-remainder allocation:** Splitting leftovers across wants weights uses Hamilton's largest-remainder method so parts always sum to 100% of the pool.
- **Versioned plans:** Updating income, bills, or goals creates a new `plans` row with `effective_from = today`. Historical `reviews` store the `plan_id` active during their period so past feedback never rewrites history.
- **Lagos calendar dates:** Daily expenses store plain `date` values in `Africa/Lagos` rather than UTC timestamps so an expense logged at 11:30 pm WAT lands on today instead of tomorrow.
- **Zero JavaScript & CSP-friendly visuals:** Native HTML5 (`<progress>`, `<meter>`, `<details>`, CSS checkbox menu) eliminates client-side JS, passes a strict `Content-Security-Policy` with zero inline scripts or inline styles, and loads fast on low-end mobile connections.
- **Needs-first waterfall:** Essentials and sinking funds are protected before discretionary wants or extra savings, while still reserving a 15% wants floor so budgets stay livable.

## Limitations

- **Budgeting guidance only:** Not a substitute for licensed financial, tax, or legal advice.
- **Irregular income simplified:** Freelancers or traders with variable earnings plan using an average month in version one.
- **Fixed costs assumed paid:** Recurring fixed bills (rent, utilities, school fees, family support) are assumed paid as planned rather than logged daily.
- **No bank connections:** Manual logging by design — no Open Banking, BVN, or automated SMS/bank alert scraping.
- **Single currency & language:** Nigerian Naira (`₦`) and English only.
- **No push/email/SMS reminders:** Weekly and cycle reviews are generated automatically when you visit the app, without background email or SMS notifications.
