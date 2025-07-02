import { useState, useEffect } from 'react';
import { usePublicClient, useWalletClient } from 'wagmi';

// Step Components
import { TokenBasicsStep } from './steps/TokenBasicsStep';
import { LiquiditySetupStep } from './steps/LiquiditySetupStep';
import { ExtensionsStep } from './steps/ExtensionsStep';
import { AdvancedConfigStep } from './steps/AdvancedConfigStep';
import { DeploymentStep } from './steps/DeploymentStep';

// Utilities
import { WIZARD_STEPS, BASE_NETWORK, POOL_POSITIONS, CLANKER_V4_ADDRESSES, DEFAULT_CUSTOM_POSITION } from '../../lib/constants';
import { validateStep } from '../../lib/validation';
import { calculateFeeDistribution } from '../../lib/fees';

// Types
import type { TokenConfig } from '../../lib/types';

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
  
  // Configuration state using updated TokenConfig interface for Clanker v4
  const [config, setConfig] = useState<TokenConfig>({
    // Core Token Settings
    name: 'My Project Token',
    symbol: 'MPT',
    image: '',
    tokenAdmin: address || '',
    
    // Metadata
    description: '',
    socialUrls: [''],
    auditUrls: [''],
    
    // Social Context
    interfaceName: 'astropad',
    platform: '',
    messageId: '',
    socialId: '',
    
    // Pool Configuration (Clanker v4)
    pool: {
      pairedToken: BASE_NETWORK.WETH_ADDRESS,
      tickIfToken0IsClanker: -230400, // Default starting tick
      tickSpacing: 200, // Default tick spacing
      positions: POOL_POSITIONS.Standard
    },
    
    // Token Locker (required for v4)
    locker: {
      locker: CLANKER_V4_ADDRESSES.LOCKER,
      lockerData: '0x' // Default empty data
    },
    
    // Extensions (all optional)
    vault: {
      enabled: false,
      percentage: 5, // 5% default
      lockupDuration: 7 * 24 * 60 * 60, // 7 days minimum
      vestingDuration: 0 // No vesting by default
    },
    
    airdrop: {
      enabled: false,
      merkleRoot: '0x0000000000000000000000000000000000000000000000000000000000000000',
      amount: 1000, // 1000 tokens default
      lockupDuration: 24 * 60 * 60, // 1 day minimum
      vestingDuration: 0, // No vesting by default
      entries: [] // Will be populated by user
    },
    
    devBuy: {
      enabled: false,
      ethAmount: 0.1, // 0.1 ETH default
      amountOutMin: 0 // No slippage protection by default
    },
    
    // Fee Configuration with automatic distribution
    fees: {
      type: 'static',
      userFeeBps: 100, // 1% total fee (60% to user, 20% to clanker, 20% to us)
      static: {
        clankerFeeBps: 100, // Will be calculated
        pairedFeeBps: 100   // Will be calculated
      }
    },
    
    // Reward Recipients (auto-calculated with fee distribution)
    rewards: {
      recipients: calculateFeeDistribution(address || '', 100) // 1% default
    },
    
    // Vanity Address
    vanity: {
      enabled: false,
      suffix: '0x4b07' // Default vanity suffix
    },
    
    // Legacy fields for backwards compatibility
    admin: address || '',
    pairTokenType: 'WETH',
    customPairTokenAddress: '',
    startingMarketCap: '',
    poolPositionType: 'Standard',
    customPositions: [DEFAULT_CUSTOM_POSITION],
    rewardRecipients: calculateFeeDistribution(address || '', 100)
  });

  // Update config when address changes
  useEffect(() => {
    if (address && address !== config.tokenAdmin) {
      setConfig(prev => ({
        ...prev,
        tokenAdmin: address,
        admin: address, // Legacy field
        devBuy: prev.devBuy ? { ...prev.devBuy } : undefined,
        rewards: {
          recipients: calculateFeeDistribution(address, prev.fees.userFeeBps)
        },
        rewardRecipients: calculateFeeDistribution(address, prev.fees.userFeeBps)
      }));
    }
  }, [address, config.tokenAdmin]);

  const updateConfig = (updates: Partial<TokenConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const isStepValid = (stepIndex: number): boolean => {
    return validateStep(stepIndex, config);
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