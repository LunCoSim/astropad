# Zenit Web Interface Specification

## 1. Goals & Scope

- **Goal:** Provide a user-friendly web interface to interact with the clanker-sdk (v4 only).
- **Scope:** Focus on v4 core features first (e.g., token deployment, fee management, rewards), then expand.

## 2. Core Features (MVP)

1. **Token Deployment (v4 only)**
   - Deploy new v4 tokens
   - Configure token parameters (name, symbol, supply, etc.)

2. **Fee Management (v4 only)**
   - View available v4 fees
   - Claim/collect v4 fees

3. **Rewards (v4 only)**
   - View available v4 rewards
   - Collect v4 rewards

4. **Extensions (v4 only)**
   - Enable/disable v4 extensions (Airdrop, Vault, DevBuy, etc.)

5. **Utilities (v4 only)**
   - Generate vanity addresses
   - Build custom transactions

6. **Status/History (v4 only)**
   - View v4 deployment and transaction history

## 3. User Flow

- **Home:** Overview/dashboard
- **Deploy Token:** Form to deploy a new v4 token
- **Manage Fees:** List and claim v4 fees
- **Rewards:** List and collect v4 rewards
- **Extensions:** Manage v4 extensions
- **Utilities:** Access v4 tools (vanity address, etc.)
- **History:** View past v4 actions

## 4. Technical Stack

- **Frontend:** React (recommended for modularity), or plain HTML/JS for simplicity
- **Backend:** None (if all logic is in clanker-sdk and can run in browser via bundling)
- **Integration:** Use clanker-sdk (v4) as a library (import and call functions)
- **Wallet:** MetaMask or WalletConnect integration for signing transactions

## 5. Step-by-Step Plan

1. Set up React (or HTML/JS) project in `zenit/`
2. Bundle clanker-sdk (v4) for browser use
3. Create UI for each v4 core feature
4. Integrate wallet connection
5. Wire up clanker-sdk (v4) calls to UI actions
6. Test and debug each feature step by step 