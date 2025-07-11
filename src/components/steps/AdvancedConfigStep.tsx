import React from 'react';
import type { TokenConfig, RewardRecipient, FeeDistributionValidation } from '../../../lib/types.js';
import { VALIDATION_LIMITS } from '../../../lib/clanker-utils';
import { calculateFeeDistribution, getFeeDisplayInfo } from '../../../lib/fees.js';
import { InfoTooltip } from '../ui/InfoTooltip.js';
import FeeCollectorsManager from '../ui/FeeCollectorsManager.js';
import { ensureAstropadCollector } from '../ui/FeeCollectorsManager';

interface AdvancedConfigStepProps {
  config: TokenConfig;
  updateConfig: (config: Partial<TokenConfig>) => void;
  onNext: () => void;
  onPrevious: () => void;
}

export const AdvancedConfigStep: React.FC<AdvancedConfigStepProps> = ({
  config,
  updateConfig,
  onNext,
  onPrevious
}) => {
  const handleFeeChange = (userFeeBps: number) => {
    // If using simple distribution, calculate the basic 3-way split
    let recipients: RewardRecipient[];
    
    if (config.rewards.useSimpleDistribution) {
      recipients = calculateFeeDistribution(config.tokenAdmin, userFeeBps);
    } else {
      // Keep existing custom recipients but update their proportions
      const totalCurrentBps = config.rewards.recipients.reduce((sum, r) => sum + r.bps, 0);
      if (totalCurrentBps > 0) {
        // Scale existing distribution to new total
        recipients = config.rewards.recipients.map(r => ({
          ...r,
          bps: Math.round((r.bps / totalCurrentBps) * userFeeBps)
        }));
      } else {
        // Fallback to simple distribution
        recipients = calculateFeeDistribution(config.tokenAdmin, userFeeBps);
      }
    }
    
    updateConfig({
      fees: {
        type: config.fees.type || 'static',
        userFeeBps,
        static: {
          clankerFeeBps: userFeeBps,
          pairedFeeBps: userFeeBps,
          customDistribution: !config.rewards.useSimpleDistribution
        },
        dynamic: {
          baseFee: Math.max(25, userFeeBps),
          maxFee: Math.min(3000, userFeeBps * 3),
          referenceTickFilterPeriod: 3600,
          resetPeriod: 86400,
          resetTickFilter: 500,
          feeControlNumerator: 100,
          decayFilterBps: 9500
        }
      },
      rewards: {
        recipients,
        customDistribution: !config.rewards.useSimpleDistribution,
        useSimpleDistribution: config.rewards.useSimpleDistribution
      }
    });
  };

  const handleFeeTypeChange = (type: 'static' | 'dynamic') => {
    updateConfig({
      fees: {
        ...config.fees,
        type
      }
    });
  };

  const handleFeeCollectorsChange = (recipients: RewardRecipient[]) => {
    // Always enforce hidden LunCo collector and force token: 'Both'
    const recipientsWithToken = recipients.map(r => ({ ...r, token: 'Both' }));
    updateConfig({
      rewards: {
        ...config.rewards,
        recipients: ensureAstropadCollector(recipientsWithToken),
        customDistribution: !config.rewards.useSimpleDistribution
      }
    });
  };

  const handleDistributionModeChange = (useSimple: boolean) => {
    updateConfig({
      rewards: {
        ...config.rewards,
        useSimpleDistribution: useSimple,
        customDistribution: !useSimple
      }
    });
  };

  const handleMevToggle = (enabled: boolean) => {
    updateConfig({
      mev: {
        ...config.mev,
        enabled
      }
    });
  };

  const handleMevBlockDelayChange = (blockDelay: number) => {
    updateConfig({
      mev: {
        ...config.mev,
        blockDelay
      }
    });
  };

  const handleVanityToggle = (enabled: boolean) => {
    updateConfig({
      vanity: {
        ...config.vanity,
        enabled
      }
    });
  };

  const handleVanitySuffixChange = (suffix: string) => {
    updateConfig({
      vanity: {
        ...config.vanity,
        suffix
      }
    });
  };

  const handleTickSpacingChange = (tickSpacing: number) => {
    updateConfig({
      pool: {
        ...config.pool,
        tickSpacing
      }
    });
  };

  const handleStartingTickChange = (tickIfToken0IsClanker: number) => {
    updateConfig({
      pool: {
        ...config.pool,
        tickIfToken0IsClanker
      }
    });
  };

  const validateFeeDistribution = (): FeeDistributionValidation => {
    // Include hidden LunCo collector in validation
    const totalBps = config.rewards.recipients.reduce((sum, r) => sum + r.bps, 0);
    const errors: string[] = [];
    const warnings: string[] = [];

    if (totalBps !== 10000) { // Must equal 100% for LP fee distribution
      errors.push(`LP fee distribution must equal 100% (currently ${(totalBps / 100).toFixed(1)}%)`);
    }

    // Exclude LunCo from editable count
    const visibleRecipients = config.rewards.recipients.filter(r => r.recipient.toLowerCase() !== '0x2ec50faa88b1ceeeb77bb36e7e31eb7c1faeb348');
    if (visibleRecipients.length > 6) {
      errors.push('Maximum 6 fee collectors allowed (excluding platform)');
    }

    if (visibleRecipients.length === 0) {
      errors.push('At least one fee collector required');
    }

    // Check for duplicate addresses
    const addresses = visibleRecipients.map(r => r.recipient.toLowerCase()).filter(addr => addr);
    const duplicates = addresses.filter((addr, index) => addresses.indexOf(addr) !== index);
    if (duplicates.length > 0) {
      errors.push('Duplicate recipient addresses found');
    }

    // Check for zero allocations
    const zeroAllocations = visibleRecipients.filter(r => r.bps === 0);
    if (zeroAllocations.length > 0) {
      warnings.push(`${zeroAllocations.length} recipients have 0% allocation`);
    }

    // User can allocate up to 8000 BPS (20% is always reserved for LunCo)
    const userTotalBps = visibleRecipients.reduce((sum, r) => sum + r.bps, 0);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      totalBps: userTotalBps,
      maxCollectors: 6,
      remainingBps: 8000 - userTotalBps
    };
  };

  const feeInfo = getFeeDisplayInfo(config.fees.userFeeBps);

  // Helper defaults for static/dynamic fee config
  const defaultStatic = { clankerFeeBps: 100, pairedFeeBps: 100, customDistribution: false };
  const defaultDynamic = { baseFee: 100, maxFee: 300, referenceTickFilterPeriod: 3600, resetPeriod: 86400, resetTickFilter: 500, feeControlNumerator: 100, decayFilterBps: 9500 };

  // Patch updateConfig to always set interfaceName to 'astropad'
  const patchedUpdateConfig = (updates: Partial<TokenConfig>) => {
    updateConfig({ ...updates, interfaceName: 'astropad' });
  };

  return (
    <div className="space-y-2xl animate-fade-in">
      {/* Header */}
      <div className="text-center space-y-md">
        <h2 className="text-4xl font-bold text-primary mb-md">
          Advanced <span className="text-gradient">Configuration</span>
        </h2>
        <p className="text-lg text-secondary mx-auto" style={{ maxWidth: '48rem', lineHeight: '1.7' }}>
          Configure advanced features including MEV protection, fee distribution, pool settings, and vanity addresses.
        </p>
      </div>

      {/* Fee Configuration */}
      <div className="card card-hover">
        <div className="flex items-center space-x-md mb-lg">
          <h3 className="text-xl font-bold text-primary">Fee Configuration</h3>
          <InfoTooltip content="Configure fee structure and distribution among up to 7 collectors" />
        </div>

        <div className="space-y-lg">
          {/* Fee Type Selection */}
          <div>
            <label className="block text-sm font-semibold text-primary mb-sm">Fee Type</label>
            <div className="flex space-x-md">
              <button
                onClick={() => handleFeeTypeChange('static')}
                className={`btn ${config.fees.type === 'static' ? 'btn-primary' : 'btn-secondary'}`}
              >
                Static Fees
              </button>
              <button
                onClick={() => handleFeeTypeChange('dynamic')}
                className={`btn ${config.fees.type === 'dynamic' ? 'btn-primary' : 'btn-secondary'}`}
              >
                Dynamic Fees
              </button>
            </div>
            <div className="text-xs text-muted mt-sm">
              {config.fees.type === 'static' 
                ? 'Fixed fee percentage for all transactions'
                : 'Variable fees based on volatility (more MEV protection)'}
            </div>
          </div>

          {/* Total Fee Percentage */}
          <div>
            <label className="block text-sm font-semibold text-primary mb-sm">
              Total Fee Percentage
            </label>
            <div className="flex items-center space-x-md">
              <input
                type="range"
                min={VALIDATION_LIMITS.MIN_FEE_BPS}
                max={VALIDATION_LIMITS.MAX_FEE_BPS}
                step="25"
                value={config.fees.userFeeBps}
                onChange={(e) => handleFeeChange(parseInt(e.target.value))}
                className="flex-1"
              />
              <div className="flex items-center space-x-sm">
                <input
                  type="number"
                  value={config.fees.userFeeBps / 100}
                  onChange={(e) => handleFeeChange(Math.round(parseFloat(e.target.value || '0') * 100))}
                  step="0.25"
                  min={VALIDATION_LIMITS.MIN_FEE_BPS / 100}
                  max={VALIDATION_LIMITS.MAX_FEE_BPS / 100}
                  className="input w-20"
                />
                <span className="text-sm text-muted">%</span>
              </div>
            </div>
                         <div className="text-xs text-muted mt-sm">
               Total fee: {feeInfo.totalFee} | Protocol (Clanker + Astropad): {feeInfo.combinedProtocol} | User: {feeInfo.userReceives}
             </div>
          </div>

          {/* Fee Collectors Manager */}
          <FeeCollectorsManager
            recipients={config.rewards.recipients.map(r => ({ ...r, token: 'Both' }))}
            onRecipientsChange={handleFeeCollectorsChange}
            validation={validateFeeDistribution()}
            totalFeeBps={config.fees.userFeeBps}
            defaultAddress={config.tokenAdmin}
          />
        </div>
      </div>

      {/* MEV Protection */}
      <div className="card card-hover">
        <div className="flex items-center space-x-md mb-lg">
          <h3 className="text-xl font-bold text-primary">MEV Protection</h3>
          <InfoTooltip content="Protect against MEV attacks with block delays and custom modules" />
        </div>

        <div className="space-y-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-primary">Enable MEV Protection</div>
              <div className="text-sm text-muted">Recommended for all new tokens</div>
            </div>
            <button
              onClick={() => handleMevToggle(!config.mev.enabled)}
              className={`btn ${config.mev.enabled ? 'btn-primary' : 'btn-secondary'}`}
            >
              {config.mev.enabled ? 'Enabled' : 'Disabled'}
            </button>
          </div>

          {config.mev.enabled && (
            <>
              <div>
                <label className="block text-sm font-semibold text-primary mb-sm">
                  Block Delay
                  <InfoTooltip content="Number of blocks to delay transactions. Higher = more protection, but slower trading." />
                </label>
                <div className="flex items-center space-x-md">
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={config.mev.blockDelay || 2}
                    onChange={(e) => handleMevBlockDelayChange(parseInt(e.target.value))}
                    className="flex-1"
                  />
                  <div className="flex items-center space-x-sm">
                    <input
                      type="number"
                      value={config.mev.blockDelay || 2}
                      onChange={(e) => handleMevBlockDelayChange(parseInt(e.target.value || '2'))}
                      min="1"
                      max="5"
                      className="input w-16"
                    />
                    <span className="text-sm text-muted">blocks</span>
                  </div>
                </div>
                <div className="text-xs text-muted mt-sm">
                  Number of blocks to delay transactions (higher = more protection, slower trading)
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Vanity Address */}
      <div className="card card-hover">
        <div className="flex items-center space-x-md mb-lg">
          <h3 className="text-xl font-bold text-primary">Vanity Address</h3>
          <InfoTooltip content="Generate a custom token address with desired suffix" />
        </div>

        <div className="space-y-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-primary">Enable Vanity Address</div>
              <div className="text-sm text-muted">Generate custom address suffix</div>
            </div>
            <button
              onClick={() => handleVanityToggle(!config.vanity.enabled)}
              className={`btn ${config.vanity.enabled ? 'btn-primary' : 'btn-secondary'}`}
            >
              {config.vanity.enabled ? 'Enabled' : 'Disabled'}
            </button>
          </div>

          {config.vanity.enabled && (
            <div>
              <label className="block text-sm font-semibold text-primary mb-sm">
                Vanity Type
              </label>
              <div>
                <label><input type="radio" checked={config.vanity.type === 'suffix'} onChange={() => updateConfig({ vanity: { ...config.vanity, type: 'suffix' } })} /> Suffix</label>
                <label><input type="radio" checked={config.vanity.type === 'prefix'} onChange={() => updateConfig({ vanity: { ...config.vanity, type: 'prefix' } })} /> Prefix</label>
              </div>
              <label className="block text-sm font-semibold text-primary mb-sm">
                Desired Suffix
              </label>
              <input
                type="text"
                value={config.vanity.suffix}
                onChange={(e) => handleVanitySuffixChange(e.target.value)}
                placeholder="e.g., 4b07"
                className="input font-mono"
                maxLength={8}
              />
              <div className="text-xs text-muted mt-sm">
                Token address will end with: 0x...{config.vanity.suffix}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center mt-2xl">
        <button onClick={onPrevious} className="btn btn-secondary">
          ← Back to Extensions
        </button>
        
        <button onClick={onNext} className="btn btn-primary btn-lg">
          Continue to Deploy →
        </button>
      </div>
    </div>
  );
}; 