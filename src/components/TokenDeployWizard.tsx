import { useState, useMemo } from 'react';
import { TokenConfigV4Builder, WETH_ADDRESS, POOL_POSITIONS, FEE_CONFIGS, type FeeConfigs } from 'clanker-sdk';

// Step Components
import { TokenBasicsStep } from './steps/TokenBasicsStep';
import { LiquiditySetupStep } from './steps/LiquiditySetupStep';
// Note: ExtensionsStep, AdvancedConfigStep, and DeploymentStep components are not yet implemented

// Types
export interface CoinConfig {
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

interface CoinDeployWizardProps {
  onDeploy: (config: CoinConfig) => Promise<void>;
  isDeploying: boolean;
  deployedCoinAddress: string;
  connected: boolean;
  address: string | undefined;
}

export function CoinDeployWizard({ 
  onDeploy, 
  isDeploying, 
  deployedCoinAddress,
  connected,
  address 
}: CoinDeployWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [config, setConfig] = useState<CoinConfig>({
    // Core Coin Settings
    name: 'My Project Coin',
    symbol: 'MPC',
    admin: '',
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
      recipient: '',
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
      { recipient: '', admin: '', bps: 10000 }
    ],
    
    // Vanity
    vanity: {
      enabled: false,
      prefix: '',
      suffix: ''
    }
  });

  // Set admin to connected wallet address when available
  useMemo(() => {
    if (address && !config.admin) {
      setConfig(prev => ({ ...prev, admin: address }));
    }
  }, [address, config.admin]);

  const updateConfig = (updates: Partial<CoinConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const updateNestedConfig = <T extends keyof CoinConfig>(
    section: T, 
    updates: Partial<CoinConfig[T]>
  ) => {
    setConfig(prev => ({
      ...prev,
      [section]: { ...prev[section], ...updates }
    }));
  };

  const isStepValid = (stepIndex: number): boolean => {
    const step = WIZARD_STEPS[stepIndex];
    
    switch (step.id) {
      case 'basics':
        return !!(config.name && config.symbol && config.admin);
      case 'liquidity':
        return !!(config.startingMarketCap && config.startingMarketCap > 0);
      case 'extensions':
        return true; // Extensions are always valid (optional)
      case 'advanced':
        return true; // Advanced config is always valid (has defaults)
      case 'deploy':
        return connected;
      default:
        return true;
    }
  };

  const canProceedToStep = (stepIndex: number): boolean => {
    // Check if all required previous steps are valid
    for (let i = 0; i < stepIndex; i++) {
      const step = WIZARD_STEPS[i];
      if (step.required && !isStepValid(i)) {
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (currentStep < WIZARD_STEPS.length - 1 && isStepValid(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (stepIndex: number) => {
    if (canProceedToStep(stepIndex)) {
      setCurrentStep(stepIndex);
    }
  };

  const renderCurrentStep = () => {
    const step = WIZARD_STEPS[currentStep];
    
    switch (step.id) {
      case 'basics':
        return (
          <TokenBasicsStep
            config={config}
            updateConfig={updateConfig}
            onNext={handleNext}
          />
        );
      case 'liquidity':
        return (
          <LiquiditySetupStep
            config={config}
            updateConfig={updateConfig}
            onNext={handleNext}
            onPrevious={handlePrevious}
          />
        );
      case 'extensions':
        return (
          <ExtensionsStep
            config={config}
            updateNestedConfig={updateNestedConfig}
            onNext={handleNext}
            onPrevious={handlePrevious}
          />
        );
      case 'advanced':
        return (
          <AdvancedConfigStep
            config={config}
            updateConfig={updateConfig}
            updateNestedConfig={updateNestedConfig}
            onNext={handleNext}
            onPrevious={handlePrevious}
          />
        );
      case 'deploy':
        return (
          <DeploymentStep
            config={config}
            onDeploy={() => onDeploy(config)}
            onPrevious={handlePrevious}
            isDeploying={isDeploying}
            deployedCoinAddress={deployedCoinAddress}
            connected={connected}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Progress Header */}
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-white text-xl">
              🪙
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Deploy Coin</h3>
              <p className="text-sm text-gray-600">Step {currentStep + 1} of {WIZARD_STEPS.length}</p>
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between">
          {WIZARD_STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <button
                onClick={() => handleStepClick(index)}
                disabled={!canProceedToStep(index)}
                className={`
                  flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-medium transition-all
                  ${index === currentStep 
                    ? 'bg-blue-100 text-blue-700' 
                    : isStepValid(index)
                      ? 'bg-green-50 text-green-700 hover:bg-green-100'
                      : canProceedToStep(index)
                        ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                  }
                `}
              >
                <span className="text-sm">{step.icon}</span>
                <span className="hidden sm:inline">{step.title}</span>
                {step.required && index > currentStep && !isStepValid(index) && (
                  <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">Required</span>
                )}
                {isStepValid(index) && index !== currentStep && (
                  <span className="text-green-500 text-xs">✓</span>
                )}
              </button>
              {index < WIZARD_STEPS.length - 1 && (
                <div className="w-2 h-px bg-gray-200 mx-1"></div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="p-6">
        {renderCurrentStep()}
      </div>
    </div>
  );
}

// Export the interface and component with backward compatibility
export type TokenConfig = CoinConfig;
export const TokenDeployWizard = CoinDeployWizard; 