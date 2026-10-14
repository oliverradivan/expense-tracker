import bcrypt
import jwt
import datetime
from backend.config import JWT_SECRET, TOKEN_EXPIRY_DAYS

def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    # bcrypt has a 72-byte limit for input; we can truncate or hash with sha256 first?
    # For simplicity, we'll truncate to 72 bytes if needed, but passwords are unlikely to be that long.
    # We'll follow the recommendation: if password longer than 72 bytes, hash with SHA-256 then bcrypt.
    # However, for this app, we'll just limit password length to 72 bytes via validation.
    # The validation step will enforce max 128 chars, but we still need to handle >72.
    # Let's do: if len(password.encode('utf-8')) > 72, we hash with SHA-256 first.
    import hashlib
    pw_bytes = password.encode('utf-8')
    if len(pw_bytes) > 72:
        # Hash with SHA-256 to get a fixed length
        pw_bytes = hashlib.sha256(pw_bytes).digest()
    # Now bcrypt expects bytes
    hashed = bcrypt.hashpw(pw_bytes, bcrypt.gensalt())
    return hashed.decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against a hashed string."""
    import hashlib
    pw_bytes = password.encode('utf-8')
    if len(pw_bytes) > 72:
        pw_bytes = hashlib.sha256(pw_bytes).digest()
    # hashed is stored as string, convert to bytes
    return bcrypt.checkpw(pw_bytes, hashed.encode('utf-8'))

def create_access_token(user_id: str, token_version: int) -> str:
    """Create a JWT access token with user_id and token_version."""
    expire = datetime.datetime.utcnow() + datetime.timedelta(days=TOKEN_EXPIRY_DAYS)
    to_encode = {
        "sub": user_id,
        "token_version": token_version,
        "exp": expire,
        "iat": datetime.datetime.utcnow()
    }
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm="HS256")
    return encoded_jwt

def verify_access_token(token: str) -> dict:
    """Verify and decode the JWT token.
    Returns the payload if valid, raises jwt.PyJWTError otherwise.
    """
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload
    except jwt.PyJWTError as e:
        raise e