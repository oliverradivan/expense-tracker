from fastapi import APIRouter, HTTPException, status, Depends, Query
from pydantic import BaseModel
from typing import Optional, List
from backend.services.transactions import (
    get_categories,
    create_transaction,
    get_transactions,
    delete_transaction
)
from backend.services.auth import get_current_user
from fastapi import Request, Response
import logging

logger = logging.getLogger(__name__)

# Dependency to get the current user from the cookie (same as in auth router)
async def get_token_from_cookie(request: Request) -> str:
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return token

async def get_current_user_from_cookie(token: str = Depends(get_token_from_cookie)):
    try:
        user_info = get_current_user(token)
        return user_info
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )

router = APIRouter(tags=["transactions"])

# Pydantic models for request/response
class TransactionCreate(BaseModel):
    type: str
    category: str
    label: str
    amount: float
    date: str  # YYYY-MM-DD

class TransactionResponse(BaseModel):
    id: str
    user_id: str
    type: str
    category: str
    label: str
    amount: float
    date: str
    created_at: str

@router.get("/categories")
async def get_categories_endpoint():
    """Get available categories for income and expense."""
    return get_categories()

@router.post("/", response_model=TransactionResponse)
async def create_transaction_endpoint(
    transaction: TransactionCreate,
    request: Request,
    response: Response,
    user_info: dict = Depends(get_current_user_from_cookie)
):
    """Create a new transaction for the authenticated user."""
    try:
        db_transaction = create_transaction(
            user_id=user_info["id"],
            type=transaction.type,
            category=transaction.category,
            label=transaction.label,
            amount=transaction.amount,
            date=transaction.date
        )
        return db_transaction
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Create transaction error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.get("/", response_model=List[TransactionResponse])
async def get_transactions_endpoint(
    month: Optional[str] = Query(None, description="Filter by month in YYYY-MM format"),
    type: Optional[str] = Query(None, description="Filter by type: expense or income"),
    user_info: dict = Depends(get_current_user_from_cookie)
):
    """Get transactions for the authenticated user, with optional filters."""
    try:
        transactions = get_transactions(
            user_id=user_info["id"],
            month=month,
            type=type
        )
        return transactions
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Get transactions error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.delete("/{transaction_id}")
async def delete_transaction_endpoint(
    transaction_id: str,
    request: Request,
    response: Response,
    user_info: dict = Depends(get_current_user_from_cookie)
):
    """Delete a transaction if it belongs to the authenticated user."""
    try:
        success = delete_transaction(
            user_id=user_info["id"],
            transaction_id=transaction_id
        )
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Transaction not found or not authorized"
            )
        return {"message": "Transaction deleted successfully"}
    except Exception as e:
        logger.error(f"Delete transaction error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )