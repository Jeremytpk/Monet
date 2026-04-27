# Monet — Diaspora-to-DRC Digital Wallet

Cross-border financial ecosystem for the African diaspora (US/Europe) to send funds to the Democratic Republic of Congo (DRC). Monet acts as a **mobile wallet**: senders fund via card; receivers see a real-time balance and can cash out to M-Pesa, Airtel Money, or Orange Money.

## Architecture

- **Sender (User A):** Funds via Visa/Debit in the US.
- **Monet Backend:** Firebase + Node.js Cloud Functions + Swiftech for international liquidity and DRC payout.
- **Receiver (User B):** Real-time balance in Monet Wallet, transaction history, and “Cash Out” to local Mobile Money.

## Repo Structure

```
Monet/
├── functions/          # Firebase Cloud Functions (Node.js + Swiftech)
├── mobile/             # React Native (Expo) app — Sender & Receiver UIs
├── firestore.rules     # Firestore security rules
├── firestore.indexes.json
└── firebase.json       # Firebase project config
```

## Tech Stack

| Layer           | Stack |
|----------------|-------|
| Frontend       | React Native (Expo), Firebase Auth, Firestore |
| Backend/DB     | Firebase (Firestore, Auth) |
| Payments       | Swiftech API (transfer + payout) |
| Server logic   | Node.js Cloud Functions |

## Quick Start

### 1. Firebase

```bash
# Install Firebase CLI: npm i -g firebase-tools
firebase login
firebase use --add   # select or create project
cp functions/.env.example functions/.env   # add Swiftech keys
firebase deploy
```

### 2. Mobile App

```bash
cd mobile
npm install --ignore-scripts   # avoids native postinstall issues
cp .env.example .env          # add Firebase config
npx expo start
```

Placeholder `icon.png`, `splash.png`, and `adaptive-icon.png` are in `mobile/assets/`; replace with final art for production.

### 3. Environment

- **Firebase:** Create a project at [Firebase Console](https://console.firebase.google.com), enable **Authentication → Email/Password** and **Firestore**, then add your app and copy the config into `mobile/.env`.
- **Swiftech:** Copy `functions/.env.example` to `functions/.env` and set `SWIFTECH_API_KEY`, `SWIFTECH_SECRET`, and `SWIFTECH_BASE_URL`.

## Data Model (Firestore)

- **`users/{uid}`:** `name`, `phone`, `wallet_balance`, `currency`, `wallet_id` (for Swiftech).
- **`users/{uid}/transactions/{tid}`:** `sender_id`, `receiver_id`, `amount`, `status`, `gateway_ref`, `type` (deposit | withdrawal | incoming_transfer), `timestamp`.

See `docs/SCHEMA.md` for full schema and indexes.

## Sender flow (card payment)

The **Send** screen currently collects recipient and amount. To complete the "fund via Visa/Debit" flow:

1. Integrate a payment gateway (e.g. **Stripe**) in the app or via a Cloud Function.
2. On "Send", charge the card for the amount, then call `initiateTransfer(receiver_uid, amount_usd)` after successful payment.
3. Alternatively, use Swiftech’s own card collection if their API supports it; the backend already calls Swiftech for the transfer once funds are confirmed.

## Phone auth

Onboarding uses **email/password** for a quick start. The wallet **phone number** is collected at signup and can be from **any country** (include country code). For production "sign up with phone number", enable **Firebase Phone Authentication**, configure reCAPTCHA (or a custom SMS provider), and switch the login/onboarding screens to phone + verification code.

## License

Proprietary — Jerttech.
