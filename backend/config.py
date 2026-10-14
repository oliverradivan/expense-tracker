import os
from dotenv import load_dotenv
from typing import List

# Load .env file from the same directory as this config file
dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(dotenv_path)

# Supabase
SUPABASE_URL: str = os.getenv("SUPABASE_URL")
SUPABASE_SECRET_KEY: str = os.getenv("SUPABASE_SECRET_KEY")

# JWT
JWT_SECRET: str = os.getenv("JWT_SECRET")
# Token expiry in days, default 7
TOKEN_EXPIRY_DAYS: int = int(os.getenv("TOKEN_EXPIRY_DAYS", "7"))

# CORS
ALLOWED_ORIGINS: List[str] = os.getenv("ALLOWED_ORIGINS", "").split(",")

# App environment
APP_ENV: str = os.getenv("APP_ENV", "development")