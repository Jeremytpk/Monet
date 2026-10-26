# Monet rebuild plan

Branch: `rebuild` (snapshot of pre-rebuild work: `25780a9` on `main`).

Decisions: keep Firebase + Expo (upgrade to current SDK, move to TypeScript), refactor in
place, all features in v1 (send/wallet/activity, Mobile Money, kiosk, admin). New visual
identity: "Malachite & Copper" brand board.

## Phase 1 — Security and money correctness (in progress)

Done:
- `firestore.rules`: users may only write `email, name, phone, photoURL, created_at,
  updated_at, force_logout(false)` on their own doc. Previously a user could set their own
  `wallet_balance` or `role: 'admin'`. Covered by `tests/rules/users.test.js`.
- Onboarding no longer writes wallet fields from the client; `createWalletUser` does it.
- `initiateTransfer` (wallet): balance checked inside the transaction (no double spend);
  self-send blocked.
- `initiatePayout`: funds reserved before calling Swiftech, refunded if the payout fails.
- `addMoneyToWallet` and card-funded sends credit wallets without charging anyone; now
  only allowed when `MONET_SIMULATION=true`.
- `swiftechWebhook`: rejects every call unless `SWIFTECH_WEBHOOK_SECRET` is set and the
  signature matches; idempotent by gateway reference (replays don't double-credit).
- Kiosk: codes use `crypto.randomInt`; agent must have role `mcp`; a code can be redeemed
  only once (re-checked inside the transaction).
- `adminEditUser`: only `name, phone, email, role, force_logout, mcp_id`; balances can't be
  edited directly.
- Amounts validated and rounded to cents.

Remaining:
- Any signed-in user can read every user doc, including phone, card/bank last4 and
  encrypted payment blobs. Split into a public `profiles` collection (name, photo, wallet
  handle) for recipient search, and lock `users` to owner + admin.
- Move roles to Firebase Auth custom claims instead of a Firestore field.
- Store money as integer cents; add a ledger collection so every balance change has an
  entry, and a reconciliation check.
- Idempotency keys on every money callable (retry-safe from the app).
- Integrate a real card processor (Stripe or Swiftech card collection: decision needed).
- Size limit on `uploadProfilePhoto`; App Check on callables.
- Kiosk fee maths and agent balance accounting: confirm the intended model with the business.

## Phase 2 — Backend modernisation
TypeScript Cloud Functions, shared types with the app, function tests on the emulator.

## Phase 3 — App foundation
Upgrade Expo SDK, TypeScript, design tokens from the brand board (replace `ThemeContext`),
shared components (Button, Input, AmountField, TransactionRow, StatusBadge).

## Phase 4 — Screens, one flow at a time
Auth + onboarding → Wallet → Send → Activity → Mobile Money → Kiosk (user + agent) →
Settings/Profile → Admin.

## Phase 5 — Launch readiness
Real payment processor live, monitoring, EAS builds, store assets with the new logo.

## Running tests
```bash
cd tests && npm install && npm run test:rules
```
