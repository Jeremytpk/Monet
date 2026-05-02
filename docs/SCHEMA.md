# Monet Firestore Schema

## Collections

### `users` (top-level)

| Field            | Type   | Description |
|------------------|--------|-------------|
| `name`           | string | Display name |
| `phone`          | string | E.164 international (e.g. +1234567890, +443...) |
| `wallet_balance` | number | Current balance in wallet (USD) |
| `currency`       | string | Default `"USD"` |
| `wallet_id`      | string | Unique id for Swiftech payout mapping (assigned on registration) |
| `role`           | string | `"sender"` \| `"receiver"` \| `"both"` (optional) |
| `card_encrypted` | string | AES-256-GCM encrypted payload: last4, exp_month, exp_year, holder_name (optional) |
| `card_last4`     | string | Last 4 digits for display (optional) |
| `card_exp_month` | number | Card expiry month 1–12 (optional) |
| `card_exp_year`  | number | Card expiry year (optional) |
| `card_holder_name` | string | Cardholder name (optional) |
| `swiftech_card_token_encrypted` | string | Encrypted Swiftech vault token if Swiftech stores card (optional) |
| `bank_encrypted` | string | AES-256-GCM encrypted payload: routing_number, account_last4, account_holder_name (optional) |
| `bank_account_holder` | string | Bank account holder name for display (optional) |
| `bank_routing`   | string | Bank routing number 9 digits (optional) |
| `bank_account_last4` | string | Last 4 digits of bank account (optional) |
| `swiftech_bank_token_encrypted` | string | Encrypted Swiftech vault token if Swiftech stores bank (optional) |
| `created_at`     | timestamp | Server timestamp |
| `updated_at`     | timestamp | Server timestamp |

Example:

```json
{
  "name": "User B",
  "phone": "+12345678901",
  "wallet_balance": 30.00,
  "currency": "USD",
  "wallet_id": "monet_usr_abc123",
  "created_at": "server_timestamp",
  "updated_at": "server_timestamp"
}
```

---

### `users/{uid}/transactions` (subcollection)

| Field         | Type    | Description |
|---------------|---------|-------------|
| `sender_id`   | string  | UID of sender (empty for deposits from gateway) |
| `receiver_id` | string  | UID of receiver |
| `amount`      | number  | Amount in USD |
| `status`      | string  | `pending` \| `completed` \| `failed` |
| `type`        | string  | `incoming_transfer` \| `deposit` \| `withdrawal` |
| `gateway_ref` | string  | Swiftech reference (e.g. `swiftech_xyz_123`) |
| `timestamp`   | timestamp | Server timestamp |
| `metadata`    | map     | Optional (e.g. mobile_money_provider, phone) |

Example:

```json
{
  "sender_id": "uid_a",
  "receiver_id": "uid_b",
  "amount": 10.00,
  "status": "completed",
  "type": "incoming_transfer",
  "gateway_ref": "swiftech_xyz_123",
  "timestamp": "server_timestamp"
}
```

---

## Indexes

Defined in `firestore.indexes.json`:

- `transactions`: `receiver_id` ASC, `timestamp` DESC
- `transactions`: `sender_id` ASC, `timestamp` DESC
- `transactions`: `status` ASC, `timestamp` DESC

---

## Ledger Logic

- **Money received:** `type === 'incoming_transfer'` or `'deposit'`; increases receiver's `wallet_balance`.
- **Money spent:** `type === 'withdrawal'`; decreases `wallet_balance` when cashing out to Mobile Money.
- All mutations to `wallet_balance` and transaction documents are performed by Cloud Functions (Swiftech webhook, payout, transfer).

---

## Kiosk System (MPA & MCP)

### `mpa_accounts` (top-level)

MPA = Money Partner Account (operated by MCP agents at physical kiosks).

| Field                      | Type   | Description |
|----------------------------|--------|-------------|
| `mcp_uid`                  | string | Firebase UID of the Monet Commercial Partner (MCP agent) |
| `business_name`            | string | Name of the kiosk/business |
| `balance`                  | number | Current MPA balance (USD) — must be ≥ $250 to enable withdrawals |
| `total_commissions_earned` | number | Cumulative commissions from all kiosk withdrawals |
| `status`                   | string | `active` \| `inactive` \| `suspended` |
| `created_at`               | timestamp | Server timestamp |
| `updated_at`               | timestamp | Server timestamp |

Example:

```json
{
  "mcp_uid": "uid_mcp_001",
  "business_name": "Kinshasa Cash Kiosk",
  "balance": 5000.00,
  "total_commissions_earned": 250.50,
  "status": "active",
  "created_at": "server_timestamp",
  "updated_at": "server_timestamp"
}
```

---

### `mpa_accounts/{mcp_uid}/transactions` (subcollection)

Commission and cash-out history for each MCP.

| Field              | Type      | Description |
|--------------------|-----------|-------------|
| `type`             | string    | `kiosk_commission` \| `deposit` \| `withdrawal` |
| `user_uid`         | string    | UID of the client who withdrew cash |
| `withdrawal_code`  | string    | 6-digit code used for this transaction |
| `commission_earned`| number    | MCP's commission from this withdrawal (7% of fees = 0.7% of gross) |
| `client_cash_handed` | number  | Amount of cash the MCP physically handed to the client |
| `timestamp`        | timestamp | Server timestamp |

---

### `kiosk_transactions` (top-level)

Pending and completed kiosk cash-out transactions.

| Field               | Type      | Description |
|---------------------|-----------|-------------|
| `code`              | string    | 6-digit withdrawal code (unique) |
| `user_uid`          | string    | UID of the user initiating withdrawal |
| `mcp_uid`           | string    | UID of the MCP partner at the kiosk |
| `gross_amount`      | number    | Original amount user requested (USD) |
| `total_fees`        | number    | 10% of gross_amount |
| `mcp_commission`    | number    | 70% of fees (7% of gross_amount) |
| `monet_commission`  | number    | 30% of fees (3% of gross_amount) |
| `client_net`        | number    | Amount MCP physically hands to client = gross_amount - total_fees |
| `status`            | string    | `pending` \| `scanned` \| `confirmed` \| `completed` \| `expired` |
| `created_at`        | timestamp | Server timestamp |
| `expires_at`        | timestamp | Expires 15 minutes after creation |
| `completed_at`      | timestamp | When MCP confirmed cash handover (optional) |

---

### Fee Breakdown Example (for $100 withdrawal)

- **Gross Amount:** $100.00
- **Total Fees (10%):** $10.00
  - **MCP Commission (70% of fees):** $7.00 (7% of gross)
  - **Monet Commission (30% of fees):** $3.00 (3% of gross)
- **Client Receives (Cash):** $90.00

