import re
from fastapi import HTTPException, Request
from jwt import InvalidTokenError
try:
    from backend.data.supabase import get_supabase
    from backend.services.security import decode_token, hash_password, verify_password
except ModuleNotFoundError as exc:
    if exc.name != "backend":
        raise
    from data.supabase import get_supabase
    from services.security import decode_token, hash_password, verify_password

USERNAME = re.compile(r"^[A-Za-z0-9_]{3,30}$")

def current_user(request: Request):
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Please sign in")
    try:
        claims = decode_token(token)
        result = get_supabase().table("users").select("id,username,token_version").eq("id", claims["sub"]).limit(1).execute()
        user = result.data[0] if result.data else None
        if not user or int(user["token_version"]) != int(claims.get("ver", -1)):
            raise HTTPException(status_code=401, detail="Session expired")
        return {"id": user["id"], "username": user["username"]}
    except HTTPException:
        raise
    except (InvalidTokenError, KeyError, ValueError, RuntimeError):
        raise HTTPException(status_code=401, detail="Invalid or expired session")

def register(username: str, password: str):
    username = username.strip()
    if not USERNAME.fullmatch(username):
        raise HTTPException(400, "Username must be 3–30 letters, numbers, or underscores")
    if len(password) < 7:
        raise HTTPException(400, "Password must be at least 7 characters")
    db = get_supabase()
    if db.rpc("find_expense_user", {"p_username": username}).execute().data:
        raise HTTPException(409, "That username is already taken")
    try:
        response = db.table("users").insert({"username": username, "password_hash": hash_password(password)}).execute()
        return response.data[0]
    except Exception as exc:
        if "duplicate" in str(exc).lower() or "unique" in str(exc).lower():
            raise HTTPException(409, "That username is already taken")
        raise

def authenticate(username: str, password: str):
    username = username.strip()
    if not USERNAME.fullmatch(username):
        raise HTTPException(401, "Incorrect username or password")
    users = get_supabase().rpc("find_expense_user", {"p_username": username}).execute().data
    if not users or not verify_password(password, users[0]["password_hash"]):
        raise HTTPException(401, "Incorrect username or password")
    return users[0]
