//! Multi-chain cryptographic primitives for Legacy Vault:
//! - Bitcoin (BTC): Bech32 (BIP-173), Bech32m (BIP-350), Base58Check (P2PKH / P2SH)
//! - Monero (XMR): CryptoNote Base58 block decoding + Keccak-256 checksum verification
//! - Stacks (STX): c32check (SIP-005) with double-SHA256 checksum verification
//! - Bitcoin Timelock / Miniscript Policy & BIP-380 Output Descriptor Generator

use chrono::{Duration, Utc};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct AddressValidationResult {
    pub valid: bool,
    pub chain: String,
    pub network: Option<String>,
    pub address_type: Option<String>,
    pub checksum_verified: bool,
    pub message: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ValidateAddressRequest {
    pub chain: String,
    pub address: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct TimelockDescriptorRequest {
    #[serde(default)]
    pub owner_key: Option<String>,
    #[serde(default)]
    pub heir_keys: Vec<String>,
    #[serde(default = "default_threshold")]
    pub heir_threshold: usize,
    pub timelock_blocks: u32,
    #[serde(default = "default_lock_mode")]
    pub lock_mode: String, // "csv" (relative) or "cltv" (absolute block height)
    #[serde(default = "default_network")]
    pub network: String, // "mainnet" or "testnet"
}

fn default_threshold() -> usize {
    1
}

fn default_lock_mode() -> String {
    "csv".to_string()
}

fn default_network() -> String {
    "mainnet".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimelockDescriptorResponse {
    pub policy: String,
    pub wsh_descriptor: String,
    pub taproot_descriptor: String,
    pub script_asm: String,
    pub lock_mode: String,
    pub timelock_blocks: u32,
    pub estimated_days: f64,
    pub estimated_unlock_at: String,
    pub estimated_witness_vbytes: u32,
    pub network: String,
    pub recovery_steps: Vec<String>,
}

/// Dispatch validation by chain identifier ("btc"/"bitcoin", "xmr"/"monero", "stx"/"stacks").
pub fn validate_address(chain: &str, raw: &str) -> AddressValidationResult {
    let address = raw.trim();
    let chain_norm = chain.trim().to_lowercase();
    if address.is_empty() {
        return AddressValidationResult {
            valid: false,
            chain: chain_norm,
            network: None,
            address_type: None,
            checksum_verified: false,
            message: "Address is empty".to_string(),
        };
    }

    match chain_norm.as_str() {
        "btc" | "bitcoin" => validate_bitcoin_address(address),
        "xmr" | "monero" => validate_monero_address(address),
        "stx" | "stacks" => validate_stacks_address(address),
        other => AddressValidationResult {
            valid: false,
            chain: other.to_string(),
            network: None,
            address_type: None,
            checksum_verified: false,
            message: format!("Unsupported chain '{other}'. Supported: btc, xmr, stx"),
        },
    }
}

// ============================================================================
// Bitcoin: Bech32 (BIP-173), Bech32m (BIP-350), and Base58Check
// ============================================================================

const BECH32_CHARSET: &[u8] = b"qpzry9x8gf2tvdw0s3jn54khce6mua7l";
const BECH32_CONST: u32 = 1;
const BECH32M_CONST: u32 = 0x2bc830a3;

fn bech32_polymod(values: &[u8]) -> u32 {
    const GEN: [u32; 5] = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
    let mut chk: u32 = 1;
    for &v in values {
        let top = chk >> 25;
        chk = ((chk & 0x1ff_ffff) << 5) ^ u32::from(v);
        for (i, &g) in GEN.iter().enumerate() {
            if (top >> i) & 1 != 0 {
                chk ^= g;
            }
        }
    }
    chk
}

fn bech32_hrp_expand(hrp: &str) -> Vec<u8> {
    let mut ret = Vec::with_capacity(hrp.len() * 2 + 1);
    for b in hrp.bytes() {
        ret.push(b >> 5);
    }
    ret.push(0);
    for b in hrp.bytes() {
        ret.push(b & 31);
    }
    ret
}

fn convert_bits(data: &[u8], from_bits: u32, to_bits: u32, pad: bool) -> Option<Vec<u8>> {
    let mut acc: u32 = 0;
    let mut bits: u32 = 0;
    let mut ret = Vec::new();
    let maxv: u32 = (1 << to_bits) - 1;
    for &value in data {
        let v = u32::from(value);
        if (v >> from_bits) != 0 {
            return None;
        }
        acc = (acc << from_bits) | v;
        bits += from_bits;
        while bits >= to_bits {
            bits -= to_bits;
            ret.push(((acc >> bits) & maxv) as u8);
        }
    }
    if pad {
        if bits > 0 {
            ret.push(((acc << (to_bits - bits)) & maxv) as u8);
        }
    } else if bits >= from_bits || ((acc << (to_bits - bits)) & maxv) != 0 {
        return None;
    }
    Some(ret)
}

fn validate_bech32_bitcoin(addr: &str) -> AddressValidationResult {
    let has_lower = addr.bytes().any(|b| b.is_ascii_lowercase());
    let has_upper = addr.bytes().any(|b| b.is_ascii_uppercase());
    if has_lower && has_upper {
        return invalid_btc("Mixed case is forbidden in Bech32/Bech32m addresses");
    }
    let lower = addr.to_ascii_lowercase();
    if lower.len() < 14 || lower.len() > 90 {
        return invalid_btc("Invalid Bech32 address length");
    }
    let Some(pos) = lower.rfind('1') else {
        return invalid_btc("Missing Bech32 separator '1'");
    };
    let hrp = &lower[..pos];
    let data_str = &lower[pos + 1..];
    if data_str.len() < 7 {
        return invalid_btc("Bech32 payload too short");
    }
    let network = match hrp {
        "bc" => "mainnet",
        "tb" => "testnet",
        "bcrt" => "regtest",
        _ => return invalid_btc("Unrecognized Bitcoin Bech32 HRP (expected bc, tb, or bcrt)"),
    };

    let mut data = Vec::with_capacity(data_str.len());
    for b in data_str.bytes() {
        let Some(idx) = BECH32_CHARSET.iter().position(|&c| c == b) else {
            return invalid_btc("Invalid character in Bech32 payload");
        };
        data.push(idx as u8);
    }

    let mut expanded = bech32_hrp_expand(hrp);
    expanded.extend_from_slice(&data);
    let polymod = bech32_polymod(&expanded);
    let is_bech32 = polymod == BECH32_CONST;
    let is_bech32m = polymod == BECH32M_CONST;
    if !is_bech32 && !is_bech32m {
        return invalid_btc("Bech32/Bech32m checksum verification failed");
    }

    let witness_version = data[0];
    if witness_version > 16 {
        return invalid_btc("Invalid SegWit witness version");
    }
    if witness_version == 0 && !is_bech32 {
        return invalid_btc("SegWit v0 addresses must use Bech32 checksum (BIP-173)");
    }
    if witness_version >= 1 && !is_bech32m {
        return invalid_btc("SegWit v1+ (Taproot) addresses must use Bech32m checksum (BIP-350)");
    }

    let Some(program) = convert_bits(&data[1..data.len() - 6], 5, 8, false) else {
        return invalid_btc("Invalid 5-to-8 bit witness program encoding");
    };
    if program.len() < 2 || program.len() > 40 {
        return invalid_btc("Invalid witness program length");
    }

    let addr_type = match (witness_version, program.len()) {
        (0, 20) => "P2WPKH (Native SegWit)",
        (0, 32) => "P2WSH (SegWit Script / Multisig)",
        (0, _) => return invalid_btc("SegWit v0 program must be 20 or 32 bytes"),
        (1, 32) => "P2TR (Taproot)",
        (v, _) => return invalid_btc(&format!("Unsupported witness v{v} program length")),
    };

    AddressValidationResult {
        valid: true,
        chain: "btc".to_string(),
        network: Some(network.to_string()),
        address_type: Some(addr_type.to_string()),
        checksum_verified: true,
        message: format!("Valid Bitcoin {network} {addr_type} address"),
    }
}

const BASE58_ALPHABET: &[u8] = b"123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

fn base58_decode(input: &str) -> Option<Vec<u8>> {
    let mut zeros = 0usize;
    for b in input.bytes() {
        if b == b'1' {
            zeros += 1;
        } else {
            break;
        }
    }
    let mut bytes: Vec<u8> = Vec::new();
    for b in input.bytes() {
        let mut carry = BASE58_ALPHABET.iter().position(|&c| c == b)? as u32;
        for byte in bytes.iter_mut().rev() {
            carry += u32::from(*byte) * 58;
            *byte = (carry & 0xff) as u8;
            carry >>= 8;
        }
        while carry > 0 {
            bytes.insert(0, (carry & 0xff) as u8);
            carry >>= 8;
        }
    }
    let mut out = vec![0u8; zeros];
    out.extend_from_slice(&bytes);
    Some(out)
}

fn sha256d(data: &[u8]) -> [u8; 32] {
    let first = Sha256::digest(data);
    let second = Sha256::digest(first);
    let mut out = [0u8; 32];
    out.copy_from_slice(&second);
    out
}

fn validate_base58_bitcoin(addr: &str) -> AddressValidationResult {
    if addr.len() < 26 || addr.len() > 35 {
        return invalid_btc("Invalid Base58 Bitcoin address length");
    }
    let Some(decoded) = base58_decode(addr) else {
        return invalid_btc("Invalid Base58 characters in Bitcoin address");
    };
    if decoded.len() != 25 {
        return invalid_btc("Decoded Base58Check payload must be 25 bytes");
    }
    let checksum = sha256d(&decoded[..21]);
    if checksum[..4] != decoded[21..25] {
        return invalid_btc("Base58Check double-SHA256 checksum failed");
    }
    let (network, addr_type) = match decoded[0] {
        0x00 => ("mainnet", "P2PKH (Legacy)"),
        0x05 => ("mainnet", "P2SH (Script Hash)"),
        0x6f => ("testnet", "P2PKH (Legacy Testnet)"),
        0xc4 => ("testnet", "P2SH (Testnet Script Hash)"),
        v => return invalid_btc(&format!("Unknown Bitcoin Base58 version byte 0x{v:02x}")),
    };
    AddressValidationResult {
        valid: true,
        chain: "btc".to_string(),
        network: Some(network.to_string()),
        address_type: Some(addr_type.to_string()),
        checksum_verified: true,
        message: format!("Valid Bitcoin {network} {addr_type} address"),
    }
}

pub fn validate_bitcoin_address(addr: &str) -> AddressValidationResult {
    let lower = addr.to_ascii_lowercase();
    if lower.starts_with("bc1") || lower.starts_with("tb1") || lower.starts_with("bcrt1") {
        validate_bech32_bitcoin(addr)
    } else {
        validate_base58_bitcoin(addr)
    }
}

fn invalid_btc(msg: &str) -> AddressValidationResult {
    AddressValidationResult {
        valid: false,
        chain: "btc".to_string(),
        network: None,
        address_type: None,
        checksum_verified: false,
        message: msg.to_string(),
    }
}

// ============================================================================
// Monero (XMR): CryptoNote Base58 Block Decoding + Keccak-256 Checksum
// ============================================================================

fn keccak256(input: &[u8]) -> [u8; 32] {
    const RC: [u64; 24] = [
        0x0000_0000_0000_0001,
        0x0000_0000_0000_8082,
        0x8000_0000_0000_808a,
        0x8000_0000_8000_8000,
        0x0000_0000_0000_808b,
        0x0000_0000_8000_0001,
        0x8000_0000_8000_8081,
        0x8000_0000_0000_8009,
        0x0000_0000_0000_008a,
        0x0000_0000_0000_0088,
        0x0000_0000_8000_8009,
        0x0000_0000_8000_000a,
        0x0000_0000_8000_808b,
        0x8000_0000_0000_008b,
        0x8000_0000_0000_8089,
        0x8000_0000_0000_8003,
        0x8000_0000_0000_8002,
        0x8000_0000_0000_0080,
        0x0000_0000_0000_800a,
        0x8000_0000_8000_000a,
        0x8000_0000_8000_8081,
        0x8000_0000_0000_8080,
        0x0000_0000_8000_0001,
        0x8000_0000_8000_8008,
    ];
    const RHO: [u32; 25] = [
        0, 1, 62, 28, 27, 36, 44, 6, 55, 20, 3, 10, 43, 25, 39, 41, 45, 15, 21, 8, 18, 2, 61, 56,
        14,
    ];

    let mut state = [0u64; 25];
    let rate = 136usize;
    let mut padded = input.to_vec();
    padded.push(0x01); // Keccak padding (NOT SHA3 0x06)
    while !padded.len().is_multiple_of(rate) {
        padded.push(0x00);
    }
    if let Some(last) = padded.last_mut() {
        *last |= 0x80;
    }

    for chunk in padded.chunks_exact(rate) {
        for (i, lane) in chunk.as_chunks::<8>().0.iter().enumerate() {
            state[i] ^= u64::from_le_bytes(*lane);
        }
        for &rc in &RC {
            let mut c = [0u64; 5];
            for x in 0..5 {
                c[x] = state[x] ^ state[x + 5] ^ state[x + 10] ^ state[x + 15] ^ state[x + 20];
            }
            for x in 0..5 {
                let d = c[(x + 4) % 5] ^ c[(x + 1) % 5].rotate_left(1);
                for y in 0..5 {
                    state[x + 5 * y] ^= d;
                }
            }
            let mut b = [0u64; 25];
            for y in 0..5 {
                for x in 0..5 {
                    let src = x + 5 * y;
                    let dst = y + 5 * ((2 * x + 3 * y) % 5);
                    b[dst] = state[src].rotate_left(RHO[src]);
                }
            }
            for y in 0..5 {
                let row = y * 5;
                for x in 0..5 {
                    state[row + x] =
                        b[row + x] ^ ((!b[row + ((x + 1) % 5)]) & b[row + ((x + 2) % 5)]);
                }
            }
            state[0] ^= rc;
        }
    }

    let mut out = [0u8; 32];
    for i in 0..4 {
        out[i * 8..(i + 1) * 8].copy_from_slice(&state[i].to_le_bytes());
    }
    out
}

fn monero_decode_block(block: &[u8], out_len: usize) -> Option<Vec<u8>> {
    let mut num: u128 = 0;
    for &ch in block {
        let idx = BASE58_ALPHABET.iter().position(|&c| c == ch)? as u128;
        num = num.checked_mul(58)?.checked_add(idx)?;
    }
    if out_len < 16 && num >= (1u128 << (out_len * 8)) {
        return None;
    }
    let bytes = num.to_be_bytes();
    Some(bytes[16 - out_len..].to_vec())
}

pub fn validate_monero_address(addr: &str) -> AddressValidationResult {
    let len = addr.len();
    if len != 95 && len != 106 {
        return AddressValidationResult {
            valid: false,
            chain: "xmr".to_string(),
            network: None,
            address_type: None,
            checksum_verified: false,
            message: format!(
                "Monero addresses must be 95 chars (standard/subaddress) or 106 chars (integrated); got {len}"
            ),
        };
    }

    let bytes_in = addr.as_bytes();
    let full_blocks = len / 11;
    let rem = len % 11;
    let rem_bytes = match rem {
        7 => 5,
        _ => {
            return AddressValidationResult {
                valid: false,
                chain: "xmr".to_string(),
                network: None,
                address_type: None,
                checksum_verified: false,
                message: "Invalid Monero Base58 block framing".to_string(),
            }
        }
    };

    let mut decoded = Vec::with_capacity(full_blocks * 8 + rem_bytes);
    for i in 0..full_blocks {
        let Some(chunk) = monero_decode_block(&bytes_in[i * 11..(i + 1) * 11], 8) else {
            return AddressValidationResult {
                valid: false,
                chain: "xmr".to_string(),
                network: None,
                address_type: None,
                checksum_verified: false,
                message: "Invalid Base58 block in Monero address".to_string(),
            };
        };
        decoded.extend_from_slice(&chunk);
    }
    let Some(last_chunk) = monero_decode_block(&bytes_in[full_blocks * 11..], rem_bytes) else {
        return AddressValidationResult {
            valid: false,
            chain: "xmr".to_string(),
            network: None,
            address_type: None,
            checksum_verified: false,
            message: "Invalid final Base58 block in Monero address".to_string(),
        };
    };
    decoded.extend_from_slice(&last_chunk);

    let payload_len = decoded.len() - 4;
    let hash = keccak256(&decoded[..payload_len]);
    if hash[..4] != decoded[payload_len..] {
        return AddressValidationResult {
            valid: false,
            chain: "xmr".to_string(),
            network: None,
            address_type: None,
            checksum_verified: false,
            message: "Monero Keccak-256 checksum verification failed".to_string(),
        };
    }

    let (network, addr_type) = match (decoded[0], len) {
        (18, 95) => ("mainnet", "Standard Address"),
        (42, 95) => ("mainnet", "Subaddress"),
        (19, 106) => ("mainnet", "Integrated Address"),
        (24, 95) => ("stagenet", "Stagenet Standard"),
        (36, 95) => ("stagenet", "Stagenet Subaddress"),
        (53, 95) => ("testnet", "Testnet Standard"),
        (63, 95) => ("testnet", "Testnet Subaddress"),
        (prefix, _) => {
            return AddressValidationResult {
                valid: false,
                chain: "xmr".to_string(),
                network: None,
                address_type: None,
                checksum_verified: false,
                message: format!("Unknown Monero network prefix byte {prefix}"),
            }
        }
    };

    AddressValidationResult {
        valid: true,
        chain: "xmr".to_string(),
        network: Some(network.to_string()),
        address_type: Some(addr_type.to_string()),
        checksum_verified: true,
        message: format!("Valid Monero {network} {addr_type}"),
    }
}

// ============================================================================
// Stacks (STX): c32check (SIP-005)
// ============================================================================

const C32_ALPHABET: &[u8] = b"0123456789ABCDEFGHJKMNPQRSTVWXYZ";

fn c32_decode(input: &str) -> Option<Vec<u8>> {
    let upper = input.to_ascii_uppercase();
    let mut digits = Vec::with_capacity(upper.len());
    for b in upper.bytes() {
        let normalized = match b {
            b'O' => b'0',
            b'I' | b'L' => b'1',
            other => other,
        };
        let val = C32_ALPHABET.iter().position(|&c| c == normalized)? as u8;
        digits.push(val);
    }

    let leading_zeros = digits.iter().take_while(|&&d| d == 0).count();
    let mut bytes: Vec<u8> = Vec::new();
    let mut carry: u32 = 0;
    let mut carry_bits: u32 = 0;
    for &d in digits.iter().rev() {
        carry |= u32::from(d) << carry_bits;
        carry_bits += 5;
        while carry_bits >= 8 {
            bytes.push((carry & 0xff) as u8);
            carry >>= 8;
            carry_bits -= 8;
        }
    }
    if carry > 0 {
        bytes.push(carry as u8);
    }
    while bytes.last() == Some(&0) {
        bytes.pop();
    }
    bytes.extend(std::iter::repeat_n(0, leading_zeros));
    bytes.reverse();
    Some(bytes)
}

pub fn validate_stacks_address(addr: &str) -> AddressValidationResult {
    let trimmed = addr.trim();
    if trimmed.len() < 38 || trimmed.len() > 42 || !trimmed.starts_with('S') {
        return AddressValidationResult {
            valid: false,
            chain: "stx".to_string(),
            network: None,
            address_type: None,
            checksum_verified: false,
            message: "Stacks addresses must start with SP, SM, ST, or SN (38-42 chars)".to_string(),
        };
    }

    let version_char = trimmed.as_bytes()[1];
    let (version_byte, network, addr_type) = match version_char {
        b'P' => (22u8, "mainnet", "Single-Sig (P2PKH)"),
        b'M' => (20u8, "mainnet", "Multi-Sig (P2SH)"),
        b'T' => (26u8, "testnet", "Testnet Single-Sig"),
        b'N' => (21u8, "testnet", "Testnet Multi-Sig"),
        _ => {
            return AddressValidationResult {
                valid: false,
                chain: "stx".to_string(),
                network: None,
                address_type: None,
                checksum_verified: false,
                message: "Invalid Stacks address prefix (expected SP, SM, ST, or SN)".to_string(),
            }
        }
    };

    let Some(decoded) = c32_decode(&trimmed[2..]) else {
        return AddressValidationResult {
            valid: false,
            chain: "stx".to_string(),
            network: None,
            address_type: None,
            checksum_verified: false,
            message: "Invalid c32 characters in Stacks address".to_string(),
        };
    };

    if decoded.len() < 4 {
        return AddressValidationResult {
            valid: false,
            chain: "stx".to_string(),
            network: None,
            address_type: None,
            checksum_verified: false,
            message: "Stacks c32 payload too short".to_string(),
        };
    }

    let payload_len = decoded.len() - 4;
    let payload = &decoded[..payload_len];
    let checksum = &decoded[payload_len..];

    let mut check_input = Vec::with_capacity(1 + payload.len());
    check_input.push(version_byte);
    check_input.extend_from_slice(payload);
    let computed = sha256d(&check_input);

    if computed[..4] != *checksum {
        return AddressValidationResult {
            valid: false,
            chain: "stx".to_string(),
            network: None,
            address_type: None,
            checksum_verified: false,
            message: "Stacks c32check double-SHA256 checksum failed".to_string(),
        };
    }

    AddressValidationResult {
        valid: true,
        chain: "stx".to_string(),
        network: Some(network.to_string()),
        address_type: Some(addr_type.to_string()),
        checksum_verified: true,
        message: format!("Valid Stacks {network} {addr_type} address"),
    }
}

// ============================================================================
// BIP-380 Output Descriptor Checksum & Bitcoin Timelock / Miniscript Generator
// ============================================================================

const DESC_INPUT_CHARSET: &str =
    "0123456789()[],'/*abcdefgh@:$%{}IJKLMNOPQRSTUVWXYZ&+-.;<=>?!^_|~ijklmnopqrstuvwxyzABCDEFGH`#\"\\ ";
const DESC_CHECKSUM_CHARSET: &[u8] = b"qpzry9x8gf2tvdw0s3jn54khce6mua7l";

fn descsum_polymod(symbols: &[u64]) -> u64 {
    const GEN: [u64; 5] = [
        0xf5dee51989,
        0xa9fdca3312,
        0x1bab10e32d,
        0x3706b1677a,
        0x644d626ffd,
    ];
    let mut chk: u64 = 1;
    for &v in symbols {
        let top = chk >> 35;
        chk = ((chk & 0x7_ffff_ffff) << 5) ^ v;
        for (i, &g) in GEN.iter().enumerate() {
            if (top >> i) & 1 != 0 {
                chk ^= g;
            }
        }
    }
    chk
}

pub fn descriptor_checksum(desc: &str) -> String {
    let mut symbols: Vec<u64> = Vec::with_capacity(desc.len() + 16);
    let mut groups: Vec<u64> = Vec::new();
    for ch in desc.chars() {
        let pos = DESC_INPUT_CHARSET.find(ch).unwrap_or(0) as u64;
        symbols.push(pos & 31);
        groups.push(pos >> 5);
        if groups.len() == 3 {
            symbols.push(groups[0] * 9 + groups[1] * 3 + groups[2]);
            groups.clear();
        }
    }
    if groups.len() == 1 {
        symbols.push(groups[0]);
    } else if groups.len() == 2 {
        symbols.push(groups[0] * 3 + groups[1]);
    }
    symbols.extend_from_slice(&[0; 8]);
    let polymod = descsum_polymod(&symbols) ^ 1;
    let mut out = String::with_capacity(8);
    for i in 0..8 {
        let idx = ((polymod >> (5 * (7 - i))) & 31) as usize;
        out.push(DESC_CHECKSUM_CHARSET[idx] as char);
    }
    out
}

pub fn build_timelock_descriptor(req: &TimelockDescriptorRequest) -> TimelockDescriptorResponse {
    let owner = req
        .owner_key
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .unwrap_or("OWNER_XPUB/0/*")
        .to_string();

    let heirs: Vec<String> = if req.heir_keys.is_empty() {
        vec!["HEIR_1_XPUB/0/*".to_string()]
    } else {
        req.heir_keys
            .iter()
            .map(|k| k.trim().to_string())
            .filter(|k| !k.is_empty())
            .collect()
    };
    let heirs = if heirs.is_empty() {
        vec!["HEIR_1_XPUB/0/*".to_string()]
    } else {
        heirs
    };

    let n = heirs.len();
    let k = req.heir_threshold.clamp(1, n);
    let blocks = req.timelock_blocks.max(1);
    let lock_mode = if req.lock_mode.eq_ignore_ascii_case("cltv") {
        "cltv"
    } else {
        "csv"
    };
    let network = if req.network.eq_ignore_ascii_case("testnet") {
        "testnet"
    } else {
        "mainnet"
    };

    let timelock_expr = if lock_mode == "cltv" {
        format!("after({blocks})")
    } else {
        format!("older({blocks})")
    };

    let heir_clause = if n == 1 {
        format!("pk({})", heirs[0])
    } else if k == n {
        let joined = heirs
            .iter()
            .map(|h| format!("pk({h})"))
            .collect::<Vec<_>>()
            .join(",");
        format!("thresh({k},{joined})")
    } else {
        let joined = heirs.join(",");
        format!("multi({k},{joined})")
    };

    let policy = format!("or(99@pk({owner}),1@and({heir_clause},{timelock_expr}))");
    let wsh_body = format!("wsh(or_d(pk({owner}),and_v(v:{heir_clause},{timelock_expr})))");
    let wsh_sum = descriptor_checksum(&wsh_body);
    let wsh_descriptor = format!("{wsh_body}#{wsh_sum}");

    let tr_heir_clause = if n == 1 {
        format!("pk({})", heirs[0])
    } else {
        let joined = heirs.join(",");
        format!("multi_a({k},{joined})")
    };
    let tr_body = format!("tr({owner},and_v(v:{tr_heir_clause},{timelock_expr}))");
    let tr_sum = descriptor_checksum(&tr_body);
    let taproot_descriptor = format!("{tr_body}#{tr_sum}");

    let lock_opcode = if lock_mode == "cltv" {
        "OP_CHECKLOCKTIMEVERIFY"
    } else {
        "OP_CHECKSEQUENCEVERIFY"
    };
    let heir_asm = if n == 1 {
        format!("<{}> OP_CHECKSIG", heirs[0])
    } else {
        let list = heirs
            .iter()
            .map(|h| format!("<{h}>"))
            .collect::<Vec<_>>()
            .join(" ");
        format!("OP_{k} {list} OP_{n} OP_CHECKMULTISIG")
    };
    let script_asm = format!(
        "OP_IF\n  <{owner}> OP_CHECKSIG\nOP_ELSE\n  <{blocks}> {lock_opcode} OP_DROP\n  {heir_asm}\nOP_ENDIF"
    );

    let estimated_days = (f64::from(blocks) / 144.0 * 10.0).round() / 10.0;
    let unlock_time = Utc::now() + Duration::minutes(i64::from(blocks) * 10);
    let estimated_witness_vbytes = 110 + (n as u32 * 34) + (k as u32 * 73);

    let recovery_steps = vec![
        "Import the BIP-380 output descriptor (including #checksum) into Sparrow Wallet, Liana, or Bitcoin Core as a watch-only descriptor wallet.".to_string(),
        format!(
            "Verify receive addresses on at least two independent hardware signing devices on Bitcoin {network}."
        ),
        if lock_mode == "csv" {
            format!(
                "Owner check-in: spend vault UTXOs back to a fresh vault address before {blocks} blocks (~{estimated_days} days) elapse to reset the relative CSV timer."
            )
        } else {
            format!(
                "Absolute CLTV policy unlocks at block height {blocks}; rotate to a new vault before this height if you wish to extend custody."
            )
        },
        format!(
            "Heir recovery: after the timelock matures, {k}-of-{n} heir key(s) construct and broadcast a PSBT spending the heir script path."
        ),
    ];

    TimelockDescriptorResponse {
        policy,
        wsh_descriptor,
        taproot_descriptor,
        script_asm,
        lock_mode: lock_mode.to_string(),
        timelock_blocks: blocks,
        estimated_days,
        estimated_unlock_at: unlock_time.to_rfc3339(),
        estimated_witness_vbytes,
        network: network.to_string(),
        recovery_steps,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validates_bitcoin_addresses() {
        // BIP-173 official P2WPKH mainnet vector
        let p2wpkh = validate_bitcoin_address("bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4");
        assert!(p2wpkh.valid, "{p2wpkh:?}");
        assert_eq!(p2wpkh.network.as_deref(), Some("mainnet"));

        // BIP-350 official Taproot (P2TR) mainnet vector
        let p2tr = validate_bitcoin_address(
            "bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqzk5jj0",
        );
        assert!(p2tr.valid, "{p2tr:?}");
        assert_eq!(p2tr.address_type.as_deref(), Some("P2TR (Taproot)"));

        // Classic P2PKH mainnet (Satoshi genesis address)
        let p2pkh = validate_bitcoin_address("1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa");
        assert!(p2pkh.valid, "{p2pkh:?}");
        assert_eq!(p2pkh.address_type.as_deref(), Some("P2PKH (Legacy)"));

        // Corrupted checksum must fail
        let bad = validate_bitcoin_address("bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t5");
        assert!(!bad.valid);
    }

    #[test]
    fn validates_stacks_c32check_addresses() {
        // Known valid Stacks mainnet address (SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7)
        let valid = validate_stacks_address("SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7");
        assert!(valid.valid, "{valid:?}");
        assert_eq!(valid.network.as_deref(), Some("mainnet"));

        // Corrupted last char must fail
        let invalid = validate_stacks_address("SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ8");
        assert!(!invalid.valid);
    }

    #[test]
    fn validates_monero_keccak_addresses() {
        // Official Monero donation mainnet standard address (95 chars)
        let valid = validate_monero_address(
            "44AFFq5kSiGBoZ4NMDwYtN18obc8AemS33DBLWs3H7otXft3XjrpDtQGv7SqSsaBYBb98uNbr2VBBEt7f2wfn3RVGQBEP3A",
        );
        assert!(valid.valid, "{valid:?}");
        assert_eq!(valid.network.as_deref(), Some("mainnet"));

        // Altered character fails Keccak checksum
        let bad = validate_monero_address(
            "44AFFq5kSiGBoZ4NMDwYtN18obc8AemS33DBLWs3H7otXft3XjrpDtQGv7SqSsaBYBb98uNbr2VBBEt7f2wfn3RVGQBEP3B",
        );
        assert!(!bad.valid);
    }

    #[test]
    fn builds_bip380_descriptor_with_valid_checksum() {
        // Known BIP-380 vector: wpkh(...) checksum verification
        let sum = descriptor_checksum(
            "pk(0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798)",
        );
        assert_eq!(sum, "gn28ywm7");

        let res = build_timelock_descriptor(&TimelockDescriptorRequest {
            owner_key: Some("xpubOwner/0/*".to_string()),
            heir_keys: vec!["xpubHeirA/0/*".to_string(), "xpubHeirB/0/*".to_string()],
            heir_threshold: 2,
            timelock_blocks: 12960,
            lock_mode: "csv".to_string(),
            network: "mainnet".to_string(),
        });
        assert!(res.wsh_descriptor.contains("older(12960)"));
        assert!(res.wsh_descriptor.contains('#'));
        assert!(res.taproot_descriptor.starts_with("tr(xpubOwner/0/*,"));
        assert!((res.estimated_days - 90.0).abs() < 0.1);
    }
}
