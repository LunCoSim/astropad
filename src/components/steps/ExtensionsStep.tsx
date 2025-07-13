import type { TokenConfig } from '../../../lib/types';
import { InfoTooltip } from '../ui/InfoTooltip';
import { calculateDevBuyTokens } from '../../../lib/calculations';
import { useState, useEffect } from 'react';
import { usePublicClient } from 'wagmi';
import { validatePairToken } from '../../../lib/validation';
import { BASE_NETWORK } from '../../../lib/clanker-utils';

interface ExtensionsStepProps {
  config: TokenConfig;
  updateConfig: (updates: Partial<TokenConfig>) => void;
  onNext: () => void;
  onPrevious: () => void;
}

export function ExtensionsStep({ config, updateConfig, onNext, onPrevious }: ExtensionsStepProps) {
  const publicClient = usePublicClient();
  const [pairTokenInfo, setPairTokenInfo] = useState<{symbol: string, decimals: number} | null>(null);
  const [pairTokenValidating, setPairTokenValidating] = useState(false);

  useEffect(() => {
    const validateToken = async () => {
      if (config.pairTokenType === 'custom' && config.customPairTokenAddress && publicClient) {
        try {
          setPairTokenValidating(true);
          const tokenAddress = config.customPairTokenAddress as `0x${string}`;
          const tokenInfo = await validatePairToken(publicClient, tokenAddress);
          if (tokenInfo) {
            setPairTokenInfo(tokenInfo);
          } else {
            setPairTokenInfo(null);
          }
        } catch (error) {
          setPairTokenInfo(null);
        } finally {
          setPairTokenValidating(false);
        }
      } else {
        setPairTokenInfo(null);
      }
    };
    validateToken();
  }, [config.pairTokenType, config.customPairTokenAddress, publicClient]);

  // Moved const definitions here to avoid TDZ
  // Ensure all extension configs are always defined for safe access
  // Removed presale config as presale is unsupported in v4
  const vault = config.vault || {
    enabled: false,
    percentage: 5,
    lockupDuration: 7 * 24 * 60 * 60,
    vestingDuration: 0,
  };

  // Calculate available supply for dev buy (subtract vault and airdrop)
  const totalTokenSupply = 100_000_000_000; // Default supply
  let availableSupply = totalTokenSupply;
  if (vault.enabled && vault.percentage > 0) {
    availableSupply -= (totalTokenSupply * vault.percentage) / 100;
  }
  if (availableSupply < 0) availableSupply = 0;

  // Use the correct paired token address for WETH if not set
  let pairedToken = config.pool?.pairedToken;
  if (!pairedToken && config.pairTokenType === 'WETH') {
    // Import BASE_NETWORK at the top if not already
    // import { BASE_NETWORK } from '../../../lib/clanker-utils';
    pairedToken = BASE_NETWORK.WETH_ADDRESS;
  }

  // Remove all Dev Buy logic, state, and JSX (card, calculations, useEffect, etc.)

  return (
    <div className="space-y-2xl animate-fade-in">
      {/* Header */}
      <div className="text-center space-y-md">
        <h2 className="text-4xl font-bold text-primary mb-md">
          Token <span className="text-gradient">Extensions</span>
        </h2>
        <p className="text-lg text-secondary mx-auto" style={{ maxWidth: '48rem', lineHeight: '1.7' }}>
          Configure optional features like token vault, airdrops, and automated dev purchases.
        </p>
      </div>

      {/* Removed Presale Extension Configuration as presale is unsupported in v4 */}

      {/* Vault Configuration */}
      <div className="card card-hover">
        <div className="flex items-center space-x-md mb-lg">
          <h3 className="text-xl font-bold text-primary">Token Vault</h3>
          <InfoTooltip content="Lock tokens for team/project treasury with vesting" />
        </div>

        <div className="space-y-lg">
          <label className="flex items-center space-x-md cursor-pointer">
            <input
              type="checkbox"
              checked={vault.enabled}
              onChange={(e) => updateConfig({ vault: { ...vault, enabled: e.target.checked } })}
              className="rounded"
            />
            <span className="form-label">Enable Token Vault</span>
          </label>

          {vault.enabled && (
            <div className="space-y-lg">
              <div className="grid grid-2 gap-lg">
                <div className="form-group">
                  <label className="form-label">Vault Percentage (%)</label>
                  <input
                    type="number"
                    value={vault.percentage}
                    onChange={(e) => updateConfig({ vault: { ...vault, percentage: Number(e.target.value) } })}
                    min="0"
                    max="50"
                    step="0.1"
                    className="input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Lockup Duration (days)</label>
                  <input
                    type="number"
                    value={vault.lockupDuration / (24 * 60 * 60)}
                    onChange={(e) => updateConfig({ vault: { ...vault, lockupDuration: Number(e.target.value) * 24 * 60 * 60 } })}
                    min="0"
                    className="input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Vesting Duration (days)</label>
                <input
                  type="number"
                  value={vault.vestingDuration / (24 * 60 * 60)}
                  onChange={(e) => updateConfig({ vault: { ...vault, vestingDuration: Number(e.target.value) * 24 * 60 * 60 } })}
                  min="0"
                  className="input"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Airdrop Configuration */}
      <div className="card card-hover">
        <div className="flex items-center space-x-md mb-lg">
          <h3 className="text-xl font-bold text-primary">Token Airdrop</h3>
          <InfoTooltip content="Distribute tokens to specific addresses" />
        </div>
        <div className="space-y-lg text-center">
          <p className="text-lg text-secondary">Coming Soon</p>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center mt-2xl">
        <button onClick={onPrevious} className="btn btn-secondary">
          ← Back to Liquidity
        </button>
        
        <button onClick={onNext} className="btn btn-primary btn-lg">
          Continue to Advanced Config →
        </button>
      </div>
    </div>
  );
} 