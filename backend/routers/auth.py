from fastapi import APIRouter, Depends, Form, Request, Response, HTTPException
from slowapi import Limiter
from slowapi.util import get_remote_address
try:
    from backend.config import COOKIE_SECURE
    from backend.data.supabase import get_supabase
    from backend.services.auth import current_user, register, authenticate
    from backend.services.security import create_token, hash_password, verify_password
except ModuleNotFoundError as exc:
    if exc.name != "backend":
        raise
    from config import COOKIE_SECURE
    from data.supabase import get_supabase
    from services.auth import current_user, register, authenticate
    from services.security import create_token, hash_password, verify_password

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

def set_session(response, user):
    response.set_cookie("access_token", create_token(user["id"], int(user.get("token_version", 0))), httponly=True, secure=COOKIE_SECURE, samesite="lax", max_age=1209600, path="/")

@router.post("/register")
@limiter.limit("5/minute")
def register_route(request: Request, response: Response, username: str = Form(...), password: str = Form(...)):
    user = register(username, password)
    set_session(response, user)
    return {"id": user["id"], "username": user["username"]}

@router.post("/login")
@limiter.limit("10/minute")
def login_route(request: Request, response: Response, username: str = Form(...), password: str = Form(...)):
    user = authenticate(username, password)
    set_session(response, user)
    return {"id": user["id"], "username": user["username"]}

@router.get("/me")
def me(user=Depends(current_user)):
    return user

@router.post("/logout")
def logout(response: Response, user=Depends(current_user)):
    db = get_supabase()
    rows = db.table("users").select("token_version").eq("id", user["id"]).limit(1).execute().data
    if rows:
        db.table("users").update({"token_version": int(rows[0]["token_version"]) + 1}).eq("id", user["id"]).execute()
    response.delete_cookie("access_token", path="/")
    return {"ok": True}

@router.post("/password")
def change_password(body: dict, response: Response, user=Depends(current_user)):
    old, new = body.get("current_password", ""), body.get("new_password", "")
    if len(new) < 7:
        raise HTTPException(400, "New password must be at least 7 characters")
    rows = get_supabase().table("users").select("password_hash,token_version").eq("id", user["id"]).limit(1).execute().data
    if not rows or not verify_password(old, rows[0]["password_hash"]):
        raise HTTPException(400, "Current password is incorrect")
    version = int(rows[0]["token_version"]) + 1
    updated = get_supabase().table("users").update({"password_hash": hash_password(new), "token_version": version}).eq("id", user["id"]).execute().data[0]
    set_session(response, {**user, **updated, "token_version": version})
    return {"ok": True}

@router.delete("/me")
def delete_account(response: Response, password: str = Form(...), user=Depends(current_user)):
    rows = get_supabase().table("users").select("password_hash").eq("id", user["id"]).limit(1).execute().data
    if not rows or not verify_password(password, rows[0]["password_hash"]):
        raise HTTPException(400, "Password is incorrect")
    db = get_supabase()
    # Orphan owned households are kept and assigned to their oldest remaining member.
    db.rpc("delete_expense_user", {"target_user_id": user["id"]}).execute()
    response.delete_cookie("access_token", path="/")
    return {"ok": True}
