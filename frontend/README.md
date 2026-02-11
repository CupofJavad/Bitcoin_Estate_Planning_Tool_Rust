# Legacy Vault — Frontend

**Secure your crypto for those who come next.**

Next.js 15+ frontend for Legacy Vault: multi-chain estate planning (Bitcoin, Monero, Stacks). Connects to the Rust API for estate plans, beneficiaries, and timelock policies.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and configure:
   ```bash
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```

3. Run development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

