-- =============================================================================
-- TicketFlow — Fix RLS Policies for user_roles and profiles
-- 20250105000000_fix_user_roles_rls.sql
-- =============================================================================

-- 1. Allow authenticated users to insert their own roles (e.g. self-assign artist/customer)
DROP POLICY IF EXISTS "Users can insert own roles" ON public.user_roles;
CREATE POLICY "Users can insert own roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- 2. Allow users to manage (update/delete) their own roles if needed
DROP POLICY IF EXISTS "Users can update own roles" ON public.user_roles;
CREATE POLICY "Users can update own roles"
  ON public.user_roles FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 3. Allow users to insert their own profile directly if needed
DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
CREATE POLICY "Users insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);
