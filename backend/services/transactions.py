from datetime import date
from decimal import Decimal, InvalidOperation
from fastapi import HTTPException
try:
    from backend.data.supabase import get_supabase
except ModuleNotFoundError as exc:
    if exc.name != "backend":
        raise
    from data.supabase import get_supabase

EXPENSE_CATEGORIES = ("Subscription", "Apartment", "Grocery", "Other")
INCOME_CATEGORIES = ("Job", "Maanak", "Gift", "Other")

def infer_category(kind: str, label: str, available: tuple[str, ...] | list[str]) -> str:
    """Classify a transaction from its description, falling back to Other."""
    text = label.casefold()
    rules = {
        "Subscription": ("netflix", "spotify", "subscription", "youtube", "icloud", "disney+", "monthly plan"),
        "Apartment": ("rent", "apartment", "mortgage", "electric", "electricity", "water bill", "internet", "arnona"),
        "Grocery": ("grocery", "groceries", "supermarket", "market", "shufersal", "rami levy", "food", "produce"),
        "Job": ("salary", "paycheck", "pay cheque", "wage", "freelance", "client payment"),
        "Maanak": ("maanak", "grant", "scholarship", "stipend"),
        "Gift": ("gift", "birthday money", "present"),
    }
    for name in sorted((name for name in available if name != "Other"), key=len, reverse=True):
        if name.casefold() in text:
            return name
    for category, keywords in rules.items():
        if category in available and any(word in text for word in keywords):
            return category
    return "Other" if "Other" in available else available[0]

def list_transactions(user_id: str, household_id: str | None = None):
    db = get_supabase()
    query = db.table("transactions").select("id,user_id,household_id,type,category,label,amount,date,created_at")
    query = query.eq("household_id", household_id) if household_id else query.eq("user_id", user_id).is_("household_id", "null")
    return query.order("date", desc=True).order("created_at", desc=True).execute().data

def create_transaction(user_id: str, body: dict):
    kind = body.get("type")
    category = body.get("category")
    label = str(body.get("label", "")).strip()
    try:
        amount = Decimal(str(body.get("amount")))
        day = date.fromisoformat(str(body.get("date")))
    except (InvalidOperation, ValueError, TypeError):
        raise HTTPException(400, "Enter a valid amount and date")
    if not isinstance(kind, str) or kind not in {"expense", "income"}:
        raise HTTPException(400, "Transaction type must be expense or income")
    if len(label) < 1 or len(label) > 100:
        raise HTTPException(400, "Description must be 1–100 characters")
    if not amount.is_finite() or amount <= 0 or amount > Decimal("9999999999.99") or amount.as_tuple().exponent < -2:
        raise HTTPException(400, "Amount must be positive with at most two decimal places")
    household_id = body.get("household_id") or None
    defaults = EXPENSE_CATEGORIES if kind == "expense" else INCOME_CATEGORIES
    available = list(defaults)
    category_query = get_supabase().table("transaction_categories").select("name").eq("type", kind)
    category_query = category_query.eq("household_id", household_id) if household_id else category_query.eq("user_id", user_id).is_("household_id", "null")
    available.extend(row["name"] for row in category_query.execute().data)
    if category is None or category == "":
        category = infer_category(kind, label, available)
    if not isinstance(category, str) or category not in available:
        raise HTTPException(400, "Choose a valid category")
    frequency = body.get("frequency", "one_time")
    if not isinstance(frequency, str) or frequency not in {"one_time", "monthly", "yearly"}:
        raise HTTPException(400, "Choose a valid transaction frequency")
    if category not in defaults:
        query = get_supabase().table("transaction_categories").select("id").eq("name", category).eq("type", kind)
        query = query.eq("household_id", household_id) if household_id else query.eq("user_id", user_id).is_("household_id", "null")
        if not query.limit(1).execute().data:
            raise HTTPException(400, "That category is not available in the selected financial space")
    data = {"user_id": None if household_id else user_id, "household_id": household_id, "type": kind, "category": category, "label": label, "amount": str(amount.quantize(Decimal('.01'))), "date": day.isoformat(), "frequency": frequency}
    try:
        return get_supabase().table("transactions").insert(data).execute().data[0]
    except Exception as exc:
        raise HTTPException(400, "Could not save transaction. Check the migration is applied and try again") from exc
