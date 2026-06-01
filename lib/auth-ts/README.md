# `@home/auth-ts`

Shared frontend auth runtime for host and remote apps.

## What it provides

- `AuthProvider` and `useAuth()` context consumer
- user/session lifecycle: login, logout, refresh, validate
- auth-aware HTTP helpers (`apiFetch`, `apiJSON`, etc.)
- permission helpers (`hasRole`, `hasPermission`, `hasAnyPermission`)

## How it works

1. `AuthProvider` bootstraps session by attempting refresh, then validating claims.
2. Claims are stored in context as `user`.
3. API helpers automatically retry once on 401 by refreshing access token.
4. If refresh fails, registered logout handler clears auth state.

## Host/remote usage

- Put a single `AuthProvider` in the shell/host app near the router root.
- Remote microfrontends call `useAuth()` directly from this package.
- In module federation, share this package as a singleton to prevent duplicate contexts.

## Typical usage

```tsx
import { AuthProvider, useAuth, hasPermission } from "@home/auth-ts";

function AppRoot() {
  return (
    <AuthProvider>
      <Routes />
    </AuthProvider>
  );
}

function ProtectedButton() {
  const { user } = useAuth();
  if (!hasPermission(user, "users:admin")) return null;
  return <button>Admin action</button>;
}
```
