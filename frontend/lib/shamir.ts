/**
 * Offline Shamir Secret Sharing over GF(2^8) (irreducible polynomial 0x11b)
 * Splits any UTF-8 secret (seed phrase, vault passphrase, recovery key) into N shares
 * where any K shares reconstruct the exact secret, and K-1 shares reveal zero information.
 * Zero network calls — executes 100% locally in the browser.
 */

const GF_EXP = new Uint8Array(512)
const GF_LOG = new Uint8Array(256)

// Initialize GF(256) log/antilog tables with generator 3 (primitive over AES polynomial 0x11b)
;(function initGf256() {
  let x = 1
  for (let i = 0; i < 255; i += 1) {
    GF_EXP[i] = x
    GF_LOG[x] = i
    // multiply x by 3 in GF(2^8) mod 0x11b: x * 3 = (x << 1) ^ x
    const x2 = x & 0x80 ? ((x << 1) ^ 0x11b) & 0xff : (x << 1) & 0xff
    x = x2 ^ x
  }
  for (let i = 255; i < 512; i += 1) {
    GF_EXP[i] = GF_EXP[i - 255]
  }
})()

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0
  return GF_EXP[GF_LOG[a] + GF_LOG[b]]
}

function gfDiv(a: number, b: number): number {
  if (b === 0) throw new Error('GF(256) division by zero')
  if (a === 0) return 0
  return GF_EXP[(GF_LOG[a] + 255 - GF_LOG[b]) % 255]
}

function evalPoly(coeffs: Uint8Array, x: number): number {
  let y = 0
  for (let i = coeffs.length - 1; i >= 0; i -= 1) {
    y = gfMul(y, x) ^ coeffs[i]
  }
  return y
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function fromHex(hex: string): Uint8Array {
  if (hex.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(hex)) {
    throw new Error('Invalid hex payload in shard')
  }
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i += 1) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return out
}

function fnv1a32(str: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}

export interface GeneratedShard {
  index: number
  threshold: number
  total: number
  checksum: string
  encoded: string
}

export function splitSecret(
  secret: string,
  totalShares: number,
  threshold: number
): GeneratedShard[] {
  if (!secret) throw new Error('Secret cannot be empty')
  if (threshold < 2) throw new Error('Threshold must be at least 2')
  if (totalShares < threshold) throw new Error('Total shares must be >= threshold')
  if (totalShares > 20) throw new Error('Maximum 20 shares supported')

  const secretBytes = new TextEncoder().encode(secret)
  const shareBuffers: Uint8Array[] = Array.from(
    { length: totalShares },
    () => new Uint8Array(secretBytes.length)
  )

  const coeffs = new Uint8Array(threshold)
  for (let byteIdx = 0; byteIdx < secretBytes.length; byteIdx += 1) {
    coeffs[0] = secretBytes[byteIdx]
    const randomPart = crypto.getRandomValues(new Uint8Array(threshold - 1))
    coeffs.set(randomPart, 1)
    for (let s = 0; s < totalShares; s += 1) {
      const x = s + 1
      shareBuffers[s][byteIdx] = evalPoly(coeffs, x)
    }
  }

  return shareBuffers.map((buf, idx) => {
    const index = idx + 1
    const hex = toHex(buf)
    const body = `LV-SHARD-v1:${index}:${threshold}:${totalShares}:${hex}`
    const checksum = fnv1a32(body)
    return {
      index,
      threshold,
      total: totalShares,
      checksum,
      encoded: `${body}:${checksum}`,
    }
  })
}

export function combineShards(encodedShards: string[]): string {
  const cleaned = encodedShards.map((s) => s.trim()).filter(Boolean)
  if (cleaned.length < 2) {
    throw new Error('Provide at least 2 shards to reconstruct the secret')
  }

  const parsed: Array<{ x: number; threshold: number; data: Uint8Array }> = []
  const seenX = new Set<number>()

  for (const raw of cleaned) {
    const parts = raw.split(':')
    if (parts.length !== 6 || parts[0] !== 'LV-SHARD-v1') {
      throw new Error('Malformed shard format (expected LV-SHARD-v1:...)')
    }
    const [prefix, idxStr, threshStr, totalStr, hex, checksum] = parts
    const body = `${prefix}:${idxStr}:${threshStr}:${totalStr}:${hex}`
    if (fnv1a32(body) !== checksum.toLowerCase()) {
      throw new Error(`Checksum mismatch on shard #${idxStr}`)
    }
    const x = parseInt(idxStr, 10)
    const threshold = parseInt(threshStr, 10)
    if (seenX.has(x)) {
      throw new Error(`Duplicate shard index #${x}`)
    }
    seenX.add(x)
    parsed.push({ x, threshold, data: fromHex(hex) })
  }

  const required = parsed[0].threshold
  if (parsed.length < required) {
    throw new Error(`Need at least ${required} unique shards; only ${parsed.length} provided`)
  }
  const len = parsed[0].data.length
  if (parsed.some((p) => p.data.length !== len)) {
    throw new Error('Shards do not belong to the same secret (mismatched payload length)')
  }

  const subset = parsed.slice(0, required)
  const recovered = new Uint8Array(len)

  for (let byteIdx = 0; byteIdx < len; byteIdx += 1) {
    let secretByte = 0
    for (let i = 0; i < subset.length; i += 1) {
      let basis = 1
      for (let j = 0; j < subset.length; j += 1) {
        if (i !== j) {
          // Lagrange basis L_i(0) = prod(x_j / (x_j ^ x_i))
          basis = gfMul(basis, gfDiv(subset[j].x, subset[j].x ^ subset[i].x))
        }
      }
      secretByte ^= gfMul(subset[i].data[byteIdx], basis)
    }
    recovered[byteIdx] = secretByte
  }

  return new TextDecoder().decode(recovered)
}
