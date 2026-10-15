from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
try:
    from backend.data.supabase import get_supabase
    from backend.services.auth import current_user, USERNAME
except ModuleNotFoundError as exc:
    if exc.name != "backend":
        raise
    from data.supabase import get_supabase
    from services.auth import current_user, USERNAME

router = APIRouter()
db = get_supabase

@router.get("/")
def list_spaces(user=Depends(current_user)):
    d = db()
    memberships = d.table("household_members").select("household_id,role,households(id,name,created_at)").eq("user_id", user["id"]).execute().data
    invitations = d.table("household_invitations").select("id,household_id,inviter_id,created_at,households(name),users!household_invitations_inviter_id_fkey(username)").eq("invitee_id", user["id"]).eq("status", "pending").execute().data
    spaces = []
    for x in memberships:
        household = {**(x.get("households") or {}), "role": x["role"]}
        household["members"] = d.table("household_members").select("user_id,role,users(username)").eq("household_id", x["household_id"]).execute().data
        spaces.append(household)
    return {"households": spaces, "invitations": invitations}

@router.post("/")
def create(body: dict, user=Depends(current_user)):
    name = str(body.get("name", "")).strip()
    if not 2 <= len(name) <= 60: raise HTTPException(400, "Household name must be 2–60 characters")
    d = db(); h = d.table("households").insert({"name": name, "created_by": user["id"]}).execute().data[0]
    d.table("household_members").insert({"household_id": h["id"], "user_id": user["id"], "role": "owner"}).execute()
    return h

@router.post("/{hid}/invitations")
def invite(hid: str, body: dict, user=Depends(current_user)):
    d = db()
    if not d.table("household_members").select("id").eq("household_id", hid).eq("user_id", user["id"]).limit(1).execute().data: raise HTTPException(403, "Household membership required")
    username = str(body.get("username", "")).strip()
    if not USERNAME.fullmatch(username): raise HTTPException(400, "Enter a valid username")
    found = d.rpc("find_expense_username", {"p_username": username}).execute().data
    if not found: raise HTTPException(404, "No user has that username")
    if found[0]["id"] == user["id"]: raise HTTPException(400, "You are already in this household")
    if d.table("household_members").select("id").eq("household_id", hid).eq("user_id", found[0]["id"]).limit(1).execute().data: raise HTTPException(409, "That user is already a member")
    try:
        return d.table("household_invitations").insert({"household_id": hid, "inviter_id": user["id"], "invitee_id": found[0]["id"]}).execute().data[0]
    except Exception as exc: raise HTTPException(409, "A pending invitation already exists") from exc

@router.post("/invitations/{iid}/{action}")
def respond(iid: str, action: str, user=Depends(current_user)):
    if action not in {"accept", "decline"}: raise HTTPException(400, "Invalid invitation action")
    d = db(); rows = d.table("household_invitations").select("id,household_id,status").eq("id", iid).eq("invitee_id", user["id"]).eq("status", "pending").limit(1).execute().data
    if not rows: raise HTTPException(404, "Pending invitation not found")
    if action == "accept":
        d.table("household_members").insert({"household_id": rows[0]["household_id"], "user_id": user["id"], "role": "member"}).execute()
    d.table("household_invitations").update({"status": "accepted" if action == "accept" else "declined", "responded_at": datetime.now(timezone.utc).isoformat()}).eq("id", iid).execute()
    return {"ok": True}

@router.delete("/{hid}/members/me")
def leave(hid: str, user=Depends(current_user)):
    d = db(); rows = d.table("household_members").select("role").eq("household_id", hid).eq("user_id", user["id"]).limit(1).execute().data
    if not rows: raise HTTPException(404, "Membership not found")
    if rows[0]["role"] == "owner":
        other = d.table("household_members").select("user_id").eq("household_id", hid).neq("user_id", user["id"]).order("joined_at").limit(1).execute().data
        if other: d.table("households").update({"created_by": other[0]["user_id"]}).eq("id", hid).execute(); d.table("household_members").update({"role": "owner"}).eq("household_id", hid).eq("user_id", other[0]["user_id"]).execute()
        else: raise HTTPException(400, "Add another member before leaving as the only owner")
    d.table("household_members").delete().eq("household_id", hid).eq("user_id", user["id"]).execute()
    return {"ok": True}
