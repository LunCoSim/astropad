import React from 'react';
import type { TokenConfig, RewardRecipient, FeeDistributionValidation } from '../../../lib/types.js';
import { VALIDATION_LIMITS } from '../../../lib/constants.js';
import { calculateFeeDistribution, getFeeDisplayInfo } from '../../../lib/fees.js';
import { InfoTooltip } from '../ui/InfoTooltip.js';
import FeeCollectorsManager from '../ui/FeeCollectorsManager.js';

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
    updateConfig({
      rewards: {
        ...config.rewards,
        recipients,
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
    const totalBps = config.rewards.recipients.reduce((sum, r) => sum + r.bps, 0);
    const errors: string[] = [];
    const warnings: string[] = [];

    if (totalBps !== 10000) { // Must equal 100% for LP fee distribution
      errors.push(`LP fee distribution must equal 100% (currently ${(totalBps / 100).toFixed(1)}%)`);
    }

    if (config.rewards.recipients.length > 7) {
      errors.push('Maximum 7 fee collectors allowed');
    }

    if (config.rewards.recipients.length === 0) {
      errors.push('At least one fee collector required');
    }

    // Check for duplicate addresses
    const addresses = config.rewards.recipients.map(r => r.recipient.toLowerCase()).filter(addr => addr);
    const duplicates = addresses.filter((addr, index) => addresses.indexOf(addr) !== index);
    if (duplicates.length > 0) {
      errors.push('Duplicate recipient addresses found');
    }

    // Check for zero allocations
    const zeroAllocations = config.rewards.recipients.filter(r => r.bps === 0);
    if (zeroAllocations.length > 0) {
      warnings.push(`${zeroAllocations.length} recipients have 0% allocation`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      totalBps,
      maxCollectors: 7,
      remainingBps: 10000 - totalBps
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
               Total fee: {feeInfo.totalFee} | Protocol: {feeInfo.protocolFee} (automatic) | LP Distribution: {feeInfo.lpDistributable} (You: {feeInfo.userReceives}, Platform: {feeInfo.astropadReceives})
             </div>
          </div>

          {/* Fee Collectors Manager */}
          <FeeCollectorsManager
            recipients={config.rewards.recipients}
            useSimpleDistribution={config.rewards.useSimpleDistribution}
            onRecipientsChange={handleFeeCollectorsChange}
            onUseSimpleDistributionChange={handleDistributionModeChange}
            validation={validateFeeDistribution()}
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
              <div className="mt-lg">
                <label className="block text-sm font-semibold text-primary mb-sm">
                  Custom MEV Module Address
                  <InfoTooltip content="(Advanced) Use a custom MEV module contract address. Leave blank for default block delay module." />
                </label>
                <input
                  type="text"
                  value={config.mev.customModule || ''}
                  onChange={e => patchedUpdateConfig({ mev: { ...config.mev, customModule: e.target.value } })}
                  placeholder="0x... (optional)"
                  className="input font-mono text-xs"
                />
                <div className="text-xs text-muted mt-sm">
                  Leave blank to use the default block delay module.
                </div>
              </div>
              <div className="mt-lg">
                <label className="block text-sm font-semibold text-primary mb-sm">
                  Custom MEV Module Data (bytes)
                  <InfoTooltip content="(Advanced) Pass custom data to the MEV module. Use only if your module requires it." />
                </label>
                <input
                  type="text"
                  value={config.mev.customData || ''}
                  onChange={e => patchedUpdateConfig({ mev: { ...config.mev, customData: e.target.value } })}
                  placeholder="0x... (optional)"
                  className="input font-mono text-xs"
                />
                <div className="text-xs text-muted mt-sm">
                  Leave blank unless your custom module requires data.
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Pool Configuration */}
      <div className="card card-hover">
        <div className="flex items-center space-x-md mb-lg">
          <h3 className="text-xl font-bold text-primary">Pool Configuration</h3>
          <InfoTooltip content="Advanced Uniswap V4 pool settings for optimal trading. You can customize all pool and fee parameters here." />
        </div>

        <div className="grid grid-2 gap-lg">
          <div>
            <label className="block text-sm font-semibold text-primary mb-sm">
              Tick Spacing
            </label>
            <select
              value={config.pool.tickSpacing}
              onChange={(e) => handleTickSpacingChange(parseInt(e.target.value))}
              className="input"
            >
              <option value={10}>10 (0.01% precision)</option>
              <option value={60}>60 (0.06% precision)</option>
              <option value={200}>200 (0.20% precision)</option>
              <option value={2000}>2000 (2.00% precision)</option>
            </select>
            <div className="text-xs text-muted mt-sm">
              Smaller values = higher precision, higher gas costs
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-primary mb-sm">
              Starting Tick
            </label>
            <input
              type="number"
              value={config.pool.tickIfToken0IsClanker}
              onChange={(e) => handleStartingTickChange(parseInt(e.target.value || '-230400'))}
              className="input"
              step={config.pool.tickSpacing}
            />
            <div className="text-xs text-muted mt-sm">
              Initial price position (must be multiple of tick spacing)
            </div>
          </div>
        </div>

        {/* Advanced Pool/Hook Config */}
        <div className="mt-lg">
          <label className="flex items-center space-x-md cursor-pointer">
            <input
              type="checkbox"
              checked={config.advanced.customHookData}
              onChange={e => patchedUpdateConfig({ advanced: { ...config.advanced, customHookData: e.target.checked } })}
              className="rounded"
            />
            <span className="form-label">Enable Advanced Pool/Hook Configuration</span>
            <InfoTooltip content="Expose all static/dynamic fee parameters and custom poolData for advanced users." />
          </label>
        </div>
        {config.advanced.customHookData && (
          <div className="space-y-lg mt-lg">
            <div>
              <label className="block text-sm font-semibold text-primary mb-sm">
                Custom Pool Data (bytes)
                <InfoTooltip content="(Advanced) Pass custom poolData bytes to the pool/hook. Use only if you know what you're doing." />
              </label>
              <input
                type="text"
                value={config.advanced.hookData || ''}
                onChange={e => patchedUpdateConfig({ advanced: { ...config.advanced, hookData: e.target.value } })}
                placeholder="0x... (optional)"
                className="input font-mono text-xs"
              />
              <div className="text-xs text-muted mt-sm">
                Leave blank unless you need to pass custom data to the pool/hook.
              </div>
            </div>
            {config.fees.type === 'static' && (
              <div className="grid grid-2 gap-lg">
                <div>
                  <label className="block text-sm font-semibold text-primary mb-sm">
                    Clanker Fee (bps)
                    <InfoTooltip content="Fee on the Clanker token. Units are in basis points (1% = 100 bps)." />
                  </label>
                  <input
                    type="number"
                    value={config.fees.static?.clankerFeeBps || 100}
                    onChange={e => patchedUpdateConfig({ fees: { ...config.fees, static: { ...defaultStatic, ...config.fees.static, clankerFeeBps: Number(e.target.value) } } })}
                    min={0}
                    max={2000}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-primary mb-sm">
                    Paired Fee (bps)
                    <InfoTooltip content="Fee on the paired token. Units are in basis points (1% = 100 bps)." />
                  </label>
                  <input
                    type="number"
                    value={config.fees.static?.pairedFeeBps || 100}
                    onChange={e => patchedUpdateConfig({ fees: { ...config.fees, static: { ...defaultStatic, ...config.fees.static, pairedFeeBps: Number(e.target.value) } } })}
                    min={0}
                    max={2000}
                    className="input"
                  />
                </div>
              </div>
            )}
            {config.fees.type === 'dynamic' && (
              <div className="space-y-lg">
                <div className="grid grid-2 gap-lg">
                  <div>
                    <label className="block text-sm font-semibold text-primary mb-sm">
                      Base Fee (bps)
                      <InfoTooltip content="Minimum fee in basis points (1% = 100 bps)." />
                    </label>
                    <input
                      type="number"
                      value={config.fees.dynamic?.baseFee || 100}
                      onChange={e => patchedUpdateConfig({ fees: { ...config.fees, dynamic: { ...defaultDynamic, ...config.fees.dynamic, baseFee: Number(e.target.value) } } })}
                      min={25}
                      max={2000}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-primary mb-sm">
                      Max Fee (bps)
                      <InfoTooltip content="Maximum fee in basis points (1% = 100 bps)." />
                    </label>
                    <input
                      type="number"
                      value={config.fees.dynamic?.maxFee || 300}
                      onChange={e => patchedUpdateConfig({ fees: { ...config.fees, dynamic: { ...defaultDynamic, ...config.fees.dynamic, maxFee: Number(e.target.value) } } })}
                      min={0}
                      max={3000}
                      className="input"
                    />
                  </div>
                </div>
                <div className="grid grid-2 gap-lg">
                  <div>
                    <label className="block text-sm font-semibold text-primary mb-sm">
                      Reference Tick Filter Period (seconds)
                      <InfoTooltip content="Period for reference tick filter. Controls volatility window." />
                    </label>
                    <input
                      type="number"
                      value={config.fees.dynamic?.referenceTickFilterPeriod || 3600}
                      onChange={e => patchedUpdateConfig({ fees: { ...config.fees, dynamic: { ...defaultDynamic, ...config.fees.dynamic, referenceTickFilterPeriod: Number(e.target.value) } } })}
                      min={1}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-primary mb-sm">
                      Reset Period (seconds)
                      <InfoTooltip content="How often the fee resets to base. Controls fee decay." />
                    </label>
                    <input
                      type="number"
                      value={config.fees.dynamic?.resetPeriod || 86400}
                      onChange={e => patchedUpdateConfig({ fees: { ...config.fees, dynamic: { ...defaultDynamic, ...config.fees.dynamic, resetPeriod: Number(e.target.value) } } })}
                      min={1}
                      className="input"
                    />
                  </div>
                </div>
                <div className="grid grid-2 gap-lg">
                  <div>
                    <label className="block text-sm font-semibold text-primary mb-sm">
                      Reset Tick Filter (bps)
                      <InfoTooltip content="Basis points for reset tick filter. Controls fee reset sensitivity." />
                    </label>
                    <input
                      type="number"
                      value={config.fees.dynamic?.resetTickFilter || 500}
                      onChange={e => patchedUpdateConfig({ fees: { ...config.fees, dynamic: { ...defaultDynamic, ...config.fees.dynamic, resetTickFilter: Number(e.target.value) } } })}
                      min={0}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-primary mb-sm">
                      Fee Control Numerator
                      <InfoTooltip content="Controls how quickly fees increase with volatility." />
                    </label>
                    <input
                      type="number"
                      value={config.fees.dynamic?.feeControlNumerator || 100}
                      onChange={e => patchedUpdateConfig({ fees: { ...config.fees, dynamic: { ...defaultDynamic, ...config.fees.dynamic, feeControlNumerator: Number(e.target.value) } } })}
                      min={1}
                      className="input"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-primary mb-sm">
                    Decay Filter Bps
                    <InfoTooltip content="Decay rate for previous volatility (e.g., 9500 = 95%)." />
                  </label>
                  <input
                    type="number"
                    value={config.fees.dynamic?.decayFilterBps || 9500}
                    onChange={e => patchedUpdateConfig({ fees: { ...config.fees, dynamic: { ...defaultDynamic, ...config.fees.dynamic, decayFilterBps: Number(e.target.value) } } })}
                    min={0}
                    max={10000}
                    className="input"
                  />
                </div>
              </div>
            )}
          </div>
        )}
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

      {/* Advanced TokenConfig Fields */}
      <div className="card card-hover">
        <div className="flex items-center space-x-md mb-lg">
          <h3 className="text-xl font-bold text-primary">Advanced TokenConfig Fields</h3>
          <InfoTooltip content="Set advanced deployment fields like custom salt for vanity address and context fields for provenance or integrations." />
        </div>
        <div className="space-y-lg">
          <div className="form-group">
            <label className="form-label">
              Vanity Custom Salt (bytes32, optional)
              <InfoTooltip content="Advanced: Set a custom salt for deterministic or vanity address deployment. Leave blank for random. Use 0x... format (32 bytes)." />
            </label>
            <input
              type="text"
              value={config.vanity.customSalt || ''}
              onChange={e => patchedUpdateConfig({ vanity: { ...config.vanity, customSalt: e.target.value } })}
              placeholder="0x... (optional, 32 bytes)"
              className="input font-mono text-xs"
              maxLength={66}
            />
            <div className="form-hint">Leave blank unless you want a specific deterministic or vanity address. Must be 0x-prefixed, 64 hex chars (32 bytes).</div>
          </div>
          {/* Context fields hidden for astropad */}
        </div>
      </div>

      {/* Locker Configuration */}
      <div className="card card-hover">
        <div className="flex items-center space-x-md mb-lg">
          <h3 className="text-xl font-bold text-primary">Locker Configuration</h3>
          <InfoTooltip content="Configure the locker contract, locker data, and reward admins/recipients for advanced liquidity management." />
        </div>
        <div className="space-y-lg">
          <div>
            <label className="block text-sm font-semibold text-primary mb-sm">
              Locker Address
              <InfoTooltip content="Address of the locker contract. Defaults to the recommended Clanker locker." />
            </label>
            <input
              type="text"
              value={config.locker.locker}
              onChange={e => patchedUpdateConfig({ locker: { ...config.locker, locker: e.target.value } })}
              className="input font-mono text-xs"
              placeholder="0x..."
            />
            <div className="text-xs text-muted mt-sm">
              Use the default unless you have a custom locker contract.
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-primary mb-sm">
              Locker Data (bytes)
              <InfoTooltip content="(Advanced) Encoded locker data for custom logic. Leave blank for default behavior." />
            </label>
            <input
              type="text"
              value={config.locker.lockerData}
              onChange={e => patchedUpdateConfig({ locker: { ...config.locker, lockerData: e.target.value } })}
              className="input font-mono text-xs"
              placeholder="0x... (optional)"
            />
            <div className="text-xs text-muted mt-sm">
              Leave blank unless your locker requires custom data.
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-primary mb-sm">
              Reward Recipients (comma-separated addresses)
              <InfoTooltip content="Addresses that receive rewards from the locker. Separate multiple addresses with commas." />
            </label>
            <input
              type="text"
              value={config.rewards.recipients.map(r => r.recipient).join(', ')}
              onChange={e => {
                const recipients = e.target.value.split(',').map(a => a.trim());
                patchedUpdateConfig({
                  rewards: {
                    ...config.rewards,
                    recipients: config.rewards.recipients.map((r, i) => ({ ...r, recipient: recipients[i] || r.recipient }))
                  }
                });
              }}
              className="input font-mono text-xs"
              placeholder="0x..., 0x..., ..."
            />
            <div className="text-xs text-muted mt-sm">
              Each reward recipient address will receive a share of rewards.
            </div>
          </div>
        </div>
      </div>

      {/* Extensions (Advanced) */}
      <div className="card card-hover">
        <div className="flex items-center space-x-md mb-lg">
          <h3 className="text-xl font-bold text-primary">Extensions (Advanced)</h3>
          <InfoTooltip content="Add arbitrary extensions to your token deployment. For advanced users and integrations only." />
        </div>
        <div className="space-y-md">
          {(config.advanced.customExtensions || []).map((ext, idx) => (
            <div key={idx} className="grid grid-4 gap-md items-center">
              <input type="text" value={ext.address || ''} onChange={e => {
                const updated = [...config.advanced.customExtensions];
                updated[idx] = { ...updated[idx], address: e.target.value };
                patchedUpdateConfig({ advanced: { ...config.advanced, customExtensions: updated } });
              }} placeholder="Extension Address" className="input font-mono text-xs" />
              <input type="number" value={ext.msgValue || ''} onChange={e => {
                const updated = [...config.advanced.customExtensions];
                updated[idx] = { ...updated[idx], msgValue: Number(e.target.value) };
                patchedUpdateConfig({ advanced: { ...config.advanced, customExtensions: updated } });
              }} placeholder="msg.value" className="input font-mono text-xs" />
              <input type="number" value={ext.extensionBps || ''} onChange={e => {
                const updated = [...config.advanced.customExtensions];
                updated[idx] = { ...updated[idx], extensionBps: Number(e.target.value) };
                patchedUpdateConfig({ advanced: { ...config.advanced, customExtensions: updated } });
              }} placeholder="Extension Bps" className="input font-mono text-xs" />
              <input type="text" value={ext.extensionData || ''} onChange={e => {
                const updated = [...config.advanced.customExtensions];
                updated[idx] = { ...updated[idx], extensionData: e.target.value };
                patchedUpdateConfig({ advanced: { ...config.advanced, customExtensions: updated } });
              }} placeholder="Extension Data (bytes)" className="input font-mono text-xs" />
              <button type="button" onClick={() => {
                const updated = [...config.advanced.customExtensions];
                updated.splice(idx, 1);
                patchedUpdateConfig({ advanced: { ...config.advanced, customExtensions: updated } });
              }} className="btn btn-secondary" style={{ padding: 'var(--spacing-sm)' }}>✕</button>
            </div>
          ))}
          <button type="button" onClick={() => {
            const updated = [...(config.advanced.customExtensions || []), { address: '', msgValue: 0, extensionBps: 0, extensionData: '' }];
            patchedUpdateConfig({ advanced: { ...config.advanced, customExtensions: updated } });
          }} className="btn btn-secondary text-sm mt-md">
            + Add Extension
          </button>
        </div>
      </div>
      {/* Gas/Fee Estimation Controls (Advanced) */}
      <div className="card card-hover">
        <div className="flex items-center space-x-md mb-lg">
          <h3 className="text-xl font-bold text-primary">Gas/Fee Estimation Controls (Advanced)</h3>
          <InfoTooltip content="Override gas estimation or enable gas optimization. For advanced users only." />
        </div>
        <div className="space-y-md">
          <label className="flex items-center space-x-md cursor-pointer">
            <input
              type="checkbox"
              checked={config.advanced.gasOptimization}
              onChange={e => patchedUpdateConfig({ advanced: { ...config.advanced, gasOptimization: e.target.checked } })}
              className="rounded"
            />
            <span className="form-label">Enable Gas Optimization</span>
          </label>
          <div className="form-group">
            <label className="form-label">Custom Gas Limit <InfoTooltip content='Advanced: Set a custom gas limit for deployment. Leave blank for automatic estimation.' /></label>
            <input
              type="number"
              value={config.advanced.customGasLimit || ''}
              onChange={e => patchedUpdateConfig({ advanced: { ...config.advanced, customGasLimit: Number(e.target.value) } })}
              placeholder="e.g., 5000000 (optional)"
              className="input font-mono text-xs"
            />
          </div>
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