# syntax=docker/dockerfile:1

# ---- Build Stage ----
FROM rust:1-bookworm AS builder
WORKDIR /app

# Cache dependencies first
COPY Cargo.toml Cargo.lock build.rs ./
RUN mkdir -p src && echo "fn main() {}" > src/main.rs && echo "" > src/lib.rs \
    && cargo build --release \
    && rm -rf src

# Copy full source & migrations and compile release binary
COPY src ./src
COPY migrations ./migrations
RUN touch src/main.rs src/lib.rs \
    && cargo build --release --locked \
    && strip /app/target/release/estate_planning_rust

# ---- Hardened Runtime Stage ----
FROM debian:bookworm-slim
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates libssl3 curl \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --system --uid 10001 --no-create-home --shell /usr/sbin/nologin appuser

WORKDIR /app
COPY --from=builder /app/target/release/estate_planning_rust /app/estate_planning_rust
COPY --from=builder /app/migrations /app/migrations
RUN chown -R appuser:appuser /app

ENV API_HOST=0.0.0.0 \
    API_PORT=8000 \
    LOG_TO_FILE=false \
    NO_COLOR=1 \
    RUST_LOG=estate_planning_rust=info,tower_http=info,warn

USER 10001
EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -fsS http://127.0.0.1:8000/ready >/dev/null || exit 1

ENTRYPOINT ["/app/estate_planning_rust"]
