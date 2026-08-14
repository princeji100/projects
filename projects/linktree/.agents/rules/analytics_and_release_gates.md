# Analytics Time Windows & Release Gate Architecture

1. **Half-Open UTC Time Boundaries**:
   - For user-facing $N$-day analytics windows (e.g., 7d, 30d), define the window as:
     - `windowStart = Date.UTC(year, month, date - (N - 1), 0, 0, 0, 0)`
     - `windowEnd = Date.UTC(year, month, date + 1, 0, 0, 0, 0)` (exclusive upper bound)
   - Query events with `{ createdAt: { $gte: windowStart, $lt: windowEnd } }`.
   - Generate timeline buckets by iterating from $N - 1$ down to $0$, ensuring exactly $N$ daily points ending on the current UTC date.

2. **Master Release-Gate Structure**:
   - Master verification suites (e.g. `verify-phase6.js`) must execute prior phase test suites as isolated subprocesses (`execSync`) and run the production build once, avoiding recursive self-invocation.
   - Onboarding / clean-clone checks must execute non-destructively in temporary directories (`os.tmpdir()`) using safe development mock configs.
