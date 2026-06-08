
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('owner', 'admin', 'user');
CREATE TYPE public.session_status AS ENUM ('draft', 'upcoming', 'live', 'ended');
CREATE TYPE public.lot_status AS ENUM ('active', 'sold', 'unsold', 'withdrawn');
CREATE TYPE public.request_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.payout_status AS ENUM ('pending', 'paid');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by everyone authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('owner','admin')) $$;

-- Admins/owner can view all roles
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

-- ============ AUTO PROFILE + OWNER BOOTSTRAP ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  );
  -- Default role
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  -- Owner bootstrap
  IF lower(NEW.email) = 'sunilnaikkethavath@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'owner') ON CONFLICT DO NOTHING;
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ UPDATED_AT HELPER ============
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============ ADMIN REQUESTS ============
CREATE TABLE public.admin_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  reason TEXT,
  status public.request_status NOT NULL DEFAULT 'pending',
  decided_by UUID REFERENCES auth.users(id),
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.admin_requests TO authenticated;
GRANT ALL ON public.admin_requests TO service_role;
ALTER TABLE public.admin_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users insert own admin requests" ON public.admin_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users view own admin requests" ON public.admin_requests FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- ============ AUCTION SESSIONS ============
CREATE TABLE public.auction_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  cover_image TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status public.session_status NOT NULL DEFAULT 'draft',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.auction_sessions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.auction_sessions TO authenticated;
GRANT ALL ON public.auction_sessions TO service_role;
ALTER TABLE public.auction_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view non-draft sessions" ON public.auction_sessions FOR SELECT USING (status <> 'draft' OR public.is_admin(auth.uid()));
CREATE POLICY "Admins manage sessions" ON public.auction_sessions FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER set_sessions_updated_at BEFORE UPDATE ON public.auction_sessions FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============ LOTS ============
CREATE TABLE public.lots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.auction_sessions(id) ON DELETE CASCADE,
  lot_number INTEGER NOT NULL,
  artist TEXT NOT NULL,
  title TEXT NOT NULL,
  year INTEGER,
  medium TEXT,
  dimensions TEXT,
  provenance TEXT,
  description TEXT,
  category TEXT,
  image_url TEXT,
  starting_bid NUMERIC(12,2) NOT NULL DEFAULT 0,
  current_bid NUMERIC(12,2) NOT NULL DEFAULT 0,
  bid_count INTEGER NOT NULL DEFAULT 0,
  status public.lot_status NOT NULL DEFAULT 'active',
  sold_to UUID REFERENCES auth.users(id),
  sold_price NUMERIC(12,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, lot_number)
);
GRANT SELECT ON public.lots TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lots TO authenticated;
GRANT ALL ON public.lots TO service_role;
ALTER TABLE public.lots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view lots of visible sessions" ON public.lots FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.auction_sessions s WHERE s.id = session_id AND (s.status <> 'draft' OR public.is_admin(auth.uid())))
);
CREATE POLICY "Admins manage lots" ON public.lots FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER set_lots_updated_at BEFORE UPDATE ON public.lots FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============ BIDS ============
CREATE TABLE public.bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id UUID NOT NULL REFERENCES public.lots(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.bids TO authenticated;
GRANT ALL ON public.bids TO service_role;
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own bids; admins all" ON public.bids FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
-- Insert is done via server function with service role; block direct inserts:
CREATE POLICY "Admins can insert bids" ON public.bids FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));

-- Trigger: update lot on new bid (only valid if session live and amount > current_bid)
CREATE OR REPLACE FUNCTION public.tg_apply_bid()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
    RAISE EXCEPTION 'Bid must exceed current bid';
  END IF;
  UPDATE public.lots SET current_bid = NEW.amount, bid_count = bid_count + 1 WHERE id = NEW.lot_id;
  RETURN NEW;
END $$;
CREATE TRIGGER apply_bid_after_insert AFTER INSERT ON public.bids FOR EACH ROW EXECUTE FUNCTION public.tg_apply_bid();

-- ============ CONSIGNMENTS ============
CREATE TABLE public.consignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  artist TEXT NOT NULL,
  title TEXT NOT NULL,
  year INTEGER,
  medium TEXT,
  dimensions TEXT,
  provenance TEXT,
  description TEXT,
  estimated_value NUMERIC(12,2),
  image_urls TEXT[] NOT NULL DEFAULT '{}',
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  status public.request_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.consignments TO anon, authenticated;
GRANT ALL ON public.consignments TO service_role;
ALTER TABLE public.consignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit consignments" ON public.consignments FOR INSERT WITH CHECK (true);
CREATE POLICY "Users view own consignments; admins all" ON public.consignments FOR SELECT USING (
  (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR public.is_admin(auth.uid())
);
CREATE POLICY "Admins update consignments" ON public.consignments FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));

-- ============ COMMISSIONS ============
CREATE TABLE public.commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id UUID NOT NULL REFERENCES public.lots(id) ON DELETE CASCADE,
  buyer_id UUID REFERENCES auth.users(id),
  hammer_price NUMERIC(12,2) NOT NULL,
  buyers_premium NUMERIC(12,2) NOT NULL DEFAULT 0,
  commission_pct NUMERIC(5,2) NOT NULL DEFAULT 10,
  commission_amount NUMERIC(12,2) NOT NULL,
  payout_status public.payout_status NOT NULL DEFAULT 'pending',
  payout_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.commissions TO authenticated;
GRANT ALL ON public.commissions TO service_role;
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view commissions" ON public.commissions FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

-- ============ ADMIN NOTIFICATIONS (in-app inbox) ============
CREATE TABLE public.admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.admin_notifications TO authenticated;
GRANT ALL ON public.admin_notifications TO service_role;
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view notifications" ON public.admin_notifications FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins mark read" ON public.admin_notifications FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));

-- ============ WATCHLIST ============
CREATE TABLE public.watchlist (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lot_id UUID NOT NULL REFERENCES public.lots(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, lot_id)
);
GRANT SELECT, INSERT, DELETE ON public.watchlist TO authenticated;
GRANT ALL ON public.watchlist TO service_role;
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own watchlist" ON public.watchlist FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
