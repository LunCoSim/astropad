import { useState, useEffect } from 'react';
import { usePublicClient, useWalletClient } from 'wagmi';

// Step Components
import { TokenBasicsStep } from './steps/TokenBasicsStep';
import { LiquiditySetupStep } from './steps/LiquiditySetupStep';
import { ExtensionsStep } from './steps/ExtensionsStep';
import { AdvancedConfigStep } from './steps/AdvancedConfigStep';
import { DeploymentStep } from './steps/DeploymentStep';

// Utilities
import { WIZARD_STEPS, DEFAULT_FEE_CONFIG, DEFAULT_VAULT_CONFIG, DEFAULT_AIRDROP_CONFIG, DEFAULT_DEV_BUY_CONFIG, DEFAULT_VANITY_CONFIG, DEFAULT_CUSTOM_POSITION } from '../../lib/constants';
import { validateStep } from '../../lib/validation';

// Types
import type { TokenConfig } from '../../lib/types';



// Import the calculation function from lib
import { calculateDevBuyTokens } from '../../lib/calculations';

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
    customPositions: [DEFAULT_CUSTOM_POSITION],
    
    // Extensions
    vault: DEFAULT_VAULT_CONFIG,
    airdrop: DEFAULT_AIRDROP_CONFIG,
    devBuy: { ...DEFAULT_DEV_BUY_CONFIG, recipient: address || '' },
    
    // Advanced Configuration
    fees: {
      type: 'static',
      static: DEFAULT_FEE_CONFIG.static,
      dynamic: DEFAULT_FEE_CONFIG.dynamic
    },
    rewardRecipients: [
      { recipient: address || '', admin: address || '', bps: 10000 }
    ],
    
    // Vanity
    vanity: DEFAULT_VANITY_CONFIG
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