# Arete Architecture Overview

Arete is curriculum-neutral. Schools define their own classes, subjects, chapters, topics, syllabus, and materials.

```mermaid
flowchart TD
  Web[Next.js Web]
  Mobile[Expo Mobile]
  API[NestJS API]
  Worker[Worker]
  DB[(PostgreSQL)]
  Redis[(Redis)]
  Files[S3-Compatible Storage]
  AI[OpenAI Provider]
  Integrations[Integration Providers]
  Observability[Logs Metrics Traces Errors]

  Web --> API
  Mobile --> API
  API --> DB
  API --> Redis
  API --> Files
  API --> Observability
  Worker --> DB
  Worker --> Redis
  Worker --> Files
  Worker --> AI
  Worker --> Integrations
  Worker --> Observability
```

Core security invariant: every school-owned resource is tenant-scoped and every server-side read/write verifies the user, school membership, role, permission, and exact resource relationship.
