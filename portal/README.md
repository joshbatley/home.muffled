# portal

Shell host frontend.

## Responsibilities

- owns top-level routing and shell frame
- owns auth provider placement using `@home/auth-ts`
- loads users domain via module federation remote (`usersRemote/UsersRoutes`)

## Run

Start `users/frontend` first, then start `portal`.
