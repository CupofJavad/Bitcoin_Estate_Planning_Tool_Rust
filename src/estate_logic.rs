//! Estate readiness scoring, dead-man's-switch heartbeat calculation, and verifiable heir inheritance packets.

use chrono::{Duration, Utc};
use sha2::{Digest, Sha256};

use crate::crypto::{build_timelock_descriptor, validate_address, TimelockDescriptorRequest};
use crate::domain::{
    Beneficiary, EncryptedVaultNote, EstatePlan, HeartbeatStatus, InheritancePacket,
    InheritancePacketPolicy, PlanCheckin, ReadinessCheckItem, ReadinessReport, TimelockPolicy,
};

/// Compute the dead-man's-switch heartbeat countdown and status for an estate plan.
pub fn compute_heartbeat_status(plan: &EstatePlan) -> HeartbeatStatus {
    let now = Utc::now();
    let interval_days = plan.heartbeat_interval_days.max(1);
    let grace_days = plan.grace_period_days.max(1);
    let next_due_at = plan.last_checkin_at + Duration::days(i64::from(interval_days));
    let grace_ends_at = next_due_at + Duration::days(i64::from(grace_days));

    let total_secs = (i64::from(interval_days) * 86_400).max(1) as f64;
    let elapsed_secs = (now - plan.last_checkin_at).num_seconds().max(0) as f64;
    let progress_percent = ((elapsed_secs / total_secs) * 100.0).clamp(0.0, 100.0);

    let days_remaining = (next_due_at - now).num_days();
    let status = if now >= grace_ends_at {
        "triggered"
    } else if now >= next_due_at {
        "grace_period"
    } else if days_remaining <= 14 {
        "due_soon"
    } else {
        "healthy"
    };

    HeartbeatStatus {
        status: status.to_string(),
        heartbeat_interval_days: interval_days,
        grace_period_days: grace_days,
        last_checkin_at: plan.last_checkin_at,
        next_due_at,
        grace_ends_at,
        days_remaining,
        progress_percent: (progress_percent * 10.0).round() / 10.0,
    }
}

fn non_empty(opt: &Option<String>) -> Option<&str> {
    opt.as_deref().map(str::trim).filter(|s| !s.is_empty())
}

