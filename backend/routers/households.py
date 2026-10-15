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

@router.post("/join-requests")
def request_to_join(body: dict, user=Depends(current_user)):
    name = str(body.get("household_name", "")).strip()
    if not 2 <= len(name) <= 60:
        raise HTTPException(400, "Enter a household name between 2 and 60 characters")
    d = db()
    matches = d.rpc("find_expense_household", {"p_name": name}).execute().data or []
    if not matches:
        raise HTTPException(404, "No household found with that name")
    if len(matches) > 1:
        raise HTTPException(409, "More than one household has that name. Ask the owner to invite you by username instead.")
    household = matches[0]
    if d.table("household_members").select("id").eq("household_id", household["id"]).eq("user_id", user["id"]).limit(1).execute().data:
        raise HTTPException(409, "You are already a member of that household")
    pending = d.table("household_join_requests").select("id").eq("household_id", household["id"]).eq("requester_id", user["id"]).eq("status", "pending").limit(1).execute().data
    if pending:
        raise HTTPException(409, "You already have a pending request for that household")
    try:
        return d.table("household_join_requests").insert({"household_id": household["id"], "requester_id": user["id"]}).execute().data[0]
    except Exception as exc:
        raise HTTPException(409, "You already have a pending request for that household") from exc

@router.get("/join-requests")
def list_join_requests(user=Depends(current_user)):
    d = db()
    owned = d.table("household_members").select("household_id").eq("user_id", user["id"]).eq("role", "owner").execute().data or []
    incoming = []
    if owned:
        incoming = d.table("household_join_requests").select(
            "id,household_id,requester_id,created_at,households(name),users!household_join_requests_requester_id_fkey(username)"
        ).in_("household_id", [item["household_id"] for item in owned]).eq("status", "pending").order("created_at", desc=True).execute().data or []
    outgoing = d.table("household_join_requests").select(
        "id,status,created_at,households(name)"
    ).eq("requester_id", user["id"]).order("created_at", desc=True).limit(10).execute().data or []
    return {"incoming": incoming, "outgoing": outgoing}

@router.post("/join-requests/{request_id}/{action}")
def respond_to_join_request(request_id: str, action: str, user=Depends(current_user)):
    if action not in {"accept", "decline"}:
        raise HTTPException(400, "Invalid request action")
    d = db()
    rows = d.table("household_join_requests").select("id,household_id,requester_id").eq("id", request_id).eq("status", "pending").limit(1).execute().data
    if not rows:
        raise HTTPException(404, "Pending join request not found")
    request = rows[0]
    is_owner = d.table("household_members").select("id").eq("household_id", request["household_id"]).eq("user_id", user["id"]).eq("role", "owner").limit(1).execute().data
    if not is_owner:
        raise HTTPException(403, "Only a household owner can respond to join requests")
    if action == "accept":
        already_member = d.table("household_members").select("id").eq("household_id", request["household_id"]).eq("user_id", request["requester_id"]).limit(1).execute().data
        if already_member:
            raise HTTPException(409, "This person is already a household member")
        d.table("household_members").insert({"household_id": request["household_id"], "user_id": request["requester_id"], "role": "member"}).execute()
    d.table("household_join_requests").update({"status": "accepted" if action == "accept" else "declined", "responded_at": datetime.now(timezone.utc).isoformat()}).eq("id", request_id).eq("status", "pending").execute()
    return {"ok": True}

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
