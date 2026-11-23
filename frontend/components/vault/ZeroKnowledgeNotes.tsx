'use client'

import { useState, useEffect, useCallback } from 'react'
import { vaultNotesApi, type EncryptedVaultNote } from '@/lib/api'
import { encryptNoteClientSide, decryptNoteClientSide } from '@/lib/zkCrypto'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { Lock, Unlock, ShieldCheck, Plus, Trash2, Eye, EyeOff } from 'lucide-react'

interface ZeroKnowledgeNotesProps {
  planId: number
  onChanged?: () => void
}

export function ZeroKnowledgeNotes({ planId, onChanged }: ZeroKnowledgeNotesProps) {
  const [notes, setNotes] = useState<EncryptedVaultNote[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [title, setTitle] = useState('')
  const [plaintext, setPlaintext] = useState('')
  const [passphrase, setPassphrase] = useState('')
  const [hint, setHint] = useState('')
  const [saving, setSaving] = useState(false)

  // Per-note local decrypt state (never persisted)
  const [unlockPassphrases, setUnlockPassphrases] = useState<Record<number, string>>({})
  const [decryptedMap, setDecryptedMap] = useState<Record<number, string>>({})
  const [inspectCipherId, setInspectCipherId] = useState<number | null>(null)

  const loadNotes = useCallback(async () => {
    try {
      setLoading(true)
      const list = await vaultNotesApi.list(planId)
      setNotes(list)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to load vault notes', 'error')
    } finally {
      setLoading(false)
    }
  }, [planId])

  useEffect(() => {
    loadNotes()
  }, [loadNotes])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !plaintext.trim()) {
      toast('Title and secret instructions are required', 'error')
      return
    }
    if (passphrase.length < 6) {
      toast('Encryption passphrase must be at least 6 characters', 'error')
      return
    }
    try {
      setSaving(true)
      const encrypted = await encryptNoteClientSide(plaintext, passphrase)
      await vaultNotesApi.create(planId, {
        title: title.trim(),
        ...encrypted,
        hint: hint.trim() || null,
      })
      toast('Encrypted in browser (AES-256-GCM) and stored zero-knowledge', 'success')
      setTitle('')
      setPlaintext('')
      setPassphrase('')
      setHint('')
      setShowCreate(false)
      await loadNotes()
      onChanged?.()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Encryption failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDecrypt = async (note: EncryptedVaultNote) => {
    const pass = unlockPassphrases[note.id] || ''
    if (!pass) {
      toast('Enter passphrase to decrypt locally', 'error')
      return
    }
    try {
      const clear = await decryptNoteClientSide(note, pass)
      setDecryptedMap((prev) => ({ ...prev, [note.id]: clear }))
      toast('Decrypted locally in browser', 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Incorrect passphrase', 'error')
    }
  }

  const handleDelete = async (noteId: number) => {
    if (!confirm('Permanently delete this encrypted vault note?')) return
    try {
      await vaultNotesApi.delete(noteId)
      setDecryptedMap((prev) => {
        const next = { ...prev }
        delete next[noteId]
        return next
      })
      toast('Vault note deleted', 'success')
      await loadNotes()
      onChanged?.()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to delete note', 'error')
    }
  }

  return (
    <section className="lv-card p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-[#a87b24]" />
            <h2 className="font-serif-display text-xl font-semibold text-[#13161b]">
              Zero-Knowledge Encrypted Vault Notes
            </h2>
          </div>
          <p className="mt-1 text-sm text-[#575d68]">
            Encrypted locally in your browser with PBKDF2-SHA256 (310,000 iterations) and AES-256-GCM. The server only ever sees ciphertext.
          </p>
        </div>
        <Button
          size="sm"
          variant={showCreate ? 'outline' : 'primary'}
          onClick={() => setShowCreate((v) => !v)}
          data-testid="toggle-zk-note-form"
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          {showCreate ? 'Close' : 'Encrypt New Note'}
        </Button>
      </div>

      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="mb-6 rounded-xl border border-[#e3ddd1] bg-[#faf8f4] p-5 space-y-4"
          data-testid="zk-note-form"
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="zk-title" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#4b505a]">
                Note Title
              </label>
              <input
                id="zk-title"
                data-testid="zk-note-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Coldcard & Safe Deposit Box Instructions"
                className="lv-input"
              />
            </div>
            <div>
              <label htmlFor="zk-hint" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#4b505a]">
                Unencrypted Passphrase Hint (Optional)
              </label>
              <input
                id="zk-hint"
                data-testid="zk-note-hint"
                value={hint}
                onChange={(e) => setHint(e.target.value)}
                placeholder="Hint visible to heirs (never the passphrase itself)"
                className="lv-input"
              />
            </div>
          </div>

          <div>
            <label htmlFor="zk-plaintext" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#4b505a]">
              Confidential Instructions (Encrypted Client-Side)
            </label>
            <textarea
              id="zk-plaintext"
              data-testid="zk-note-plaintext"
              rows={4}
              value={plaintext}
              onChange={(e) => setPlaintext(e.target.value)}
              placeholder="Hardware wallet locations, attorney contacts, multisig quorum instructions…"
              className="lv-input"
            />
          </div>

          <div>
            <label htmlFor="zk-passphrase" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#4b505a]">
              Encryption Passphrase (Never Sent to Server)
            </label>
            <input
              id="zk-passphrase"
              data-testid="zk-note-passphrase"
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder="Minimum 6 characters — share out-of-band with heirs"
              className="lv-input"
            />
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <span className="inline-flex items-center gap-1.5 text-xs text-[#136f4a]">
              <ShieldCheck className="h-4 w-4" />
              WebCrypto AES-256-GCM · Zero-Knowledge
            </span>
            <Button type="submit" variant="gold" disabled={saving} data-testid="zk-note-submit">
              {saving ? 'Encrypting…' : 'Encrypt & Store Note'}
            </Button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="py-6 text-center text-sm text-[#575d68]">Loading encrypted vault notes…</p>
      ) : notes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#d8d0c1] bg-[#faf8f4] p-8 text-center">
          <Lock className="mx-auto mb-2 h-6 w-6 text-[#9c9281]" />
          <p className="text-sm font-medium text-[#16181d]">No encrypted vault notes yet</p>
          <p className="mt-1 text-xs text-[#575d68]">
            Store hardware device locations, executor instructions, or legal references with client-side AES-256-GCM encryption.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {notes.map((note) => {
            const decrypted = decryptedMap[note.id]
            const inspecting = inspectCipherId === note.id
            return (
              <div
                key={note.id}
                className="rounded-xl border border-[#e3ddd1] bg-[#fdfcfa] p-4"
                data-testid={`zk-note-card-${note.id}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      {decrypted ? (
                        <Unlock className="h-4 w-4 text-[#136f4a]" />
                      ) : (
                        <Lock className="h-4 w-4 text-[#a87b24]" />
                      )}
                      <h3 className="font-semibold text-[#13161b]">{note.title}</h3>
                      <span className="rounded bg-[#ece7dc] px-2 py-0.5 font-mono-code text-[10px] font-medium text-[#4b505a]">
                        {note.algorithm}
                      </span>
                    </div>
                    {note.hint && (
                      <p className="mt-1 text-xs text-[#575d68]">
                        Passphrase hint: <span className="font-medium text-[#16181d]">{note.hint}</span>
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setInspectCipherId(inspecting ? null : note.id)}
                    >
                      {inspecting ? <EyeOff className="mr-1 h-3.5 w-3.5" /> : <Eye className="mr-1 h-3.5 w-3.5" />}
                      {inspecting ? 'Hide Ciphertext' : 'Inspect Ciphertext'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(note.id)}
                      className="text-[#b91c1c] hover:bg-[#fef2f2]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {inspecting && (
                  <div className="mt-3 rounded-lg bg-[#13161b] p-3 font-mono-code text-[11px] text-[#d6d1c4] space-y-1 overflow-x-auto">
                    <div>
                      <span className="text-[#d6b15e]">kdf:</span> PBKDF2-SHA256 ({note.kdf_iterations.toLocaleString()} iter)
                    </div>
                    <div className="break-all">
                      <span className="text-[#d6b15e]">salt:</span> {note.salt_b64}
                    </div>
                    <div className="break-all">
                      <span className="text-[#d6b15e]">iv:</span> {note.iv_b64}
                    </div>
                    <div className="break-all">
                      <span className="text-[#d6b15e]">ciphertext:</span> {note.ciphertext_b64}
                    </div>
                  </div>
                )}

                {decrypted ? (
                  <div className="mt-3 rounded-lg border border-[#136f4a]/30 bg-[#f2faf6] p-3">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-[#136f4a]">
                        Decrypted Plaintext (Browser Memory Only)
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setDecryptedMap((prev) => {
                            const next = { ...prev }
                            delete next[note.id]
                            return next
                          })
                        }
                        className="text-xs font-medium text-[#4b505a] hover:underline"
                      >
                        Lock
                      </button>
                    </div>
                    <pre
                      className="whitespace-pre-wrap font-sans text-sm text-[#16181d]"
                      data-testid={`zk-note-decrypted-${note.id}`}
                    >
                      {decrypted}
                    </pre>
                  </div>
                ) : (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <input
                      type="password"
                      placeholder="Enter passphrase to decrypt locally…"
                      value={unlockPassphrases[note.id] || ''}
                      onChange={(e) =>
                        setUnlockPassphrases((prev) => ({
                          ...prev,
                          [note.id]: e.target.value,
                        }))
                      }
                      data-testid={`zk-decrypt-input-${note.id}`}
                      className="lv-input max-w-xs py-1.5 text-xs"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDecrypt(note)}
                      data-testid={`zk-decrypt-btn-${note.id}`}
                    >
                      <Unlock className="mr-1.5 h-3.5 w-3.5" />
                      Decrypt
                    </Button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
