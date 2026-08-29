-- Run this SQL in your Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- Profiles
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  account_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User Roles
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'user')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auction Sessions
CREATE TABLE IF NOT EXISTS auction_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  cover_image TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'upcoming', 'live', 'ended')),
  mode TEXT NOT NULL DEFAULT 'long' CHECK (mode IN ('short', 'long')),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Lots
CREATE TABLE IF NOT EXISTS lots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES auction_sessions(id) ON DELETE CASCADE,
  lot_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  year INTEGER,
  description TEXT,
  medium TEXT,
  dimensions TEXT,
  category TEXT,
  image_url TEXT,
  provenance TEXT,
  starting_bid NUMERIC NOT NULL DEFAULT 0,
  current_bid NUMERIC NOT NULL DEFAULT 0,
  bid_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'sold', 'unsold', 'withdrawn', 'awaiting_payment', 'returned')),
  sold_price NUMERIC,
  sold_to TEXT,
  payment_due_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bids
CREATE TABLE IF NOT EXISTS bids (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lot_id UUID NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auction Registrations
CREATE TABLE IF NOT EXISTS auction_registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES auction_sessions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Consignments
CREATE TABLE IF NOT EXISTS consignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT,
  artist TEXT NOT NULL,
  title TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  year INTEGER,
  medium TEXT,
  dimensions TEXT,
  description TEXT,
  provenance TEXT,
  estimated_value NUMERIC,
  image_urls JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Admin Requests
CREATE TABLE IF NOT EXISTS admin_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  full_name TEXT,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  decided_at TIMESTAMPTZ,
  decided_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Admin Notifications
CREATE TABLE IF NOT EXISTS admin_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Commissions
CREATE TABLE IF NOT EXISTS commissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lot_id UUID NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
  buyer_id TEXT,
  hammer_price NUMERIC NOT NULL,
  buyers_premium NUMERIC NOT NULL,
  commission_pct NUMERIC NOT NULL,
  commission_amount NUMERIC NOT NULL,
  payout_status TEXT NOT NULL DEFAULT 'pending' CHECK (payout_status IN ('pending', 'paid')),
  payout_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Watchlist
CREATE TABLE IF NOT EXISTS watchlist (
  user_id TEXT NOT NULL,
  lot_id UUID NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, lot_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_lots_session_id ON lots(session_id);
CREATE INDEX IF NOT EXISTS idx_bids_lot_id ON bids(lot_id);
CREATE INDEX IF NOT EXISTS idx_bids_user_id ON bids(user_id);
CREATE INDEX IF NOT EXISTS idx_auction_registrations_session_user ON auction_registrations(session_id, user_id);
CREATE INDEX IF NOT EXISTS idx_consignments_user_id ON consignments(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_requests_user_id ON admin_requests(user_id);
