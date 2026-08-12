-- ============================================================================
-- Default catalog: basic categories + tags for every user (new and existing)
--
-- New users get a sensible starter set so they can start tracking immediately
-- instead of creating everything by hand. Existing users are seeded in a
-- separate step below. The trigger rewire covers all future signups.
--
-- Safe to run multiple times (ON CONFLICT DO NOTHING) — it never touches or
-- deletes anything the user already has.
-- ============================================================================

-- 1) The reusable seeder (SECURITY DEFINER so the trigger can call it).
CREATE OR REPLACE FUNCTION public.seed_default_catalog(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.categories (user_id, name, icon, classification) VALUES
        (p_user_id, 'Study',         '📚', 'PRODUCTIVE'),
        (p_user_id, 'Work',          '💼', 'PRODUCTIVE'),
        (p_user_id, 'Exercise',      '🏃', 'PRODUCTIVE'),
        (p_user_id, 'Reading',       '📖', 'PRODUCTIVE'),
        (p_user_id, 'Commute',       '🚗', 'NEUTRAL'),
        (p_user_id, 'Chores',        '🧹', 'NEUTRAL'),
        (p_user_id, 'Errands',       '🛒', 'NEUTRAL'),
        (p_user_id, 'Meals',         '🍽️', 'NEUTRAL'),
        (p_user_id, 'Leisure',       '🎮', 'LEISURE'),
        (p_user_id, 'Entertainment', '🍿', 'LEISURE'),
        (p_user_id, 'Social',        '👥', 'LEISURE'),
        (p_user_id, 'Rest',          '🧘', 'LEISURE'),
        (p_user_id, 'Distraction',   '📱', 'UNPRODUCTIVE')
    ON CONFLICT (user_id, name) DO NOTHING;

    INSERT INTO public.tags (user_id, name) VALUES
        (p_user_id, 'deepwork'),
        (p_user_id, 'focus'),
        (p_user_id, 'urgent'),
        (p_user_id, 'high-priority'),
        (p_user_id, 'project'),
        (p_user_id, 'meeting'),
        (p_user_id, 'learning'),
        (p_user_id, 'reading'),
        (p_user_id, 'fitness'),
        (p_user_id, 'health'),
        (p_user_id, 'errands'),
        (p_user_id, 'family'),
        (p_user_id, 'break')
    ON CONFLICT (user_id, name) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.seed_default_catalog(UUID) TO authenticated;

-- 2) Seed every EXISTING user (idempotent).
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id FROM auth.users
    LOOP
        PERFORM public.seed_default_catalog(r.id);
    END LOOP;
END $$;

-- 3) Rewire the signup trigger so FUTURE users also get the default catalog.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, google_id, email, display_name, emoji_avatar, timezone)
    VALUES (
        NEW.id,
        COALESCE(
            (NEW.raw_user_meta_data ->> 'google_id'),
            (NEW.raw_user_meta_data ->> 'sub'),
            NEW.id::text
        ),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
        '🚀',
        'UTC'
    )
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.user_preferences (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
    INSERT INTO public.notification_preferences (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
    PERFORM public.seed_default_catalog(NEW.id);
    RETURN NEW;
END;
$$;
