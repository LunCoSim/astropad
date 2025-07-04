/**
 * Generic array manipulation utilities for managing dynamic lists in forms
 */

import type { AirdropEntry, RewardRecipient, PoolPosition as CustomPosition } from './types.js';

/**
 * Generic function to add an item to an array
 */
export function addArrayItem<T>(array: T[], newItem: T): T[] {
  return [...array, newItem];
}

/**
 * Generic function to remove an item from an array by index
 */
export function removeArrayItem<T>(array: T[], index: number, minLength: number = 1): T[] {
  if (array.length <= minLength) {
    return array;
  }
  return array.filter((_, i) => i !== index);
}

/**
 * Generic function to update an item in an array by index
 */
export function updateArrayItem<T>(array: T[], index: number, updates: Partial<T>): T[] {
  const newArray = [...array];
  newArray[index] = { ...newArray[index], ...updates };
  return newArray;
}

// Specific utility functions for common use cases

/**
 * Add a new social URL to the list
 */
export function addSocialUrl(socialUrls: string[]): string[] {
  return addArrayItem(socialUrls, '');
}

/**
 * Remove a social URL from the list
 */
export function removeSocialUrl(socialUrls: string[], index: number): string[] {
  return removeArrayItem(socialUrls, index, 1);
}

/**
 * Update a social URL in the list
 */
export function updateSocialUrl(socialUrls: string[], index: number, value: string): string[] {
  const newUrls = [...socialUrls];
  newUrls[index] = value;
  return newUrls;
}

/**
 * Add a new audit URL to the list
 */
export function addAuditUrl(auditUrls: string[]): string[] {
  return addArrayItem(auditUrls, '');
}

/**
 * Remove an audit URL from the list
 */
export function removeAuditUrl(auditUrls: string[], index: number): string[] {
  return removeArrayItem(auditUrls, index, 1);
}

/**
 * Update an audit URL in the list
 */
export function updateAuditUrl(auditUrls: string[], index: number, value: string): string[] {
  const newUrls = [...auditUrls];
  newUrls[index] = value;
  return newUrls;
}

/**
 * Add a new airdrop entry to the list
 */
export function addAirdropEntry(entries: AirdropEntry[]): AirdropEntry[] {
  return addArrayItem(entries, { address: '', amount: 1 });
}

/**
 * Remove an airdrop entry from the list
 */
export function removeAirdropEntry(entries: AirdropEntry[], index: number): AirdropEntry[] {
  return removeArrayItem(entries, index, 1);
}

/**
 * Update an airdrop entry in the list
 */
export function updateAirdropEntry(
  entries: AirdropEntry[], 
  index: number, 
  field: keyof AirdropEntry, 
  value: string | number
): AirdropEntry[] {
  return updateArrayItem(entries, index, { [field]: value });
}

/**
 * Add a new custom position to the list
 */
export function addCustomPosition(positions: CustomPosition[]): CustomPosition[] {
  return addArrayItem(positions, { tickLower: -230400, tickUpper: -120000, positionBps: 10000 });
}

/**
 * Remove a custom position from the list
 */
export function removeCustomPosition(positions: CustomPosition[], index: number): CustomPosition[] {
  return removeArrayItem(positions, index, 0);
}

/**
 * Update a custom position in the list
 */
export function updateCustomPosition(
  positions: CustomPosition[], 
  index: number, 
  field: keyof CustomPosition, 
  value: number
): CustomPosition[] {
  return updateArrayItem(positions, index, { [field]: value });
}

/**
 * Add a new reward recipient to the list
 */
export function addRewardRecipient(recipients: RewardRecipient[]): RewardRecipient[] {
  return addArrayItem(recipients, { recipient: '', admin: '', bps: 1000 });
}

/**
 * Remove a reward recipient from the list
 */
export function removeRewardRecipient(recipients: RewardRecipient[], index: number): RewardRecipient[] {
  return removeArrayItem(recipients, index, 1);
}

/**
 * Update a reward recipient in the list
 */
export function updateRewardRecipient(
  recipients: RewardRecipient[], 
  index: number, 
  field: keyof RewardRecipient, 
  value: string | number
): RewardRecipient[] {
  return updateArrayItem(recipients, index, { [field]: value });
}

// New function to validate image file
export function validateImageFile(file: File): Promise<{ isValid: boolean; file: File }> {
  return new Promise((resolve) => {
    // Implementation of validation logic
    // For example, you can check file size, type, etc.
    // If validation passes, resolve the promise with isValid: true and the file
    // If validation fails, reject the promise
    resolve({
      isValid: true,
      file
    });
  });
} 