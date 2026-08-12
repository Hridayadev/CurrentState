-- ============================================================================
-- CurrentState — Supabase schema (PostgreSQL 15/16, real Supabase Auth)
--
-- Adapted from database/schema.sql for Supabase:
--   * Users live in auth.users (Supabase Auth) — there is NO public `users`
--     table. Profile/preferences are 1:1 tables keyed by auth.uid().
--   * RLS is enabled everywhere. Every user-owned row is scoped by
--     `user_id = auth.uid()`.
--   * A `handle_new_user` trigger auto-creates the profile + preferences rows
--     on signup, so the app never has to race on user creation.
--
-- How to run: Supabase Dashboard > SQL Editor > New query > paste > Run.
-- Run schema.sql first, then seed.sql.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. ENUMS (mirror TS unions in apps/web/src/types/index.ts)
-- ============================================================================
CREATE TYPE classification     AS ENUM ('PRODUCTIVE', 'NEUTRAL', 'LEISURE', 'UNPRODUCTIVE');
CREATE TYPE activity_status    AS ENUM ('PENDING', 'RUNNING', 'COMPLETED');
CREATE TYPE schedule_status    AS ENUM ('SCHEDULED', 'PENDING', 'STARTED', 'NO_INFO');
CREATE TYPE privacy            AS ENUM ('PUBLIC', 'PRIVATE');
CREATE TYPE activity_source    AS ENUM ('MANUAL', 'TIMER', 'SCHEDULE');
CREATE TYPE room_member_status AS ENUM ('ACTIVE', 'LEFT');
CREATE TYPE notification_type  AS ENUM ('ACTIVITY', 'ROOM', 'SYSTEM');
CREATE TYPE export_status      AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED');

