/**
 * Validation utilities for token configuration steps
 */

import type { PublicClient } from 'viem';
import { parseUnits, formatUnits } from 'viem';
import { VALIDATION_LIMITS } from './constants.js';
import type { TokenConfig, RewardRecipient, ValidationResult } from './types.js';

/**
 * Validate step 0: Token Basics
 */
export function validateBasicsStep(config: Pick<TokenConfig, 'name' | 'symbol' | 'admin'>): boolean {
  return !!(config.name && config.symbol && config.admin);
}

/**
 * Validate step 1: Liquidity Setup
 */
export function validateLiquidityStep(config: Pick<TokenConfig, 'startingMarketCap'>): boolean {
  return !!(config.startingMarketCap && config.startingMarketCap > 0);
}

/**
 * Validate step 2: Extensions (always valid as they're optional)
 */
export function validateExtensionsStep(): boolean {
  return true;
}

/**
 * Validate step 3: Advanced Config
 */
export function validateAdvancedStep(config: Pick<TokenConfig, 'rewardRecipients'>): boolean {
  const totalBps = config.rewardRecipients.reduce((sum, r) => sum + r.bps, 0);
  return totalBps === VALIDATION_LIMITS.TOTAL_BPS; // Must equal 100%
}

/**
 * Validate step 4: Deploy (checks basics and liquidity)
 */
export function validateDeployStep(config: Pick<TokenConfig, 'name' | 'symbol' | 'admin' | 'startingMarketCap'>): boolean {
  return validateBasicsStep(config) && validateLiquidityStep(config);
}

/**
 * Validate a specific step by index
 */
export function validateStep(stepIndex: number, config: TokenConfig): boolean {
  switch (stepIndex) {
    case 0:
      return validateBasicsStep(config);
    case 1:
      return validateLiquidityStep(config);
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
      if (!config.admin) errors.push('Token admin address is required');
      break;
    case 1:
      if (!config.startingMarketCap || config.startingMarketCap <= 0) {
        errors.push('Starting market cap must be greater than 0');
      }
      break;
    case 3:
      const totalBps = config.rewardRecipients.reduce((sum, r) => sum + r.bps, 0);
      if (totalBps !== VALIDATION_LIMITS.TOTAL_BPS) {
        errors.push(`Reward recipients must total exactly ${VALIDATION_LIMITS.TOTAL_BPS / 100}% (currently ${totalBps / 100}%)`);
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
    return { isValid: false, error: 'Token name is required' };
  }
  if (name.length > VALIDATION_LIMITS.NAME_MAX_LENGTH) {
    return { isValid: false, error: `Token name must be ${VALIDATION_LIMITS.NAME_MAX_LENGTH} characters or less` };
  }
  return { isValid: true };
}

/**
 * Validate token symbol
 */
export function validateTokenSymbol(symbol: string): ValidationResult {
  if (!symbol.trim()) {
    return { isValid: false, error: 'Token symbol is required' };
  }
  if (symbol.length > VALIDATION_LIMITS.SYMBOL_MAX_LENGTH) {
    return { isValid: false, error: `Token symbol must be ${VALIDATION_LIMITS.SYMBOL_MAX_LENGTH} characters or less` };
  }
  if (!/^[A-Z0-9]+$/.test(symbol)) {
    return { isValid: false, error: 'Token symbol must contain only uppercase letters and numbers' };
  }
  return { isValid: true };
}

/**
 * Validate Ethereum address
 */
export function validateEthereumAddress(address: string): ValidationResult {
  if (!address.trim()) {
    return { isValid: false, error: 'Address is required' };
  }
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return { isValid: false, error: 'Invalid Ethereum address format' };
  }
  return { isValid: true };
}

/**
 * Validate percentage value
 */
export function validatePercentage(value: number, min: number = 0, max: number = 100): ValidationResult {
  if (value < min) {
    return { isValid: false, error: `Percentage must be at least ${min}%` };
  }
  if (value > max) {
    return { isValid: false, error: `Percentage must be no more than ${max}%` };
  }
  return { isValid: true };
} 