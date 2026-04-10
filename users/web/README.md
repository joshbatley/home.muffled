# users web

Federated remote frontend for users domain screens.

## Responsibilities

- exposes `./UsersRoutes` for host consumption
- uses shared auth runtime from `@home/auth-ts`
- keeps users/admin domain UI and calls users APIs

## Run

Run this app before `portal` so host can load the remote entry.
