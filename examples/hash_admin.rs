// One-off: print Argon2 hash for default admin password ("admin") for manual DB seed.
// Run: cargo run --example hash_admin
fn main() {
    let hash = estate_planning_rust::auth::hash_password("admin").expect("hash");
    println!("{}", hash);
}
