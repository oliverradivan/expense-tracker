from fastapi import FastAPI, Request, Depends
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
import time
import logging
from backend.config import APP_ENV, ALLOWED_ORIGINS
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Expense Tracker API",
    description="API for personal expense tracker",
    version="0.1.0",
    # Disable docs in production
    docs_url=None if APP_ENV != "development" else "/docs",
    redoc_url=None if APP_ENV != "development" else "/redoc",
    openapi_url=None if APP_ENV != "development" else "/openapi.json"
)

# Rate limiting
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Security headers middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    # For API endpoints, we want to avoid caching sensitive data
    if request.url.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    else:
        # For non-API routes (if any), we can allow caching but still be safe
        response.headers["Cache-Control"] = "no-cache"
    return response

# Trusted host middleware (optional, but good practice)
# We'll allow any host for now since we are behind a reverse proxy? 
# For simplicity, we'll not restrict hosts in development.
if APP_ENV != "development":
    # In production, we should restrict to our domain
    # We'll get the allowed host from SUPABASE_URL? Not ideal.
    # We'll skip for now and rely on reverse proxy.
    pass

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "ok", "note": "test", "timestamp": time.time()}

# Global exception handler to avoid leaking stack traces
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )

# Import and include routers
from backend.routers import auth, transactions

app.include_router(auth.router, prefix="", tags=["auth"])
app.include_router(transactions.router, prefix="/transactions", tags=["transactions"])