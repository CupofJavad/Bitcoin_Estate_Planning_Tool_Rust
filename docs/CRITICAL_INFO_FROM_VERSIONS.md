# Critical Information from Existing Versions

Short pointers to the three project versions and the MVP domain/API used for Estate_Planning_Rust.

## Version locations

- **bitcoin-estate-planning** – Full production variant (auth, chatbot, deploy). Use for feature reference and deploy patterns.
- **bitcoin-estate-planning-source** – Slim reference. **Source of truth for MVP:** domain models and API shape.
- **Estate_Management** – Canonical model and server layout; IAS/EPS/AWPS/BITS etc. Defer to post-MVP.

## MVP domain (from bitcoin-estate-planning-source)

- **EstatePlan:** id, user_id, name, description, bitcoin_address, is_active, created_at, updated_at. 1:N beneficiaries, 1:N timelock_policies.
- **Beneficiary:** id, estate_plan_id (FK CASCADE), name, email, bitcoin_address, allocation_percentage (0–100), created_at, updated_at.
- **TimelockPolicy:** id, estate_plan_id (FK CASCADE), name, description, timelock_blocks, trigger_condition (e.g. death, inactivity, manual), is_active, created_at, updated_at.

**Business rule:** Sum of `allocation_percentage` per estate_plan must be ≤ 100%.

## API shape (MVP)

- `GET /api/v1/estate-plans` – list all
- `GET /api/v1/estate-plans/:id` – get one with relations
- `POST /api/v1/estate-plans` – create
- `PATCH /api/v1/estate-plans/:id` – update
- `DELETE /api/v1/estate-plans/:id` – delete

Same pattern for `/api/v1/beneficiaries` and `/api/v1/timelock-policies`. Beneficiaries and timelock-policies support filter `?estate_plan_id=<id>`.

- `GET /health` – health check

MVP has no auth; all plans in one global pool.
