# Interview Notes — Budget Buddy

Ten likely technical and product questions an interviewer might ask about Budget Buddy, with concise, honest answers.

### 1. Why did you store all money in integer kobo instead of floats or `DECIMAL` columns?
Floating-point numbers (`float`) introduce binary rounding errors like `0.1 + 0.2 != 0.3`, which break budget reconciliations. Storing integer kobo (`BigInteger` in SQLAlchemy) guarantees exact addition and subtraction across both SQLite and PostgreSQL, while `app/money.py` uses Python's `Decimal` only at the parsing boundary to convert Naira input cleanly into kobo.

### 2. How do you ensure split categories always add up to the exact monthly income?
We use Hamilton's largest-remainder method in `app/engine/allocate.py`. Every share gets its integer floor first, and any leftover kobo are distributed one kobo at a time to the items with the largest fractional remainders. That guarantees `sum(parts) == total` for every possible input.

### 3. Why separate `app/engine/` into pure functions with no database imports?
Keeping the engine pure makes it deterministic, fast to test (no database setup required for math tests), and trivial to reuse across the live planner, the non-destructive "What-If" simulator, the 12-month year view, and historical review generation.

### 4. How do past weekly reviews stay accurate if a user updates their rent or salary later?
Whenever a user changes their profile, income, costs, or goals, `create_plan_version` inserts a **new** `plans` row with `effective_from = today` rather than overwriting the old plan. Each `reviews` row stores the `plan_id` that was active during that period, so historical feedback always matches the budget the user actually had at the time.

### 5. Why store `spent_on` as a plain `date` in `Africa/Lagos` instead of a UTC `datetime`?
If a user in Lagos logs dinner at 11:30 pm WAT (`22:30 UTC`), storing a UTC timestamp and converting later—or comparing against a server running in UTC—causes boundary bugs around midnight. Storing plain calendar dates resolved in `ZoneInfo("Africa/Lagos")` ensures late-night logs always land on the user's actual day.

### 6. How did you handle edge cases like paydays on the 31st or February 29th?
`app/engine/periods.py` calculates each monthly payday from the user's original anchor day-of-month (`anchor_pay_date.day`) and clamps to `calendar.monthrange(year, month)[1]`. That means someone paid on the 31st gets Feb 28 (or Feb 29 in a leap year) and snaps right back to March 31 instead of getting stuck on the 28th.

### 7. Why build the frontend with zero JavaScript and pure server-rendered HTML/CSS?
A server-rendered FastAPI + Jinja2 stack with native HTML5 controls (`<progress>`, `<meter>`, `<details>`, CSS checkbox navigation) works reliably on low-end phones and slow mobile networks, eliminates client-side state bugs, and allows a strict `Content-Security-Policy` with zero inline scripts or styles.

### 8. How do you protect against common web security vulnerabilities (XSS, CSRF, IDOR, brute force)?
- **XSS:** Jinja2 autoescaping is enabled everywhere, and CSV exports neutralize leading formula characters (`=`, `+`, `-`, `@`).
- **CSRF:** Every state-changing POST route verifies a per-session token with `hmac.compare_digest`.
- **IDOR:** Every query for an expense, goal, or plan filters explicitly on `Model.user_id == current_user.id` and returns `404` if unmatched.
- **Brute force & passwords:** Passwords use `argon2-cffi`, and `login_attempts` enforces a 15-minute lockout after 5 consecutive failures per hashed account key or IP.

### 9. How does idempotent review generation avoid duplicate weekly reviews on concurrent requests?
`reviews` has a composite unique constraint on `(user_id, kind, period_start)`. Before inserting a review for a completed 7-day block, `ensure_due_reviews` checks existing keys and wraps inserts in `IntegrityError` handling, so refreshing `/reviews` or opening `/home` simultaneously never creates duplicates.

### 10. What would you add next if taking Budget Buddy to real users?
First, deploy with a managed PostgreSQL database (since free hosts wipe local SQLite files). Second, add optional background weekly summary emails or WhatsApp/SMS reminders. Third, support irregular income smoothing (e.g., rolling 3-month average) and shared household budgets for couples.
