from dataclasses import dataclass

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.supabase_client import get_service_client

bearer = HTTPBearer()


@dataclass(frozen=True)
class CurrentUser:
    id: str
    email: str | None
    role: str


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
) -> CurrentUser:
    """Validates the Supabase access token and loads the user's role from profiles."""
    client = get_service_client()
    try:
        response = client.auth.get_user(credentials.credentials)
    except Exception:
        response = None
    if response is None or response.user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "טוקן התחברות לא תקין")

    user = response.user
    profile = (
        client.table("profiles").select("role").eq("id", user.id).maybe_single().execute()
    )
    if profile is None or not profile.data:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "לא נמצא פרופיל משתמש")

    return CurrentUser(id=user.id, email=user.email, role=profile.data["role"])


def require_admin(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    if user.role != "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "פעולה זו מותרת למנהל בלבד")
    return user
