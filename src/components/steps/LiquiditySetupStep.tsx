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

  // Validate custom pair coin
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
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Liquidity Setup</h2>
        <p className="text-gray-600 text-sm">
          Configure your coin's initial liquidity and trading pair settings
        </p>
      </div>

      <div className="bg-gray-50 rounded-xl p-4 space-y-4">
        <h3 className="text-sm font-medium text-gray-900 flex items-center">
          <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full mr-2"></span>
          Market Cap
        </h3>

        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-700 flex items-center">
            <span>Starting Market Cap (ETH)</span>
            <span className="text-red-500 ml-1">*</span>
            <InfoTooltip content="The initial market capitalization of your coin in ETH. This determines the starting price and initial liquidity." />
          </label>
          <input
            type="number"
            value={config.startingMarketCap}
            onChange={(e) => updateConfig({ startingMarketCap: parseFloat(e.target.value) || '' })}
            placeholder="1.0"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            min="0.01"
            step="0.01"
          />
          <div className="text-xs text-gray-500">
            Minimum 0.01 ETH. This determines your coin's initial price and liquidity.
          </div>
        </div>

        {config.startingMarketCap && (
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <h4 className="text-xs font-medium text-gray-900 mb-2">Price Calculation</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Supply:</span>
                <span className="font-mono">100B {config.symbol || 'COIN'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Initial Price:</span>
                <span className="font-mono">
                  {config.startingMarketCap ? (Number(config.startingMarketCap) / 100_000_000_000).toExponential(2) : '0'} ETH
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-gray-50 rounded-xl p-4 space-y-4">
        <h3 className="text-sm font-medium text-gray-900 flex items-center">
          <span className="w-1.5 h-1.5 bg-purple-500 rounded-full mr-2"></span>
          Trading Pair
        </h3>

        <div className="space-y-3">
          <label className="text-xs font-medium text-gray-700 flex items-center">
            <span>Pair Coin</span>
            <InfoTooltip content="Choose which coin to pair with your coin. ETH (WETH) is recommended for most projects." />
          </label>
          
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => updateConfig({ pairTokenType: 'WETH' })}
              className={`
                p-3 rounded-lg border-2 transition-all text-left
                ${config.pairTokenType === 'WETH'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }
              `}
            >
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xs">
                  ETH
                </div>
                <div>
                  <div className="text-xs font-medium">Ethereum (WETH)</div>
                  <div className="text-xs opacity-75">Recommended</div>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => updateConfig({ pairTokenType: 'custom' })}
              className={`
                p-3 rounded-lg border-2 transition-all text-left
                ${config.pairTokenType === 'custom'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }
              `}
            >
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center text-white font-bold text-xs">
                  ?
                </div>
                <div>
                  <div className="text-xs font-medium">Custom Coin</div>
                  <div className="text-xs opacity-75">Advanced</div>
                </div>
              </div>
            </button>
          </div>
        </div>

        {config.pairTokenType === 'custom' && (
          <div className="space-y-2 pl-3 border-l-2 border-blue-200 bg-blue-50 rounded-r-lg pr-3 py-2">
            <label className="text-xs font-medium text-gray-700">Custom Coin Address</label>
            <input
              type="text"
              value={config.customPairTokenAddress}
              onChange={(e) => updateConfig({ customPairTokenAddress: e.target.value })}
              placeholder="0x... (custom coin address)"
              className="w-full px-3 py-2 text-xs font-mono border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            
            {pairTokenValidating && (
              <div className="text-xs text-blue-600">Validating coin...</div>
            )}
            
            {pairTokenInfo && (
              <div className="text-xs text-green-600">
                ✓ Valid coin: {pairTokenInfo.symbol} ({pairTokenInfo.decimals} decimals)
              </div>
            )}
            
            {config.customPairTokenAddress && !pairTokenValidating && !pairTokenValid && (
              <div className="text-xs text-red-600">
                ✗ Invalid coin address
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-gray-50 rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-medium text-gray-900 flex items-center">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2"></span>
          Pool Positions
        </h3>

        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-700 flex items-center">
            <span>Position Type</span>
            <InfoTooltip content="Standard positions work for most projects. Custom positions allow fine-tuned liquidity distribution." />
          </label>
          
          <div className="grid grid-cols-3 gap-2">
            {(['Standard', 'Project', 'Custom'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => updateConfig({ poolPositionType: type })}
                className={`
                  px-3 py-2 text-xs font-medium rounded-lg border transition-all
                  ${config.poolPositionType === type
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }
                `}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {config.poolPositionType === 'Custom' && (
          <div className="space-y-2 pl-3 border-l-2 border-green-200 bg-green-50 rounded-r-lg pr-3 py-2">
            <div className="text-xs text-green-700 font-medium">Custom positions require advanced knowledge of Uniswap V4 tick ranges</div>
            <div className="text-xs text-green-600">Current: {config.customPositions.length} position(s) configured</div>
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <button 
          onClick={onPrevious} 
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
        >
          ← Back to Coin Details
        </button>
        <button
          onClick={onNext}
          disabled={!isValid}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            isValid 
              ? 'bg-blue-600 text-white hover:bg-blue-700' 
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          Continue to Extensions →
        </button>
      </div>
    </div>
  );
} 