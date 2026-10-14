from fastapi import APIRouter, HTTPException, status, Depends, Request, Response, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from slowapi import Limiter
from slowapi.util import get_remote_address
import logging
from backend.services.auth import (
    register_user,
    login_user,
    get_current_user,
    change_password,
    delete_account
)
from backend.services.security import create_access_token
from backend.config import TOKEN_EXPIRY_DAYS

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])
limiter = Limiter(key_func=get_remote_address)

# Dependency to get the current user from the token in the cookie
# We'll assume the token is stored in a cookie named "access_token"
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

@router.post("/register")
@limiter.limit("5/minute")  # Example rate limit
async def register(request: Request, response: Response, username: str = Form(...), password: str = Form(...)):
    try:
        user_id = register_user(username, password)
        # After registration, we can log in the user automatically
        _, token_version, access_token = login_user(username, password)
        # Set the token as an httpOnly cookie
        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,
            max_age=TOKEN_EXPIRY_DAYS * 24 * 60 * 60,  # seconds
            samesite="Lax",
            secure=False,  # Set to True in production (when APP_ENV != "development")
        )
        return {"message": "User registered successfully", "user_id": user_id}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT if "already taken" in str(e) else status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Registration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.post("/login")
@limiter.limit("5/minute")
async def login(request: Request, response: Response, username: str = Form(...), password: str = Form(...)):
    try:
        user_id, token_version, access_token = login_user(username, password)
        # Set the token as an httpOnly cookie
        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,
            max_age=TOKEN_EXPIRY_DAYS * 24 * 60 * 60,
            samesite="Lax",
            secure=False,  # Set to True in production
        )
        return {"message": "Login successful", "user_id": user_id}
    except ValueError as e:
        # Both invalid username and password give the same message
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.post("/logout")
async def logout(response: Response):
    # Clear the cookie
    response.delete_cookie(key="access_token", samesite="Lax", secure=False)
    return {"message": "Logged out successfully"}

@router.get("/me")
async def get_me(user_info: dict = Depends(get_current_user_from_cookie)):
    # Return user info (excluding password hash and token_version? we can return id and username)
    return {
        "id": user_info["id"],
        "username": user_info["username"]
    }

@router.post("/change-password")
async def change_password_endpoint(
    request: Request,
    current_password: str = Form(...),
    new_password: str = Form(...),
    user_info: dict = Depends(get_current_user_from_cookie)
):
    try:
        new_token_version = change_password(user_info["id"], current_password, new_password)
        # Since token_version changed, we need to issue a new token and set the cookie
        # Generate new access token with the updated token_version
        access_token = create_access_token(user_info["id"], new_token_version)
        response = Response()
        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,
            max_age=TOKEN_EXPIRY_DAYS * 24 * 60 * 60,
            samesite="Lax",
            secure=False,
        )
        return {"message": "Password changed successfully"}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Change password error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.delete("/me")
async def delete_account_endpoint(
    request: Request,
    response: Response,
    password: str = Form(...),
    user_info: dict = Depends(get_current_user_from_cookie)
):
    try:
        success = delete_account(user_info["id"], password)
        if success:
            # Clear the cookie
            response.delete_cookie(key="access_token", samesite="Lax", secure=False)
            return {"message": "Account deleted successfully"}
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete account"
            )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Delete account error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )