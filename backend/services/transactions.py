from backend.data.supabase import supabase
from postgrest.exceptions import APIError

def get_categories():
    """Return static categories for income and expense."""
    return {
        "expense": ["subscription", "apartment", "grocery", "other"],
        "income": ["job", "maanak", "gift", "other"]
    }

def create_transaction(user_id: str, type: str, category: str, label: str, amount: float, date: str):
    """Insert a new transaction for the user.
    Returns the inserted transaction data on success.
    Raises appropriate exceptions on failure.
    """
    # Validate type
    if type not in ("expense", "income"):
        raise ValueError("Invalid type")
    
    # Validate category matches type
    categories = get_categories()
    if category not in categories[type]:
        raise ValueError("Invalid category for type")
    
    # Validate label length (1-100)
    if not (1 <= len(label) <= 100):
        raise ValueError("Label must be between 1 and 100 characters")
    
    # Validate amount > 0 and has at most 2 decimal places
    if amount <= 0:
        raise ValueError("Amount must be greater than 0")
    if round(amount, 2) != amount:
        raise ValueError("Amount must have at most 2 decimal places")
    
    # Validate date format (YYYY-MM-DD)
    # We'll let the database handle date validation, but we can do a basic check
    # For simplicity, we'll just pass it to the database and catch any error.
    
    # Insert transaction
    transaction_data = {
        "user_id": user_id,
        "type": type,
        "category": category,
        "label": label,
        "amount": amount,
        "date": date
    }
    result = supabase.table('transactions').insert(transaction_data).execute()
    if not result.data:
        raise Exception("Failed to create transaction")
    return result.data[0]

def get_transactions(user_id: str, month: str = None, type: str = None):
    """Get transactions for a user, optionally filtered by month and type.
    Month format: YYYY-MM
    Returns list of transactions.
    """
    query = supabase.table('transactions').select('*').eq('user_id', user_id)
    
    if month:
        # Filter by month: we can use the date column and extract year and month
        # Since date is a DATE type, we can use >= first day of month and < first day of next month
        # We'll do: date >= month-01 and date < (month+1)-01
        # We'll calculate the first day of the month and the first day of the next month.
        # We'll assume month is valid YYYY-MM.
        try:
            year, month_num = month.split('-')
            start_date = f"{year}-{month_num}-01"
            # Calculate end date: first day of next month
            next_month = int(month_num) + 1
            next_year = int(year)
            if next_month > 12:
                next_month = 1
                next_year += 1
            end_date = f"{next_year:04d}-{next_month:02d}-01"
        except Exception:
            raise ValueError("Invalid month format. Expected YYYY-MM")
        
        query = query.gte('date', start_date).lt('date', end_date)
    
    if type:
        if type not in ("expense", "income"):
            raise ValueError("Invalid type")
        query = query.eq('type', type)
    
    result = query.order('date', desc=True).execute()
    return result.data

def delete_transaction(user_id: str, transaction_id: str):
    """Delete a transaction if it belongs to the user.
    Returns True on success, False if not found or not owned.
    """
    # First, check if the transaction exists and belongs to the user
    result = supabase.table('transactions').select('id').eq('id', transaction_id).eq('user_id', user_id).execute()
    if not result.data or len(result.data) == 0:
        return False  # Not found or not owned
    
    # Delete the transaction
    supabase.table('transactions').delete().eq('id', transaction_id).execute()
    return True