-- ============================================================================
-- 2. PROFILES (1:1 with auth.users)
-- ============================================================================
CREATE TABLE profiles (
    id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    google_id     TEXT NOT NULL,
    email         TEXT NOT NULL,
    display_name  TEXT NOT NULL DEFAULT '',
    emoji_avatar  TEXT NOT NULL DEFAULT '🚀',
    timezone      TEXT NOT NULL DEFAULT 'UTC',
    onboarded     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX profiles_google_id_uidx  ON profiles (google_id);
CREATE UNIQUE INDEX profiles_email_lower_uidx ON profiles (lower(email));

CREATE TABLE user_preferences (
    user_id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    overlap_enabled  BOOLEAN NOT NULL DEFAULT FALSE,
    default_privacy  privacy NOT NULL DEFAULT 'PUBLIC',
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE notification_preferences (
    user_id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_changes BOOLEAN NOT NULL DEFAULT TRUE,
    in_app           BOOLEAN NOT NULL DEFAULT TRUE,
    browser_push     BOOLEAN NOT NULL DEFAULT FALSE
);

-- ============================================================================
-- 3. CATEGORIES
-- ============================================================================
CREATE TABLE categories (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name           TEXT NOT NULL,
    icon           TEXT NOT NULL,
    classification classification NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT categories_user_name_uniq UNIQUE (user_id, name)
);

CREATE INDEX categories_user_id_idx ON categories (user_id);

-- ============================================================================
-- 4. TAGS
-- ============================================================================
CREATE TABLE tags (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT tags_user_name_uniq UNIQUE (user_id, name)
);

CREATE INDEX tags_user_id_idx ON tags (user_id);

-- ============================================================================
-- 5. ACTIVITY TEMPLATES
-- ============================================================================
CREATE TABLE activity_templates (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category_id    UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    title          TEXT NOT NULL,
    description    TEXT,
    classification classification NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT templates_user_cat_title_uniq UNIQUE (user_id, category_id, title)
);

CREATE INDEX activity_templates_user_id_idx     ON activity_templates (user_id);
CREATE INDEX activity_templates_category_id_idx ON activity_templates (category_id);

-- ============================================================================
-- 6. ACTIVITY RECORDS (title/classification are immutable snapshots)
-- ============================================================================
CREATE TABLE activity_records (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category_id       UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    template_id       UUID REFERENCES activity_templates(id) ON DELETE SET NULL,
    title             TEXT NOT NULL,
    description       TEXT,
    classification    classification NOT NULL,
    source            activity_source NOT NULL DEFAULT 'MANUAL',
    status            activity_status NOT NULL DEFAULT 'PENDING',
    privacy           privacy NOT NULL DEFAULT 'PUBLIC',
    start_time        TIMESTAMPTZ NOT NULL,
    end_time          TIMESTAMPTZ,
    expected_end_time TIMESTAMPTZ,
    duration_seconds  INTEGER NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT activity_records_time_ck     CHECK (end_time IS NULL OR end_time >= start_time),
    CONSTRAINT activity_records_duration_ck CHECK (duration_seconds >= 0)
);

CREATE INDEX activity_records_user_start_idx   ON activity_records (user_id, start_time);
CREATE INDEX activity_records_user_status_idx  ON activity_records (user_id, status);
CREATE INDEX activity_records_user_range_idx   ON activity_records (user_id, start_time, end_time);
CREATE INDEX activity_records_user_created_idx ON activity_records (user_id, created_at);
CREATE INDEX activity_records_category_id_idx  ON activity_records (category_id);
CREATE INDEX activity_records_template_id_idx  ON activity_records (template_id);
CREATE INDEX activity_records_user_privacy_idx ON activity_records (user_id, privacy);
CREATE INDEX activity_records_running_uidx
    ON activity_records (user_id) WHERE status = 'RUNNING';

-- ============================================================================
-- 7. ACTIVITY ↔ TAGS (junction)
-- ============================================================================
CREATE TABLE activity_tags (
    record_id UUID NOT NULL REFERENCES activity_records(id) ON DELETE CASCADE,
    tag_id    UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (record_id, tag_id)
);

CREATE INDEX activity_tags_tag_id_idx ON activity_tags (tag_id);

-- ============================================================================
-- 8. SCHEDULES
-- ============================================================================
CREATE TABLE schedules (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    template_id       UUID NOT NULL REFERENCES activity_templates(id) ON DELETE CASCADE,
    scheduled_date    DATE NOT NULL,
    planned_start     TIME NOT NULL,
    planned_end       TIME,
    duration_seconds  INTEGER NOT NULL DEFAULT 0,
    status            schedule_status NOT NULL DEFAULT 'SCHEDULED',
    started_record_id UUID REFERENCES activity_records(id) ON DELETE SET NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT schedules_user_template_time_uniq UNIQUE (user_id, template_id, scheduled_date, planned_start)
);

CREATE INDEX schedules_user_date_status_idx ON schedules (user_id, scheduled_date, status);
CREATE INDEX schedules_template_id_idx      ON schedules (template_id);

-- ============================================================================
-- 9. ROOMS, MEMBERSHIPS, INVITES
-- ============================================================================
CREATE TABLE rooms (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    invite_code       TEXT NOT NULL,
    invite_link       TEXT,
    invite_expires_at TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX rooms_invite_code_uidx ON rooms (invite_code);

CREATE TABLE room_memberships (
    room_id   UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status    room_member_status NOT NULL DEFAULT 'ACTIVE',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    left_at   TIMESTAMPTZ,
    PRIMARY KEY (room_id, user_id)
);

CREATE UNIQUE INDEX room_memberships_one_active_uidx
    ON room_memberships (user_id) WHERE status = 'ACTIVE';

CREATE OR REPLACE FUNCTION enforce_room_capacity() RETURNS trigger AS $$
DECLARE
    active_count INTEGER;
BEGIN
    IF NEW.status = 'ACTIVE' THEN
        SELECT count(*) INTO active_count
        FROM room_memberships
        WHERE room_id = NEW.room_id AND status = 'ACTIVE';
        IF active_count >= 2 THEN
            RAISE EXCEPTION 'room already has 2 active members';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER room_capacity_trigger
    BEFORE INSERT OR UPDATE OF status ON room_memberships
    FOR EACH ROW EXECUTE FUNCTION enforce_room_capacity();

CREATE INDEX room_memberships_user_idx ON room_memberships (user_id, status);
CREATE INDEX room_memberships_room_idx ON room_memberships (room_id, status);

CREATE TABLE room_invites (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id    UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    code_hash  TEXT NOT NULL,
    expires_at TIMESTAMPTZ,
    max_uses   INTEGER NOT NULL DEFAULT 1,
    used_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT room_invites_code_hash_uniq UNIQUE (code_hash)
);

CREATE INDEX room_invites_room_id_idx ON room_invites (room_id);

-- ============================================================================
-- 10. NOTIFICATIONS + PUSH SUBSCRIPTIONS
-- ============================================================================
CREATE TABLE notifications (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type       notification_type NOT NULL,
    title      TEXT NOT NULL,
    body       TEXT NOT NULL DEFAULT '',
    read_at    TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX notifications_user_created_idx ON notifications (user_id, created_at);
CREATE INDEX notifications_user_unread_idx  ON notifications (user_id) WHERE read_at IS NULL;

CREATE TABLE push_subscriptions (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint   TEXT NOT NULL,
    p256dh     TEXT NOT NULL,
    auth       TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT push_subscriptions_endpoint_uniq UNIQUE (endpoint)
);

CREATE INDEX push_subscriptions_user_id_idx ON push_subscriptions (user_id);

-- ============================================================================
-- 11. ANALYTICS + EXPORTS
-- ============================================================================
CREATE TABLE daily_analytics (
    user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    day                  DATE NOT NULL,
    productive_seconds   INTEGER NOT NULL DEFAULT 0,
    neutral_seconds      INTEGER NOT NULL DEFAULT 0,
    leisure_seconds      INTEGER NOT NULL DEFAULT 0,
    unproductive_seconds INTEGER NOT NULL DEFAULT 0,
    tracked_seconds      INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, day)
);

CREATE INDEX daily_analytics_user_day_idx ON daily_analytics (user_id, day DESC);

CREATE TABLE exports (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    format     TEXT NOT NULL DEFAULT 'CSV',
    status     export_status NOT NULL DEFAULT 'PENDING',
    file_path  TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ
);

CREATE INDEX exports_user_id_idx ON exports (user_id, created_at);

-- ============================================================================
-- 12. TRIGGERS
-- ============================================================================
-- Starter catalog (categories + tags) handed to every new user so they can
-- start tracking immediately without creating everything by hand.
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

-- Auto-create profile + preferences on signup (the app never races on this).
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Keep updated_at current on mutable tables.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER user_preferences_updated_at BEFORE UPDATE ON public.user_preferences
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER categories_updated_at BEFORE UPDATE ON public.categories
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER activity_records_updated_at BEFORE UPDATE ON public.activity_records
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER schedules_updated_at BEFORE UPDATE ON public.schedules
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMIT;

-- ============================================================================
-- 13. ROW LEVEL SECURITY
-- ============================================================================
-- Must run OUTSIDE the transaction above. Keep this in the same paste.
ALTER TABLE public.profiles                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_templates       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_records         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_tags            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_memberships         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_invites             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_analytics          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exports                  ENABLE ROW LEVEL SECURITY;

-- Own-row access on user-owned tables.
CREATE POLICY "profiles select own"      ON public.profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "profiles insert own"      ON public.profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "profiles update own"      ON public.profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "preferences select own"   ON public.user_preferences FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "preferences upsert own"   ON public.user_preferences FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "preferences update own"   ON public.user_preferences FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "notif_prefs select own"   ON public.notification_preferences FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notif_prefs upsert own"   ON public.notification_preferences FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "notif_prefs update own"   ON public.notification_preferences FOR UPDATE USING (user_id = auth.uid());

-- Partner visibility: the room UI reads the partner's profile (name/avatar) and
-- the icon of their current category. Members of the same room may read those.
CREATE POLICY "profiles select partner" ON public.profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM room_memberships rm
            JOIN room_memberships mine ON mine.room_id = rm.room_id AND mine.user_id = auth.uid()
            WHERE rm.user_id = profiles.id AND rm.status = 'ACTIVE' AND mine.status = 'ACTIVE'
        )
    );

CREATE POLICY "categories select partner" ON public.categories FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM room_memberships rm
            JOIN room_memberships mine ON mine.room_id = rm.room_id AND mine.user_id = auth.uid()
            WHERE rm.user_id = categories.user_id AND rm.status = 'ACTIVE' AND mine.status = 'ACTIVE'
        )
    );

