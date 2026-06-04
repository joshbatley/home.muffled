# First admin user

After `make platform-migrate`:

1. Sign up via portal `/login` (or Studio Auth) with your admin email/password.
2. In Studio SQL editor (or psql), assign admin role:

```sql
INSERT INTO public.user_roles (user_id, role_id)
SELECT u.id, r.id
FROM auth.users u
CROSS JOIN public.roles r
WHERE u.email = 'admin@home.muffled'
  AND r.name = 'admin'
ON CONFLICT DO NOTHING;
```

Or create user via doadmin UI after temporarily using service role in Studio.