//! Production Prometheus metrics & HTTP request telemetry middleware.

use axum::{extract::Request, middleware::Next, response::Response};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::OnceLock;
use std::time::Instant;

struct MetricsState {
    started_at: Instant,
    requests_total: AtomicU64,
    requests_in_flight: AtomicU64,
    requests_4xx: AtomicU64,
    requests_5xx: AtomicU64,
    duration_ms_sum: AtomicU64,
}

static METRICS: OnceLock<MetricsState> = OnceLock::new();

fn state() -> &'static MetricsState {
    METRICS.get_or_init(|| MetricsState {
        started_at: Instant::now(),
        requests_total: AtomicU64::new(0),
        requests_in_flight: AtomicU64::new(0),
        requests_4xx: AtomicU64::new(0),
        requests_5xx: AtomicU64::new(0),
        duration_ms_sum: AtomicU64::new(0),
    })
}

pub fn uptime_secs() -> u64 {
    state().started_at.elapsed().as_secs()
}

pub async fn metrics_middleware(req: Request, next: Next) -> Response {
    let m = state();
    m.requests_in_flight.fetch_add(1, Ordering::Relaxed);
    let start = Instant::now();
    let res = next.run(req).await;
    let elapsed_ms = start.elapsed().as_millis() as u64;
    m.requests_in_flight.fetch_sub(1, Ordering::Relaxed);
    m.requests_total.fetch_add(1, Ordering::Relaxed);
    m.duration_ms_sum.fetch_add(elapsed_ms, Ordering::Relaxed);
    let status = res.status().as_u16();
    if (400..500).contains(&status) {
        m.requests_4xx.fetch_add(1, Ordering::Relaxed);
    } else if status >= 500 {
        m.requests_5xx.fetch_add(1, Ordering::Relaxed);
    }
    res
}

pub fn render_prometheus(
    pool_size: u32,
    pool_idle: usize,
    estate_plans_total: i64,
    active_sessions_total: i64,
    vault_notes_total: i64,
) -> String {
    let m = state();
    let total = m.requests_total.load(Ordering::Relaxed);
    let in_flight = m.requests_in_flight.load(Ordering::Relaxed);
    let r4xx = m.requests_4xx.load(Ordering::Relaxed);
    let r5xx = m.requests_5xx.load(Ordering::Relaxed);
    let dur_ms = m.duration_ms_sum.load(Ordering::Relaxed);
    let uptime = uptime_secs();

    format!(
        "# HELP legacy_vault_uptime_seconds Process uptime in seconds\n\
# TYPE legacy_vault_uptime_seconds gauge\n\
legacy_vault_uptime_seconds {uptime}\n\
# HELP legacy_vault_http_requests_total Total HTTP requests handled\n\
# TYPE legacy_vault_http_requests_total counter\n\
legacy_vault_http_requests_total {total}\n\
# HELP legacy_vault_http_requests_in_flight Current in-flight HTTP requests\n\
# TYPE legacy_vault_http_requests_in_flight gauge\n\
legacy_vault_http_requests_in_flight {in_flight}\n\
# HELP legacy_vault_http_requests_4xx_total Total 4xx HTTP responses\n\
# TYPE legacy_vault_http_requests_4xx_total counter\n\
legacy_vault_http_requests_4xx_total {r4xx}\n\
# HELP legacy_vault_http_requests_5xx_total Total 5xx HTTP responses\n\
# TYPE legacy_vault_http_requests_5xx_total counter\n\
legacy_vault_http_requests_5xx_total {r5xx}\n\
# HELP legacy_vault_http_request_duration_ms_sum Cumulative HTTP response latency in ms\n\
# TYPE legacy_vault_http_request_duration_ms_sum counter\n\
legacy_vault_http_request_duration_ms_sum {dur_ms}\n\
# HELP legacy_vault_db_pool_connections Current SQLx pool connections\n\
# TYPE legacy_vault_db_pool_connections gauge\n\
legacy_vault_db_pool_connections {pool_size}\n\
# HELP legacy_vault_db_pool_idle_connections Idle SQLx pool connections\n\
# TYPE legacy_vault_db_pool_idle_connections gauge\n\
legacy_vault_db_pool_idle_connections {pool_idle}\n\
# HELP legacy_vault_estate_plans_total Total estate plans stored\n\
# TYPE legacy_vault_estate_plans_total gauge\n\
legacy_vault_estate_plans_total {estate_plans_total}\n\
# HELP legacy_vault_active_sessions_total Active non-expired user sessions\n\
# TYPE legacy_vault_active_sessions_total gauge\n\
legacy_vault_active_sessions_total {active_sessions_total}\n\
# HELP legacy_vault_encrypted_notes_total Total zero-knowledge encrypted vault notes\n\
# TYPE legacy_vault_encrypted_notes_total gauge\n\
legacy_vault_encrypted_notes_total {vault_notes_total}\n"
    )
}
