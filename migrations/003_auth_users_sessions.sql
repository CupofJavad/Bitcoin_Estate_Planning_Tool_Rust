-- Auth: users and sessions (Phase A); role for Phase B
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    email_verified_at TIMESTAMPTZ,
    role VARCHAR(50) NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'executor', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

CREATE TABLE sessions (
    id UUID PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- Backfill: create system user (unusable password) and point existing estate_plans to it
INSERT INTO users (email, password_hash, name, role)
VALUES ('system@legacyvault.local', 'no-login', 'System', 'owner')
ON CONFLICT (email) DO NOTHING;

UPDATE estate_plans SET user_id = (SELECT id FROM users WHERE email = 'system@legacyvault.local') WHERE user_id = 0;

-- Add FK to users (after backfill)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'estate_plans_user_id_fkey'
    ) THEN
        ALTER TABLE estate_plans ADD CONSTRAINT estate_plans_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);
    END IF;
END $$;

-- Trigger for users.updated_at
CREATE TRIGGER users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
