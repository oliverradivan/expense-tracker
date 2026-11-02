from datetime import date
from decimal import Decimal, InvalidOperation
from fastapi import HTTPException
try:
    from backend.data.supabase import get_supabase
    from backend.services.transactions import EXPENSE_CATEGORIES, INCOME_CATEGORIES, infer_category
except ModuleNotFoundError as exc:
    if exc.name != "backend":
        raise
    from data.supabase import get_supabase
    from services.transactions import EXPENSE_CATEGORIES, INCOME_CATEGORIES, infer_category


def scoped(query, user_id: str, household_id: str | None):
    return query.eq("household_id", household_id) if household_id else query.eq("user_id", user_id).is_("household_id", "null")


def amount_value(value):
    try:
        amount = Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError):
        raise HTTPException(400, "Enter a valid amount")
    if not amount.is_finite() or amount <= 0 or amount > Decimal("9999999999.99") or amount.as_tuple().exponent < -2:
        raise HTTPException(400, "Amount must be positive with at most two decimal places")
    return str(amount.quantize(Decimal(".01")))


def list_budgets(user_id, household_id, month):
    return scoped(get_supabase().table("monthly_budgets").select("*"), user_id, household_id).eq("month", month).order("category").execute().data


def save_budget(user_id, household_id, body):
    month = body.get("month", "")
    category = str(body.get("category") or "").strip()
    if not isinstance(month, str) or len(month) != 7 or not month[:4].isdigit() or month[4] != "-" or not month[5:].isdigit() or not 1 <= int(month[5:]) <= 12:
        raise HTTPException(400, "Choose a valid budget month")
    if len(category) > 40:
        raise HTTPException(400, "Category must be 40 characters or fewer")
    db = get_supabase()
    data = {"user_id": None if household_id else user_id, "household_id": household_id, "month": month, "category": category, "amount": amount_value(body.get("amount"))}
    existing_rows = scoped(db.table("monthly_budgets").select("id,category"), user_id, household_id).eq("month", month).execute().data
    existing = next((row for row in existing_rows if row["category"].casefold() == category.casefold()), None)
    try:
        if existing:
            return db.table("monthly_budgets").update({"amount": data["amount"]}).eq("id", existing["id"]).execute().data[0]
        return db.table("monthly_budgets").insert(data).execute().data[0]
    except Exception as exc:
        raise HTTPException(409, "Could not save budget. Check that migration 006 is applied.") from exc


def delete_budget(user_id, household_id, budget_id):
    db = get_supabase()
    if not scoped(db.table("monthly_budgets").select("id").eq("id", budget_id), user_id, household_id).limit(1).execute().data:
        raise HTTPException(404, "Budget not found")
    scoped(db.table("monthly_budgets").delete().eq("id", budget_id), user_id, household_id).execute()
    return {"ok": True}


def list_goals(user_id, household_id):
    return scoped(get_supabase().table("savings_goals").select("*"), user_id, household_id).order("created_at").execute().data


def create_goal(user_id, household_id, body):
    name = str(body.get("name", "")).strip()
    if not 1 <= len(name) <= 60:
        raise HTTPException(400, "Goal name must be 1–60 characters")
    target_date = body.get("target_date") or None
    if target_date:
        try:
            date.fromisoformat(target_date)
        except (ValueError, TypeError):
            raise HTTPException(400, "Enter a valid target date")
    data = {"user_id": None if household_id else user_id, "household_id": household_id, "name": name, "target_amount": amount_value(body.get("target_amount")), "target_date": target_date}
    return get_supabase().table("savings_goals").insert(data).execute().data[0]


def add_contribution(user_id, household_id, goal_id, body):
    try:
        value = float(amount_value(body.get("amount")))
        result = get_supabase().rpc("add_expense_goal_contribution", {
            "p_goal_id": goal_id, "p_user_id": user_id, "p_household_id": household_id, "p_amount": value,
        }).execute().data
    except Exception as exc:
        if getattr(exc, "code", None) == "P0002":
            raise HTTPException(404, "Goal not found") from exc
        if isinstance(exc, HTTPException):
            raise
        raise HTTPException(400, "Could not update goal. Check that migration 006 is applied.") from exc
    return {"saved_amount": result}


def delete_goal(user_id, household_id, goal_id):
    db = get_supabase()
    if not scoped(db.table("savings_goals").select("id").eq("id", goal_id), user_id, household_id).limit(1).execute().data:
        raise HTTPException(404, "Goal not found")
    scoped(db.table("savings_goals").delete().eq("id", goal_id), user_id, household_id).execute()
    return {"ok": True}


def list_reminders(user_id, household_id):
    return scoped(get_supabase().table("recurring_reminders").select("*"), user_id, household_id).order("next_due").execute().data


def create_reminder(user_id, household_id, body):
    kind = body.get("type")
    if kind not in {"expense", "income"}:
        raise HTTPException(400, "Choose expense or income")
    frequency = body.get("frequency")
    if frequency not in {"monthly", "yearly"}:
        raise HTTPException(400, "Choose monthly or yearly reminders")
    label = str(body.get("label", "")).strip()
    category = str(body.get("category", "")).strip()
    if not 1 <= len(label) <= 100:
        raise HTTPException(400, "Description must be 1–100 characters")
    try:
        due = date.fromisoformat(str(body.get("next_due")))
    except (ValueError, TypeError):
        raise HTTPException(400, "Enter a valid due date")
    db = get_supabase()
    defaults = EXPENSE_CATEGORIES if kind == "expense" else INCOME_CATEGORIES
    category_query = db.table("transaction_categories").select("name").eq("type", kind)
    category_query = category_query.eq("household_id", household_id) if household_id else category_query.eq("user_id", user_id).is_("household_id", "null")
    available = list(defaults) + [row["name"] for row in category_query.execute().data]
    if not category:
        category = infer_category(kind, label, available)
    elif category not in available:
        raise HTTPException(400, "Choose a valid category")
    data = {
        "user_id": None if household_id else user_id, "household_id": household_id,
        "type": kind, "category": category, "label": label,
        "amount": amount_value(body.get("amount")), "frequency": frequency, "next_due": due.isoformat(),
    }
    try:
        return db.table("recurring_reminders").insert(data).execute().data[0]
    except Exception as exc:
        raise HTTPException(400, "Could not save reminder. Check that migration 006 is applied.") from exc


def log_reminder(user_id, household_id, reminder_id):
    try:
        result = get_supabase().rpc("log_expense_reminder", {
            "p_reminder_id": reminder_id, "p_user_id": user_id, "p_household_id": household_id,
        }).execute().data
    except Exception as exc:
        if getattr(exc, "code", None) == "P0002":
            raise HTTPException(404, "Reminder not found") from exc
        if getattr(exc, "code", None) == "P0001":
            raise HTTPException(400, "This reminder is not due yet") from exc
        raise HTTPException(400, "Could not log reminder. Check that migration 006 is applied.") from exc
    return result[0]


def delete_reminder(user_id, household_id, reminder_id):
    db = get_supabase()
    if not scoped(db.table("recurring_reminders").select("id").eq("id", reminder_id), user_id, household_id).limit(1).execute().data:
        raise HTTPException(404, "Reminder not found")
    scoped(db.table("recurring_reminders").delete().eq("id", reminder_id), user_id, household_id).execute()
    return {"ok": True}
