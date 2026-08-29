# ADR 0002: Authentication And Tenancy

## Status

Accepted.

## Decision

Arete will start with built-in authentication using email/password, Argon2id password hashes, short-lived access tokens, refresh token rotation, device/session management, and MFA-ready admin flows.

Every authenticated request receives an active tenant context derived from a verified membership. Client-supplied tenant IDs are treated as selectors only; authorization is resolved server-side.

## Future

SAML/OIDC SSO will be added after the first paid school pilots or when enterprise sales require it.
