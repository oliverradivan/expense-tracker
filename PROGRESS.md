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

## Step 2: Backend auth (Completed)
- Implemented endpoints: POST /auth/register, POST /auth/login, POST /auth/logout, GET /auth/me, POST /auth/change-password, DELETE /auth/me.
- Register: validates username (3-30, alphanumeric/underscore), password (6-128 chars), hashes password (bcrypt with SHA-256 fallback for >72 bytes), inserts user, returns JWT token in httpOnly cookie.
- Login: verifies credentials (uses dummy hash for non-existent users to prevent timing attack), checks token_version, issues new JWT.
- Logout: clears the httpOnly cookie.
- Me: returns user info (id, username) from verified token.
- Change password: validates current password, sets new password hash, increments token_version, issues new token.
- Delete account: verifies password, deletes user (cascade deletes transactions).
- All endpoints are protected by rate limiting (5/minute) to prevent brute force.
- Tested with multiple users, verified cross-user isolation, validation, and rate limiting.
- Updated cookies are set with httpOnly, SameSite=Lax, secure=False (for development).

## Step 3: Backend transactions and categories (Completed)
- Implemented GET /categories returning static categories.
- Implemented POST /transactions with validation (type, category matching type, label length 1-100, amount > 0 and max 2 decimals, date format).
- Implemented GET /transactions with optional month (YYYY-MM) and type filters.
- Implemented DELETE /transactions/{id} with ownership verification.
- All transactions endpoints require authentication via httpOnly cookie.
- Tested: categories, create transaction, get transactions (with and without filters), delete transaction.
- Verified validation and error handling.

## Step 4: Backend verification (Completed)
- Wrote and ran a verification script that:
  * Created two test users with random suffixes.
  * Verified cross-user isolation: each user can only see their own transactions.
  * Tested validation: invalid type, negative amount, overly long label all return 400.
  * Tested rate limiting: exceeded limit of 5 login attempts per minute returns 429.
  * Verified cleanup: after account deletion, users cannot access protected endpoints.
- Fixed bugs found:
  * The get_current_user service was raising an unhandled APIError when a user was deleted (due to .single() on empty result). Added proper error handling to raise ValueError("User not found").
  * The delete account endpoint was working correctly; the issue was in the get_current_user function.
- All tests passed.

## Step 5: Frontend foundation (Completed)
- Installed react-router-dom and set up routing with BrowserRouter, Routes, and Route.
- Created auth context in src/context/authContext.jsx with useAuth hook and AuthProvider, providing login, register, logout, changePassword, deleteAccount functions, and user/loading state.
- Created api.js lib in src/lib/api.js for making HTTP requests to backend with credentials (for cookies).
- Updated main.jsx to wrap the app with AuthProvider.
- Updated App.jsx to set up protected routes: auth routes (login, register) are guest-only, other routes require authentication, and root redirects to dashboard.
- Moved existing page files to subdirectories and renamed them to Page.jsx for lazy loading.
- Implemented login page (src/pages/login/LoginPage.jsx) with form, validation (username 3-30 alphanumeric/underscore, password 6-128), and submission via auth context.
- Implemented register page (src/pages/register/RegisterPage.jsx) similarly.
- Other pages (dashboard, history, log, review, settings) remain as empty placeholders for now.
- Verified that the frontend builds successfully and linting passes (except for one minor rule about exporting hook from context, which is acceptable).

## Step 6: App shell (Completed)
- Created layout component with fixed bottom nav bar using CSS scroll-snap for swipe deck.
- Implemented NavBar component with icons from lucide-react.
- Ensured URL and nav bar sync with current page using useParams and useEffect to update URL on page change and vice versa.
- Pages stay mounted in the DOM (they are rendered in a flex container).
- Respects prefers-reduced-motion by using auto scroll behavior when reduced motion is preferred.
- Desktop: nav clicks change page, left/right arrow keys change slides when not in an input or textarea.
- Added resize observer to handle window resizing.
- Verified that the layout works and the app builds successfully.

## Step 7: Log page (Completed)
- Implemented log page with toggle for Expense/Income.
- Category dropdown fetches categories from backend GET /categories and updates when type changes.
- Label input (max 100 chars), amount input (number, step 0.01), date input (date type, default today).
- Form submission uses POST /transactions endpoint via api lib.
- Shows success/error messages and resets form on success.
- Verified that the form works and submits data correctly.

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

## Step 1: Backend foundation (Completed)
- Created config.py to load environment variables from backend/.env (using python-dotenv).
- Created data/supabase.py to initialize Supabase client with the service role key (upgraded supabase to 2.32.0 to support sb_secret_ keys).
- Created services/security.py for password hashing (bcrypt) and JWT handling (PyJWT) with token_version claim.
- Updated main.py with FastAPI app, CORS (from ALLOWED_ORIGINS), security headers (X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Cache-Control), rate limiting (slowapi) on auth endpoints, and health check endpoint.
- Updated requirements.txt with pinned versions: fastapi==0.104.1, uvicorn[standard]==0.27.0, supabase==2.32.0, python-dotenv==1.0.1, bcrypt==4.1.2, PyJWT==2.15.1, slowapi==0.1.8.
- Verified that the backend can start and basic components work (imports, password hashing, token creation/verification).