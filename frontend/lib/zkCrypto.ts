/**
 * Zero-Knowledge Client-Side Encryption (Web Crypto API)
 * Plaintext and passphrases NEVER leave the browser.
 * Only AES-256-GCM ciphertext, IV, salt, and PBKDF2 metadata are transmitted to the server.
 */

export const DEFAULT_KDF_ITERATIONS = 310_000
export const DEFAULT_ALGORITHM = 'AES-256-GCM'

export interface EncryptedPayload {
  ciphertext_b64: string
  iv_b64: string
  salt_b64: string
  kdf_iterations: number
  algorithm: string
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64)
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    out[i] = binary.charCodeAt(i)
  }
  return out
}

async function deriveAesKey(
  passphrase: string,
  salt: Uint8Array,
  iterations: number
): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

export async function encryptNoteClientSide(
  plaintext: string,
  passphrase: string,
  iterations: number = DEFAULT_KDF_ITERATIONS
): Promise<EncryptedPayload> {
  if (!passphrase || passphrase.length < 6) {
    throw new Error('Passphrase must be at least 6 characters')
  }
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveAesKey(passphrase, salt, iterations)
  const encoded = new TextEncoder().encode(plaintext)
  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    encoded
  )
  return {
    ciphertext_b64: bytesToBase64(new Uint8Array(cipherBuffer)),
    iv_b64: bytesToBase64(iv),
    salt_b64: bytesToBase64(salt),
    kdf_iterations: iterations,
    algorithm: DEFAULT_ALGORITHM,
  }
}

export async function decryptNoteClientSide(
  payload: Pick<EncryptedPayload, 'ciphertext_b64' | 'iv_b64' | 'salt_b64' | 'kdf_iterations'>,
  passphrase: string
): Promise<string> {
  const salt = base64ToBytes(payload.salt_b64)
  const iv = base64ToBytes(payload.iv_b64)
  const ciphertext = base64ToBytes(payload.ciphertext_b64)
  const key = await deriveAesKey(passphrase, salt, payload.kdf_iterations)
  try {
    const plainBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      key,
      ciphertext as BufferSource
    )
    return new TextDecoder().decode(plainBuffer)
  } catch {
    throw new Error('Decryption failed — incorrect passphrase or corrupted ciphertext')
  }
}
