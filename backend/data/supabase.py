from functools import lru_cache
from supabase import create_client
try:
    from backend.config import SUPABASE_URL, SUPABASE_SECRET_KEY
except ModuleNotFoundError as exc:
    if exc.name != "backend":
        raise
    from config import SUPABASE_URL, SUPABASE_SECRET_KEY

@lru_cache(maxsize=1)
def get_supabase():
    if not SUPABASE_URL or not SUPABASE_SECRET_KEY:
        raise RuntimeError("Supabase is not configured. Set SUPABASE_URL and SUPABASE_SECRET_KEY.")
    return create_client(SUPABASE_URL, SUPABASE_SECRET_KEY)

supabase = get_supabase if SUPABASE_URL and SUPABASE_SECRET_KEY else None
