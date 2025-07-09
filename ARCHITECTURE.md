# Astropad Project Architecture

This document outlines the architecture of the Astropad project, providing a guide for developers and contributors.

## 1. Core Principles

The project is built on a set of core principles to ensure it is maintainable, scalable, and easy to develop.

- **Clanker v4 Only:** The project is focused exclusively on Clanker v4 functionality, leveraging the official clanker-sdk for all blockchain interactions.
- **SDK-First Approach:** Core blockchain logic is handled by the clanker-sdk, with minimal custom utilities only for UI-specific functionality.
- **Separation of Concerns:** The project is divided into distinct layers: a thin utility library (`/lib`), a minimal backend API, and a React frontend UI.
- **Provider Agnostic Logic:** Functions in the library are designed to work with both Node.js and browser environments using viem providers.

## 2. Directory Structure

The project is organized into the following top-level directories:

- **/lib**: Contains minimal UI-specific utilities and re-exports from clanker-sdk. Focused on v4-only functionality.
- **/api**: Minimal Express.js endpoints for image upload and fee checking. Most blockchain logic happens client-side via clanker-sdk.
- **/backend**: Development server that combines API endpoints for local development.
- **/src**: The React frontend UI built with Vite. Primary interface for Clanker v4 token deployment and management.
- **/netlify**: Netlify-specific serverless functions for production deployment.
- **/cli**: Optional command-line tools (currently disabled pending v4 migration).
- **/dist**: Production build output for the frontend.
- **/dist-api**: Compiled backend/API code for production.

## 3. Development Workflow

1.  **Installation:** Install dependencies with `pnpm install`.
2.  **Running the Dev Server:** Run `pnpm dev`.
    - This command uses `concurrently` to start both the Vite frontend server and the Express API server.
    - The Vite server is configured to proxy any requests to `/api/*` to the backend server running on `http://localhost:3001`, avoiding CORS issues.

## 4. Production

1.  **Building the Application:** Run `pnpm build`.
    - This command will first build the frontend UI into the `/dist` directory.
    - It will then compile the API server's TypeScript code into JavaScript in the `/dist-api` directory.
2.  **Starting the Server:** Run `pnpm start`.
    - This runs the compiled API server from `/dist-api/backend/index.js`.
    - In this mode, the server will both handle API requests and serve the built static files from the `/dist` directory.

## 5. The v4-First Architecture

The frontend is designed to leverage clanker-sdk v4 for all blockchain operations:

- **Token Deployment**: Direct integration with clanker-sdk v4 using `wagmi` WalletClient for user-signed transactions.
- **Fee Management**: Utilizes clanker-sdk v4 fee checking and collection methods.
- **Read-Only Data**: Some operations use backend API endpoints for caching and reliability, but most data comes directly from the SDK.
- **Extensions**: Full support for v4 extensions (Vault, Airdrop, DevBuy, etc.) through the SDK interface.

## 6. Key Dependencies

- **clanker-sdk**: Official SDK for Clanker v4 interactions
- **wagmi**: Wallet connection and transaction management 
- **viem**: Low-level Ethereum client library
- **@reown/appkit**: Wallet connection UI components
