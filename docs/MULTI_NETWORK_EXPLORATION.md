# Multi-Network Exploration: BTC, XMR, STX

Exploring what it takes to make the estate planning tool available on **Bitcoin (BTC)**, **Monero (XMR)**, and **Stacks (STX)**.

**Status:** **Implemented.** Option A (one column per network) is in place: `monero_address` and `stacks_address` on `estate_plans` and `beneficiaries`; API and frontend support all three networks with labels and copy-to-clipboard.

---

## What “available on” each network means (scope)

For this app, “available on” a network can mean:

1. **Address storage & display** – Store and show addresses (or equivalents) for that chain per estate plan and per beneficiary; validate format where possible.
2. **UI & copy** – Labels and “copy address” that are network-aware (e.g. “Bitcoin address”, “Monero address”, “Stacks address”).
3. **Future (Phase E+)** – Wallet connection, balance display, timelock execution, or chain-specific flows (e.g. Monero view-key inheritance, Stacks Clarity contracts). Not in scope for this exploration; only noted where relevant.

This doc focuses on **(1) and (2)** so the product can support multiple networks in the data model and UI without committing to full wallet/signing integration yet.

---

## Per-network snapshot

| Network | Symbol | Address / identifier | Max length (typical) | Notes |
|--------|--------|----------------------|----------------------|--------|
| **Bitcoin** | BTC | Legacy (1...), SegWit (bc1...), etc. | ~26–62 chars | Current app already stores “bitcoin_address”. Well-documented validation (regex/checksum). |
| **Monero** | XMR | Primary (4...) or subaddress (8...); Base58, 95 chars | 95 chars | Privacy chain; inheritance often involves view keys / wallet files, not only “send to address”. Storing payout address (primary or subaddress) is still useful. |
| **Stacks** | STX | c32check (e.g. SP... mainnet, ST... testnet) | ~39–45 chars | Same curve as Bitcoin; Stacks is a Bitcoin L2. Principals are used for STX and Clarity contracts. |

Current schema uses `VARCHAR(255)` for address fields, which is enough for any of these (Monero is the longest at 95).

---

## Data model options

Today we have a single address concept: `estate_plans.bitcoin_address`, `beneficiaries.bitcoin_address`.

To support multiple networks without breaking existing data:

### Option A: One column per network (simplest migration)

- Add optional columns: e.g. `monero_address`, `stacks_address` (and keep `bitcoin_address`).
- **Pros:** Simple, explicit, no schema ambiguity; backward compatible (existing BTC data stays).  
- **Cons:** One migration per new network; table widens.

### Option B: Generic “network + address” (normalized)

- New table e.g. `plan_addresses(estate_plan_id, network, address)` and `beneficiary_addresses(beneficiary_id, network, address)` with `network` in (`btc`,`xmr`,`stx`).
- **Pros:** Easy to add networks later without new columns; one row per (entity, network).  
- **Cons:** More joins; API and UI must switch from “one address per plan/beneficiary” to “addresses per network.”

### Option C: Single JSON/JSONB column

- Replace `bitcoin_address` with e.g. `addresses JSONB` like `{"btc": "...", "xmr": "...", "stx": "..."}`.
- **Pros:** Flexible; one column for all networks.  
- **Cons:** Weaker typing and indexing; validation and API shape need clear rules.

**Recommendation for a first multi-network step:** **Option A** – add `monero_address` and `stacks_address` (nullable) to `estate_plans` and `beneficiaries`, keep `bitcoin_address`. Rename in API/UI to “addresses” keyed by network (e.g. `addresses: { btc, xmr, stx }`) so the frontend can show a tab or field per network. If you later add many more chains, you can introduce Option B and migrate.

---

## Validation per network

