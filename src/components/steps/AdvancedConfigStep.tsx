import React from 'react';
import type { TokenConfig, RewardRecipient } from '../../../lib/types.js';
import { VALIDATION_LIMITS } from '../../../lib/constants.js';
import { calculateFeeDistribution, getFeeDisplayInfo } from '../../../lib/fees.js';
import { InfoTooltip } from '../ui/InfoTooltip.js';

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
    // Calculate the fee distribution for reward recipients
    const recipients = calculateFeeDistribution(config.tokenAdmin, userFeeBps);
    
    updateConfig({
      fees: {
        type: config.fees.type || 'static',
        userFeeBps,
        static: {
          clankerFeeBps: userFeeBps,
          pairedFeeBps: userFeeBps,
          customDistribution: false
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
        customDistribution: false
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

  const handleFeeTypeChange = (type: 'static' | 'dynamic') => {
    updateConfig({
      fees: {
        ...config.fees,
        type
      }
    });
  };

  const maxFeePercent = VALIDATION_LIMITS.MAX_FEE_BPS / 100;
  const currentFeePercent = config.fees.userFeeBps / 100;
  const feeDisplayInfo = getFeeDisplayInfo(config.fees.userFeeBps);

  return (
    <div className="space-y-2xl animate-fade-in">
      {/* Header */}
      <div className="text-center space-y-md">
        <h2 className="text-4xl font-bold text-primary mb-md">
          <span className="text-gradient">Advanced Configuration</span>
        </h2>
        <p className="text-lg text-secondary mx-auto" style={{ maxWidth: '48rem', lineHeight: '1.7' }}>
          Configure advanced features including MEV protection, pool settings, fee structure, and vanity addresses.
        </p>
      </div>

      {/* MEV Protection Card */}
      <div className="card card-hover">
        <div className="flex items-center space-x-md mb-lg">
          <div style={{ width: '3rem', height: '3rem', background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))', borderRadius: 'var(--radius-xl)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg style={{ width: '1.5rem', height: '1.5rem' }} className="text-primary" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-primary">MEV Protection</h3>
            <p className="text-muted text-sm">Protect against front-running and sandwich attacks</p>
          </div>
        </div>

        <div className="space-y-lg">
          <label className="flex items-center space-x-md cursor-pointer">
            <input
              type="checkbox"
              checked={config.mev.enabled}
              onChange={(e) => handleMevToggle(e.target.checked)}
              className="rounded"
            />
            <span className="form-label">
              Enable MEV Protection (Recommended)
              <InfoTooltip content="MEV protection prevents front-running attacks by adding a 2-block delay before trading can begin." />
            </span>
          </label>

          {config.mev.enabled && (
            <div className="form-group">
              <label className="form-label">
                Block Delay
                <InfoTooltip content="Number of blocks to prevent trading after deployment. 2 blocks (~4 seconds) is recommended." />
              </label>
              <div className="flex items-center space-x-md">
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={config.mev.blockDelay || 2}
                  onChange={(e) => handleMevBlockDelayChange(Number(e.target.value))}
                  className="flex-1"
                />
                <div className="text-sm font-semibold text-primary min-w-[3rem]">
                  {config.mev.blockDelay || 2} blocks
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pool Configuration Card */}
      <div className="card card-hover">
        <div className="flex items-center space-x-md mb-lg">
          <div style={{ width: '3rem', height: '3rem', background: 'linear-gradient(135deg, var(--color-secondary), var(--color-secondary-dark))', borderRadius: 'var(--radius-xl)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg style={{ width: '1.5rem', height: '1.5rem' }} className="text-primary" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-primary">Pool Settings</h3>
            <p className="text-muted text-sm">Advanced Uniswap V4 pool configuration</p>
          </div>
        </div>

        <div className="grid grid-2 gap-lg">
          <div className="form-group">
            <label className="form-label">
              Tick Spacing
              <InfoTooltip content="Tick spacing determines price granularity. Lower values allow more precise pricing but higher gas costs." />
            </label>
            <select
              value={config.pool.tickSpacing}
              onChange={(e) => handleTickSpacingChange(Number(e.target.value))}
              className="input"
            >
              <option value={10}>10 (Highest precision)</option>
              <option value={60}>60 (High precision)</option>
              <option value={200}>200 (Standard)</option>
              <option value={2000}>2000 (Low precision)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">
              Starting Price (Tick)
              <InfoTooltip content="The initial price tick for your token pool. -230400 is a common starting point." />
            </label>
            <input
              type="number"
              value={config.pool.tickIfToken0IsClanker}
              onChange={(e) => handleStartingTickChange(Number(e.target.value))}
              className="input font-mono"
              step="1000"
            />
          </div>
        </div>
      </div>

      {/* Fee Configuration Card */}
      <div className="card card-hover">
        <div className="flex items-center space-x-md mb-lg">
          <div style={{ width: '3rem', height: '3rem', background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-dark))', borderRadius: 'var(--radius-xl)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg style={{ width: '1.5rem', height: '1.5rem' }} className="text-primary" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-primary">Fee Structure</h3>
            <p className="text-muted text-sm">Configure trading fees and distribution</p>
          </div>
        </div>

        <div className="space-y-lg">
          <div className="form-group">
            <label className="form-label">Fee Type</label>
            <div className="grid grid-2 gap-md">
              <label className="flex items-center space-x-md cursor-pointer card p-md">
                <input
                  type="radio"
                  name="feeType"
                  value="static"
                  checked={config.fees.type === 'static'}
                  onChange={() => handleFeeTypeChange('static')}
                  className="rounded"
                />
                <div>
                  <div className="font-semibold text-primary">Static Fees</div>
                  <div className="text-xs text-muted">Fixed percentage fee</div>
                </div>
              </label>
              
              <label className="flex items-center space-x-md cursor-pointer card p-md">
                <input
                  type="radio"
                  name="feeType"
                  value="dynamic"
                  checked={config.fees.type === 'dynamic'}
                  onChange={() => handleFeeTypeChange('dynamic')}
                  className="rounded"
                />
                <div>
                  <div className="font-semibold text-primary">Dynamic Fees</div>
                  <div className="text-xs text-muted">Adjusts with volatility</div>
                </div>
              </label>
            </div>
          </div>

          <div>
            <label htmlFor="fee-slider" className="form-label mb-md">
              Total Trading Fee: {currentFeePercent.toFixed(2)}%
            </label>
            <input
              id="fee-slider"
              type="range"
              min="0"
              max={VALIDATION_LIMITS.MAX_FEE_BPS}
              step="25"
              value={config.fees.userFeeBps}
              onChange={(e) => handleFeeChange(Number(e.target.value))}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, var(--color-primary) 0%, var(--color-primary) ${(config.fees.userFeeBps / VALIDATION_LIMITS.MAX_FEE_BPS) * 100}%, var(--bg-surface) ${(config.fees.userFeeBps / VALIDATION_LIMITS.MAX_FEE_BPS) * 100}%, var(--bg-surface) 100%)`
              }}
            />
            <div className="flex justify-between text-xs text-muted mt-sm">
              <span>0%</span>
              <span>{maxFeePercent}%</span>
            </div>
          </div>

          {config.fees.userFeeBps > 0 && (
            <div className="card" style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
              <h4 className="font-semibold text-primary mb-md">Fee Distribution</h4>
              <div className="space-y-sm">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-secondary">Your share (60%)</span>
                  <span className="font-semibold text-success">
                    {feeDisplayInfo.userReceives}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-secondary">Clanker protocol (20%)</span>
                  <span className="font-semibold text-primary">
                    {feeDisplayInfo.clankerReceives}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-secondary">AstroPad (20%)</span>
                  <span className="font-semibold" style={{ color: 'var(--color-accent)' }}>
                    {feeDisplayInfo.astropadReceives}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Vanity Address Card */}
      <div className="card card-hover">
        <div className="flex items-center space-x-md mb-lg">
          <div style={{ width: '3rem', height: '3rem', background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))', borderRadius: 'var(--radius-xl)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg style={{ width: '1.5rem', height: '1.5rem' }} className="text-primary" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-primary">Vanity Address</h3>
            <p className="text-muted text-sm">Generate a custom token address</p>
          </div>
        </div>
        
        <div className="space-y-lg">
          <label className="flex items-center space-x-md cursor-pointer">
            <input
              type="checkbox"
              checked={config.vanity.enabled}
              onChange={(e) => handleVanityToggle(e.target.checked)}
              className="rounded"
            />
            <span className="form-label">Generate vanity address</span>
          </label>
          
          {config.vanity.enabled && (
            <div className="form-group">
              <label htmlFor="vanity-suffix" className="form-label">
                Desired suffix (4 hex characters)
              </label>
              <input
                id="vanity-suffix"
                type="text"
                value={config.vanity.suffix}
                onChange={(e) => handleVanitySuffixChange(e.target.value.toLowerCase())}
                placeholder="0x1234"
                maxLength={6}
                pattern="0x[0-9a-f]{4}"
                className="input font-mono"
              />
              <p className="text-xs text-muted mt-xs">
                Example: 0x1234 will create an address ending in ...1234
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Tips */}
      <div className="card" style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
        <h4 className="font-semibold text-primary mb-md">💡 Advanced Configuration Tips</h4>
        <ul className="text-sm text-secondary space-y-xs">
          <li>• MEV protection is highly recommended for new token launches</li>
          <li>• Lower tick spacing provides more precise pricing but higher gas costs</li>
          <li>• Dynamic fees can increase revenue during high volatility periods</li>
          <li>• Vanity addresses are purely cosmetic and cost extra gas to generate</li>
          <li>• Most successful tokens use fees between 0.5% - 2%</li>
        </ul>
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