CREATE POLICY "categories select own"    ON public.categories FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "categories insert own"    ON public.categories FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "categories update own"    ON public.categories FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "categories delete own"    ON public.categories FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "tags select own"          ON public.tags FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "tags insert own"          ON public.tags FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "tags delete own"          ON public.tags FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "templates select own"     ON public.activity_templates FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "templates insert own"     ON public.activity_templates FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "templates update own"     ON public.activity_templates FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "templates delete own"     ON public.activity_templates FOR DELETE USING (user_id = auth.uid());

-- Records: owner sees everything; a room partner sees PUBLIC ones (real-time share).
CREATE POLICY "records select own"   ON public.activity_records FOR SELECT
    USING (
        user_id = auth.uid()
        OR (
            privacy = 'PUBLIC'
            AND EXISTS (
                SELECT 1
                FROM room_memberships rm
                JOIN room_memberships mine ON mine.room_id = rm.room_id
                WHERE rm.user_id = activity_records.user_id
                  AND rm.status = 'ACTIVE'
                  AND mine.user_id = auth.uid()
                  AND mine.status = 'ACTIVE'
            )
        )
    );
CREATE POLICY "records insert own"   ON public.activity_records FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "records update own"   ON public.activity_records FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "records delete own"   ON public.activity_records FOR DELETE USING (user_id = auth.uid());