/// Evaluate an estate plan across 6 security & operational criteria (0-100 score).
pub fn compute_readiness_report(
    plan: &EstatePlan,
    beneficiaries: &[Beneficiary],
    policies: &[TimelockPolicy],
    vault_notes_count: i64,
) -> ReadinessReport {
    let mut checks = Vec::with_capacity(6);

    // 1. Source vault addresses (20 pts)
    let mut configured = 0usize;
    let mut verified = 0usize;
    for (chain, opt) in [
        ("btc", &plan.bitcoin_address),
        ("xmr", &plan.monero_address),
        ("stx", &plan.stacks_address),
    ] {
        if let Some(addr) = non_empty(opt) {
            configured += 1;
            if validate_address(chain, addr).valid {
                verified += 1;
            }
        }
    }
    let (addr_pts, addr_status, addr_detail) = if configured == 0 {
        (
            0,
            "fail",
            "Add at least one Bitcoin, Monero, or Stacks vault address".to_string(),
        )
    } else if verified == configured {
        (
            20,
            "pass",
            format!("{verified}/{configured} vault address(es) passed cryptographic checksum verification"),
        )
    } else {
        (
            10,
            "warn",
            format!(
                "{verified}/{configured} vault address(es) verified; review unverified address formatting"
            ),
        )
    };
    checks.push(ReadinessCheckItem {
        key: "vault_addresses".to_string(),
        label: "Cryptographically Verified Vault Addresses".to_string(),
        status: addr_status.to_string(),
        points: addr_pts,
        max_points: 20,
        detail: addr_detail,
    });

    // 2. Beneficiary allocation completeness (20 pts)
    let total_alloc: f64 = beneficiaries.iter().map(|b| b.allocation_percentage).sum();
    let (alloc_pts, alloc_status, alloc_detail) = if beneficiaries.is_empty() {
        (0, "fail", "No beneficiaries designated yet".to_string())
    } else if (total_alloc - 100.0).abs() < 0.01 {
        (
            20,
            "pass",
            format!(
                "100% allocated across {} beneficiary(ies)",
                beneficiaries.len()
            ),
        )
    } else {
        (
            10,
            "warn",
            format!(
                "{total_alloc:.2}% allocated ({:.2}% unallocated remaining)",
                (100.0 - total_alloc).max(0.0)
            ),
        )
    };
    checks.push(ReadinessCheckItem {
        key: "beneficiary_allocations".to_string(),
        label: "100% Beneficiary Allocation".to_string(),
        status: alloc_status.to_string(),
        points: alloc_pts,
        max_points: 20,
        detail: alloc_detail,
    });

    // 3. Beneficiary payout addresses (15 pts)
    let with_payout = beneficiaries
        .iter()
        .filter(|b| {
            non_empty(&b.bitcoin_address).is_some()
                || non_empty(&b.monero_address).is_some()
                || non_empty(&b.stacks_address).is_some()
        })
        .count();
    let (ben_addr_pts, ben_addr_status, ben_addr_detail) = if beneficiaries.is_empty() {
        (
            0,
            "fail",
            "Add beneficiaries with payout addresses".to_string(),
        )
    } else if with_payout == beneficiaries.len() {
        (
            15,
            "pass",
            format!(
                "All {} beneficiary(ies) have payout destinations",
                beneficiaries.len()
            ),
        )
    } else {
        (
            7,
            "warn",
            format!(
                "{with_payout}/{} beneficiary(ies) have a crypto payout address",
                beneficiaries.len()
            ),
        )
    };
    checks.push(ReadinessCheckItem {
        key: "beneficiary_addresses".to_string(),
        label: "Heir Payout Destinations".to_string(),
        status: ben_addr_status.to_string(),
        points: ben_addr_pts,
        max_points: 15,
        detail: ben_addr_detail,
    });

    // 4. Active Timelock Policy (20 pts)
    let active_policies = policies.iter().filter(|p| p.is_active).count();
    let (tl_pts, tl_status, tl_detail) = if active_policies > 0 {
        (
            20,
            "pass",
            format!("{active_policies} active timelock policy(ies) configured"),
        )
    } else if !policies.is_empty() {
        (
            8,
            "warn",
            "Timelock policies exist but none are currently active".to_string(),
        )
    } else {
        (
            0,
            "fail",
            "Configure at least one Bitcoin CSV/CLTV timelock policy".to_string(),
        )
    };
    checks.push(ReadinessCheckItem {
        key: "timelock_policy".to_string(),
        label: "Active Timelock Policy".to_string(),
        status: tl_status.to_string(),
        points: tl_pts,
        max_points: 20,
        detail: tl_detail,
    });

    // 5. Heartbeat / Proof-of-Life Health (15 pts)
    let hb = compute_heartbeat_status(plan);
    let (hb_pts, hb_status, hb_detail) = match hb.status.as_str() {
        "healthy" => (
            15,
            "pass",
            format!("Healthy — next check-in due in {} days", hb.days_remaining),
        ),
        "due_soon" => (
            10,
            "warn",
            format!("Check-in due soon ({} days remaining)", hb.days_remaining),
        ),
        "grace_period" => (
            5,
            "warn",
            "In grace period — complete proof-of-life check-in immediately".to_string(),
        ),
        _ => (
            0,
            "fail",
            "Heartbeat expired — dead-man's-switch window triggered".to_string(),
        ),
    };
    checks.push(ReadinessCheckItem {
        key: "heartbeat".to_string(),
        label: "Proof-of-Life Heartbeat".to_string(),
        status: hb_status.to_string(),
        points: hb_pts,
        max_points: 15,
        detail: hb_detail,
    });

    // 6. Zero-Knowledge Vault Notes (10 pts)
    let (zk_pts, zk_status, zk_detail) = if vault_notes_count > 0 {
        (
            10,
            "pass",
            format!("{vault_notes_count} client-side AES-256-GCM encrypted dossier note(s) stored"),
        )
    } else {
        (
            0,
            "warn",
            "Optional: store encrypted hardware wallet locations or heir instructions".to_string(),
        )
    };
    checks.push(ReadinessCheckItem {
        key: "zk_vault_notes".to_string(),
        label: "Zero-Knowledge Heir Instructions".to_string(),
        status: zk_status.to_string(),
        points: zk_pts,
        max_points: 10,
        detail: zk_detail,
    });

    let score: u8 = checks.iter().map(|c| c.points).sum();
    let grade = match score {
        90..=100 => "A+",
        80..=89 => "A",
        70..=79 => "B",
        55..=69 => "C",
        _ => "D",
    }
    .to_string();

    ReadinessReport {
        score,
        grade,
        checks,
    }
}

