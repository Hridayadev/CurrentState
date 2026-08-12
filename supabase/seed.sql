-- ============================================================================
-- CurrentState — Seed data (categories + tags)
--
-- IMPORTANT: Replace YOUR_USER_UUID below with your real Supabase Auth user id
-- BEFORE running this. Find it in: Supabase Dashboard > Authentication > Users
-- (you must sign in to the app once first, which also creates your profile row).
--
-- Every user (new and existing) gets the same starter catalog automatically via
-- public.seed_default_catalog(). This seed just backfills a specific user who
-- signed up before that was wired into the signup trigger.
-- ============================================================================

DO $$
DECLARE
    v_user UUID := 'YOUR_USER_UUID';  -- <-- paste your auth.users id here
BEGIN
    IF v_user = 'YOUR_USER_UUID'::uuid THEN
        RAISE EXCEPTION 'Seed aborted: replace YOUR_USER_UUID with your real auth user id first.';
    END IF;

    PERFORM public.seed_default_catalog(v_user);

    RAISE NOTICE 'Seeded default categories and tags for user %', v_user;
END $$;
