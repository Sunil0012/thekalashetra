-- Data API access grants for all existing tables (RLS still applies for non-service roles)
GRANT ALL ON public.profiles, public.user_roles, public.admin_requests, public.admin_notifications, public.auction_sessions, public.lots, public.bids, public.consignments, public.commissions, public.watchlist TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles, public.user_roles, public.admin_requests, public.admin_notifications, public.auction_sessions, public.lots, public.bids, public.consignments, public.commissions, public.watchlist TO authenticated;

-- Public catalogue is readable without sign-in
GRANT SELECT ON public.auction_sessions, public.lots TO anon;