-- Partner notifications
--
-- Creates an in-app notification for the room partner when the user:
--   • starts an activity  (activity_records → status RUNNING)
--   • stops an activity   (activity_records → status COMPLETED)
--   • changes their profile name/avatar/timezone  (profiles)
--   • changes their tracking settings             (user_preferences)
--
-- Also publishes profiles + user_preferences to realtime so the partner's
-- client can react to those changes live.
--
-- Run in Supabase Dashboard > SQL Editor. Idempotent — safe to run anytime.

-- 1) Realtime -----------------------------------------------------------------
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_preferences;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2) Helpers ------------------------------------------------------------------

-- The other ACTIVE member of the room this user shares.
CREATE OR REPLACE FUNCTION public.room_partner_of(p_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT rm2.user_id
    FROM public.room_memberships rm1
    JOIN public.room_memberships rm2
      ON rm2.room_id = rm1.room_id
     AND rm2.user_id <> rm1.user_id
     AND rm2.status = 'ACTIVE'
    WHERE rm1.user_id = p_user_id
      AND rm1.status = 'ACTIVE'
    LIMIT 1;
$$;

-- Insert a notification for the partner (runs as owner, so RLS cannot block it).
CREATE OR REPLACE FUNCTION public.notify_partner(
    p_partner_id uuid,
    p_type public.notification_type,
    p_title text,
    p_body text
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    INSERT INTO public.notifications (user_id, type, title, body)
    VALUES (p_partner_id, p_type, p_title, p_body);
$$;

-- 3) Activity start/stop --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_partner_activity() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    partner_id uuid;
    actor_name text;
BEGIN
    partner_id := public.room_partner_of(NEW.user_id);
    IF partner_id IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- Respect the partner's "activity changes" preference.
    IF NOT EXISTS (
        SELECT 1 FROM public.notification_preferences np
        WHERE np.user_id = partner_id AND np.activity_changes
    ) THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    SELECT display_name INTO actor_name FROM public.profiles WHERE id = NEW.user_id;
    actor_name := COALESCE(NULLIF(actor_name, ''), 'Your partner');

    IF TG_OP = 'INSERT' AND NEW.status = 'RUNNING' THEN
        PERFORM public.notify_partner(partner_id, 'ACTIVITY',
            format('%s started %s', actor_name, NEW.title),
            format('Focused on "%s" right now.', NEW.title));
    ELSIF TG_OP = 'UPDATE' AND OLD.status = 'RUNNING' AND NEW.status = 'COMPLETED' THEN
        PERFORM public.notify_partner(partner_id, 'ACTIVITY',
            format('%s stopped %s', actor_name, NEW.title),
            format('Wrapped up "%s".', NEW.title));
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$;

-- 4) Profile change --------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_partner_profile() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    partner_id uuid;
BEGIN
    IF NEW.display_name IS NOT DISTINCT FROM OLD.display_name
       AND NEW.emoji_avatar IS NOT DISTINCT FROM OLD.emoji_avatar
       AND NEW.timezone IS NOT DISTINCT FROM OLD.timezone THEN
        RETURN NEW;
    END IF;

    partner_id := public.room_partner_of(NEW.id);
    IF partner_id IS NULL THEN
        RETURN NEW;
    END IF;

    PERFORM public.notify_partner(partner_id, 'SYSTEM',
        format('%s updated their profile', NEW.display_name),
        'Their name, avatar, or timezone changed.');
    RETURN NEW;
END;
$$;

-- 5) Settings change --------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_partner_preferences() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    partner_id uuid;
    actor_name text;
BEGIN
    IF NEW.overlap_enabled IS NOT DISTINCT FROM OLD.overlap_enabled
       AND NEW.default_privacy IS NOT DISTINCT FROM OLD.default_privacy THEN
        RETURN NEW;
    END IF;

    partner_id := public.room_partner_of(NEW.user_id);
    IF partner_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT display_name INTO actor_name FROM public.profiles WHERE id = NEW.user_id;
    actor_name := COALESCE(NULLIF(actor_name, ''), 'Your partner');

    PERFORM public.notify_partner(partner_id, 'SYSTEM',
        format('%s updated their tracking settings', actor_name),
        'Their timer or privacy preferences changed.');
    RETURN NEW;
END;
$$;

-- 6) Triggers ---------------------------------------------------------------------
DROP TRIGGER IF EXISTS notify_partner_activity_trg ON public.activity_records;
CREATE TRIGGER notify_partner_activity_trg
    AFTER INSERT OR UPDATE ON public.activity_records
    FOR EACH ROW EXECUTE FUNCTION public.notify_partner_activity();

DROP TRIGGER IF EXISTS notify_partner_profile_trg ON public.profiles;
CREATE TRIGGER notify_partner_profile_trg
    AFTER UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.notify_partner_profile();

DROP TRIGGER IF EXISTS notify_partner_preferences_trg ON public.user_preferences;
CREATE TRIGGER notify_partner_preferences_trg
    AFTER UPDATE ON public.user_preferences
    FOR EACH ROW EXECUTE FUNCTION public.notify_partner_preferences();
