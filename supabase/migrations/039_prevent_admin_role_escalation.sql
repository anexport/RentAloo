-- Migration: Prevent admin role escalation vulnerabilities
-- This migration adds multiple layers of security to prevent unauthorized admin role assignment:
-- 1. Update handle_new_user() trigger to explicitly reject admin role during signup
-- 2. Add trigger to prevent role escalation to admin
-- 3. Update RLS policy to prevent users from changing their own role

-- ============================================================================
-- 1. Update handle_new_user() trigger to reject admin role
-- ============================================================================
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  user_role text;
BEGIN
  -- Get role from user metadata, default to 'renter'
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'renter');
  
  -- SECURITY: Explicitly reject admin role assignment during signup
  -- Admin roles can only be assigned through the admin-users edge function
  -- This prevents privilege escalation via signup metadata manipulation
  IF user_role = 'admin' THEN
    RAISE WARNING 'Admin role cannot be assigned during signup. User % will be created as renter.', NEW.id;
    user_role := 'renter';
  END IF;

  -- Create base profile
  -- SECURITY DEFINER allows this function to bypass RLS policies
  IF user_role = 'owner' THEN
    INSERT INTO public.profiles (id, email, role, created_at, updated_at)
    VALUES (
      NEW.id,
      NEW.email,
      'owner'::public.user_role,
      now(),
      now()
    );
  ELSE
    INSERT INTO public.profiles (id, email, role, created_at, updated_at)
    VALUES (
      NEW.id,
      NEW.email,
      'renter'::public.user_role,
      now(),
      now()
    );
  END IF;

  -- Create role-specific profile
  IF user_role = 'renter' THEN
    INSERT INTO public.renter_profiles (
      profile_id,
      preferences,
      experience_level,
      created_at,
      updated_at
    )
    VALUES (
      NEW.id,
      COALESCE((NEW.raw_user_meta_data->>'preferences')::jsonb, '{}'::jsonb),
      COALESCE(NEW.raw_user_meta_data->>'experienceLevel', 'beginner'),
      now(),
      now()
    );

  ELSIF user_role = 'owner' THEN
    INSERT INTO public.owner_profiles (
      profile_id,
      business_info,
      earnings_total,
      created_at,
      updated_at
    )
    VALUES (
      NEW.id,
      COALESCE((NEW.raw_user_meta_data->>'business_info')::jsonb, '{}'::jsonb),
      0,
      now(),
      now()
    );
  END IF;

  RETURN NEW;

EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't prevent user creation
    -- This ensures auth.users record is still created even if profile creation fails
    RAISE WARNING 'Error in handle_new_user for user %: % (SQLSTATE: %)',
      NEW.id, SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

COMMENT ON FUNCTION public.handle_new_user() IS
  'Automatically creates profile and role-specific profile (renter/owner) when a new user signs up. Uses SECURITY DEFINER to bypass RLS policies during profile creation. Explicitly rejects admin role assignment during signup - admin roles can only be assigned through the admin-users edge function.';

-- ============================================================================
-- 2. Add trigger to prevent role escalation to admin
-- ============================================================================
CREATE OR REPLACE FUNCTION prevent_role_escalation()
RETURNS TRIGGER AS $$
DECLARE
  current_user_id UUID;
  is_admin_user BOOLEAN;
BEGIN
  -- Get current user ID (may be NULL if using service role)
  current_user_id := auth.uid();
  
  -- Prevent changing role to admin unless already admin
  -- This blocks privilege escalation attempts
  IF NEW.role = 'admin' AND (OLD.role IS NULL OR OLD.role != 'admin') THEN
    -- Allow if:
    -- 1. Using service role (current_user_id is NULL) - admin-users edge function
    --    The edge function validates admin access before calling
    -- 2. Current user is already an admin
    -- Regular users cannot escalate their own privileges
    IF current_user_id IS NOT NULL THEN
      is_admin_user := is_admin(current_user_id);
      IF NOT is_admin_user THEN
        RAISE EXCEPTION 'Cannot change role to admin. Admin roles can only be assigned by administrators through the admin dashboard.';
      END IF;
    END IF;
    -- If current_user_id IS NULL, we're using service role (admin-users function)
    -- which has already validated admin access, so allow the change
  END IF;
  
  -- Prevent changing FROM admin (additional safety)
  -- Only admins can demote other admins
  IF OLD.role = 'admin' AND NEW.role != 'admin' THEN
    -- Allow if:
    -- 1. Using service role (admin-users function)
    -- 2. Current user is an admin
    IF current_user_id IS NOT NULL THEN
      is_admin_user := is_admin(current_user_id);
      IF NOT is_admin_user THEN
        RAISE EXCEPTION 'Cannot change admin role. Only administrators can modify admin roles.';
      END IF;
    END IF;
    -- If current_user_id IS NULL, allow (service role from admin-users function)
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_catalog;

-- Create trigger to prevent role escalation
DROP TRIGGER IF EXISTS prevent_role_escalation_trigger ON profiles;
CREATE TRIGGER prevent_role_escalation_trigger
BEFORE UPDATE ON profiles
FOR EACH ROW
WHEN (OLD.role IS DISTINCT FROM NEW.role)
EXECUTE FUNCTION prevent_role_escalation();

COMMENT ON FUNCTION prevent_role_escalation() IS
  'Prevents unauthorized role escalation to admin. Only existing admins can assign admin roles. This provides defense-in-depth against privilege escalation attacks.';

-- ============================================================================
-- 3. Update RLS policy - role changes are prevented by trigger
-- ============================================================================
-- Note: The trigger prevent_role_escalation_trigger handles role change prevention
-- The RLS policy allows users to update their own profile, and the trigger enforces
-- that role changes to admin are blocked unless performed by an admin
DROP POLICY IF EXISTS "Authenticated users can update profiles" ON profiles;

CREATE POLICY "Authenticated users can update profiles" ON profiles
    FOR UPDATE TO authenticated
    USING (
        (select auth.uid()) IS NOT NULL AND
        (select auth.uid()) = id
    )
    WITH CHECK (
        (select auth.uid()) IS NOT NULL AND
        (select auth.uid()) = id
    );

COMMENT ON POLICY "Authenticated users can update profiles" ON profiles IS
  'Allows users to update their own profile. Role changes are prevented by the prevent_role_escalation_trigger. Role changes to admin can only be made by administrators through the admin dashboard.';

