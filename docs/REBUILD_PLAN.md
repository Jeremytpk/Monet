# Monet rebuild plan

Branch: `rebuild` (snapshot of pre-rebuild work: `25780a9` on `main`).

Decisions: keep Firebase + Expo (upgrade to current SDK, move to TypeScript), refactor in
place, all features in v1 (send/wallet/activity, Mobile Money, kiosk, admin). New visual
identity: "Malachite & Copper" brand board. Card funding: Stripe. Kiosk fee stays 10% of the
amount (7% agent commission, 3% Monet).

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

- Privacy: `users/{uid}` is readable only by its owner and admins. Other users read
  `profiles/{uid}` (name, phone, photo, kiosk agent id), kept in sync by the
  `syncPublicProfile` trigger. Covered by `tests/functions/profiles.test.js`.

  **Deploy order matters:** (1) deploy functions, (2) in the app's admin dashboard tap
  "Sync profiles" once to create profiles for existing users, (3) ship the app update,
  (4) deploy `firestore.rules`. Deploying the rules before the app update breaks recipient
  search in older app versions.

Remaining:
- Profiles still expose every user's phone number to all signed-in users (the Send screen
  lists everyone). Product decision for the redesign: search by exact phone/handle instead
  of browsing a directory.
- Move roles to Firebase Auth custom claims instead of a Firestore field.
- Store money as integer cents; add a ledger collection so every balance change has an
  entry, and a reconciliation check.
- Idempotency keys on every money callable (retry-safe from the app).
- Integrate Stripe for card funding (PaymentIntents; credit the wallet from the Stripe
  webhook, not from the app).
- Size limit on `uploadProfilePhoto`; App Check on callables.
- Kiosk agent balance accounting: the MPA is credited `client_net + commission`; confirm
  that is the intended settlement model.

## Phase 2 — Backend modernisation
TypeScript Cloud Functions, shared types with the app, function tests on the emulator.

## Phase 3 — App foundation (done)
- Expo SDK 51 → 58 (React 19, RN 0.88, expo-router 58, Firebase 13). Requires Node ≥ 22.13;
  the repo pins Node 24 in `.nvmrc` (`nvm use`).
- `android/` removed (stale SDK 51 prebuild); native projects are generated on demand
  (`npx expo prebuild` / EAS). `babel.config.js` removed (Expo's default preset applies).
- Auth sessions persist across restarts (`initializeAuth` + AsyncStorage).
- TypeScript enabled (`tsconfig.json`, strict). New code is TS; existing screens convert in phase 4.
- Design tokens in `mobile/lib/theme/tokens.ts`; `ThemeContext` keeps its old colour names
  (so every screen already uses the new palette) and follows the device light/dark setting
  unless the user picked one.
- Sora + Inter fonts loaded in `app/_layout.js`; new icon, adaptive icon, splash and favicon.
- Shared components in `mobile/components/ui`: AppText, Button, Card, Logo/LogoMark,
  StatusBadge, TextField, TransactionRow. Money formatting in `lib/format.ts`.
- Send helpers moved out of `app/` (expo-router treated them as screens).

## Phase 4 — UI redesign (done, frontend only)
Every screen rebuilt on the Malachite & Copper kit (`mobile/components/ui`): custom icon set,
Screen/Header/Sheet/ListGroup/AmountInput/PromoCarousel/Segmented, light + dark.
- Send now has a review step before money moves; kiosk sends show the fee and code in a sheet.
- Promo cards never put text over photos; broken ad images fall back to an icon.
- Bugs fixed on the way: kiosk-withdraw crashed on any alert (`t` undefined); activity's
  pending-code listener never unsubscribed; agent dashboard recreated listeners every render;
  admin transactions broke hook order and de-duplicated by id only; admin activity filters
  matched the wrong types; "regular user" role sent `''` (rejected by the hardened backend).
- Removed: admin "Simulate add funds" (direct balance edits are now blocked server-side).
- Not yet verified on device: signed-in screens (needs a test account).

## Phase 5 — Launch readiness
Real payment processor live, monitoring, EAS builds, store assets with the new logo.

## Running tests
```bash
cd functions && npm install    # the functions emulator loads them from here
cd ../tests && npm install && npm test
```
