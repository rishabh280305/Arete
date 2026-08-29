# ADR 0001: Architecture Baseline

## Status

Accepted.

## Context

Arete needs to serve many independent schools with strong data isolation, low operating cost, and fast iteration across web and mobile.

## Decision

Start with a TypeScript monorepo and a modular monolith:

- Next.js for the web application
- Expo React Native for Android and iOS
- NestJS API
- Worker process for asynchronous jobs
- PostgreSQL with tenant-scoped relational data
- Redis for queues and rate-limit support
- S3-compatible private object storage

## Consequences

This keeps the system inexpensive and understandable while leaving clean module boundaries for future extraction into services if scale requires it.
