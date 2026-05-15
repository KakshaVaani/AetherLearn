from __future__ import annotations

import hashlib
from datetime import timedelta

from shared_schemas import SafeUser, TokenPair
from shared_utils.dates import utc_in
from shared_utils.errors import UnauthorizedError

from ..repository.refresh_token_repository import RefreshTokenRepository
from ..security.jwt import create_jwt, decode_jwt


def hash_refresh_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


class TokenService:
    def __init__(
        self,
        refresh_tokens: RefreshTokenRepository,
        access_secret: str,
        refresh_secret: str,
        access_ttl_minutes: int,
        refresh_ttl_days: int,
    ) -> None:
        self.refresh_tokens = refresh_tokens
        self.access_secret = access_secret
        self.refresh_secret = refresh_secret
        self.access_ttl = timedelta(minutes=access_ttl_minutes)
        self.refresh_ttl = timedelta(days=refresh_ttl_days)

    async def issue_pair(self, user: SafeUser) -> TokenPair:
        claims = {
            "role": user.role,
            "schoolIds": user.school_ids,
            "activeSchoolId": user.active_school_id,
            "tokenVersion": user.token_version,
        }
        access = create_jwt(
            subject=user.id,
            secret=self.access_secret,
            ttl=self.access_ttl,
            token_type="access",
            claims=claims,
        )
        refresh = create_jwt(
            subject=user.id,
            secret=self.refresh_secret,
            ttl=self.refresh_ttl,
            token_type="refresh",
            claims={"tokenVersion": user.token_version},
        )
        await self.refresh_tokens.create(
            {
                "userId": user.id,
                "tokenHash": hash_refresh_token(refresh),
                "revoked": False,
                "expiresAt": utc_in(days=self.refresh_ttl.days),
            }
        )
        return TokenPair(
            access_token=access,
            refresh_token=refresh,
            expires_in=int(self.access_ttl.total_seconds()),
        )

    def verify_access(self, token: str) -> dict:
        return decode_jwt(token, self.access_secret, expected_type="access")

    async def verify_refresh(self, token: str) -> dict:
        payload = decode_jwt(token, self.refresh_secret, expected_type="refresh")
        row = await self.refresh_tokens.find_by_hash(hash_refresh_token(token))
        if row is None:
            raise UnauthorizedError("Refresh token is revoked")
        return payload | {"refreshTokenId": row["id"]}
