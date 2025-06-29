# Zenit Project Architecture

This document outlines the architecture of the Zenit project, providing a guide for developers and contributors.

## 1. Core Principles

The project is built on a set of core principles to ensure it is maintainable, scalable, and easy to develop.

- **Separation of Concerns:** The project is divided into distinct layers: a shared core logic library, a backend API, a command-line interface (CLI), and a frontend UI. Each layer has a single, well-defined responsibility.
- **Code Reusability:** The core business logic is written once in a shared library (`/lib`) and reused across the API, CLI, and frontend.
- **Provider Agnostic Logic:** Functions in the core library are designed to be independent of where they run (Node.js or browser). They accept blockchain providers (`PublicClient`, `WalletClient`) as arguments rather than creating their own.

## 2. Directory Structure

The project is organized into the following top-level directories:

- **/lib**: Contains the shared, reusable core logic of the application. This code is universal and can be run in both a Node.js environment and the browser.
- **/api**: An Express.js server that exposes a RESTful API. It consumes the functions from `/lib`. In production, it also serves the static frontend application.
- **/cli**: Contains scripts for the command-line interface. This is used for administrative tasks, scripting, and testing. It also consumes functions from `/lib`.
- **/src**: The frontend user interface, built with React and Vite. It interacts with the blockchain via both our backend API and the user's browser wallet (e.g., MetaMask).
- **/dist**: The output directory for the production build of the frontend UI.
- **/dist-api**: The output directory for the compiled JavaScript version of the API server.

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
    - This runs the compiled API server from `/dist-api/index.js`.
    - In this mode, the server will both handle API requests and serve the built static files from the `/dist` directory.

## 5. The Hybrid Model (Frontend)

The frontend is designed to use the most appropriate method for blockchain interactions:

- **User-Signed Actions** (e.g., deploying a token): The frontend uses `wagmi` to get a `WalletClient` directly from the user's browser wallet. It then calls the relevant function from `/lib`, passing this client to sign and send the transaction.
- **Read-Only Data** (e.g., checking fees): The frontend makes a `fetch` request to our backend API. This allows for potential caching, use of a reliable RPC, and keeps the frontend clean.
