-- Multi-network support: Monero (XMR) and Stacks (STX) addresses
-- Keeps existing bitcoin_address; new columns nullable for backward compatibility.

ALTER TABLE estate_plans
  ADD COLUMN IF NOT EXISTS monero_address VARCHAR(255),
  ADD COLUMN IF NOT EXISTS stacks_address VARCHAR(255);

ALTER TABLE beneficiaries
  ADD COLUMN IF NOT EXISTS monero_address VARCHAR(255),
  ADD COLUMN IF NOT EXISTS stacks_address VARCHAR(255);
