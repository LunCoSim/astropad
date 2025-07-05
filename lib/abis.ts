/**
 * Centralized contract ABIs for the Astropad application
 * This file contains all contract ABIs to prevent duplication
 */

// ===== ERC20 ABI =====

export const ERC20_ABI = [
  {
    inputs: [],
    name: "name",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "account", type: "address" }
    ],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// ===== TOKEN ADMIN ABI =====

export const TOKEN_ADMIN_ABI = [
  {
    constant: true,
    inputs: [],
    name: 'admin',
    outputs: [{ name: '', type: 'address' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'owner',
    outputs: [{ name: '', type: 'address' }],
    type: 'function',
  },
] as const;

// ===== CLANKER EVENT ABI =====

export const TOKEN_CREATED_EVENT_ABI = [
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'token', type: 'address' },
      { indexed: false, name: 'name', type: 'string' },
      { indexed: false, name: 'symbol', type: 'string' },
      { indexed: true, name: 'deployer', type: 'address' },
      { indexed: false, name: 'totalSupply', type: 'uint256' },
      { indexed: false, name: 'fid', type: 'uint256' },
      { indexed: false, name: 'positionId', type: 'uint256' },
    ],
    name: 'TokenCreated',
    type: 'event',
  },
] as const; 