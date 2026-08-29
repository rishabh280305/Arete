# Arete Threat Model

## Priority Risks

- Cross-school data leakage
- IDOR against students, assignments, files, and quiz attempts
- Teacher access to unassigned classes
- Parent access to unlinked children
- Answer-key exposure before quiz submission
- Unsafe file uploads
- OAuth token leakage
- AI requests containing unnecessary student PII
- Import jobs overwriting or deleting legitimate data

## Baseline Controls

- Server-side RBAC and resource-level authorization
- Tenant-scoped database access
- Private object storage with signed access
- Short-lived access tokens and refresh rotation
- Admin MFA-ready authentication design
- Structured audit logs for sensitive actions
- Import preview, validation, idempotency, and provenance
- AI usage logs and content minimization
- Rate limits for auth, AI, imports, and public APIs
