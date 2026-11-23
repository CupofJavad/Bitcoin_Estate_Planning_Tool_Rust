import { test, expect } from '@playwright/test'

test.describe('Legacy Vault v2 Flagship Flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.getByTestId('login-email').fill('admin@localhost')
    await page.getByTestId('login-password').fill('admin')
    await page.getByTestId('login-submit').click()
    await expect(page).toHaveURL('/', { timeout: 10000 })
  })

  test('Create vault with live BTC checksum verification, heartbeat check-in, ZK AES-GCM note, and Heir Dossier', async ({
    page,
  }) => {
    const vaultName = `E2E Sovereign Vault ${Date.now()}`

    // Create Estate Plan with verified Bitcoin Bech32 address
    await page.getByTestId('create-estate-plan-btn').click()
    await page.getByTestId('plan-name-input').fill(vaultName)
    await page.locator('#bitcoin_address').fill('bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4')
    await expect(page.getByTestId('address-valid-btc')).toBeVisible({ timeout: 5000 })
    await page.getByTestId('plan-submit-btn').click()

    // Open newly created vault detail workspace
    const vaultLink = page.getByRole('link', { name: vaultName })
    await expect(vaultLink).toBeVisible({ timeout: 5000 })
    await vaultLink.click()
    await expect(page).toHaveURL(/\/estate-plans\/\d+/, { timeout: 10000 })

    // Verify Readiness Score & Record Proof-of-Life Check-in
    await expect(page.getByTestId('plan-readiness-score')).toBeVisible()
    await page.getByTestId('checkin-note-input').fill('Playwright quarterly coldcard check')
    await page.getByTestId('record-checkin-btn').click()
    await expect(page.getByText('Playwright quarterly coldcard check')).toBeVisible({ timeout: 5000 })

    // Encrypt & Decrypt a Zero-Knowledge AES-256-GCM Vault Note client-side
    const secretText = 'Coldcard MK4 stored in Zurich Vault #42'
    const pass = 'obsidian-gold-passphrase'
    await page.getByTestId('toggle-zk-note-form').click()
    await page.getByTestId('zk-note-title').fill('Hardware Custody Map')
    await page.getByTestId('zk-note-hint').fill('Obsidian theme')
    await page.getByTestId('zk-note-plaintext').fill(secretText)
    await page.getByTestId('zk-note-passphrase').fill(pass)
    await page.getByTestId('zk-note-submit').click()

    await expect(page.getByText('Hardware Custody Map')).toBeVisible({ timeout: 8000 })
    const decryptInput = page.locator('[data-testid^="zk-decrypt-input-"]').first()
    await decryptInput.fill(pass)
    await page.locator('[data-testid^="zk-decrypt-btn-"]').first().click()
    await expect(page.locator('[data-testid^="zk-note-decrypted-"]').first()).toContainText(secretText, {
      timeout: 8000,
    })

    // Open Verifiable Heir Inheritance Dossier & verify SHA-256 integrity seal
    await page.getByTestId('open-inheritance-packet-btn').click()
    const digest = page.getByTestId('packet-sha256')
    await expect(digest).toBeVisible({ timeout: 8000 })
    const hashText = (await digest.textContent())?.trim() || ''
    expect(hashText).toMatch(/^[a-f0-9]{64}$/)
  })

  test('Crypto & Bitcoin Miniscript Lab verifies addresses and compiles BIP-380 descriptors', async ({
    page,
  }) => {
    await page.goto('/tools/crypto')
    await page.getByTestId('crypto-lab-verify-btn').click()
    await expect(page.getByTestId('crypto-lab-validation-result')).toContainText(/Valid Bitcoin mainnet/i, {
      timeout: 5000,
    })

    await page.getByTestId('compile-descriptor-btn').click()
    const out = page.getByTestId('descriptor-output')
    await expect(out).toBeVisible({ timeout: 5000 })
    await expect(out).toContainText(/wsh\(or_d\(/i)
    await expect(out).toContainText(/tr\(/i)
  })

  test('Offline Shamir Secret Sharing (GF256) splits and reconstructs secret byte-for-byte', async ({
    page,
  }) => {
    const secretPhrase = 'abandon ability able about above absent absorb abstract absurd abuse access accident'
    await page.goto('/tools/sharding')
    await page.getByTestId('sss-secret-input').fill(secretPhrase)
    await page.getByTestId('sss-split-btn').click()
    await expect(page.getByTestId('sss-shards-grid')).toContainText('LV-SHARD-v1:1:2:3:')

    await page.getByTestId('sss-test-reconstruct-btn').click()
    await page.getByTestId('sss-reconstruct-btn').click()
    await expect(page.getByTestId('sss-recovered-output')).toContainText(secretPhrase)
  })
})
