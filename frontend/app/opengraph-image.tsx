import { ImageResponse } from 'next/og'

export const alt = 'Legacy Vault – Multi-Chain Estate Planning'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f8fafc',
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: 80,
            border: '3px solid #e2e8f0',
            borderRadius: 16,
            background: '#ffffff',
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              border: '3px solid #0ea5e9',
              borderRadius: 8,
              marginBottom: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: '50%',
                background: '#0ea5e9',
              }}
            />
          </div>
          <div style={{ fontSize: 56, fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>
            Legacy Vault
          </div>
          <div style={{ fontSize: 28, color: '#334155', textAlign: 'center', maxWidth: 600 }}>
            Secure your crypto for those who come next.
          </div>
          <div style={{ fontSize: 20, color: '#0ea5e9', marginTop: 24 }}>
            Bitcoin · Monero · Stacks
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
