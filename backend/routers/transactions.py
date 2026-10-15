from fastapi import APIRouter, Depends, HTTPException
from backend.data.supabase import get_supabase
from backend.services.auth import current_user
from backend.services.transactions import list_transactions, create_transaction, EXPENSE_CATEGORIES, INCOME_CATEGORIES

router = APIRouter()

@router.get("/categories")
def get_categories(type: str, household_id: str | None = None, user=Depends(current_user)):
    if not isinstance(type, str) or type not in {"expense", "income"}:
        raise HTTPException(400, "Choose expense or income")
    defaults = list(EXPENSE_CATEGORIES if type == "expense" else INCOME_CATEGORIES)
    query = get_supabase().table("transaction_categories").select("name").eq("type", type)
    if household_id:
        require_member(user["id"], household_id)
        query = query.eq("household_id", household_id)
    else:
        query = query.eq("user_id", user["id"]).is_("household_id", "null")
    custom = [row["name"] for row in query.order("name").execute().data]
    return {"categories": list(dict.fromkeys(defaults + custom))}

@router.post("/categories")
def add_category(body: dict, user=Depends(current_user)):
    kind, name = body.get("type"), str(body.get("name", "")).strip()
    household_id = body.get("household_id") or None
    if not isinstance(kind, str) or kind not in {"expense", "income"}:
        raise HTTPException(400, "Choose expense or income")
    if not 1 <= len(name) <= 40:
        raise HTTPException(400, "Category name must be 1–40 characters")
    if household_id:
        require_member(user["id"], household_id)
    defaults = EXPENSE_CATEGORIES if kind == "expense" else INCOME_CATEGORIES
    if name.casefold() in {item.casefold() for item in defaults}:
        raise HTTPException(409, "That category already exists")
    data = {"user_id": None if household_id else user["id"], "household_id": household_id, "type": kind, "name": name}
    try:
        return get_supabase().table("transaction_categories").insert(data).execute().data[0]
    except Exception as exc:
        raise HTTPException(409, "That category already exists in this financial space") from exc

def require_member(user_id: str, household_id: str):
    rows = get_supabase().table("household_members").select("id").eq("user_id", user_id).eq("household_id", household_id).limit(1).execute().data
    if not rows:
        raise HTTPException(403, "You are not a member of that household")

@router.get("/")
def get_all(household_id: str | None = None, user=Depends(current_user)):
    if household_id:
        require_member(user["id"], household_id)
    return list_transactions(user["id"], household_id)

@router.post("/")
def add(body: dict, user=Depends(current_user)):
    household_id = body.get("household_id")
    if household_id:
        require_member(user["id"], household_id)
    return create_transaction(user["id"], body)

@router.delete("/{transaction_id}")
def remove(transaction_id: str, user=Depends(current_user)):
    db = get_supabase()
    rows = db.table("transactions").select("id,user_id,household_id").eq("id", transaction_id).limit(1).execute().data
    if not rows:
        raise HTTPException(404, "Transaction not found")
    row = rows[0]
    if row.get("household_id"):
        require_member(user["id"], row["household_id"])
    elif row.get("user_id") != user["id"]:
        raise HTTPException(404, "Transaction not found")
    db.table("transactions").delete().eq("id", transaction_id).execute()
    return {"ok": True}
