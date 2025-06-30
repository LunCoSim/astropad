import { useState, useMemo, useEffect } from 'react';
import { usePublicClient, useWalletClient } from 'wagmi';
import { TokenConfigV4Builder, WETH_ADDRESS, Clanker, POOL_POSITIONS, FEE_CONFIGS, type FeeConfigs } from 'clanker-sdk';
import { formatUnits } from 'viem';
import { getAvailableFees } from '../../lib/fees.js';

// Step Components
import { TokenBasicsStep } from './steps/TokenBasicsStep';
import { LiquiditySetupStep } from './steps/LiquiditySetupStep';
// Note: ExtensionsStep, AdvancedConfigStep, and DeploymentStep components are not yet implemented

// Types
export interface TokenConfig {
  // Core Coin Settings
  name: string;
  symbol: string;
  admin: string;
  image: string;
  description: string;
  socialUrls: string[];
  auditUrls: string[];
  
  // Social Context
  interfaceName: string;
  platform: string;
  messageId: string;
  socialId: string;
  
  // Liquidity Setup
  pairTokenType: 'WETH' | 'custom';
  customPairTokenAddress: string;
  startingMarketCap: number | '';
  poolPositionType: 'Standard' | 'Project' | 'Custom';
  customPositions: Array<{
    tickLower: number;
    tickUpper: number;
    positionBps: number;
  }>;
  
  // Extensions
  vault: {
    enabled: boolean;
    percentage: number;
    lockupDuration: number;
    vestingDuration: number;
  };
  airdrop: {
    enabled: boolean;
    percentage: number;
    entries: Array<{address: string, amount: number}>;
    lockupDuration: number;
    vestingDuration: number;
  };
  devBuy: {
    enabled: boolean;
    ethAmount: number;
    recipient: string;
    amountOutMin: number;
  };
  
  // Advanced Configuration
  fees: {
    type: 'static' | 'dynamic';
    static: {
      clankerFeeBps: number;
      pairedFeeBps: number;
    };
    dynamic: {
      baseFee: number;
      maxLpFee: number;
      referenceTickFilterPeriod: number;
      resetPeriod: number;
      resetTickFilter: number;
      feeControlNumerator: number;
      decayFilterBps: number;
    };
  };
  rewardRecipients: Array<{
    recipient: string;
    admin: string;
    bps: number;
  }>;
  
  // Vanity
  vanity: {
    enabled: boolean;
    prefix: string;
    suffix: string;
  };
}

// Generic ERC20 ABI for fetching decimals and symbol
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

async function getTokenDecimals(publicClient: ReturnType<typeof usePublicClient> | undefined, tokenAddress: `0x${string}`) {
  if (!publicClient) return 18; // Default if publicClient is not available
  try {
    const decimals = await publicClient.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'decimals',
    });
    return decimals;
  } catch (error: any) {
    console.warn(`Could not fetch decimals for ${tokenAddress}, assuming 18. Error:`, error);
    return 18; // Default to 18 if decimals cannot be fetched
  }
}

async function getTokenSymbol(publicClient: ReturnType<typeof usePublicClient> | undefined, tokenAddress: `0x${string}`) {
  if (!publicClient) return 'UNKNOWN'; // Default if publicClient is not available
  try {
    const symbol = await publicClient.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'symbol',
    });
    return symbol;
  } catch (error: any) {
    console.warn(`Could not fetch symbol for ${tokenAddress}, assuming 'UNKNOWN'. Error:`, error);
    return 'UNKNOWN';
  }
}

