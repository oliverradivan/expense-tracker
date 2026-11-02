from fastapi import APIRouter, Depends
try:
    from backend.services.auth import current_user
    from backend.services.planning import (
        add_contribution, create_goal, create_reminder, delete_budget, delete_goal,
        delete_reminder, list_budgets, list_goals, list_reminders, log_reminder, save_budget,
    )
    from backend.routers.transactions import require_member
except ModuleNotFoundError as exc:
    if exc.name != "backend":
        raise
    from services.auth import current_user
    from services.planning import (
        add_contribution, create_goal, create_reminder, delete_budget, delete_goal,
        delete_reminder, list_budgets, list_goals, list_reminders, log_reminder, save_budget,
    )
    from routers.transactions import require_member

router = APIRouter()


def checked_space(user_id, household_id):
    if household_id:
        require_member(user_id, household_id)


@router.get("/budgets")
def budgets(month: str, household_id: str | None = None, user=Depends(current_user)):
    checked_space(user["id"], household_id)
    return list_budgets(user["id"], household_id, month)


@router.post("/budgets")
def budget(body: dict, user=Depends(current_user)):
    household_id = body.get("household_id") or None
    checked_space(user["id"], household_id)
    return save_budget(user["id"], household_id, body)


@router.delete("/budgets/{budget_id}")
def remove_budget(budget_id: str, household_id: str | None = None, user=Depends(current_user)):
    checked_space(user["id"], household_id)
    return delete_budget(user["id"], household_id, budget_id)


@router.get("/goals")
def goals(household_id: str | None = None, user=Depends(current_user)):
    checked_space(user["id"], household_id)
    return list_goals(user["id"], household_id)


@router.post("/goals")
def goal(body: dict, user=Depends(current_user)):
    household_id = body.get("household_id") or None
    checked_space(user["id"], household_id)
    return create_goal(user["id"], household_id, body)


@router.post("/goals/{goal_id}/contributions")
def contribution(goal_id: str, body: dict, household_id: str | None = None, user=Depends(current_user)):
    checked_space(user["id"], household_id)
    return add_contribution(user["id"], household_id, goal_id, body)


@router.delete("/goals/{goal_id}")
def remove_goal(goal_id: str, household_id: str | None = None, user=Depends(current_user)):
    checked_space(user["id"], household_id)
    return delete_goal(user["id"], household_id, goal_id)


@router.get("/reminders")
def reminders(household_id: str | None = None, user=Depends(current_user)):
    checked_space(user["id"], household_id)
    return list_reminders(user["id"], household_id)


@router.post("/reminders")
def reminder(body: dict, user=Depends(current_user)):
    household_id = body.get("household_id") or None
    checked_space(user["id"], household_id)
    return create_reminder(user["id"], household_id, body)


@router.post("/reminders/{reminder_id}/log")
def log_due_reminder(reminder_id: str, household_id: str | None = None, user=Depends(current_user)):
    checked_space(user["id"], household_id)
    return log_reminder(user["id"], household_id, reminder_id)


@router.delete("/reminders/{reminder_id}")
def remove_reminder(reminder_id: str, household_id: str | None = None, user=Depends(current_user)):
    checked_space(user["id"], household_id)
    return delete_reminder(user["id"], household_id, reminder_id)
