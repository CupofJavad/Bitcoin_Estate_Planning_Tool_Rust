-- Estate plans (user_id = 0 for MVP single-user)
CREATE TABLE estate_plans (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL DEFAULT 0,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    bitcoin_address VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_estate_plans_user_id ON estate_plans(user_id);

-- Beneficiaries
CREATE TABLE beneficiaries (
    id SERIAL PRIMARY KEY,
    estate_plan_id INTEGER NOT NULL REFERENCES estate_plans(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    bitcoin_address VARCHAR(255),
    allocation_percentage NUMERIC(5,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_beneficiaries_estate_plan_id ON beneficiaries(estate_plan_id);

-- Timelock policies
CREATE TABLE timelock_policies (
    id SERIAL PRIMARY KEY,
    estate_plan_id INTEGER NOT NULL REFERENCES estate_plans(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    timelock_blocks INTEGER NOT NULL,
    trigger_condition VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_timelock_policies_estate_plan_id ON timelock_policies(estate_plan_id);

-- Updated_at trigger helper
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER estate_plans_updated_at
    BEFORE UPDATE ON estate_plans
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
CREATE TRIGGER beneficiaries_updated_at
    BEFORE UPDATE ON beneficiaries
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
CREATE TRIGGER timelock_policies_updated_at
    BEFORE UPDATE ON timelock_policies
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
