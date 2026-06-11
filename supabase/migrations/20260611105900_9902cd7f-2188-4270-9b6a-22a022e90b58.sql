
DO $$ BEGIN
  CREATE TYPE public.account_status AS ENUM ('pending','approved','suspended');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_status public.account_status NOT NULL DEFAULT 'pending';

UPDATE public.profiles SET account_status='approved' WHERE account_status='pending';

DO $$ BEGIN
  CREATE TYPE public.auction_mode AS ENUM ('short','long');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.auction_sessions
  ADD COLUMN IF NOT EXISTS mode public.auction_mode NOT NULL DEFAULT 'long',
  ADD COLUMN IF NOT EXISTS duration_minutes integer;

ALTER TYPE public.lot_status ADD VALUE IF NOT EXISTS 'awaiting_payment';
ALTER TYPE public.lot_status ADD VALUE IF NOT EXISTS 'returned';

ALTER TABLE public.lots
  ADD COLUMN IF NOT EXISTS payment_due_at timestamptz;

CREATE TABLE IF NOT EXISTS public.auction_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.auction_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  UNIQUE(session_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.auction_registrations TO authenticated;
GRANT ALL ON public.auction_registrations TO service_role;

ALTER TABLE public.auction_registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users see own registrations" ON public.auction_registrations;
CREATE POLICY "users see own registrations" ON public.auction_registrations
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "users create own registrations" ON public.auction_registrations;
CREATE POLICY "users create own registrations" ON public.auction_registrations
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "admins manage registrations" ON public.auction_registrations;
CREATE POLICY "admins manage registrations" ON public.auction_registrations
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.tg_apply_bid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_session_status public.session_status;
  v_current NUMERIC;
BEGIN
  SELECT s.status, l.current_bid INTO v_session_status, v_current
  FROM public.lots l JOIN public.auction_sessions s ON s.id = l.session_id
  WHERE l.id = NEW.lot_id;
  IF v_session_status <> 'live' THEN
    RAISE EXCEPTION 'Auction session is not live';
  END IF;
  IF NEW.amount <= v_current THEN
    RAISE EXCEPTION 'Bid of % must exceed current bid of %', NEW.amount, v_current;
  END IF;
  UPDATE public.lots
    SET current_bid = NEW.amount, bid_count = bid_count + 1
    WHERE id = NEW.lot_id;
  RETURN NEW;
END $fn$;

DROP TRIGGER IF EXISTS trg_apply_bid ON public.bids;
CREATE TRIGGER trg_apply_bid
  BEFORE INSERT ON public.bids
  FOR EACH ROW EXECUTE FUNCTION public.tg_apply_bid();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, avatar_url, account_status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url',
    CASE WHEN lower(NEW.email) = 'sunilnaikkethavath@gmail.com' THEN 'approved'::public.account_status ELSE 'pending'::public.account_status END
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  IF lower(NEW.email) = 'sunilnaikkethavath@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'owner') ON CONFLICT DO NOTHING;
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $fn$;

DELETE FROM public.lots WHERE category IN ('Photography','Photographs','Sculpture','Sculptures');
