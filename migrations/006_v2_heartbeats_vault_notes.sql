-- Legacy Vault v2: dead-man's-switch heartbeats, proof-of-life check-ins, and zero-knowledge encrypted vault notes

ALTER TABLE estate_plans
    ADD COLUMN IF NOT EXISTS heartbeat_interval_days INTEGER NOT NULL DEFAULT 90,
    ADD COLUMN IF NOT EXISTS last_checkin_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS grace_period_days INTEGER NOT NULL DEFAULT 14;

CREATE TABLE IF NOT EXISTS plan_checkins (
    id SERIAL PRIMARY KEY,
    estate_plan_id INTEGER NOT NULL REFERENCES estate_plans(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plan_checkins_plan_id ON plan_checkins(estate_plan_id, created_at DESC);

CREATE TABLE IF NOT EXISTS encrypted_vault_notes (
    id SERIAL PRIMARY KEY,
    estate_plan_id INTEGER NOT NULL REFERENCES estate_plans(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    ciphertext_b64 TEXT NOT NULL,
    iv_b64 VARCHAR(128) NOT NULL,
    salt_b64 VARCHAR(128) NOT NULL,
    kdf_iterations INTEGER NOT NULL DEFAULT 310000,
    algorithm VARCHAR(64) NOT NULL DEFAULT 'AES-256-GCM',
    hint TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_encrypted_vault_notes_plan_id ON encrypted_vault_notes(estate_plan_id);

DROP TRIGGER IF EXISTS encrypted_vault_notes_updated_at ON encrypted_vault_notes;
CREATE TRIGGER encrypted_vault_notes_updated_at
    BEFORE UPDATE ON encrypted_vault_notes
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
