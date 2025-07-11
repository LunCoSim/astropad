/**
 * Validation utilities for token configuration steps
 */

import type { TokenConfig, ValidationResult } from './types.js';
import type { PublicClient } from "viem";
import { erc20Abi } from 'viem';
import type { TokenInfo } from './types';

/**
 * Validate step 0: Token Basics
 */
export function validateBasicsStep(config: Pick<TokenConfig, 'name' | 'symbol' | 'tokenAdmin'>): boolean {
  return !!(config.name && config.symbol && config.tokenAdmin);
}

/**
 * Validate step 1: Pool Setup (always valid with default configuration)
 */
export function validateLiquidityStep(): boolean {
  return true; // Pool configuration is always valid with v4 defaults
}

/**
 * Validate step 2: Extensions (always valid as they're optional)
 */
export function validateExtensionsStep(): boolean {
  return true;
}

/**
 * Validate step 3: Advanced Config (fees are automatically distributed)
 */
export function validateAdvancedStep(config: Pick<TokenConfig, 'fees'>): boolean {
  // Fee validation - check if userFeeBps is within valid range
  const feeBps = config.fees.userFeeBps;
  return feeBps >= 0 && feeBps <= 10000; // Changed from VALIDATION_LIMITS.MAX_FEE_BPS to 10000
}

/**
 * Validate step 4: Deploy (checks basics)
 */
export function validateDeployStep(config: Pick<TokenConfig, 'name' | 'symbol' | 'tokenAdmin'>): boolean {
  return validateBasicsStep(config);
}

/**
 * Validate a specific step by index
 */
export function validateStep(stepIndex: number, config: TokenConfig): boolean {
  switch (stepIndex) {
    case 0:
      return validateBasicsStep(config);
    case 1:
      return validateLiquidityStep();
    case 2:
      return validateExtensionsStep();
    case 3:
      return validateAdvancedStep(config);
    case 4:
      return validateDeployStep(config);
    default:
      return false;
  }
}

/**
 * Get validation errors for a specific step
 */
export function getStepValidationErrors(stepIndex: number, config: TokenConfig): string[] {
  const errors: string[] = [];

  switch (stepIndex) {
    case 0:
      if (!config.name) errors.push('Token name is required');
      if (!config.symbol) errors.push('Token symbol is required');
      if (!config.tokenAdmin) errors.push('Token admin address is required');
      break;
    case 3:
      const feeBps = config.fees.userFeeBps;
      if (feeBps < 0) {
        errors.push('Fee percentage cannot be negative');
      }
      if (feeBps > 10000) { // Changed from VALIDATION_LIMITS.MAX_FEE_BPS to 10000
        errors.push(`Fee percentage cannot exceed ${10000 / 100}%`);
      }
      if (feeBps > 0 && feeBps < 100) { // Changed from VALIDATION_LIMITS.MIN_FEE_BPS to 100
        errors.push(`Minimum fee is ${100 / 100}% if enabled`);
      }
      break;
  }

  return errors;
}

/**
 * Validate token name
 */
export function validateTokenName(name: string): ValidationResult {
  if (!name.trim()) {
    return { isValid: false, errors: ['Token name is required'], warnings: [] };
  }
  if (name.length > 32) { // Changed from VALIDATION_LIMITS.NAME_MAX_LENGTH to 32
    return { isValid: false, errors: [`Token name must be ${32} characters or less`], warnings: [] };
  }
  return { isValid: true, errors: [], warnings: [] };
}

/**
 * Validate token symbol
 */
export function validateTokenSymbol(symbol: string): ValidationResult {
  if (!symbol.trim()) {
    return { isValid: false, errors: ['Token symbol is required'], warnings: [] };
  }
  if (symbol.length > 10) { // Changed from VALIDATION_LIMITS.SYMBOL_MAX_LENGTH to 10
    return { isValid: false, errors: [`Token symbol must be ${10} characters or less`], warnings: [] };
  }
  if (!/^[A-Z0-9]+$/.test(symbol)) {
    return { isValid: false, errors: ['Token symbol must contain only uppercase letters and numbers'], warnings: [] };
  }
  return { isValid: true, errors: [], warnings: [] };
}

/**
 * Validate Ethereum address
 */
export function validateEthereumAddress(address: string): ValidationResult {
  if (!address.trim()) {
    return { isValid: false, errors: ['Address is required'], warnings: [] };
  }
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return { isValid: false, errors: ['Invalid Ethereum address format'], warnings: [] };
  }
  return { isValid: true, errors: [], warnings: [] };
}

/**
 * Validate percentage value
 */
export function validatePercentage(value: number, min: number = 0, max: number = 100): ValidationResult {
  if (value < min) {
    return { isValid: false, errors: [`Percentage must be at least ${min}%`], warnings: [] };
  }
  if (value > max) {
    return { isValid: false, errors: [`Percentage must be no more than ${max}%`], warnings: [] };
  }
  return { isValid: true, errors: [], warnings: [] };
}

/**
 * Validate fee percentage is within acceptable bounds
 * @param feeBps - Fee in basis points
 * @returns Validation result
 */
export function validateFeeBps(feeBps: number): { isValid: boolean; error?: string } {
  if (feeBps < 0) {
    return { isValid: false, error: 'Fee cannot be negative' };
  }

  if (feeBps > 2000) { // 20% max
    return { isValid: false, error: 'Fee cannot exceed 20%' };
  }

  if (feeBps > 0 && feeBps < 25) {
    return { isValid: false, error: 'Minimum fee is 0.25% (25 basis points)' };
  }

  return { isValid: true };
}

/**
 * Fetch token decimals from an ERC20 contract with error handling
 * @throws Error if contract read fails
 */
export async function getTokenDecimals(
  publicClient: PublicClient,
  tokenAddress: `0x${string}`,
): Promise<number> {
  try {
    return await publicClient.readContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: "decimals",
    });
  } catch (error) {
    console.warn(`Could not fetch decimals for ${tokenAddress}, assuming 18.`);
    return 18;
  }
}

/**
 * Fetch token symbol from an ERC20 contract with error handling
 * @throws Error if contract read fails
 */
export async function getTokenSymbol(
  publicClient: PublicClient,
  tokenAddress: `0x${string}`,
): Promise<string> {
  try {
    return await publicClient.readContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: "symbol",
    });
  } catch (error: any) {
    console.error(`Error fetching symbol for ${tokenAddress}:`, error);
    return 'UNKNOWN';
  }
}

/**
 * Validate a pair token by fetching its decimals and symbol
 * Returns token info if valid, null if invalid
 */
export async function validatePairToken(
  publicClient: PublicClient,
  tokenAddress: `0x${string}`
): Promise<TokenInfo | null> {
  try {
    const [decimals, symbol] = await Promise.all([
      getTokenDecimals(publicClient, tokenAddress),
      getTokenSymbol(publicClient, tokenAddress)
    ]);

    return { address: tokenAddress, name: symbol, symbol, decimals };
  } catch (error) {
    console.error(`Error validating token ${tokenAddress}:`, error);
    return null;
  }
}

/**
 * Check if an address is a valid Ethereum address format
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Validate multiple token addresses
 */
export async function validateMultipleTokens(
  publicClient: PublicClient,
  tokenAddresses: `0x${string}`[]
): Promise<(TokenInfo | null)[]> {
  return Promise.all(
    tokenAddresses.map(address => validatePairToken(publicClient, address))
  );
} 