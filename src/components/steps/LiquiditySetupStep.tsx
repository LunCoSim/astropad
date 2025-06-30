import { useState, useEffect } from 'react';
import { usePublicClient } from 'wagmi';
import type { TokenConfig } from '../TokenDeployWizard';
import { InfoTooltip } from '../ui/InfoTooltip';
import { WETH_ADDRESS, POOL_POSITIONS } from 'clanker-sdk';

interface LiquiditySetupStepProps {
  config: TokenConfig;
  updateConfig: (updates: Partial<TokenConfig>) => void;
  onNext: () => void;
  onPrevious: () => void;
}

// ERC20 ABI for token validation
const ERC20_ABI = [
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
];

export function LiquiditySetupStep({ config, updateConfig, onNext, onPrevious }: LiquiditySetupStepProps) {
  const publicClient = usePublicClient();
  const [pairTokenInfo, setPairTokenInfo] = useState<{symbol: string, decimals: number} | null>(null);
  const [pairTokenValidating, setPairTokenValidating] = useState(false);
  const [pairTokenValid, setPairTokenValid] = useState(false);

  const isValid = !!(config.startingMarketCap && config.startingMarketCap > 0);

  // Validate custom pair token
  useEffect(() => {
    const validatePairToken = async () => {
      if (config.pairTokenType === 'custom' && config.customPairTokenAddress) {
        try {
          setPairTokenValidating(true);
          const tokenAddress = config.customPairTokenAddress as `0x${string}`;
          
          const [decimals, symbol] = await Promise.all([
            publicClient?.readContract({
              address: tokenAddress,
              abi: ERC20_ABI,
              functionName: 'decimals',
            }),
            publicClient?.readContract({
              address: tokenAddress,
              abi: ERC20_ABI,
              functionName: 'symbol',
            })
          ]);

          setPairTokenInfo({ symbol: symbol as string, decimals: decimals as number });
          setPairTokenValid(true);
        } catch (error) {
          setPairTokenInfo(null);
          setPairTokenValid(false);
        } finally {
          setPairTokenValidating(false);
        }
      } else {
        setPairTokenInfo(null);
        setPairTokenValid(config.pairTokenType === 'WETH');
      }
    };

    validatePairToken();
  }, [config.pairTokenType, config.customPairTokenAddress, publicClient]);

  const addCustomPosition = () => {
    updateConfig({
      customPositions: [...config.customPositions, { tickLower: -230400, tickUpper: -120000, positionBps: 10000 }]
    });
  };

  const removeCustomPosition = (index: number) => {
    updateConfig({
      customPositions: config.customPositions.filter((_, i) => i !== index)
    });
  };

  const updateCustomPosition = (index: number, field: 'tickLower' | 'tickUpper' | 'positionBps', value: number) => {
    const newPositions = [...config.customPositions];
    newPositions[index] = { ...newPositions[index], [field]: value };
    updateConfig({ customPositions: newPositions });
  };

  // Calculate estimated token distribution
  const calculateDistribution = () => {
    const totalSupply = 100_000_000_000; // 100 billion tokens
    let remaining = totalSupply;
    
    const distributions = [];
    
    if (config.vault.enabled) {
      const vaultTokens = (totalSupply * config.vault.percentage) / 100;
      distributions.push({ name: 'Vault', amount: vaultTokens, percentage: config.vault.percentage });
      remaining -= vaultTokens;
    }
    
    if (config.airdrop.enabled) {
      const airdropTokens = (totalSupply * config.airdrop.percentage) / 100;
      distributions.push({ name: 'Airdrop', amount: airdropTokens, percentage: config.airdrop.percentage });
      remaining -= airdropTokens;
    }
    
    const liquidityPercentage = (remaining / totalSupply) * 100;
    distributions.push({ name: 'Liquidity Pool', amount: remaining, percentage: liquidityPercentage });
    
    return distributions;
  };

  const distributions = calculateDistribution();

  return (
    <div className="space-y-2xl animate-fade-in">
      {/* Enhanced Header */}
      <div className="text-center space-y-md">
        <div className="animate-float mx-auto" style={{ width: '5rem', height: '5rem', background: 'linear-gradient(135deg, var(--color-secondary), var(--color-success))', borderRadius: 'var(--radius-2xl)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg style={{ width: '2.5rem', height: '2.5rem' }} className="text-primary" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
            <path fillRule="evenodd" d="M4 5a2 2 0 012-2v1a3 3 0 003 3h2a3 3 0 003-3V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zM8 8a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1zm1 3a1 1 0 100 2h2a1 1 0 100-2H9z" clipRule="evenodd"/>
          </svg>
        </div>
        <h2 className="text-4xl font-bold text-primary mb-md">
          Liquidity <span className="text-gradient">Configuration</span>
        </h2>
        <p className="text-lg text-secondary mx-auto" style={{ maxWidth: '48rem', lineHeight: '1.7' }}>
          Configure your token's initial liquidity, trading pairs, and market parameters. This determines how your token will trade on DEXs.
        </p>
      </div>

      {/* Trading Pair Configuration */}
      <div className="card card-hover animate-slide-up">
        <div className="flex items-center space-x-md mb-xl">
          <div style={{ width: '3rem', height: '3rem', background: 'linear-gradient(135deg, var(--color-secondary), var(--color-secondary-dark))', borderRadius: 'var(--radius-xl)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg style={{ width: '1.5rem', height: '1.5rem' }} className="text-primary" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 2a2 2 0 00-2 2v11a3 3 0 106 0V4a2 2 0 00-2-2H4zM3 15a1 1 0 011-1h1a1 1 0 011 1v1a1 1 0 01-1 1H4a1 1 0 01-1-1v-1zm7-11a1 1 0 000 2h5a1 1 0 000-2h-5zM9 9a1 1 0 100 2h5a1 1 0 100-2H9zm0 4a1 1 0 100 2h5a1 1 0 100-2H9z" clipRule="evenodd"/>
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-primary">Trading Pair Setup</h3>
            <p className="text-muted text-sm">Choose your trading pair and initial market parameters</p>
          </div>
        </div>

        <div className="grid grid-2 gap-xl">
          {/* Pair Token Selection */}
          <div className="form-group">
            <label className="form-label">
              Pair Token
              <InfoTooltip content="The token your new token will be paired with in the liquidity pool." />
            </label>
            
            <div className="space-y-md">
              <div className="flex gap-md">
                <button
                  type="button"
                  onClick={() => updateConfig({ pairTokenType: 'WETH' })}
                  className={`flex-1 card-hover transition ${config.pairTokenType === 'WETH' ? 'card-gradient' : 'card'}`}
                  style={{ 
                    padding: 'var(--spacing-md)', 
                    borderRadius: 'var(--radius-xl)',
                    border: `2px solid ${config.pairTokenType === 'WETH' ? 'var(--color-primary)' : 'var(--border-primary)'}`
                  }}
                >
                  <div className="flex items-center space-x-md">
                    <div style={{ width: '2.5rem', height: '2.5rem', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span className="text-primary font-bold text-sm">ETH</span>
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-primary">WETH</div>
                      <div className="text-xs text-muted">Most liquid pair</div>
                    </div>
                  </div>
                </button>
                
                <button
                  type="button"
                  onClick={() => updateConfig({ pairTokenType: 'custom' })}
                  className={`flex-1 card-hover transition ${config.pairTokenType === 'custom' ? 'card-gradient' : 'card'}`}
                  style={{ 
                    padding: 'var(--spacing-md)', 
                    borderRadius: 'var(--radius-xl)',
                    border: `2px solid ${config.pairTokenType === 'custom' ? 'var(--color-primary)' : 'var(--border-primary)'}`
                  }}
                >
                  <div className="flex items-center space-x-md">
                    <div style={{ width: '2.5rem', height: '2.5rem', background: 'linear-gradient(135deg, var(--color-secondary), var(--color-secondary-dark))', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg style={{ width: '1.25rem', height: '1.25rem' }} className="text-primary" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/>
                      </svg>
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-primary">Custom</div>
                      <div className="text-xs text-muted">Other ERC20</div>
                    </div>
                  </div>
                </button>
              </div>

              {config.pairTokenType === 'custom' && (
                <div className="space-y-md animate-slide-up">
                  <input
                    type="text"
                    value={config.customPairTokenAddress}
                    onChange={(e) => updateConfig({ customPairTokenAddress: e.target.value })}
                    placeholder="0x... (Custom token address)"
                    className="input font-mono text-sm"
                  />
                  
                  {pairTokenValidating && (
                    <div className="flex items-center space-x-sm" style={{ color: 'var(--color-secondary)' }}>
                      <div className="animate-pulse" style={{ width: '1rem', height: '1rem', border: '2px solid var(--color-secondary)', borderTop: '2px solid transparent', borderRadius: '50%' }}></div>
                      <span className="text-sm">Validating token...</span>
                    </div>
                  )}
                  
                  {pairTokenInfo && (
                    <div className="card" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: 'var(--spacing-md)' }}>
                      <div className="text-sm" style={{ color: 'var(--color-success)' }}>
                        ✓ Valid token: {pairTokenInfo.symbol} ({pairTokenInfo.decimals} decimals)
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Starting Market Cap */}
          <div className="form-group">
            <label className="form-label">
              Initial Market Cap
              <span className="required">*</span>
              <InfoTooltip content="Starting market capitalization in ETH. This determines the initial price of your token." />
            </label>
            
            <div className="relative">
              <input
                type="number"
                value={config.startingMarketCap || ''}
                onChange={(e) => updateConfig({ startingMarketCap: parseFloat(e.target.value) || '' })}
                placeholder="1.0"
                step="0.001"
                min="0.001"
                className="input font-mono"
                style={{ paddingRight: '4rem' }}
              />
              <div className="absolute" style={{ top: '50%', right: 'var(--spacing-md)', transform: 'translateY(-50%)' }}>
                <div style={{ background: 'var(--bg-surface)', padding: 'var(--spacing-xs) var(--spacing-md)', borderRadius: 'var(--radius-md)' }}>
                  <span className="text-sm font-mono text-secondary">ETH</span>
                </div>
              </div>
            </div>
            
            <div className="form-hint space-y-xs">
              <div>• Minimum: 0.001 ETH</div>
              <div>• Recommended: 1-10 ETH for good liquidity</div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center mt-2xl">
        <button
          onClick={onPrevious}
          className="btn btn-secondary"
        >
          <svg style={{ width: '1rem', height: '1rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
          </svg>
          Back to Token Details
        </button>
        
        <button
          onClick={onNext}
          disabled={!isValid}
          className="btn btn-primary btn-lg"
        >
          Continue to Extensions
          <svg style={{ width: '1rem', height: '1rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </button>
      </div>
    </div>
  );
} 