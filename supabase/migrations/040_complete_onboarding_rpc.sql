-- Migration: Add complete_onboarding RPC function
-- This function performs all onboarding DB updates in a single transaction

CREATE OR REPLACE FUNCTION public.complete_onboarding(
  p_user_id UUID,
  p_role TEXT,
  p_location TEXT,
  p_experience_level TEXT,
  p_interests TEXT[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_preferences JSONB;
  v_business_info JSONB;
  v_caller_id UUID;
BEGIN
  -- Authorization check: Only allow users to update their own profile
  -- Service role (Edge Functions) has auth.uid() = null, which is allowed
  -- Regular users must match p_user_id to their auth.uid()
  v_caller_id := auth.uid();
  IF v_caller_id IS NOT NULL AND v_caller_id != p_user_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unauthorized: Cannot modify another user''s profile.'
    );
  END IF;

  -- Validate role
  IF p_role NOT IN ('renter', 'owner') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid role. Must be renter or owner.');
  END IF;

  -- Build preferences JSON
  v_preferences := jsonb_build_object(
    'location', p_location,
    'interests', to_jsonb(p_interests)
  );

  -- Build business_info JSON for owners
  v_business_info := jsonb_build_object('location', p_location);

  -- 1. Update profiles table with role
  UPDATE public.profiles
  SET role = p_role::public.user_role,
      updated_at = now()
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found for user.');
  END IF;

  -- 2. Upsert renter_profiles (always create for all users to store preferences)
  INSERT INTO public.renter_profiles (
    profile_id,
    experience_level,
    preferences,
    updated_at
  )
  VALUES (
    p_user_id,
    p_experience_level,
    v_preferences,
    now()
  )
  ON CONFLICT (profile_id) DO UPDATE
  SET experience_level = EXCLUDED.experience_level,
      preferences = EXCLUDED.preferences,
      updated_at = now();

  -- 3. If owner, also upsert owner_profiles
  IF p_role = 'owner' THEN
    INSERT INTO public.owner_profiles (
      profile_id,
      business_info,
      updated_at
    )
    VALUES (
      p_user_id,
      v_business_info,
      now()
    )
    ON CONFLICT (profile_id) DO UPDATE
    SET business_info = EXCLUDED.business_info,
        updated_at = now();
  END IF;

  RETURN jsonb_build_object('success', true);

EXCEPTION
  WHEN OTHERS THEN
    -- Log error and return failure
    RAISE WARNING 'complete_onboarding error for user %: % (SQLSTATE: %)',
      p_user_id, SQLERRM, SQLSTATE;
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'sqlstate', SQLSTATE
    );
END;
$$;

-- Grant execute to authenticated users (they can only update their own profile)
GRANT EXECUTE ON FUNCTION public.complete_onboarding(UUID, TEXT, TEXT, TEXT, TEXT[]) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.complete_onboarding IS
  'Atomically completes user onboarding by updating profiles, renter_profiles, and optionally owner_profiles in a single transaction.';