- **Bitcoin:** Regex + optional Bech32/checksum validation (many crates exist, e.g. `bitcoin` or dedicated address-validation libs).
- **Monero:** Length 95, prefix `4` or `8`, Base58 character set; full validation = decode + check type byte + Keccak-256 checksum. Rust: `monero-rs` or custom small validator.
- **Stacks:** c32check decoding; prefix `SP` (mainnet) or `ST` (testnet). Stacks docs and `stacks.js` reference c32; Rust may need a small c32check lib or call out to a script.

Validation can be “best effort” in the API (e.g. format only) and documented as non-custodial: we don’t guarantee the address is correct for receiving funds.

---

## API shape (Option A)

Keep backward compatibility; extend with optional fields.

**Estate plan (example):**

```json
{
  "id": 1,
  "name": "...",
  "bitcoin_address": "bc1...",
  "monero_address": null,
  "stacks_address": null,
  ...
}
```

Or, for a cleaner long-term shape, add a view that nests by network:

```json
"addresses": {
  "btc": "bc1...",
  "xmr": null,
  "stx": null
}
```

Backend can derive `addresses` from the three columns so the frontend only deals with `addresses.btc`, `addresses.xmr`, `addresses.stx`.

---

## UI changes

- **Plan and beneficiary forms:** One field per network (Bitcoin, Monero, Stacks), or a small “Addresses” section with a tab or accordion per network. Labels: “Bitcoin (BTC) address”, “Monero (XMR) address”, “Stacks (STX) address”.
- **Copy:** “Copy Bitcoin address” / “Copy Monero address” / “Copy Stacks address” so it’s clear which chain.
- **Branding:** Consider a tagline like “Multi-chain estate planning” or “BTC, XMR, STX” so it’s clear the product supports more than Bitcoin.

---

## Implementation order (suggested)

1. **Schema (Option A):** Migration adding `monero_address` and `stacks_address` to `estate_plans` and `beneficiaries`; keep `bitcoin_address`.
2. **Domain & API:** Extend Rust structs and CRUD so all three are read/written; optionally expose `addresses: { btc, xmr, stx }` in JSON.
3. **Validation (optional but recommended):** Add format validation per network (BTC, then XMR, then STX) in the API; return 4xx with a clear message for invalid format.
4. **Frontend:** Add fields and labels for XMR and STX; network-aware copy; keep BTC as default/first.
5. **Docs & product:** Update PRODUCT_ROADMAP and any “Phase E” wallet section to say “multi-network (BTC, XMR, STX) address support”; note that Monero inheritance may later involve view keys / wallet recovery, and Stacks may involve Clarity contracts.

---

## Monero- and Stacks-specific notes

- **Monero:** Address storage is the minimum. Real inheritance/recovery often needs view keys or wallet files and possibly a separate “recovery instructions” or “view key” flow in a later phase. For “available on XMR” in the sense of “I can assign a Monero payout address to a beneficiary,” storing and displaying the address is sufficient.
- **Stacks:** Stacks is Bitcoin-secured; addresses are c32check. If you later integrate Clarity (e.g. estate contracts on Stacks), that would be a separate feature; the GitHub analysis already referenced a Stacks/Clarity estate-style project (oyin-da/Digital-Will-and-Testament-Vault) for inspiration.

---

## Summary

| Question | Answer |
|----------|--------|
| Can we support BTC, XMR, and STX in the same app? | Yes. Easiest path: add optional address columns (or a small normalized table) and network-aware UI and validation. |
| When to do it? | Can be part of current roadmap after “harden & deploy” (e.g. before or alongside Phase A), or folded into Phase E (wallet) when you add real wallet/balance features. |
| Breaking changes? | No. Keep `bitcoin_address`; add XMR and STX as optional. Existing clients can ignore new fields. |
| Risk / effort | Low for address storage + UI; medium if you add full per-network validation (need or implement small validators for XMR and STX). |

If you want to proceed, the next concrete step is a migration (Option A) plus domain/API changes for `monero_address` and `stacks_address`, then frontend fields and labels.
