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
  return feeBps >= 0 && feeBps <= VALIDATION_LIMITS.MAX_FEE_BPS;
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
      if (feeBps > VALIDATION_LIMITS.MAX_FEE_BPS) {
        errors.push(`Fee percentage cannot exceed ${VALIDATION_LIMITS.MAX_FEE_BPS / 100}%`);
      }
      if (feeBps > 0 && feeBps < VALIDATION_LIMITS.MIN_FEE_BPS) {
        errors.push(`Minimum fee is ${VALIDATION_LIMITS.MIN_FEE_BPS / 100}% if enabled`);
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