/// Generate a verifiable Heir Inheritance Packet containing BIP-380 descriptors & SHA-256 digest.
pub fn build_inheritance_packet(
    plan: EstatePlan,
    beneficiaries: Vec<Beneficiary>,
    policies: Vec<TimelockPolicy>,
    encrypted_vault_notes: Vec<EncryptedVaultNote>,
    recent_checkins: Vec<PlanCheckin>,
) -> InheritancePacket {
    let heartbeat = compute_heartbeat_status(&plan);
    let readiness = compute_readiness_report(
        &plan,
        &beneficiaries,
        &policies,
        encrypted_vault_notes.len() as i64,
    );

    let owner_key = plan
        .bitcoin_address
        .clone()
        .filter(|s| !s.trim().is_empty())
        .map(|a| format!("OWNER_KEY_FOR({a})"));
    let heir_keys: Vec<String> = beneficiaries
        .iter()
        .enumerate()
        .map(|(i, b)| {
            let safe = b
                .name
                .chars()
                .filter(|c| c.is_ascii_alphanumeric())
                .collect::<String>();
            if safe.is_empty() {
                format!("HEIR_{}_XPUB/0/*", i + 1)
            } else {
                format!("HEIR_{}_XPUB/0/*", safe.to_uppercase())
            }
        })
        .collect();

    let packet_policies: Vec<InheritancePacketPolicy> = policies
        .into_iter()
        .map(|policy| {
            let lock_mode = match policy.trigger_condition.as_deref() {
                Some("date") => "cltv",
                _ => "csv",
            };
            let descriptor = build_timelock_descriptor(&TimelockDescriptorRequest {
                owner_key: owner_key.clone(),
                heir_keys: heir_keys.clone(),
                heir_threshold: 1,
                timelock_blocks: policy.timelock_blocks.max(1) as u32,
                lock_mode: lock_mode.to_string(),
                network: "mainnet".to_string(),
            });
            InheritancePacketPolicy { policy, descriptor }
        })
        .collect();

    let heir_instructions = vec![
        "1. Verify packet integrity: compute SHA-256 over the packet JSON (with integrity_sha256 cleared) or confirm against the owner's recorded digest.".to_string(),
        "2. Confirm proof-of-life status: wait until both the heartbeat interval and grace period have elapsed without an owner check-in.".to_string(),
        "3. Decrypt Zero-Knowledge Vault Notes locally in Legacy Vault (or offline with WebCrypto PBKDF2-SHA256 + AES-256-GCM) using the separately shared family passphrase.".to_string(),
        "4. If Shamir Secret Sharing (M-of-N) shards were issued, convene at least M custodians to reconstruct the master seed offline using the Key Sharding tool.".to_string(),
        "5. For Bitcoin timelocked vaults, import the BIP-380 output descriptor into Sparrow Wallet or Liana and broadcast the heir recovery PSBT once the block timelock matures.".to_string(),
        "6. Distribute funds strictly according to the beneficiary percentage allocations listed in this dossier across BTC, XMR, and STX.".to_string(),
    ];

    let generated_at = Utc::now();
    let mut packet = InheritancePacket {
        schema_version: "legacy-vault.inheritance-packet.v2".to_string(),
        generated_at,
        integrity_sha256: String::new(),
        plan,
        heartbeat,
        readiness,
        beneficiaries,
        timelock_policies: packet_policies,
        encrypted_vault_notes,
        recent_checkins,
        heir_instructions,
    };

    let serialized = serde_json::to_vec(&packet).unwrap_or_default();
    let digest = Sha256::digest(&serialized);
    packet.integrity_sha256 = digest.iter().map(|b| format!("{b:02x}")).collect();
    packet
}