// AMM calculation function using constant product formula (x * y = k)
function calculateDevBuyTokens(
  devBuyEthAmount: number,
  marketCapEth: number,
  totalTokenSupply: number = 100_000_000_000 // 100 billion default supply
): { tokensReceived: number; priceImpact: number; newPrice: number; effectivePrice: number } {
  if (devBuyEthAmount <= 0 || marketCapEth <= 0) {
    return { tokensReceived: 0, priceImpact: 0, newPrice: 0, effectivePrice: 0 };
  }

  // In Clanker v4, the dev buy is a normal swap that happens AFTER liquidity is created
  // Initial liquidity pool setup (assuming no vault/airdrop extensions for simplicity)
  // Market cap = pool_eth_reserve * total_token_supply / pool_token_reserve
  // For simplicity, assume the full token supply goes to the pool initially
  const initialTokenReserve = totalTokenSupply;
  const initialEthReserve = marketCapEth;
  
  // Constant product: k = x * y
  const k = initialEthReserve * initialTokenReserve;
  
  // Dev buy swaps ETH for tokens: (eth_reserve + eth_in) * (token_reserve - token_out) = k
  // Solving for token_out: token_out = token_reserve - k / (eth_reserve + eth_in)
  const newEthReserve = initialEthReserve + devBuyEthAmount;
  const newTokenReserve = k / newEthReserve;
  const tokensReceived = initialTokenReserve - newTokenReserve;
  
  // Calculate prices and impact
  const initialPrice = initialEthReserve / initialTokenReserve; // ETH per token
  const newPrice = newEthReserve / newTokenReserve; // ETH per token after swap
  const priceImpact = ((newPrice - initialPrice) / initialPrice) * 100;
  
  // Effective price paid by dev buyer
  const effectivePrice = devBuyEthAmount / tokensReceived; // ETH per token
  
  return {
    tokensReceived,
    priceImpact,
    newPrice,
    effectivePrice
  };
}

const WIZARD_STEPS = [
  {
    id: 'basics',
    title: 'Coin Details',
    description: 'Name, symbol, and branding',
    icon: '🪙',
    required: true
  },
  {
    id: 'liquidity',
    title: 'Liquidity Setup',
    description: 'Market cap and trading pair',
    icon: '💧',
    required: true
  },
  {
    id: 'extensions',
    title: 'Extensions',
    description: 'Vault, airdrops, and dev buy',
    icon: '⚡',
    required: false
  },
  {
    id: 'advanced',
    title: 'Advanced Config',
    description: 'Fees, rewards, and custom settings',
    icon: '⚙️',
    required: false
  },
  {
    id: 'deploy',
    title: 'Deploy',
    description: 'Review and launch your coin',
    icon: '🚀',
    required: true
  }
];

interface TokenDeployWizardProps {
  connected: boolean;
  address: string | undefined;
}

