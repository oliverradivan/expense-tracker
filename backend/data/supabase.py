from supabase import create_client, Client
from backend.config import SUPABASE_URL, SUPABASE_SECRET_KEY

# Initialize Supabase client with the service role key (secret key)
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SECRET_KEY)