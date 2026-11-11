from functools import lru_cache

from fastapi import HTTPException, status
from supabase import Client, create_client

from app.config import get_settings


@lru_cache
def get_service_client() -> Client:
    """Supabase client with the service_role key. Bypasses RLS — server-side only."""
    settings = get_settings()
    if not settings.supabase_service_role_key:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "השרת עוד לא חובר ל-Supabase: חסר המשתנה SUPABASE_SERVICE_ROLE_KEY",
        )
    return create_client(settings.supabase_url, settings.supabase_service_role_key)
