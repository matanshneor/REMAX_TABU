from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    supabase_url: str
    # Optional at startup so the service (and its health check) can run before the key is
    # configured; the lead endpoint returns 503 until it's set.
    supabase_service_role_key: str = ""
    # Comma-separated list of allowed origins: the public website's address.
    cors_origins: str = "http://localhost:3001"

    # The site's agent: their row in the office team list (office_agents.id), the same id the
    # database views use (migration public_website). Leads become their buyers.
    website_agent_id: str = "63a51f45-fdef-4797-855d-12d8b9405960"
    # The public website's address, used in links inside lead notes.
    website_url: str = ""

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