-- Junction table follows the owning record's visibility.
CREATE POLICY "activity_tags select" ON public.activity_tags FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM activity_records r
            WHERE r.id = activity_tags.record_id
              AND (
                  r.user_id = auth.uid()
                  OR (r.privacy = 'PUBLIC' AND EXISTS (
                      SELECT 1 FROM room_memberships rm
                      JOIN room_memberships mine ON mine.room_id = rm.room_id
                      WHERE rm.user_id = r.user_id AND rm.status = 'ACTIVE'
                        AND mine.user_id = auth.uid() AND mine.status = 'ACTIVE'
                  ))
              )
        )
    );
CREATE POLICY "activity_tags insert" ON public.activity_tags FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM activity_records r
            WHERE r.id = activity_tags.record_id AND r.user_id = auth.uid()
        )
    );
CREATE POLICY "activity_tags delete" ON public.activity_tags FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM activity_records r
            WHERE r.id = activity_tags.record_id AND r.user_id = auth.uid()
        )
    );

CREATE POLICY "schedules select own"  ON public.schedules FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "schedules insert own"  ON public.schedules FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "schedules update own"  ON public.schedules FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "schedules delete own"  ON public.schedules FOR DELETE USING (user_id = auth.uid());

-- Rooms/memberships: a user can see rooms they are part of; any signed-in
-- user may look up a room by its (shareable) invite code in order to join.
CREATE POLICY "rooms select member"  ON public.rooms FOR SELECT
    USING (EXISTS (SELECT 1 FROM room_memberships rm WHERE rm.room_id = rooms.id AND rm.user_id = auth.uid()));
CREATE POLICY "rooms select invite"  ON public.rooms FOR SELECT USING (true);
CREATE POLICY "rooms insert own"     ON public.rooms FOR INSERT WITH CHECK (created_by = auth.uid());
CREATE POLICY "rooms update member"  ON public.rooms FOR UPDATE
    USING (EXISTS (SELECT 1 FROM room_memberships rm WHERE rm.room_id = rooms.id AND rm.user_id = auth.uid()));
CREATE POLICY "rooms delete creator" ON public.rooms FOR DELETE USING (created_by = auth.uid());

CREATE POLICY "members select member" ON public.room_memberships FOR SELECT
    USING (room_id IN (SELECT room_id FROM room_memberships WHERE user_id = auth.uid()));
CREATE POLICY "members insert own"    ON public.room_memberships FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "members join update"   ON public.room_memberships FOR UPDATE
    USING (user_id = auth.uid() OR room_id IN (SELECT room_id FROM room_memberships WHERE user_id = auth.uid()));

CREATE POLICY "invites select member" ON public.room_invites FOR SELECT
    USING (room_id IN (SELECT room_id FROM room_memberships WHERE user_id = auth.uid()));
CREATE POLICY "invites insert member" ON public.room_invites FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "notifications select own" ON public.notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notifications insert own" ON public.notifications FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "notifications update own" ON public.notifications FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "push select own"  ON public.push_subscriptions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "push insert own"  ON public.push_subscriptions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "push delete own"  ON public.push_subscriptions FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "analytics select own" ON public.daily_analytics FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "exports select own" ON public.exports FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "exports insert own" ON public.exports FOR INSERT WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- 14. REALTIME (partner activity + notifications)
-- ============================================================================
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_records;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
