# Budget Buddy Planning Rules & Thresholds

Every rule in the planning and review engine is deterministic, stored in `app/engine/`, and listed below with its rationale and where to customize it.

| Rule / Threshold | Default Value | Why It Exists | Where to Change |
| --- | --- | --- | --- |
| **Integer money unit** | `1 Naira = 100 kobo` | Eliminates floating-point rounding drift in splits and totals | `app/money.py` |
| **Weekly → monthly factor** | `× 52 / 12` (half-up) | Converts 52 weekly payments accurately across 12 calendar months | `app/engine/normalize.py` (`normalize_to_monthly_kobo`) |
| **Biweekly → monthly factor** | `× 26 / 12` (half-up) | Converts 26 two-week paydays accurately across 12 months | `app/engine/normalize.py` (`normalize_to_monthly_kobo`) |
| **Termly → monthly factor** | `× 3 / 12` (half-up) | Nigerian schools typically run 3 terms per year | `app/engine/normalize.py` (`normalize_to_monthly_kobo`) |
| **Yearly → monthly factor** | `/ 12` (half-up) | Turns annual rent or insurance into a calm monthly set-aside | `app/engine/normalize.py` (`normalize_to_monthly_kobo`) |
| **Monthly buffer** | `min(leftover, 5% of income)` | Absorbs small unexpected costs (generator repairs, price bumps) before touching savings | `app/engine/planner.py` (`compute_plan`) |
| **Emergency fund target** | `3 × monthly needs` (user adjustable 1–12) | Protects against salary delays or sudden job changes | `app/models.py` (`Profile.emergency_months`), `app/engine/planner.py` |
| **Emergency contribution cap** | `min(gap, 10% of income, remaining)` | Builds safety net steadily without starving day-to-day living, and stops once target is met | `app/engine/planner.py` (`compute_plan`) |
| **Festive fund (optional)** | `min(3% of income, remaining)` | Prevents December travel and celebrations from draining January rent/food | `app/engine/planner.py` (`compute_plan`) |
| **Minimum wants floor** | `15% of (income - needs)` | Ensures goals never squeeze daily life so hard that the budget becomes unrealistic | `app/engine/planner.py` (`compute_plan`) |
| **Default wants weights** | Eating out 30, Entertainment 20, Personal care 20, Clothing 20, Gifts 10 | Sensible starting split adjustable in Settings | `app/engine/normalize.py` (`DEFAULT_WANTS_WEIGHTS`) |
| **Plan status: BALANCED** | Wants ≥ 15% of leftover AND all goals on track | Signals a sustainable, realistic month | `app/engine/planner.py` (`compute_plan`) |
| **Plan status: TIGHT** | Needs covered, but wants < 15% of leftover OR a goal is behind | Warns gently without false alarm when flexibility is narrow | `app/engine/planner.py` (`compute_plan`) |
| **Plan status: DEFICIT** | `needs_total > income` | Zeroes non-needs and suggests reviewing the 3 largest flexible needs (never cutting essentials to zero) | `app/engine/planner.py` (`_build_deficit_suggestions`) |
| **Weekly review: low_data** | `< 3 logged days` in the 7-day block | Avoids praising or warning based on incomplete tracking | `app/engine/review.py` (`compute_weekly_review`) |
| **Weekly review: on_track** | `spent < 90%` of block allowance | Leaves at least 10% margin in reserve | `app/engine/review.py` (`compute_weekly_review`) |
| **Weekly review: close** | `90% ≤ spent ≤ 100%` of block allowance | Early nudge before going over | `app/engine/review.py` (`compute_weekly_review`) |
| **Weekly review: over** | `spent > 100%` of block allowance | Specific, calm feedback referencing the largest gap | `app/engine/review.py` (`compute_weekly_review`) |
| **Protected essentials** | `food`, `rent`, `health`, `school_fees` | Feedback never tells users to cut below essential survival needs | `app/engine/normalize.py` (`ESSENTIAL_CATEGORIES`) |
| **4-week trend threshold** | `±10 percentage points` (`±1000 bp`) | Distinguishes meaningful shifts (`rising` / `improving`) from normal weekly noise (`steady`) | `app/engine/review.py` (`compute_four_week_trend`) |
| **Login rate limit** | `5 failed attempts in 15 minutes` | Blocks brute-force password guessing per account key and IP | `app/security.py` (`MAX_FAILED_ATTEMPTS`, `LOCKOUT_MINUTES`) |