export function TokenDeployWizard({ 
  connected,
  address 
}: TokenDeployWizardProps) {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  // ========== UI STATE ==========
  const [currentStep, setCurrentStep] = useState(0);
  const [deployedTokenAddress, setDeployedTokenAddress] = useState('');
  const [simulationResult, setSimulationResult] = useState<any>(null);
  
  // Configuration state using TokenConfig interface
  const [config, setConfig] = useState<TokenConfig>({
    // Core Coin Settings
    name: 'My Project Coin',
    symbol: 'MPC',
    admin: address || '',
    image: '',
    description: '',
    socialUrls: [''],
    auditUrls: [''],
    
    // Social Context
    interfaceName: 'astropad',
    platform: '',
    messageId: '',
    socialId: '',
    
    // Liquidity Setup
    pairTokenType: 'WETH',
    customPairTokenAddress: '',
    startingMarketCap: '',
    poolPositionType: 'Standard',
    customPositions: [
      { tickLower: -230400, tickUpper: -120000, positionBps: 10000 }
    ],
    
    // Extensions
    vault: {
      enabled: false,
      percentage: 10,
      lockupDuration: 7 * 24 * 60 * 60,
      vestingDuration: 30 * 24 * 60 * 60
    },
    airdrop: {
      enabled: false,
      percentage: 5,
      entries: [{address: '', amount: 1}],
      lockupDuration: 24 * 60 * 60,
      vestingDuration: 30 * 24 * 60 * 60
    },
    devBuy: {
      enabled: true,
      ethAmount: 0.0001,
      recipient: address || '',
      amountOutMin: 0
    },
    
    // Advanced Configuration
    fees: {
      type: 'static',
      static: {
        clankerFeeBps: 100,
        pairedFeeBps: 100
      },
      dynamic: {
        baseFee: 5000,
        maxLpFee: 50000,
        referenceTickFilterPeriod: 30,
        resetPeriod: 120,
        resetTickFilter: 200,
        feeControlNumerator: 500000000,
        decayFilterBps: 7500
      }
    },
    rewardRecipients: [
      { recipient: address || '', admin: address || '', bps: 10000 }
    ],
    
    // Vanity
    vanity: {
      enabled: false,
      prefix: '',
      suffix: ''
    }
  });

  // Fee checking state
  const [customClankerTokenAddress, setCustomClankerTokenAddress] = useState('0x699E27a42095D3cb9A6a23097E5C201E33E314B4');
  const [customFeeOwnerAddress, setCustomFeeOwnerAddress] = useState('0xCd2a99C6d6b27976537fC3737b0ef243E7C49946');

  // Update config when address changes
  useEffect(() => {
    if (address && address !== config.admin) {
      setConfig(prev => ({
        ...prev,
        admin: address,
        devBuy: { ...prev.devBuy, recipient: address },
        rewardRecipients: prev.rewardRecipients.map(r => ({ ...r, recipient: address, admin: address }))
      }));
    }
  }, [address, config.admin]);

  const updateConfig = (updates: Partial<TokenConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const isStepValid = (stepIndex: number): boolean => {
    switch (stepIndex) {
      case 0: // Basics
        return !!(config.name && config.symbol && config.admin);
      case 1: // Liquidity
        return !!(config.startingMarketCap && config.startingMarketCap > 0);
      case 2: // Extensions
        return true; // Optional step
      case 3: // Advanced
        return true; // Optional step
      case 4: // Deploy
        return isStepValid(0) && isStepValid(1);
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (currentStep < WIZARD_STEPS.length - 1 && isStepValid(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSimulateToken = async () => {
    if (!publicClient || !walletClient) {
      alert('Wallet not connected properly');
      return;
    }

    try {
      const builder = new TokenConfigV4Builder()
        .withName(config.name)
        .withSymbol(config.symbol)
// Note: withChainId is not available in current SDK version
        // .withChainId(84532) // Base chain ID
        .withTokenAdmin(config.admin as `0x${string}`)
        .withStaticFeeConfig({
          clankerFeeBps: config.fees.static.clankerFeeBps,
          pairedFeeBps: config.fees.static.pairedFeeBps,
        })
        .withPoolConfig({
          pairedToken: config.pairTokenType === 'WETH' ? WETH_ADDRESS : config.customPairTokenAddress as `0x${string}`,
          positions: POOL_POSITIONS.Standard,
        })
        .withRewardsRecipients({
          recipients: config.rewardRecipients.map(r => ({
            admin: r.admin as `0x${string}`,
            recipient: r.recipient as `0x${string}`,
            bps: r.bps,
          })),
        });

      if (config.devBuy.enabled) {
        builder.withDevBuy({
          ethAmount: config.devBuy.ethAmount,
        });
      }

      const tokenConfig = builder.build();
      const clanker = new Clanker({ publicClient });

      const result = await clanker.simulateDeployToken(tokenConfig, walletClient.account);

             if ('error' in result) {
         throw new Error(String(result.error));
       }

      setSimulationResult(result);
      alert(`Simulation successful! Estimated token address: ${result.simulatedAddress}`);
    } catch (error: any) {
      console.error('Simulation failed:', error);
      alert(`Simulation failed: ${error.message}`);
    }
  };

  const handleConfirmDeploy = async () => {
    if (!simulationResult || !walletClient) {
      alert('Please simulate deployment first');
      return;
    }

    try {
      const hash = await walletClient.sendTransaction({
        to: simulationResult.transaction.to,
        value: simulationResult.transaction.value,
        data: simulationResult.transaction.data,
        account: walletClient.account,
      });

      setDeployedTokenAddress(simulationResult.simulatedAddress);
      alert(`Token deployed! Transaction hash: ${hash}`);
    } catch (error: any) {
      console.error('Deployment failed:', error);
      alert(`Deployment failed: ${error.message}`);
    }
  };

  const handleCheckFees = async () => {
    if (!publicClient) {
      alert('Wallet not connected');
      return;
    }

    try {
      const fees = await getAvailableFees(
        publicClient,
        customFeeOwnerAddress as `0x${string}`,
        customClankerTokenAddress as `0x${string}`
      );

      const feesList = Object.entries(fees)
        .map(([symbol, amount]) => `${symbol}: ${amount}`)
        .join('\n');
      
      alert(`Available fees:\n${feesList}`);
    } catch (error: any) {
      console.error('Error checking fees:', error);
      alert(`Error checking fees: ${error.message}`);
    }
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <TokenBasicsStep
            config={config}
            updateConfig={updateConfig}
            onNext={nextStep}
          />
        );
      case 1:
        return (
          <LiquiditySetupStep
            config={config}
            updateConfig={updateConfig}
            onNext={nextStep}
            onPrevious={prevStep}
          />
        );
             case 2:
       case 3:
       case 4:
      default:
        return <div>Step not implemented yet</div>;
    }
  };

  if (!connected) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-white mb-4">Wallet Required</h2>
        <p className="text-white/70">Please connect your wallet to use the token deployment wizard.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Progress Bar */}
      <div className="bg-white/5 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Deploy Your Token</h2>
          <span className="text-sm text-white/60">
            Step {currentStep + 1} of {WIZARD_STEPS.length}
          </span>
        </div>
        
        <div className="flex items-center space-x-4">
          {WIZARD_STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold
                  ${index === currentStep
                    ? 'bg-primary-500 text-white'
                    : index < currentStep
                    ? 'bg-green-500 text-white'
                    : 'bg-white/10 text-white/50'
                  }
                `}
              >
                {index < currentStep ? '✓' : index + 1}
              </div>
              {index < WIZARD_STEPS.length - 1 && (
                <div className={`w-12 h-1 mx-2 ${index < currentStep ? 'bg-green-500' : 'bg-white/10'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Current Step Content */}
      {renderCurrentStep()}

      {/* Fee Checking Section */}
      {currentStep === WIZARD_STEPS.length - 1 && (
        <div className="bg-white/5 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">Check Fees</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <input
              type="text"
              value={customFeeOwnerAddress}
              onChange={(e) => setCustomFeeOwnerAddress(e.target.value)}
              placeholder="Fee Owner Address"
              className="input"
            />
            <input
              type="text"
              value={customClankerTokenAddress}
              onChange={(e) => setCustomClankerTokenAddress(e.target.value)}
              placeholder="Clanker Token Address"
              className="input"
            />
          </div>
          <button onClick={handleCheckFees} className="btn btn-secondary">
            Check Available Fees
          </button>
        </div>
      )}

      {/* Deployment Actions */}
      {currentStep === WIZARD_STEPS.length - 1 && (
        <div className="bg-white/5 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">Deploy Token</h3>
          <div className="flex space-x-4">
            <button
              onClick={handleSimulateToken}
              className="btn btn-secondary"
              disabled={!isStepValid(currentStep)}
            >
              Simulate Deployment
            </button>
            <button
              onClick={handleConfirmDeploy}
              className="btn btn-primary"
              disabled={!simulationResult}
            >
              Confirm Deploy
            </button>
          </div>
          
          {deployedTokenAddress && (
            <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p className="text-green-400 font-semibold">
                Token deployed successfully!
              </p>
              <p className="text-white/70 text-sm break-all">
                Address: {deployedTokenAddress}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export { TokenDeployWizard as default }; 