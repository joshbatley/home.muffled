-- RBAC schema for home.muffled (auth.users + public profiles)

CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    force_password_change BOOLEAN NOT NULL DEFAULT false,
    preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_email ON public.profiles (email);

CREATE TABLE public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(64) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(256) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.role_permissions (
    role_id UUID NOT NULL REFERENCES public.roles (id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES public.permissions (id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE public.user_roles (
    user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES public.roles (id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE public.user_permission_grants (
    user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES public.permissions (id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, permission_id)
);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email)
    VALUES (NEW.id, NEW.email);
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.user_has_role(p_user_id UUID, p_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id
        WHERE ur.user_id = p_user_id AND r.name = p_name
    );
$$;

CREATE OR REPLACE FUNCTION public.user_has_permission(p_user_id UUID, p_key TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_permission_grants upg
        JOIN public.permissions p ON p.id = upg.permission_id
        WHERE upg.user_id = p_user_id AND p.key = p_key
    )
    OR EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.role_permissions rp ON rp.role_id = ur.role_id
        JOIN public.permissions p ON p.id = rp.permission_id
        WHERE ur.user_id = p_user_id AND p.key = p_key
    );
$$;

CREATE OR REPLACE FUNCTION public.is_app_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.user_has_role(auth.uid(), 'admin')
        OR public.user_has_permission(auth.uid(), 'users:admin');
$$;

CREATE OR REPLACE FUNCTION public.get_my_permissions()
RETURNS JSON
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT json_build_object(
        'user_id', auth.uid(),
        'email', (SELECT email FROM auth.users WHERE id = auth.uid()),
        'roles', COALESCE(
            (
                SELECT json_agg(DISTINCT r.name ORDER BY r.name)
                FROM public.user_roles ur
                JOIN public.roles r ON r.id = ur.role_id
                WHERE ur.user_id = auth.uid()
            ),
            '[]'::json
        ),
        'permissions', COALESCE(
            (
                SELECT json_agg(DISTINCT keys.key ORDER BY keys.key)
                FROM (
                    SELECT p.key
                    FROM public.user_roles ur
                    JOIN public.role_permissions rp ON rp.role_id = ur.role_id
                    JOIN public.permissions p ON p.id = rp.permission_id
                    WHERE ur.user_id = auth.uid()
                    UNION
                    SELECT p.key
                    FROM public.user_permission_grants upg
                    JOIN public.permissions p ON p.id = upg.permission_id
                    WHERE upg.user_id = auth.uid()
                ) keys
            ),
            '[]'::json
        ),
        'force_password_change', COALESCE(
            (SELECT force_password_change FROM public.profiles WHERE id = auth.uid()),
            false
        )
    );
$$;

GRANT EXECUTE ON FUNCTION public.get_my_permissions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_app_admin() TO authenticated;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permission_grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select ON public.profiles
    FOR SELECT TO authenticated
    USING (id = auth.uid() OR public.is_app_admin());

CREATE POLICY profiles_update ON public.profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid() OR public.is_app_admin())
    WITH CHECK (id = auth.uid() OR public.is_app_admin());

CREATE POLICY roles_select ON public.roles
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY roles_admin ON public.roles
    FOR ALL TO authenticated
    USING (public.is_app_admin())
    WITH CHECK (public.is_app_admin());

CREATE POLICY permissions_select ON public.permissions
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY permissions_admin ON public.permissions
    FOR ALL TO authenticated
    USING (public.is_app_admin())
    WITH CHECK (public.is_app_admin());

CREATE POLICY role_permissions_select ON public.role_permissions
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY role_permissions_admin ON public.role_permissions
    FOR ALL TO authenticated
    USING (public.is_app_admin())
    WITH CHECK (public.is_app_admin());

CREATE POLICY user_roles_select ON public.user_roles
    FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR public.is_app_admin());

CREATE POLICY user_roles_admin ON public.user_roles
    FOR ALL TO authenticated
    USING (public.is_app_admin())
    WITH CHECK (public.is_app_admin());

CREATE POLICY user_permission_grants_select ON public.user_permission_grants
    FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR public.is_app_admin());

CREATE POLICY user_permission_grants_admin ON public.user_permission_grants
    FOR ALL TO authenticated
    USING (public.is_app_admin())
    WITH CHECK (public.is_app_admin());

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.roles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.permissions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.role_permissions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_permission_grants TO authenticated;
