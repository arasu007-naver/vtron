"""Bearer auth for the HTTP API.

`Authorization: Bearer <token>` is accepted when the token is either
  - the static `API_KEY` (scripts / curl / server-to-server), or
  - a Supabase user access token of the same project (vtron forwards its logged-in user's).
"""

from __future__ import annotations

import logging
import secrets
from dataclasses import dataclass
from typing import Annotated, Literal

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from supabase import AsyncClient

from config import Settings, get_settings

log = logging.getLogger(__name__)

bearer_scheme = HTTPBearer(auto_error=False)


@dataclass
class Caller:
    kind: Literal["api_key", "user"]
    id: str
    email: str | None = None

    def __str__(self) -> str:
        return self.kind if self.kind == "api_key" else f"user:{self.email or self.id}"


def unauthorized(detail: str) -> HTTPException:
    return HTTPException(
        status.HTTP_401_UNAUTHORIZED, detail, headers={"WWW-Authenticate": "Bearer"}
    )


async def verify_user_token(client: AsyncClient, token: str) -> Caller | None:
    """Ask Supabase Auth who owns the token. Invalid / expired → None."""
    try:
        resp = await client.auth.get_user(token)
    except Exception as exc:  # noqa: BLE001 - AuthApiError etc.
        log.info("bearer token rejected by Supabase Auth: %s", exc)
        return None
    user = resp.user if resp else None
    return Caller("user", user.id, user.email) if user else None


async def require_bearer(
    request: Request,
    settings: Annotated[Settings, Depends(get_settings)],
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> Caller:
    if credentials is None:
        raise unauthorized("missing bearer token")
    token = credentials.credentials
    if settings.api_key and secrets.compare_digest(token.encode(), settings.api_key.encode()):
        return Caller("api_key", "api_key")
    caller = await verify_user_token(request.app.state.auth_client, token)
    if caller is None:
        raise unauthorized("invalid bearer token")
    return caller
