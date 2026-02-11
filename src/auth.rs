//! Auth helpers: password hashing and session cookie name.

use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};

pub const SESSION_COOKIE_NAME: &str = "session_id";
pub const SESSION_DURATION_DAYS: i64 = 14;

/// Hash a password for storage. Never log the password.
pub fn hash_password(password: &str) -> Result<String, argon2::password_hash::Error> {
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let hash = argon2.hash_password(password.as_bytes(), &salt)?;
    Ok(hash.to_string())
}

/// Verify a password against a stored hash.
pub fn verify_password(password: &str, stored_hash: &str) -> Result<bool, argon2::password_hash::Error> {
    let parsed = PasswordHash::new(stored_hash)?;
    Ok(Argon2::default()
        .verify_password(password.as_bytes(), &parsed)
        .is_ok())
}
