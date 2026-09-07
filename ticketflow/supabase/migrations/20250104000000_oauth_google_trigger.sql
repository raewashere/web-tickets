-- =============================================================================
-- TicketFlow — Google OAuth & Role Assignment Trigger Enhancement (Fix)
-- 20250104000000_oauth_google_trigger.sql
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_display_name TEXT;
  v_avatar_url   TEXT;
  v_role         public.role_type;
BEGIN
  -- Extract display name (check full_name, name, display_name or fallback to email username)
  v_display_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'display_name',
    split_part(COALESCE(NEW.email, ''), '@', 1),
    'Usuario'
  );

  -- Extract avatar url
  v_avatar_url := COALESCE(
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'picture'
  );

  -- Extract role from metadata (defaulting to 'customer')
  BEGIN
    v_role := (NEW.raw_user_meta_data->>'role')::public.role_type;
  EXCEPTION WHEN OTHERS THEN
    v_role := 'customer'::public.role_type;
  END;

  IF v_role IS NULL THEN
    v_role := 'customer'::public.role_type;
  END IF;

  -- 1. Insert or update profile
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (NEW.id, v_display_name, v_avatar_url)
  ON CONFLICT (id) DO UPDATE
  SET 
    display_name = COALESCE(public.profiles.display_name, EXCLUDED.display_name),
    avatar_url   = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url),
    updated_at   = now();

  -- 2. Insert role into user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- 3. If role is 'artist', ensure an artist record exists for this user
  IF v_role = 'artist'::public.role_type THEN
    IF NOT EXISTS (SELECT 1 FROM public.artists WHERE user_id = NEW.id) THEN
      INSERT INTO public.artists (user_id, name, email, photo_url, created_by)
      VALUES (NEW.id, v_display_name, NEW.email, v_avatar_url, NEW.id);
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Fallback log error and continue to prevent blocking user signup
  RAISE WARNING 'handle_new_user error: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, anon, authenticated, service_role, supabase_admin;

-- Recreate trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
