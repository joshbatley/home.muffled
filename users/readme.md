# Goal
Build a small auth service for a home intranet that handles user login (username + password), issues JWT tokens, manages roles/permissions, and exposes simple HTTP APIs so other internal services can authenticate users and check their permissions.

# Tech being used
-  Go
-  Postgres
-  net/http
-  Docker
-  JWT (HS256)

# Tech details
-  Username (not email) as login identifier
-  Password-based auth with secure hashing
-  JWT access tokens with configurable expiry
-  Refresh tokens for long-lived sessions
-  Role-based and permission-based access control (e.g. service:resource.verb)
-  Central authz check endpoint for other services
-  Environment-based configuration (ports, DB URL, secrets)

## Impl details
-    API layout
     - Versioned JSON HTTP API (e.g. /v1)
     - Auth endpoints: register, login, refresh, me
     - User endpoints: list, get, update, change password
     - Admin endpoints: roles, permissions, assign roles
     - Authz endpoint for permission checks
-    testing strat
     - TDD for handlers and core auth logic
     - Standard Go `testing` package and `httptest`
     - Tests run against a real Postgres test database
-    Logging
     - Minimal structured-ish logging via stdlib `log`
     - Log startup config (without secrets) and key errors
-    Database & migrations
     - SQL migrations to define/update schema
     - Simple migration runner as part of the service or a separate command
-    Configuration
     - All settings via environment variables (port, DB URL, JWT secret, token TTLs)
     - Fail fast on missing/invalid required config
-    Deployment
     - Docker image for the auth service
     - Optional docker-compose setup with Postgres + auth-service

## Assumptions
-   Small number of users (home/lab use)
-   Intranet-only, behind trusted network
-   Single auth-service instance is sufficient
- 
## Status
-    No code implemented yet
-    This document defines initial goals and tech choices only

## Working style
-    Implement features in small, incremental steps
-    Use TDD: write tests first, then minimal code to pass them
-    Prefer discussing/confirming design changes before large refactors or new features