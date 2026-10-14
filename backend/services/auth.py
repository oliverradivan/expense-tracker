import uuid
from datetime import datetime
from backend.data.supabase import supabase
from backend.services.security import hash_password, verify_password, create_access_token, verify_access_token
from backend.config import JWT_SECRET
import jwt
from postgrest.exceptions import APIError

def register_user(username: str, password: str):
    """Register a new user.
    Returns the user id on success.
    Raises appropriate exceptions on failure.
    """
    # Check if username already exists (case-insensitive)
    # We'll query by lower(username)
    existing = supabase.table('users').select('id').ilike('username', username).execute()
    if existing.data and len(existing.data) > 0:
        # Raise an exception that will be caught in the router to return 409
        raise ValueError("Username already taken")
    
    # Hash the password
    hashed_password = hash_password(password)
    
    # Insert new user
    user_id = str(uuid.uuid4())
    data = {
        "id": user_id,
        "username": username,
        "password_hash": hashed_password,
        "token_version": 0
    }
    result = supabase.table('users').insert(data).execute()
    if not result.data:
        raise Exception("Failed to create user")
    
    return user_id

def login_user(username: str, password: str):
    """Login a user.
    Returns (user_id, token_version, access_token) on success.
    Raises appropriate exceptions on failure.
    """
    # Fetch user by username (case-insensitive)
    result = supabase.table('users').select('id, username, password_hash, token_version').ilike('username', username).execute()
    if not result.data or len(result.data) == 0:
        # User not found: perform a dummy hash to prevent timing attack
        dummy_hash = hash_password("dummy")
        verify_password(password, dummy_hash)  # Always false, but takes time
        raise ValueError("Invalid username or password")
    
    user = result.data[0]
    user_id = user['id']
    stored_hash = user['password_hash']
    token_version = user['token_version']
    
    # Verify password
    if not verify_password(password, stored_hash):
        raise ValueError("Invalid username or password")
    
    # Create access token
    access_token = create_access_token(user_id, token_version)
    
    return user_id, token_version, access_token

def get_current_user(access_token: str):
    """Validate access token and return user info.
    Returns user dict (id, username, token_version) if valid and token_version matches.
    Raises appropriate exceptions on failure.
    """
    try:
        payload = verify_access_token(access_token)
    except jwt.PyJWTError:
        raise ValueError("Invalid token")
    
    user_id = payload.get('sub')
    token_version_from_token = payload.get('token_version')
    
    # Fetch user from database
    try:
        result = supabase.table('users').select('id, username, token_version').eq('id', user_id).single().execute()
    except APIError as e:
        if e.code == 'PGRST116':
            raise ValueError("User not found")
        else:
            raise
    
    if not result.data:
        raise ValueError("User not found")
    
    user = result.data
    # Check token_version matches
    if user['token_version'] != token_version_from_token:
        raise ValueError("Token version mismatch")
    
    return {
        "id": user['id'],
        "username": user['username'],
        "token_version": user['token_version']
    }

def change_password(user_id: str, current_password: str, new_password: str):
    """Change password for a user.
    Increments token_version.
    """
    # Fetch current password hash
    result = supabase.table('users').select('password_hash, token_version').eq('id', user_id).single().execute()
    if not result.data:
        raise ValueError("User not found")
    
    stored_hash = result.data['password_hash']
    current_token_version = result.data['token_version']
    
    # Verify current password
    if not verify_password(current_password, stored_hash):
        raise ValueError("Invalid current password")
    
    # Hash new password
    new_hashed = hash_password(new_password)
    
    # Update user with new password hash and increment token_version
    update_data = {
        "password_hash": new_hashed,
        "token_version": current_token_version + 1
    }
    supabase.table('users').update(update_data).eq('id', user_id).execute()
    
    # Return new token_version
    return current_token_version + 1

def delete_account(user_id: str, password: str):
    """Delete a user account.
    Returns True on success.
    """
    # Fetch current password hash
    result = supabase.table('users').select('password_hash').eq('id', user_id).single().execute()
    if not result.data:
        raise ValueError("User not found")
    
    stored_hash = result.data['password_hash']
    
    # Verify password
    if not verify_password(password, stored_hash):
        raise ValueError("Invalid password")
    
    # Delete user (cascade will delete transactions)
    supabase.table('users').delete().eq('id', user_id).execute()
    return True