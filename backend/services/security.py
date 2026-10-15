import bcrypt
import jwt
import hashlib
from datetime import datetime, timedelta, timezone
try:
    from backend.config import JWT_SECRET
except ModuleNotFoundError as exc:
    if exc.name != "backend":
        raise
    from config import JWT_SECRET

def hash_password(password: str) -> str:
    digest = hashlib.sha256(password.encode("utf-8")).hexdigest().encode("ascii")
    return "sha256$" + bcrypt.hashpw(digest, bcrypt.gensalt()).decode("ascii")

def verify_password(password: str, encoded: str) -> bool:
    try:
        if encoded.startswith("sha256$"):
            digest, encoded = hashlib.sha256(password.encode("utf-8")).hexdigest().encode("ascii"), encoded[7:]
            return bcrypt.checkpw(digest, encoded.encode("utf-8"))
        # Support conventional bcrypt hashes should the existing table contain any.
        raw = password.encode("utf-8")
        return (len(raw) <= 72 and bcrypt.checkpw(raw, encoded.encode("utf-8"))) or bcrypt.checkpw(hashlib.sha256(raw).hexdigest().encode("ascii"), encoded.encode("utf-8"))
    except (ValueError, TypeError):
        return False

def create_token(user_id: str, token_version: int) -> str:
    if not JWT_SECRET:
        raise RuntimeError("JWT_SECRET is not configured")
    now = datetime.now(timezone.utc)
    return jwt.encode({"sub": user_id, "ver": token_version, "iat": now, "exp": now + timedelta(days=14)}, JWT_SECRET, algorithm="HS256")

def decode_token(token: str) -> dict:
    if not JWT_SECRET:
        raise RuntimeError("JWT_SECRET is not configured")
    return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
