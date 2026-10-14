# Expense Tracker Project Plan

## Step 0: Recon (Completed)
- Read existing files and folders.
- Backend structure: main.py, requirements.txt, empty data/, routers/, services/ folders, migrations/ with 001_init.sql.
- Frontend structure: src/ with assets/, pages/ (login, register, dashboard, history, logexpense, analysis, settings), and App.jsx, App.css, index.css, main.jsx.
- Database schema from migrations/001_init.sql:
  - Users table: id (uuid), username (text, unique lower case, 3-30 chars letters/numbers/underscore), password_hash, token_version, created_at.
  - Transactions table: id (uuid), user_id (fk to users), type (expense/income), category, label (1-100 chars), amount (numeric >0, 2 decimals), date, created_at.
  - Row Level Security enabled on both tables, no policies (so only backend with secret key can access).
  - Indexes: transactions_user_date_idx.

## Step 1: Backend foundation
- Configure environment variables from backend/.env.
- Set up Supabase client in data/ using the secret key.
- Create security helpers: password hashing (bcrypt), JWT token handling (with token_version claim).
- Set up FastAPI app with CORS (from ALLOWED_ORIGINS), security headers, rate limiting (slowapi) on auth endpoints.
- Add health check endpoint.
- Update requirements.txt with pinned versions.

## Step 2: Backend auth
- Implement endpoints: POST /auth/register, POST /auth/login, POST /auth/logout, GET /auth/me, POST /auth/change-password, DELETE /auth/me.
- Register: validate username (3-30, alphanumeric/underscore), password (6-128 chars), hash password, insert user, return JWT token (httpOnly cookie or header).
- Login: verify credentials (dummy hash if user not exists to prevent timing attack), check token_version, issue new JWT.
- Logout: clear token (if cookie) or instruct client to remove token.
- Me: return user info (excluding password hash) from verified token.
- Change password: validate current password, set new password hash, increment token_version.
- Delete account: verify password, delete user (cascade deletes transactions due to ON DELETE CASCADE).

## Step 3: Backend transactions and categories
- GET /categories: return static categories (expense: subscription, apartment, grocery, other; income: job, maanak, gift, other).
- POST /transactions: validate input (type, category matching type, label, amount, date), insert with user_id from token.
- GET /transactions: optional query params month (YYYY-MM) and type, return list for user.
- DELETE /transactions/{id}: verify ownership, delete.

## Step 4: Backend verification
- Write a test script that uses the real backend (running locally) to:
  - Create two test users.
  - Attempt cross-user access (should fail).
  - Test validation (invalid inputs).
  - Test rate limiting on auth endpoints.
  - Clean up test users and data.
- Fix any bugs found.

## Step 5: Frontend foundation
- Set up react-router-dom for routes: /login, /register, /dashboard, /history, /log, /review, /settings.
- Create auth context (using React Context) to hold user token and user info, with login/logout functions.
- Create api.js lib for making HTTP requests to backend (with base URL from VITE_API_URL).
- Protect routes: require auth for /dashboard, /history, /log, /review, /settings; redirect unauthenticated to /login.
- If already authenticated, redirect /login and /register to /dashboard.
- Build login and register pages with inline validation (matching backend rules) and form submission.

## Step 6: App shell
- Create layout component with fixed bottom nav bar (5 items: Dashboard, History, Log, Review, Settings).
- Implement swipe deck for the five main pages (using Swiper.js or CSS scroll-snap or custom touch handler).
- Ensure URL and nav tab sync with current slide (using useEffect and history.listen).
- Pages stay mounted while sliding; use context or state sharing to keep data fresh (e.g., History updates when new transaction added via Log).
- Respect prefers-reduced-motion (fade or instant switch).
- Desktop: nav clicks slide, left/right arrow keys change slides when not in form field.

## Step 7: Log page
- Toggle for Expense/Income at top.
- Category dropdown that fetches categories from backend GET /categories (filtered by type).
- Label input, amount input, date input (default today).
- Form submission to POST /transactions.
- Show success/error messages, reset form on success.

## Step 8: History page
- Fetch transactions via GET /transactions (optionally without filters to get all, then group by month and category in frontend).
- Display grouped by month (newest first), within each month by category.
- Show income and expense totals per month.
- Each entry: label, amount, date, visual distinction (color/icon) for income vs expense.
- Delete button per entry with confirmation dialog, calling DELETE /transactions/{id}.
- Empty state when no transactions.

## Step 9: Settings and Month in Review placeholder
- Settings: Logout (clear auth context), Change Password (form with current and new password, calls POST /auth/change-password), Delete Account (form with password confirmation, calls DELETE /auth/me), Theme toggle (light/dark using CSS variables, store preference in localStorage).
- Month in Review (analysis): placeholder UI for now.

## Step 10: Final review
- Go through security and privacy requirements checklist.
- Test swipe deck at phone-sized viewport (390px) for swipe, nav taps, URL sync, form fields, and History refresh after new log.
- Run npm run lint and npm run build in frontend.
- Update README with setup and run instructions.
- List any unfinished or risky items.
