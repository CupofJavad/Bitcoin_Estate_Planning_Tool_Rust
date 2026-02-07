# Build stage
FROM rust:1-bookworm AS builder
WORKDIR /app

# Copy manifests and source
COPY Cargo.toml Cargo.lock ./
COPY src ./src
COPY migrations ./migrations
COPY build.rs ./

# Build release binary
RUN cargo build --release

# Runtime stage
FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y ca-certificates libssl3 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /app/target/release/estate_planning_rust /app/estate_planning_rust
COPY migrations ./migrations

# Default env (override at run)
ENV API_HOST=0.0.0.0
ENV API_PORT=8000

EXPOSE 8000
ENTRYPOINT ["/app/estate_planning_rust"]
