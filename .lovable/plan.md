## Kalashetra v2 — Plan

A large, coordinated change. I'll ship it as one migration + one set of code edits.

### 1. Categories
- Remove **Photographs** and **Sculptures** everywhere (seed data, filters, sell form). Keep Paintings, Drawings, Prints, Mixed Media.

### 2. Currency: USD → INR
- `formatBid` → `₹` with `en-IN` grouping (e.g. ₹1,28,000).
- Update bid increments to INR-sensible bands: <₹10k → ₹500, <₹50k → ₹1,000, <₹2L → ₹2,500, else ₹5,000.
- Update buyer's premium copy & checkout.

### 3. Bid bug ("must exceed current bid" even when higher)
Root cause: the DB trigger `tg_apply_bid` AND the JS pre-check both read `current_bid`, and the JS message includes the amount while the trigger message is the bare string the user is seeing. Most likely the user's previous click already moved `current_bid` past their amount (race / double-submit), or the row in `lots.current_bid` is stored as a higher value due to a stale UI.
Fix:
- Make the trigger return a precise message: `Bid ₹X must exceed current ₹Y`.
- Add a single-flight guard on the client (disable button on submit + ignore submits within 1s of the last).
- Remove duplicate JS pre-check (trust trigger) so we don't double-validate against stale data.
- Always refetch lot after a failed bid so the user sees the true current.

### 4. Two bidding modes — short-term & long-term
Add `auction_sessions.mode ENUM('short','long')` (default `long`).
- **Short**: admin sets a duration in hours (2–6). When admin clicks "Go live", `starts_at = now()`, `ends_at = now() + duration`.
- **Long**: multi-day sessions with explicit start/end dates (today's behaviour).
- Admin Sessions form gets a Mode toggle + Duration field (only for short).

### 5. Seller → Admin → Catalog → Upcoming → Live workflow
Already partly there. Tighten:
- Sell page submits a `consignment` (already wired).
- Admin /consignments approves → button "Add to catalog" opens a session picker → creates a `lot` in chosen draft/upcoming session. Until the session goes live, lot is not biddable.
- Lots can only be bid on when session is `live`.

### 6. Payment deadline (11:59 PM IST)
- Add `lots.payment_due_at` set when session ends (the next 23:59 IST after ends_at).
- Add `lots.status` value `awaiting_payment` (between ended-with-winner and sold).
- Add an admin server fn `expireUnpaidLots()` callable from `/admin` "Run cleanup" button + auto-called on any page load that needs it (lightweight). For unpaid lots past due: set `status='returned'`, clear `sold_to`, notify admin. Full pg_cron later.

### 7. Per-user signup approval
Add `profiles.account_status ENUM('pending','approved','suspended')` (default `pending`; owner auto-approved).
- After sign-in, if status ≠ approved, show a "Pending admin approval" gate page (no access to bidding/checkout/sell). Browsing public catalog still allowed.
- Admin dashboard `/admin/users` shows pending users with **Approve** / **Reject** / **Suspend** / **Remove user** buttons. "Remove user" deletes the auth user via admin API and cascades.

### 8. Per-auction registration with admin approval
New table `auction_registrations(user_id, session_id, status pending|approved|rejected)`.
- "Register to bid" button on session/lot page → creates pending row.
- Admin /admin/sessions/$id has a "Registrations" tab to approve/reject.
- Bidding rejected unless approved registration exists.

### 9. Live room transparency (short auctions)
On short-mode lot pages, bid history shows **bidder display name** + amount (only to approved registrants for that session). Long-mode keeps anonymous (current behaviour).

### 10. Image upload (system file → storage)
- Create storage bucket `lot-images` (public).
- Reusable `<ImageUpload>` component: file picker → uploads to bucket → returns public URL.
- Used in admin Sessions form (cover image), admin Lots form (lot image), sell form (consignment images).

### 11. Admin Users — Remove user button
Add **Remove user** next to **Make admin** (owner only, never on owner). Calls `auth.admin.deleteUser` via server fn.

### 12. Auctions vs Upcoming pages distinct
- `/auctions` shows ONLY `status='live'` sessions (grouped by session, with their lots & countdowns).
- `/auctions/upcoming` shows ONLY `status='upcoming'` (catalogues, opens-in countdowns) — already correct, but de-dupe the layout so they're visually distinct.

### 13. Admin can change session times & countdowns reflect instantly
- The "Edit" form already accepts new `ends_at`. Issue is the cached query: invalidate `["catalogue"]` AND `["lot", *]` on every session edit (already partial). Also bump the `useNow` tick on those pages to 1s for accurate countdowns.

---

### Technical bits
- One migration: enums, columns, new table, grants, RLS policies, updated trigger message, storage bucket policies.
- One pass of code edits for the routes / components above.
- Touch points: `src/lib/format.ts`, `src/lib/auction.functions.ts`, `src/routes/lot.$id.tsx`, `src/routes/auctions.tsx`, `src/routes/auctions.upcoming.tsx`, `src/routes/sell.tsx`, `src/routes/checkout.tsx`, `src/routes/_authenticated/admin/*`, `src/hooks/use-auth.ts`, `src/components/ImageUpload.tsx` (new), `src/routes/_authenticated/pending.tsx` (new gate page).

### Questions before I start
1. **Short auction duration** — should admin pick any minutes value, or fixed buckets (2h / 3h / 6h)?
2. **Auto-approve owner-promoted admins**: when an admin (not just owner) is added, should they auto-approve users, or only the owner?
3. **"Remove user"** should it hard-delete the auth account (irreversible) or just suspend (`account_status='suspended'`)?

After your answers I'll execute the whole plan in one go.