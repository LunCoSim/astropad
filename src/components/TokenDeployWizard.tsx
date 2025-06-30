import { useState, useEffect } from 'react';
import { usePublicClient, useWalletClient } from 'wagmi';

// Step Components
import { TokenBasicsStep } from './steps/TokenBasicsStep';
import { LiquiditySetupStep } from './steps/LiquiditySetupStep';
import { ExtensionsStep } from './steps/ExtensionsStep';
import { AdvancedConfigStep } from './steps/AdvancedConfigStep';
import { DeploymentStep } from './steps/DeploymentStep';

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
        return true; // Extensions are optional
      case 3: // Advanced Config
        const totalBps = config.rewardRecipients.reduce((sum, r) => sum + r.bps, 0);
        return totalBps === 10000; // Must equal 100%
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
        return (
          <ExtensionsStep
            config={config}
            updateConfig={updateConfig}
            onNext={nextStep}
            onPrevious={prevStep}
          />
        );
      case 3:
        return (
          <AdvancedConfigStep
            config={config}
            updateConfig={updateConfig}
            onNext={nextStep}
            onPrevious={prevStep}
          />
        );
      case 4:
        return (
          <DeploymentStep
            config={config}
            onPrevious={prevStep}
          />
        );
      default:
        return <div>Step not implemented yet</div>;
    }
  };

  if (!connected) {
    return (
      <div className="text-center" style={{ padding: 'var(--spacing-3xl) 0' }}>
        <h2 className="text-2xl font-bold text-primary mb-md">Wallet Required</h2>
        <p className="text-secondary">Please connect your wallet to use the token deployment wizard.</p>
      </div>
    );
  }

  return (
    <div className="space-y-xl">
      {/* Progress Bar */}
      <div className="card">
        <div className="flex items-center justify-between mb-md">
          <h2 className="text-xl font-bold text-primary">Deploy Your Token</h2>
          <span className="text-sm text-muted">
            Step {currentStep + 1} of {WIZARD_STEPS.length}
          </span>
        </div>
        
        <div className="flex items-center space-x-md">
          {WIZARD_STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className="flex items-center justify-center text-sm font-bold rounded-full"
                style={{
                  width: '2.5rem',
                  height: '2.5rem',
                  background: index === currentStep 
                    ? 'var(--color-primary)' 
                    : index < currentStep 
                    ? 'var(--color-success)' 
                    : 'var(--bg-surface)',
                  color: index <= currentStep ? 'white' : 'var(--text-muted)'
                }}
              >
                {index < currentStep ? '✓' : index + 1}
              </div>
              {index < WIZARD_STEPS.length - 1 && (
                <div 
                  style={{
                    width: '3rem',
                    height: '0.25rem',
                    margin: '0 var(--spacing-sm)',
                    background: index < currentStep ? 'var(--color-success)' : 'var(--bg-surface)',
                    borderRadius: 'var(--radius-sm)'
                  }}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Current Step Content */}
      {renderCurrentStep()}
    </div>
  );
}

export { TokenDeployWizard as default }; 