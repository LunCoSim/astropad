import React from 'react';
import type { TokenConfig } from '../../../lib/types.js';
import { VALIDATION_LIMITS } from '../../../lib/constants.js';
import { calculateFeeDistribution, getFeeDisplayInfo } from '../../../lib/fees.js';

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
          pairedFeeBps: userFeeBps
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
        recipients
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

  const maxFeePercent = VALIDATION_LIMITS.MAX_FEE_BPS / 100;
  const currentFeePercent = config.fees.userFeeBps / 100;
  const feeDisplayInfo = getFeeDisplayInfo(config.fees.userFeeBps);

  return (
    <div className="space-y-2xl animate-fade-in">
      {/* Header */}
      <div className="text-center space-y-md">
        <h2 className="text-4xl font-bold text-primary mb-md">
          <span className="text-gradient">Fee Configuration</span>
        </h2>
        <p className="text-lg text-secondary mx-auto" style={{ maxWidth: '48rem', lineHeight: '1.7' }}>
          Configure trading fees for this token. Fees are automatically distributed between you, Clanker protocol, and AstroPad.
          Total Trading Fee: {currentFeePercent.toFixed(2)}%
        </p>
      </div>

      {/* Fee Configuration Card */}
      <div className="card card-hover">
        <div className="space-y-lg">
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
        <div className="space-y-lg">
          <div>
            <h3 className="text-xl font-bold text-primary mb-md">Vanity Address</h3>
            <p className="text-sm text-secondary mb-lg">
              Generate a custom token address with your preferred suffix.
            </p>
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
      </div>

      {/* Fee Tips */}
      <div className="card" style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
        <h4 className="font-semibold text-primary mb-md">💡 Fee Tips</h4>
        <ul className="text-sm text-secondary space-y-xs">
          <li>• Higher fees may discourage trading but increase revenue per trade</li>
          <li>• Lower fees encourage more trading volume</li>
          <li>• Most successful tokens use fees between 0.5% - 2%</li>
          <li>• Each token can have different fees based on your strategy</li>
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