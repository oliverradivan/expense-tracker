# Expense Tracker

A full-stack expense tracker application built with:

- Frontend: React, Vite, React Router
- Backend: Python, FastAPI, Supabase
- Database: Supabase (PostgreSQL)

## Setup

### Backend
1. Navigate to the `backend` directory.
2. Create a virtual environment using `uv` (or venv):
   ```bash
   uv venv
   source .venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   uv pip install -r requirements.txt
   ```
4. Ensure the `.env` file is present with the following variables:
   - SUPABASE_URL
   - SUPABASE_SECRET_KEY
   - JWT_SECRET
   - ALLOWED_ORIGINS
   - APP_ENV
5. Start the backend server:
   ```bash
   uv uvicorn backend.main:app --host 0.0.0.0 --port 8000
   ```

### Frontend
1. Navigate to the `frontend` directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. The frontend will be available at http://localhost:5173

## Features
- User authentication (register, login, logout, change password, delete account)
- Transaction logging (income and expenses)
- Transaction history with grouping by month and category
- Settings page with theme toggle (light/dark)
- Responsive design with swipe deck for mobile devices

## Security
- Passwords are hashed using bcrypt with SHA-256 fallback for long passwords.
- JWT tokens are used for authentication with token_version for session invalidation.
- All API endpoints require authentication via httpOnly cookies.
- Rate limiting on auth endpoints to prevent brute force attacks.
- Input validation and sanitization on all endpoints.
- SQL injection prevention via Supabase parameterized queries.
- CORS restricted to allowed origins.
- Security headers (X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Cache-Control).

## Notes
- The backend uses a real Supabase instance; ensure the .env file contains valid credentials.
- The frontend proxies API requests to the backend via relative URLs (same origin).
- The application is intended for personal use and should be deployed in a secure environment.
