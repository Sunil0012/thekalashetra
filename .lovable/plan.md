## Plan: Kalashetra — Premium Auction Platform with Admin Backend

### 1. Rebrand
- Replace "Vermillion" → **Kalashetra** everywhere (header, footer, meta tags, copy, email subjects)
- Tagline: "Fine Art Auctions · Est. 2026" stays
- Update all route `head()` titles

### 2. Database schema (Lovable Cloud)
- `profiles` (id → auth.users, full_name, email, avatar_url, created_at) + auto-create trigger on signup
- `app_role` enum: `owner`, `admin`, `user`
- `user_roles` (user_id, role, unique) + `has_role(uuid, app_role)` security-definer function
- Auto-promote `sunilnaikkethavath@gmail.com` to `owner` on signup via trigger
- `admin_requests` (id, user_id, email, full_name, reason, status: pending/approved/rejected, decided_by, decided_at, created_at)
- `auction_sessions` (id, title, slug, description, cover_image, starts_at, ends_at, status: draft/upcoming/live/ended, created_by, created_at)
- `lots` (id, session_id, lot_number, artist, title, year, medium, dimensions, provenance, description, image_url, starting_bid, current_bid, bid_count, category, sold_to, sold_price, status)
- `bids` (id, lot_id, user_id, amount, created_at) — RLS allows insert if session is live and amount valid; trigger updates lot.current_bid
- `consignments` (id, user_id/null, artist, title, year, medium, dimensions, provenance, description, estimated_value, image_urls[], contact_email, contact_phone, status: pending/approved/rejected, created_at)
- `commissions` (id, lot_id, buyer_id, hammer_price, commission_amount, commission_pct, payout_status, razorpay_payment_id, created_at) — for tracking payouts owed to owner UPI

All tables: RLS enabled, GRANTs to `authenticated`/`service_role`, public-read on `auction_sessions`/`lots` (anon SELECT allowed).

### 3. Authentication
- Email/password sign-up + sign-in (no email auto-confirm — users verify email)
- **Google sign-in** via Lovable managed OAuth
- Auth page redesigned with current premium look, branded Kalashetra
- Sign-out hygiene; root `onAuthStateChange` listener wired

### 4. Email infrastructure (Lovable Emails)
- Set up email domain (will prompt user)
- Auth confirmation emails branded Kalashetra
- **Transactional emails** sent to `sunilnaikkethavath@gmail.com`:
  - New consignment submitted (seller verification)
  - New admin request submitted (with approve/reject magic link to admin panel)
  - Sale completed (commission owed notification with amount + buyer + UPI reminder)

### 5. Routes & pages

**Public**
- `/` — landing (rebranded)
- `/auctions` — current/live auctions (sessions list + lots within)
- `/auctions/upcoming` — upcoming sessions with countdown
- `/auctions/ended` — past sessions / results
- `/sessions/$slug` — session detail page with all lots
- `/lot/$id` — lot detail (bidding only if signed in + session live)
- `/sell` — consignment form → submits to `consignments` table → emails owner
- `/artists`, `/about` — keep, rebranded
- `/auth` — sign in / sign up (email + Google) with redirect param
- `/request-admin` — form for users to request admin access

**Authenticated** (`src/routes/_authenticated/`)
- `/account` — user dashboard: my bids, watchlist, my consignments, my admin request status
- `/checkout/$lotId` — pay for won lot (Cards/UPI/Netbanking UI; mock until Razorpay added; commission recorded server-side)

**Admin** (`src/routes/_authenticated/admin/`, gated by `has_role(user, 'admin' or 'owner')`)
- `/admin` — dashboard (stats: live sessions, pending requests, pending consignments, recent bids)
- `/admin/sessions` — list, create, edit, delete auction sessions (with start/end dates, status)
- `/admin/sessions/$id/lots` — manage lots in a session (add/edit/delete; upload image)
- `/admin/requests` — admin access requests (approve/reject; only `owner` can approve)
- `/admin/consignments` — review submitted artworks (approve → can convert to lot; reject)
- `/admin/users` — list users, view roles, promote/demote (owner only)
- `/admin/sales` — completed sales + commission ledger (UPI: 9346739056@ybl displayed)

### 6. Server functions (`createServerFn` + `requireSupabaseAuth`)
- `submitConsignment` — public; inserts row; sends email to owner
- `requestAdmin` — auth required; inserts admin_request; sends email to owner
- `approveAdminRequest` / `rejectAdminRequest` — owner only; updates request + inserts user_role
- `createSession` / `updateSession` / `deleteSession` — admin only
- `createLot` / `updateLot` / `deleteLot` — admin only
- `placeBid` — auth required; validates session live, amount ≥ current + increment; inserts bid; updates lot
- `recordSale` — called on session end or checkout; computes 22% buyer premium + commission (e.g., 10%); creates commission row; emails owner
- `getSessionsByStatus` — public reads via admin client

### 7. Admin role bootstrap
- Trigger `handle_new_user`: creates profile; if email = `sunilnaikkethavath@gmail.com`, also inserts `('owner', user_id)` and `('admin', user_id)` into user_roles
- `has_role()` security-definer function for RLS

### 8. Commission / payout
- Display owner UPI `9346739056@ybl` + QR placeholder at checkout for now (text noting Razorpay auto-split coming)
- Every sale creates `commissions` row visible in `/admin/sales`
- When Razorpay keys provided later: swap mock checkout for Razorpay Orders API + Route auto-transfer to UPI

### 9. Existing UI to keep / migrate
- Header (rebranded), footer, lot card, premium typography, dark theme — all preserved
- `src/lib/auction-data.ts` legacy mock LOTS replaced by live DB reads; keep helpers `formatBid`, `formatCountdown`, `nextMinIncrement`
- Existing `signin.tsx` becomes `/auth` redirect; existing `checkout.tsx` rewired to commission flow

### Technical notes
- All DB writes go through server fns with `requireSupabaseAuth`; RLS as defense in depth
- Image uploads → Lovable Cloud storage bucket `lots` (public read)
- Use TanStack Query for all reads with route loaders priming cache
- Email domain setup will prompt user via `<presentation-open-email-setup>`

This is a large build — I'll do it in this order: schema → auth → admin gate → admin CRUD → public pages rewire → bidding → consignment + emails → checkout/commission.