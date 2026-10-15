# Ledger — Expense Tracker

React/Vite frontend, FastAPI backend, and Supabase PostgreSQL storage. The browser talks only to the FastAPI service. The backend uses the Supabase service key and authorizes each request from its signed, HTTP-only session cookie.

## Run locally

The checked-in local environment files already define the required settings. Keep `SUPABASE_SECRET_KEY` and `JWT_SECRET` on the backend only; never add privileged values to `frontend/.env`.

```bash
# Terminal 1, repository root
backend/.venv/bin/uvicorn backend.main:app --reload --port 8000

# Terminal 2
cd frontend && npm run dev
```

The frontend API URL defaults to `http://localhost:8000`. Backend CORS permits the origins in `ALLOWED_ORIGINS`.

## Database setup

Apply migrations in order in the Supabase SQL editor (or through the project's migration process): `001_init.sql`, `002_households.sql`, then `003_custom_categories_frequency.sql`. The second migration adds shared households, invitations, and the exclusive private-or-household transaction owner constraint. It keeps existing private transaction rows and does not reset data. It also installs the account-deletion procedure: private transactions are removed; household transactions and households are retained; when a household owner leaves or deletes their account, the oldest remaining member becomes owner. If an owner deletes their account and no other member remains, the household is retained without a member. The third migration adds user/household scoped custom categories and transaction frequency.

Both migrations enable RLS and deny direct `anon`/`authenticated` table access. The API uses the backend service key and checks the signed user and current household membership before every household read, write, or delete. Run the migrations before registering users or using household features.

## Main behavior

- Username/password login uses bcrypt password hashes and signed JWTs in HTTP-only cookies. Logout increments the stored token version to invalidate existing sessions.
- Private transactions are owned by one user. Household transactions have `user_id = null` and one `household_id`, so the row is shared once among authorized members.
- Space selection is revalidated against the current memberships at sign-in and refresh. Transaction lists and reports query only the selected space.
- Categories start with Subscription, Apartment, Grocery, Other for expenses and Job, Maanak, Gift, Other for income. Validation is enforced in both the UI and API.
- Currency is Israeli shekels. Theme preference is stored locally in the browser.

## Checks

Run frontend checks with `cd frontend && npm run lint && npm run build`. Run Python syntax/import checks with `backend/.venv/bin/python -m compileall -q backend` and `backend/.venv/bin/python -c 'import backend.main'`.

The integration script `backend/verify_step4.py` creates and deletes real Supabase accounts and records. Only run it against a disposable test project after configuring the required migration; it does not cover household workflows.
