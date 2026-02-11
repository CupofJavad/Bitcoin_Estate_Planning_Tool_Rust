//! In-memory per-IP rate limit for auth endpoints (login, register).
//! GTM Phase A: limit brute-force and DoS on auth.

use axum::{
    body::Body,
    extract::Request,
    http::StatusCode,
    middleware::Next,
    response::{IntoResponse, Response},
};
use std::collections::HashMap;
use std::sync::{Mutex, OnceLock};
use std::time::Instant;

static STORE: OnceLock<std::sync::Arc<RateLimitStore>> = OnceLock::new();

/// Call once from api::router when building the app to set the rate limit store.
pub fn init_store(store: std::sync::Arc<RateLimitStore>) {
    let _ = STORE.set(store);
}

const AUTH_RATE_WINDOW_SECS: u64 = 60;
const AUTH_RATE_MAX_PER_WINDOW: u32 = 10;

/// In-memory store: IP -> (window start, request count).
pub struct RateLimitStore {
    window_secs: u64,
    max_per_window: u32,
    map: Mutex<HashMap<String, (Instant, u32)>>,
}

impl Default for RateLimitStore {
    fn default() -> Self {
        let max_per_window = std::env::var("RATE_LIMIT_MAX")
            .ok()
            .and_then(|s| s.parse().ok())
            .unwrap_or(AUTH_RATE_MAX_PER_WINDOW);
        Self {
            window_secs: AUTH_RATE_WINDOW_SECS,
            max_per_window,
            map: Mutex::new(HashMap::new()),
        }
    }
}

impl RateLimitStore {
    /// Returns true if the request is allowed, false if rate limited.
    pub fn check(&self, key: &str) -> bool {
        let mut map = self.map.lock().expect("rate limit lock");
        let now = Instant::now();
        map.retain(|_, (t, _)| now.duration_since(*t).as_secs() < self.window_secs);
        let (start, count) = map.entry(key.to_string()).or_insert((now, 0));
        if now.duration_since(*start).as_secs() >= self.window_secs {
            *start = now;
            *count = 0;
        }
        *count += 1;
        *count <= self.max_per_window
    }
}

/// Extracts client IP from common headers (proxy). Falls back to "unknown" if none.
fn client_ip_from_headers(headers: &axum::http::HeaderMap) -> String {
    if let Some(v) = headers.get("x-forwarded-for") {
        if let Ok(s) = v.to_str() {
            return s
                .split(',')
                .next()
                .map(|s| s.trim().to_string())
                .unwrap_or_else(|| "unknown".to_string());
        }
    }
    if let Some(v) = headers.get("x-real-ip") {
        if let Ok(s) = v.to_str() {
            return s.trim().to_string();
        }
    }
    "unknown".to_string()
}

fn get_store() -> &'static std::sync::Arc<RateLimitStore> {
    STORE.get().expect("rate_limit::init_store called in api::router")
}

/// Axum middleware: rate limit by client IP; return 429 if over limit.
pub async fn auth_rate_limit_middleware(request: Request, next: Next) -> Response {
    let store = get_store();
    let key = client_ip_from_headers(request.headers());
    if !store.check(&key) {
        return (
            StatusCode::TOO_MANY_REQUESTS,
            Body::from("Too many requests. Try again later."),
        )
            .into_response();
    }
    next.run(request).await
}
