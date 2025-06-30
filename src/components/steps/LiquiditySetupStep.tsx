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
    <div className="space-y-10 animate-fade-in-up">
      {/* Enhanced Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-secondary-500 to-success-500 rounded-3xl shadow-lg shadow-secondary-500/25 animate-floating">
          <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
            <path fillRule="evenodd" d="M4 5a2 2 0 012-2v1a3 3 0 003 3h2a3 3 0 003-3V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zM8 8a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1zm1 3a1 1 0 100 2h2a1 1 0 100-2H9z" clipRule="evenodd"/>
          </svg>
        </div>
        <h2 className="text-4xl font-bold text-white mb-4">
          Liquidity <span className="text-gradient-secondary">Configuration</span>
        </h2>
        <p className="text-lg text-white/70 max-w-3xl mx-auto leading-relaxed">
          Configure your token's initial liquidity, trading pairs, and market parameters. This determines how your token will trade on DEXs.
        </p>
      </div>

      {/* Trading Pair Configuration */}
      <div className="card p-8 card-hover animate-slide-in-left">
        <div className="flex items-center space-x-4 mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-secondary-500 to-secondary-600 rounded-2xl flex items-center justify-center shadow-lg">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 2a2 2 0 00-2 2v11a3 3 0 106 0V4a2 2 0 00-2-2H4zM3 15a1 1 0 011-1h1a1 1 0 011 1v1a1 1 0 01-1 1H4a1 1 0 01-1-1v-1zm7-11a1 1 0 000 2h5a1 1 0 000-2h-5zM9 9a1 1 0 100 2h5a1 1 0 100-2H9zm0 4a1 1 0 100 2h5a1 1 0 100-2H9z" clipRule="evenodd"/>
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-white">Trading Pair Setup</h3>
            <p className="text-white/60 text-sm">Choose your trading pair and initial market parameters</p>
          </div>
          <div className="h-px bg-gradient-to-r from-white/30 to-transparent flex-1"></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Pair Token Selection */}
          <div className="space-y-4">
            <label className="text-sm font-semibold text-white/90">
              Pair Token
              <InfoTooltip content="The token your new token will be paired with in the liquidity pool." />
            </label>
            
            <div className="space-y-3">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => updateConfig({ pairTokenType: 'WETH' })}
                  className={`
                    flex-1 p-4 rounded-xl border-2 transition-all duration-200
                    ${config.pairTokenType === 'WETH'
                      ? 'border-primary-500 bg-primary-500/20 shadow-glow'
                      : 'border-white/20 bg-white/5 hover:border-white/30'
                    }
                  `}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-sm">ETH</span>
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-white">WETH</div>
                      <div className="text-xs text-white/60">Most liquid pair</div>
                    </div>
                  </div>
                </button>
                
                <button
                  type="button"
                  onClick={() => updateConfig({ pairTokenType: 'custom' })}
                  className={`
                    flex-1 p-4 rounded-xl border-2 transition-all duration-200
                    ${config.pairTokenType === 'custom'
                      ? 'border-primary-500 bg-primary-500/20 shadow-glow'
                      : 'border-white/20 bg-white/5 hover:border-white/30'
                    }
                  `}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/>
                      </svg>
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-white">Custom</div>
                      <div className="text-xs text-white/60">Other ERC20</div>
                    </div>
                  </div>
                </button>
              </div>

              {config.pairTokenType === 'custom' && (
                <div className="space-y-3 animate-slide-down">
                  <input
                    type="text"
                    value={config.customPairTokenAddress}
                    onChange={(e) => updateConfig({ customPairTokenAddress: e.target.value })}
                    placeholder="0x... (Custom token address)"
                    className="input w-full font-mono text-sm text-white placeholder-white/40 focus:shadow-glow"
                  />
                  
                  {pairTokenValidating && (
                    <div className="flex items-center space-x-2 text-secondary-400">
                      <div className="w-4 h-4 border-2 border-secondary-400 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-sm">Validating token...</span>
                    </div>
                  )}
                  
                  {pairTokenInfo && (
                    <div className="bg-success-500/20 border border-success-500/30 rounded-xl p-3">
                      <div className="text-sm text-success-300">
                        ✓ Valid token: {pairTokenInfo.symbol} ({pairTokenInfo.decimals} decimals)
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Starting Market Cap */}
          <div className="space-y-4">
            <label className="text-sm font-semibold text-white/90">
              Initial Market Cap
              <span className="text-danger-400 ml-1">*</span>
              <InfoTooltip content="Starting market capitalization in ETH. This determines the initial price of your token." />
            </label>
            
            <div className="relative group">
              <input
                type="number"
                value={config.startingMarketCap || ''}
                onChange={(e) => updateConfig({ startingMarketCap: parseFloat(e.target.value) || '' })}
                placeholder="1.0"
                step="0.001"
                min="0.001"
                className="input w-full font-mono text-white placeholder-white/40 focus:shadow-glow pr-16"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-6">
                <div className="bg-white/10 px-3 py-1 rounded-md">
                  <span className="text-sm font-mono text-white/80">ETH</span>
                </div>
              </div>
            </div>
            
            <div className="text-xs text-white/50 space-y-1">
              <div>• Minimum: 0.001 ETH</div>
              <div>• Recommended: 1-10 ETH for good liquidity</div>
            </div>
          </div>
        </div>
      </div>

      {/* Pool Position Configuration */}
      <div className="card p-8 card-hover animate-slide-in-right">
        <div className="flex items-center space-x-4 mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-success-500 to-success-600 rounded-2xl flex items-center justify-center shadow-lg">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-white">Liquidity Position</h3>
            <p className="text-white/60 text-sm">Configure the price range for your liquidity</p>
          </div>
          <div className="h-px bg-gradient-to-r from-white/30 to-transparent flex-1"></div>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Object.entries(POOL_POSITIONS).map(([key, position]) => (
              <button
                key={key}
                type="button"
                onClick={() => updateConfig({ poolPositionType: key as any })}
                className={`
                  p-4 rounded-xl border-2 transition-all duration-200 text-left
                  ${config.poolPositionType === key
                    ? 'border-success-500 bg-success-500/20 shadow-glow'
                    : 'border-white/20 bg-white/5 hover:border-white/30'
                  }
                `}
              >
                <div className="space-y-2">
                  <div className="font-semibold text-white">{key}</div>
                  <div className="text-xs text-white/60">
                    {key === 'Standard' && 'Full range liquidity'}
                    {key === 'Project' && 'Concentrated around current price'}
                    {key === 'Custom' && 'Define your own range'}
                  </div>
                  {position.length > 0 && (
                    <div className="text-xs font-mono text-white/50">
                      Range: {position[0].tickLower} to {position[0].tickUpper}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>

          {config.poolPositionType === 'Custom' && (
            <div className="space-y-4 animate-slide-down">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-white/90">Custom Positions</label>
                <button
                  type="button"
                  onClick={addCustomPosition}
                  className="btn-glass px-4 py-2 text-sm rounded-xl hover:scale-105 transition-transform"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Position
                </button>
              </div>

              <div className="space-y-3">
                {config.customPositions.map((position, index) => (
                  <div key={index} className="bg-white/5 rounded-xl p-4 animate-scale-in">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="text-xs text-white/60 block mb-1">Lower Tick</label>
                        <input
                          type="number"
                          value={position.tickLower}
                          onChange={(e) => updateCustomPosition(index, 'tickLower', parseInt(e.target.value) || 0)}
                          className="input w-full text-sm font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-white/60 block mb-1">Upper Tick</label>
                        <input
                          type="number"
                          value={position.tickUpper}
                          onChange={(e) => updateCustomPosition(index, 'tickUpper', parseInt(e.target.value) || 0)}
                          className="input w-full text-sm font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-white/60 block mb-1">Position %</label>
                        <input
                          type="number"
                          value={position.positionBps / 100}
                          onChange={(e) => updateCustomPosition(index, 'positionBps', (parseFloat(e.target.value) || 0) * 100)}
                          className="input w-full text-sm"
                          max="100"
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={() => removeCustomPosition(index)}
                          className="w-full h-12 bg-danger-500/20 hover:bg-danger-500/30 text-danger-400 rounded-xl flex items-center justify-center transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Token Distribution Preview */}
      {distributions.length > 0 && (
        <div className="card p-8 card-hover animate-fade-in">
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-warning-500 to-warning-600 rounded-2xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z"/>
                <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z"/>
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-white">Token Distribution Preview</h3>
              <p className="text-white/60 text-sm">How your 100B tokens will be allocated</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {distributions.map((dist, index) => (
              <div key={index} className="bg-white/5 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-white">{dist.name}</span>
                  <span className="text-sm font-mono text-success-400">{dist.percentage.toFixed(1)}%</span>
                </div>
                <div className="text-xs font-mono text-white/60">
                  {(dist.amount / 1_000_000_000).toFixed(2)}B tokens
                </div>
                <div className="w-full bg-white/10 rounded-full h-2 mt-2">
                  <div 
                    className="bg-gradient-to-r from-success-400 to-success-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${dist.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between items-center pt-8">
        <button
          onClick={onPrevious}
          className="btn-glass px-6 py-3 rounded-xl hover:scale-105 transition-transform"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
          </svg>
          <span>Back to Basics</span>
        </button>
        
        <button
          onClick={onNext}
          disabled={!isValid}
          className={`
            btn px-8 py-4 text-lg font-semibold rounded-2xl transition-all duration-300 transform
            ${isValid 
              ? 'btn-secondary hover:scale-105 shadow-glow-cyan' 
              : 'bg-white/10 text-white/50 cursor-not-allowed'
            }
          `}
        >
          <span>Continue to Features</span>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </button>
      </div>
    </div>
  );
} 