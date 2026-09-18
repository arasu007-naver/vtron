"""Runtime settings for the HTTP API (read from environment / .env)."""

from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Supabase (server-side only: service role key bypasses RLS)
    supabase_url: str
    supabase_service_role_key: str
    supabase_bucket: str = "product-images"
    supabase_table: str = "products"

    # Browser capture (same defaults as RUN_MAC.md)
    cdp_url: str = "http://127.0.0.1:9222"
    wait_ms: int = 1500
    timeout_ms: int = 45000
    viewport_width: int = 1280
    viewport_height: int = 900

    # API
    # Static `Authorization: Bearer` token for scripts / curl. Supabase user access
    # tokens of the same project are always accepted too; no token → 401.
    api_key: str | None = None
    max_items_per_request: int = 50
    # Stop processing the rest of a request once Naver blocks / asks for login.
    stop_on_block: bool = True


@lru_cache
def get_settings() -> Settings:
    return Settings()
