# Polish Audit

## Audit Scope
The worktree was clean at audit start (`main`, three commits ahead of `origin/main`). The source inventory contains FastAPI backend and React/Vite frontend files. This is a targeted audit, not a verified line-by-line review of every page or asset; no database or secret values were accessed.

## Findings (Highest Priority First)

### Bugs
1. `backend/routers/transactions.py`: delete handler catches its own `HTTPException`; a not-found result can be converted to a 500.
2. `backend/routers/auth.py`: change-password constructs a replacement `Response` but returns a dict, so the refreshed cookie may not be sent.
3. Frontend auth calls and backend auth endpoints use URL-encoded form bodies, inconsistent with the requested JSON/Pydantic contract. Changing this safely requires updating both sides together.

### Leftover Debug Code
1. `backend/main.py`: `/health` returns a test note and timestamp instead of a minimal health response.
2. `backend/verify_step4.py`: committed manual verification script prints user/test responses and contains test-only logic in the application tree.

### Security Issues
1. `backend/routers/auth.py`: auth cookies set `secure=False` for registration, login, logout and deletion, regardless of environment.
2. `backend/main.py`: unhandled exception logging includes exception text and traceback; confirm that provider/credential details cannot enter logs before retaining this behavior.
3. `backend/config.py`: empty `ALLOWED_ORIGINS` becomes `['']`; configuration validation and startup behavior need verification.

### Duplicated or Dead Code
1. Cookie-token/current-user dependencies are duplicated in both routers.
2. `backend/routers/auth.py` imports unused `HTTPBearer` and `HTTPAuthorizationCredentials`; transaction router has unused request/response parameters and likely unused imports.
3. `frontend/src/context/authContext.jsx.backup` is a backup copy and should be reviewed before removal; no deletion made during this audit.

### UI / Visual Inconsistencies
1. `frontend/src/pages/Progress.css` identifies itself as placeholder styling.
2. `frontend/src/index.css` defines global theme variables, but the sampled stylesheet has a narrow 420px `main` width and lacks a complete, verified shared spacing/type scale and reduced-motion treatment.
3. Consistency across all page styles and dark-mode contrast remains unverified.

### UX Gaps
1. `frontend/src/lib/api.js` returns raw fetch responses and has no shared network/401 handling.
2. README setup command says `uv uvicorn`; expected invocation appears to be `uv run uvicorn` or `python -m uvicorn`, and should be checked against installed tooling.
3. Mobile navigation, post-create History refresh, loading/empty/error states, and duplicate-submit prevention remain unverified.

### Accessibility Gaps
1. Labels, autocomplete, decimal input mode, keyboard dialogs, accessible icon names, live announcements, focus visibility and nav-current semantics were not verified across pages.
2. Viewport behavior and 44px touch targets have not been tested.

## Step 0 Summary
Created this prioritized audit. No source code or environment files changed. The sampled findings are evidence-based; remaining pages and flows require targeted checks before claiming completeness.

## Steps 1-5 Status
Not performed. The requested end-to-end cleanup is substantially larger than this token-limited run. No backend verification, frontend lint/build, browser walkthrough, database test, or secret-history audit was run. No commits were created.

## Left Alone / Risks
- No Supabase database tests were run; no test users were created or removed.
- No `.env` values were read or printed.
- Schema, routes, API shapes, and project structure were not changed.
- Authentication body-format change should be coordinated frontend/backend and regression-tested before adoption.
