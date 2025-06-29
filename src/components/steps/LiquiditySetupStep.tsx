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
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="w-20 h-20 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-3xl flex items-center justify-center text-white text-3xl mx-auto mb-4 shadow-lg">
          💧
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Liquidity Setup</h2>
        <p className="text-gray-600 max-w-lg mx-auto">
          Configure your token's initial liquidity and trading pair settings.
        </p>
      </div>

      {/* Market Cap Configuration */}
      <div className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-2xl p-6 border border-blue-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <span className="w-2 h-2 bg-cyan-500 rounded-full mr-3"></span>
          Market Cap
        </h3>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-label flex items-center space-x-2">
              <span>Starting Market Cap (ETH)</span>
              <span className="text-red-500">*</span>
              <InfoTooltip content="The initial market capitalization of your token in ETH. This determines the starting price and initial liquidity." />
            </label>
            <input
              type="number"
              value={config.startingMarketCap}
              onChange={(e) => updateConfig({ startingMarketCap: parseFloat(e.target.value) || '' })}
              placeholder="1.0"
              className="input w-full"
              min="0.01"
              step="0.01"
            />
            <div className="text-xs text-gray-500">
              Minimum 0.01 ETH. Higher values create more stable initial trading.
            </div>
          </div>

          {config.startingMarketCap && (
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-3">Price Calculation</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Total Supply:</span>
                  <span className="font-mono ml-2">100,000,000,000 {config.symbol || 'TOKEN'}</span>
                </div>
                <div>
                  <span className="text-gray-600">Initial Price:</span>
                  <span className="font-mono ml-2">
                    {config.startingMarketCap ? (Number(config.startingMarketCap) / 100_000_000_000).toExponential(2) : '0'} ETH
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Trading Pair Configuration */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl p-6 border border-purple-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <span className="w-2 h-2 bg-purple-500 rounded-full mr-3"></span>
          Trading Pair
        </h3>

        <div className="space-y-6">
          <div className="space-y-4">
            <label className="text-label flex items-center space-x-2">
              <span>Pair Token</span>
              <InfoTooltip content="Choose which token to pair with your token. ETH (WETH) is recommended for most projects." />
            </label>
            
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => updateConfig({ pairTokenType: 'WETH' })}
                className={`
                  flex-1 p-4 rounded-xl border-2 transition-all
                  ${config.pairTokenType === 'WETH'
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }
                `}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    ETH
                  </div>
                  <div className="text-left">
                    <div className="font-semibold">Ethereum (WETH)</div>
                    <div className="text-sm opacity-75">Recommended</div>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => updateConfig({ pairTokenType: 'custom' })}
                className={`
                  flex-1 p-4 rounded-xl border-2 transition-all
                  ${config.pairTokenType === 'custom'
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }
                `}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    ?
                  </div>
                  <div className="text-left">
                    <div className="font-semibold">Custom Token</div>
                    <div className="text-sm opacity-75">Advanced</div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {config.pairTokenType === 'custom' && (
            <div className="space-y-2 pl-4 border-l-2 border-purple-200">
              <label className="text-label">Custom Token Address</label>
              <input
                type="text"
                value={config.customPairTokenAddress}
                onChange={(e) => updateConfig({ customPairTokenAddress: e.target.value })}
                placeholder="0x..."
                className="input w-full font-mono text-sm"
              />
              
              {pairTokenValidating && (
                <div className="text-sm text-gray-500 flex items-center space-x-2">
                  <div className="spinner w-4 h-4"></div>
                  <span>Validating token...</span>
                </div>
              )}
              
              {pairTokenInfo && (
                <div className="text-sm text-green-600 bg-green-50 p-3 rounded-lg">
                  ✅ Valid token: {pairTokenInfo.symbol} ({pairTokenInfo.decimals} decimals)
                </div>
              )}
              
              {config.customPairTokenAddress && !pairTokenValidating && !pairTokenValid && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                  ❌ Invalid token address or unable to validate
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Pool Position Configuration */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
          Pool Position
        </h3>

        <div className="space-y-6">
          <div className="space-y-4">
            <label className="text-label flex items-center space-x-2">
              <span>Position Type</span>
              <InfoTooltip content="Choose how liquidity will be distributed in the Uniswap V4 pool." />
            </label>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(['Standard', 'Project', 'Custom'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => updateConfig({ poolPositionType: type })}
                  className={`
                    p-4 rounded-xl border-2 transition-all text-left
                    ${config.poolPositionType === type
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }
                  `}
                >
                  <div className="font-semibold mb-1">{type}</div>
                  <div className="text-sm opacity-75">
                    {type === 'Standard' && 'Wide range, stable for most tokens'}
                    {type === 'Project' && 'Optimized for project tokens'}
                    {type === 'Custom' && 'Define your own tick ranges'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {config.poolPositionType === 'Custom' && (
            <div className="space-y-4 pl-4 border-l-2 border-green-200">
              <div className="flex items-center justify-between">
                <label className="text-label">Custom Positions</label>
                <button
                  type="button"
                  onClick={addCustomPosition}
                  className="text-sm text-green-600 hover:text-green-700 font-medium"
                >
                  + Add Position
                </button>
              </div>
              
              {config.customPositions.map((position, index) => (
                <div key={index} className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold text-gray-900">Position #{index + 1}</span>
                    {config.customPositions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeCustomPosition(index)}
                        className="text-red-600 text-sm hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm text-gray-600">Lower Tick</label>
                      <input
                        type="number"
                        value={position.tickLower}
                        onChange={(e) => updateCustomPosition(index, 'tickLower', parseInt(e.target.value) || 0)}
                        className="input text-sm"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm text-gray-600">Upper Tick</label>
                      <input
                        type="number"
                        value={position.tickUpper}
                        onChange={(e) => updateCustomPosition(index, 'tickUpper', parseInt(e.target.value) || 0)}
                        className="input text-sm"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm text-gray-600">Position %</label>
                      <input
                        type="number"
                        value={position.positionBps / 100}
                        onChange={(e) => updateCustomPosition(index, 'positionBps', (parseInt(e.target.value) || 0) * 100)}
                        min="0"
                        max="100"
                        className="input text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Token Distribution Preview */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <span className="w-2 h-2 bg-amber-500 rounded-full mr-3"></span>
          Token Distribution Preview
        </h3>

        <div className="space-y-3">
          {distributions.map((dist, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${
                  dist.name === 'Vault' ? 'bg-purple-500' :
                  dist.name === 'Airdrop' ? 'bg-green-500' :
                  'bg-blue-500'
                }`}></div>
                <span className="font-medium text-gray-900">{dist.name}</span>
              </div>
              <div className="text-right">
                <div className="font-mono text-sm text-gray-900">
                  {dist.amount.toLocaleString()} tokens
                </div>
                <div className="text-xs text-gray-500">
                  {dist.percentage.toFixed(1)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={onPrevious}
          className="btn btn-secondary px-8"
        >
          <span className="text-xl">←</span>
          <span>Back to Token Details</span>
        </button>

        <button
          onClick={onNext}
          disabled={!isValid}
          className={`btn btn-lg ${isValid ? 'btn-primary' : 'btn-secondary'} px-8`}
        >
          <span>Continue to Extensions</span>
          <span className="text-xl">→</span>
        </button>
      </div>

      {/* Validation Message */}
      {!isValid && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center space-x-3">
            <span className="text-amber-600 text-xl">⚠️</span>
            <div>
              <p className="text-sm font-medium text-amber-800">Market cap required</p>
              <p className="text-sm text-amber-700">
                Please set a starting market cap to continue.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 