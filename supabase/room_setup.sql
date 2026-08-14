-- ============================================================================
-- CurrentState — ROOM feature setup (idempotent, safe to re-run)
-- Fixes: missing room tables, missing RLS policies, missing capacity trigger.
-- Run in: Supabase Dashboard > SQL Editor
-- ============================================================================

-- 1) Enum used by room_memberships (no-op if it already exists) ---------------
DO $$ BEGIN
    CREATE TYPE room_member_status AS ENUM ('ACTIVE', 'LEFT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2) rooms table ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rooms (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    invite_code       TEXT NOT NULL,
    invite_link       TEXT,
    invite_expires_at TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS rooms_invite_code_uidx ON public.rooms (invite_code);

-- 3) room_memberships table ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.room_memberships (
    room_id   UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status    room_member_status NOT NULL DEFAULT 'ACTIVE',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    left_at   TIMESTAMPTZ,
    PRIMARY KEY (room_id, user_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS room_memberships_one_active_uidx
    ON public.room_memberships (user_id) WHERE status = 'ACTIVE';
CREATE INDEX IF NOT EXISTS room_memberships_user_idx ON public.room_memberships (user_id, status);
CREATE INDEX IF NOT EXISTS room_memberships_room_idx ON public.room_memberships (room_id, status);

-- 4) Capacity trigger (max 2 active members per room) --------------------------
CREATE OR REPLACE FUNCTION public.enforce_room_capacity() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
    active_count INTEGER;
BEGIN
    IF NEW.status = 'ACTIVE' THEN
        SELECT count(*) INTO active_count
        FROM public.room_memberships
        WHERE room_id = NEW.room_id AND status = 'ACTIVE';
        IF active_count >= 2 THEN
            RAISE EXCEPTION 'room already has 2 active members';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS room_capacity_trigger ON public.room_memberships;
CREATE TRIGGER room_capacity_trigger
    BEFORE INSERT OR UPDATE OF status ON public.room_memberships
    FOR EACH ROW EXECUTE FUNCTION public.enforce_room_capacity();

-- 5) room_invites (optional, kept for parity with schema.sql) ------------------
CREATE TABLE IF NOT EXISTS public.room_invites (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id    UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    code_hash  TEXT NOT NULL,
    expires_at TIMESTAMPTZ,
    max_uses   INTEGER NOT NULL DEFAULT 1,
    used_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT room_invites_code_hash_uniq UNIQUE (code_hash)
);
CREATE INDEX IF NOT EXISTS room_invites_room_id_idx ON public.room_invites (room_id);

-- 6) ROW LEVEL SECURITY ----------------------------------------------------------
ALTER TABLE public.rooms            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_invites     ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rooms select member"  ON public.rooms;
DROP POLICY IF EXISTS "rooms select invite"  ON public.rooms;
DROP POLICY IF EXISTS "rooms insert own"     ON public.rooms;
DROP POLICY IF EXISTS "rooms update member"  ON public.rooms;
DROP POLICY IF EXISTS "rooms delete creator" ON public.rooms;
CREATE POLICY "rooms select member" ON public.rooms FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.room_memberships rm WHERE rm.room_id = rooms.id AND rm.user_id = auth.uid()));
CREATE POLICY "rooms select invite" ON public.rooms FOR SELECT USING (true);
CREATE POLICY "rooms insert own"    ON public.rooms FOR INSERT WITH CHECK (created_by = auth.uid());
CREATE POLICY "rooms update member" ON public.rooms FOR UPDATE
    USING (EXISTS (SELECT 1 FROM public.room_memberships rm WHERE rm.room_id = rooms.id AND rm.user_id = auth.uid()));
CREATE POLICY "rooms delete creator" ON public.rooms FOR DELETE USING (created_by = auth.uid());

DROP POLICY IF EXISTS "members select member" ON public.room_memberships;
DROP POLICY IF EXISTS "members insert own"    ON public.room_memberships;
DROP POLICY IF EXISTS "members join update"   ON public.room_memberships;
CREATE POLICY "members select member" ON public.room_memberships FOR SELECT
    USING (room_id IN (SELECT room_id FROM public.room_memberships WHERE user_id = auth.uid()));
CREATE POLICY "members insert own"    ON public.room_memberships FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "members join update"   ON public.room_memberships FOR UPDATE
    USING (user_id = auth.uid() OR room_id IN (SELECT room_id FROM public.room_memberships WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "invites select member" ON public.room_invites;
DROP POLICY IF EXISTS "invites insert member" ON public.room_invites;
CREATE POLICY "invites select member" ON public.room_invites FOR SELECT
    USING (room_id IN (SELECT room_id FROM public.room_memberships WHERE user_id = auth.uid()));
CREATE POLICY "invites insert member" ON public.room_invites FOR INSERT WITH CHECK (created_by = auth.uid());

-- 7) Realtime: publish room tables so the partner's app updates live ------------
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.room_memberships;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 8) DIAGNOSTIC — run and paste the result --------------------------------------
SELECT 'rooms' AS tbl, count(*) FROM public.rooms
UNION ALL SELECT 'room_memberships', count(*) FROM public.room_memberships
UNION ALL SELECT 'room_invites', count(*) FROM public.room_invites;
