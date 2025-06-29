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
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-3">Liquidity Configuration</h2>
        <p className="text-gray-600">
          Configure your coin's initial liquidity and trading parameters
        </p>
      </div>

      <div className="bg-gradient-to-br from-emerald-50/50 to-green-50/50 rounded-2xl p-6 border border-emerald-200/30 backdrop-blur-sm">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center mb-6">
          <div className="w-2 h-2 bg-emerald-500 rounded-full mr-3"></div>
          Initial Liquidity
        </h3>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 flex items-center">
              <span>ETH Amount</span>
              <span className="text-red-500 ml-1">*</span>
              <InfoTooltip content="Amount of ETH to provide as initial liquidity. This determines the initial price of your coin." />
            </label>
            <input
              type="number"
              value={config.ethAmount || ''}
              onChange={(e) => updateConfig({ ethAmount: e.target.value })}
              placeholder="1.0"
              step="0.01"
              min="0"
              className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/80 backdrop-blur-sm transition-all hover:border-gray-300 font-mono"
            />
            <div className="text-xs text-gray-500 font-medium">
              Minimum recommended: 0.1 ETH
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 flex items-center">
              <span>Pair Coin</span>
              <InfoTooltip content="The coin your new coin will be paired with in the liquidity pool." />
            </label>
            <select
              value={config.pairCoin}
              onChange={(e) => updateConfig({ pairCoin: e.target.value })}
              className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/80 backdrop-blur-sm transition-all hover:border-gray-300"
            >
              <option value="ETH">ETH</option>
              <option value="USDC">USDC</option>
              <option value="WETH">WETH</option>
            </select>
            <div className="text-xs text-gray-500 font-medium">
              ETH is the most common pairing
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <label className="text-sm font-semibold text-gray-700 flex items-center">
            <span>Initial Coin Supply</span>
            <InfoTooltip content="Total number of coins that will be minted. The portion not added to liquidity will be sent to the admin." />
          </label>
          <input
            type="number"
            value={config.initialSupply || ''}
            onChange={(e) => updateConfig({ initialSupply: e.target.value })}
            placeholder="1000000"
            min="1"
            className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/80 backdrop-blur-sm transition-all hover:border-gray-300 font-mono"
          />
          <div className="text-xs text-gray-500 font-medium">
            Common supplies: 1M, 100M, 1B coins
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-orange-50/50 to-amber-50/50 rounded-2xl p-6 border border-orange-200/30 backdrop-blur-sm">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center mb-6">
          <div className="w-2 h-2 bg-orange-500 rounded-full mr-3"></div>
          Trading Configuration
        </h3>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 flex items-center">
              <span>Fee Tier</span>
              <InfoTooltip content="The trading fee percentage for this liquidity pool. Lower fees encourage more trading volume." />
            </label>
            <select
              value={config.feeTier}
              onChange={(e) => updateConfig({ feeTier: e.target.value })}
              className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/80 backdrop-blur-sm transition-all hover:border-gray-300"
            >
              <option value="0.05">0.05% (Most Stable)</option>
              <option value="0.30">0.30% (Standard)</option>
              <option value="1.00">1.00% (High Volatility)</option>
            </select>
            <div className="text-xs text-gray-500 font-medium">
              0.30% is recommended for most coins
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 flex items-center">
              <span>Price Range</span>
              <InfoTooltip content="The price range for concentrated liquidity. Narrower ranges provide more liquidity at current price but may go out of range." />
            </label>
            <select
              value={config.priceRange}
              onChange={(e) => updateConfig({ priceRange: e.target.value })}
              className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/80 backdrop-blur-sm transition-all hover:border-gray-300"
            >
              <option value="narrow">Narrow (±10%)</option>
              <option value="medium">Medium (±50%)</option>
              <option value="wide">Wide (±200%)</option>
              <option value="full">Full Range</option>
            </select>
            <div className="text-xs text-gray-500 font-medium">
              Medium range balances efficiency and safety
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center space-x-3">
          <input
            type="checkbox"
            id="lockLiquidity"
            checked={config.lockLiquidity}
            onChange={(e) => updateConfig({ lockLiquidity: e.target.checked })}
            className="w-5 h-5 text-blue-600 border-2 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 transition-all"
          />
          <label htmlFor="lockLiquidity" className="text-sm font-semibold text-gray-700 flex items-center cursor-pointer">
            <span>Lock Initial Liquidity</span>
            <InfoTooltip content="Prevents removal of initial liquidity for a specified period. This builds trust with traders." />
          </label>
        </div>

        {config.lockLiquidity && (
          <div className="mt-4 space-y-2">
            <label className="text-sm font-semibold text-gray-700">Lock Duration</label>
            <select
              value={config.lockDuration}
              onChange={(e) => updateConfig({ lockDuration: e.target.value })}
              className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/80 backdrop-blur-sm transition-all hover:border-gray-300"
            >
              <option value="30">30 days</option>
              <option value="90">90 days</option>
              <option value="180">180 days</option>
              <option value="365">1 year</option>
            </select>
          </div>
        )}
      </div>

      <div className="bg-gradient-to-br from-violet-50/50 to-indigo-50/50 rounded-2xl p-6 border border-violet-200/30 backdrop-blur-sm">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center mb-6">
          <div className="w-2 h-2 bg-violet-500 rounded-full mr-3"></div>
          Advanced Options
          <span className="text-sm text-gray-500 ml-2 font-normal">(Optional)</span>
        </h3>

        <div className="space-y-6">
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="enableRewards"
              checked={config.enableRewards}
              onChange={(e) => updateConfig({ enableRewards: e.target.checked })}
              className="w-5 h-5 text-blue-600 border-2 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 transition-all"
            />
            <label htmlFor="enableRewards" className="text-sm font-semibold text-gray-700 flex items-center cursor-pointer">
              <span>Enable Liquidity Rewards</span>
              <InfoTooltip content="Provides additional rewards to liquidity providers beyond trading fees." />
            </label>
          </div>

          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="antiMev"
              checked={config.antiMev}
              onChange={(e) => updateConfig({ antiMev: e.target.checked })}
              className="w-5 h-5 text-blue-600 border-2 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 transition-all"
            />
            <label htmlFor="antiMev" className="text-sm font-semibold text-gray-700 flex items-center cursor-pointer">
              <span>MEV Protection</span>
              <InfoTooltip content="Adds protection against MEV (Maximal Extractable Value) attacks using block delay mechanisms." />
            </label>
          </div>

          {config.antiMev && (
            <div className="ml-8 space-y-2">
              <label className="text-sm font-semibold text-gray-700">Block Delay</label>
              <select
                value={config.mevDelay}
                onChange={(e) => updateConfig({ mevDelay: e.target.value })}
                className="w-48 px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/80 backdrop-blur-sm transition-all hover:border-gray-300"
              >
                <option value="1">1 block (~12 seconds)</option>
                <option value="2">2 blocks (~24 seconds)</option>
                <option value="3">3 blocks (~36 seconds)</option>
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <button
          onClick={onPrevious}
          className="px-8 py-3 text-gray-600 hover:text-gray-800 font-semibold rounded-xl hover:bg-gray-50 transition-all"
        >
          ← Back to Coin Details
        </button>
        
        <button
          onClick={onNext}
          disabled={!isValid}
          className={`px-8 py-3 rounded-xl font-semibold transition-all transform hover:scale-105 ${
            isValid 
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl' 
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          Continue to Extensions →
        </button>
      </div>
    </div>
  );
} 