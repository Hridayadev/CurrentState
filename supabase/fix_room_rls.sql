-- ============================================================================
-- CurrentState — FIX: RLS infinite recursion on room_memberships
--
-- Symptoms this fixes:
--   • "infinite recursion detected in policy for relation room_memberships"
--     when saving your profile / clicking "Get started"
--   • Being stuck on /welcome (onboarding can't complete because of the above)
--
-- Root cause: the "members select member" / "members join update" policies on
-- room_memberships selected FROM room_memberships inside their own USING clause.
-- Postgres treats a policy that references its own table as infinite recursion.
--
-- Fix: membership is checked through public.is_room_member(), a SECURITY
-- DEFINER helper that runs as the table owner and therefore does NOT re-enter
-- room_memberships' RLS. This is idempotent — safe to run any number of times.
--
-- Run in: Supabase Dashboard > SQL Editor  (paste the whole file, click Run)
-- ============================================================================

-- 1) Membership helper (bypasses RLS -> breaks the recursion loop) -------------
CREATE OR REPLACE FUNCTION public.is_room_member(p_room_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.room_memberships
        WHERE room_id = p_room_id AND user_id = auth.uid()
    );
$$;

GRANT EXECUTE ON FUNCTION public.is_room_member(uuid) TO authenticated;

-- 2) Rewrite room_memberships policies -----------------------------------------
DROP POLICY IF EXISTS "members select member" ON public.room_memberships;
CREATE POLICY "members select member" ON public.room_memberships FOR SELECT
    USING (user_id = auth.uid() OR public.is_room_member(room_id));

DROP POLICY IF EXISTS "members join update" ON public.room_memberships;
CREATE POLICY "members join update" ON public.room_memberships FOR UPDATE
    USING (user_id = auth.uid() OR public.is_room_member(room_id))
    WITH CHECK (user_id = auth.uid() OR public.is_room_member(room_id));

-- 3) Rewrite rooms policies to use the same helper (avoids any recursion via
--    the members policy and keeps behaviour identical) -------------------------
DROP POLICY IF EXISTS "rooms select member"  ON public.rooms;
DROP POLICY IF EXISTS "rooms update member"  ON public.rooms;
CREATE POLICY "rooms select member" ON public.rooms FOR SELECT
    USING (public.is_room_member(rooms.id));
CREATE POLICY "rooms update member" ON public.rooms FOR UPDATE
    USING (public.is_room_member(rooms.id));

-- 4) Optional: unstick an account stuck on /welcome ------------------------------
--    Replace <your-user-uuid> with your id from Authentication > Users, then
--    uncomment and run. Onboarding will then be marked done so you land on the
--    dashboard immediately.
--
-- UPDATE public.profiles
-- SET onboarded = true
-- WHERE id = '<your-user-uuid>';

-- 5) Verify ----------------------------------------------------------------
--    Each query should return 1 row (true). If you get errors, the fix isn't
--    fully applied.
SELECT public.is_room_member(NULL) IS NULL AS function_exists;

SELECT count(*) = 2 AS policies_ok
FROM pg_policies
WHERE tablename = 'room_memberships'
  AND policyname IN ('members select member', 'members join update')
  AND qual LIKE '%is_room_member%';
