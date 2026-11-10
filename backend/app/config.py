from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    supabase_url: str
    # Optional at startup so the service (and its health check) can run before the key is
    # configured; endpoints that need it return 503 until it's set.
    supabase_service_role_key: str = ""
    # Comma-separated list of allowed frontend origins (the CRM and the public website).
    cors_origins: str = "http://localhost:3000"

    # Public website leads (POST /public/leads).
    # The site's agent: their row in the office team list (office_agents.id), the same id the
    # database views use (migration public_website). Leads become their buyers.
    website_agent_id: str = "63a51f45-fdef-4797-855d-12d8b9405960"
    # Addresses used in links inside lead notes and emails.
    website_url: str = ""
    crm_url: str = "https://remax-tabu.up.railway.app"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
