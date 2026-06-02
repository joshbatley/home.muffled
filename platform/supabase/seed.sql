-- Roles and permissions (admin user: create via Edge Function or Studio after first signup)

INSERT INTO public.roles (name) VALUES
    ('admin'),
    ('user'),
    ('readonly')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.permissions (key, description) VALUES
    ('intranet:read', 'Read intranet resources'),
    ('intranet:write', 'Write intranet resources'),
    ('users:admin', 'Manage users, roles, and permissions')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'admin'
  AND p.key IN ('intranet:read', 'intranet:write', 'users:admin')
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'user'
  AND p.key IN ('intranet:read', 'intranet:write')
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'readonly'
  AND p.key = 'intranet:read'
ON CONFLICT DO NOTHING;
