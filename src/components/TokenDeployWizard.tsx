import { useState, useEffect, useRef, useCallback } from 'react';
import { usePublicClient, useWalletClient } from 'wagmi';

// Step Components
import { TokenBasicsStep } from './steps/TokenBasicsStep';
import { LiquiditySetupStep } from './steps/LiquiditySetupStep';
import { ExtensionsStep } from './steps/ExtensionsStep';
import { AdvancedConfigStep } from './steps/AdvancedConfigStep';
import DeploymentStep from './steps/DeploymentStep';

// Utilities
import { WIZARD_STEPS, BASE_NETWORK, CLANKER_V4_ADDRESSES, DEFAULT_CUSTOM_POSITION } from "../../lib/clanker-utils";

// If any symbols are missing in clanker-utils, we'll handle separately, but assuming merge included them.
import { POOL_POSITIONS } from 'clanker-sdk';
import { validateStep } from '../../lib/validation';

import { useAppKit } from '@reown/appkit/react';

// Types
import type { TokenConfig } from '../../lib/types';

interface TokenDeployWizardProps {
  connected: boolean;
  address: string | undefined;
}

const getDraftKey = (address?: string) => address ? `astropad_wizard_draft_${address.toLowerCase()}` : 'astropad_wizard_draft_anonymous';

export function TokenDeployWizard({ 
  connected,
  address 
}: TokenDeployWizardProps) {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { open } = useAppKit();

  // ========== UI STATE ==========
  const [currentStep, setCurrentStep] = useState(0);
  
  // Configuration state using updated TokenConfig interface for Clanker v4
  const [config, setConfig] = useState<TokenConfig>(() => {
    const draftKey = getDraftKey(address);
    if (draftKey) {
      const draft = localStorage.getItem(draftKey);
      if (draft) {
        try {
          const parsed = JSON.parse(draft);
          // Ensure all recipients have token: 'Both' if missing
          if (parsed.rewards && Array.isArray(parsed.rewards.recipients)) {
            parsed.rewards.recipients = parsed.rewards.recipients.map((r: any) => ({
              ...r,
              token: r.token ?? 'Both'
            }));
          }
          return parsed;
        } catch {}
      }
    }
    // Default config if no draft
    return {
      name: 'My Project Token',
      symbol: 'MPT',
      image: '',
      tokenAdmin: address || '',
      description: '',
      socialUrls: [''],
      auditUrls: [''],
      interfaceName: 'astropad',
      platform: '',
      messageId: '',
      socialId: '',
      originatingChainId: 8453,
      pool: {
        pairedToken: BASE_NETWORK.WETH_ADDRESS,
        tickIfToken0IsClanker: -230400,
        tickSpacing: 200,
        positions: POOL_POSITIONS.Standard,
      },
      pairTokenType: 'WETH',
      mev: {
        enabled: true,
        blockDelay: 2
      },
      locker: {
        locker: CLANKER_V4_ADDRESSES.LOCKER,
        lockerData: '0x'
      },
      vault: {
        enabled: false,
        percentage: 5,
        lockupDuration: 7 * 24 * 60 * 60,
        vestingDuration: 0,
        msgValue: 0
      },
      airdrop: {
        enabled: false,
        merkleRoot: '0x0000000000000000000000000000000000000000000000000000000000000000',
        amount: 1000,
        lockupDuration: 24 * 60 * 60,
        vestingDuration: 0,
        entries: [],
        msgValue: 0
      },
      devBuy: {
        enabled: false,
        amount: 0.0001,
        amountOutMin: 0,
        recipient: address || ''
      },
      fees: {
        type: 'static',
        userFeeBps: 100,
        static: {
          clankerFeeBps: 100,
          pairedFeeBps: 100,
          customDistribution: false
        }
      },
      rewards: {
        recipients: [{
          recipient: address || '',
          admin: address || '',
          bps: 10000,
          token: 'Both'  // Ensure default is set
        }],
        customDistribution: false,
        useSimpleDistribution: true
      },
      vanity: {
        enabled: false,
        suffix: '0x4b07',
        type: 'suffix',
        customSalt: undefined
      },
      advanced: {
        customHookData: false,
        hookData: undefined,
        customExtensions: [],
        gasOptimization: false
      }
    };
  });

  // Track if a draft exists
  const [hasDraft, setHasDraft] = useState(false);
  // Track if deployment is complete (set to true after deployment)
  const [isDeployed, setIsDeployed] = useState(false);
  // Used to avoid saving on first load if loading draft
  const isFirstLoad = useRef(true);
  const [showDraftModal, setShowDraftModal] = useState(false);

  // Load draft config on mount if available
  useEffect(() => {
    const draftKey = getDraftKey(address);
    if (!draftKey) return;
    const draft = localStorage.getItem(draftKey);
    if (draft) {
      setHasDraft(true);
      setShowDraftModal(true);
    }
  }, [address]);

  // Auto-save config to localStorage on change, unless deployed
  useEffect(() => {
    const draftKey = getDraftKey(address);
    if (!draftKey) return;
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      return;
    }
    if (!isDeployed) {
      localStorage.setItem(draftKey, JSON.stringify(config));
    }
  }, [config, address, isDeployed]);

  // Function to clear draft (to be called after deployment)
  const clearDraft = () => {
    const draftKey = getDraftKey(address);
    if (draftKey) localStorage.removeItem(draftKey);
  };

  // Handler for continuing with draft
  const handleContinueDraft = () => {
    setShowDraftModal(false);
  };

  // Handler for starting new
  const handleStartNew = () => {
    const draftKey = getDraftKey(address);
    if (draftKey) localStorage.removeItem(draftKey);
    // Reset config to defaults
    setConfig({
      name: 'My Project Token',
      symbol: 'MPT',
      image: '',
      tokenAdmin: address || '',
      description: '',
      socialUrls: [''],
      auditUrls: [''],
      interfaceName: 'astropad',
      platform: '',
      messageId: '',
      socialId: '',
      originatingChainId: 8453,
      pool: {
        pairedToken: BASE_NETWORK.WETH_ADDRESS,
        tickIfToken0IsClanker: -230400,
        tickSpacing: 200,
        positions: POOL_POSITIONS.Standard,
      },
      pairTokenType: 'WETH',
      mev: {
        enabled: true,
        blockDelay: 2
      },
      locker: {
        locker: CLANKER_V4_ADDRESSES.LOCKER,
        lockerData: '0x'
      },
      vault: {
        enabled: false,
        percentage: 5,
        lockupDuration: 7 * 24 * 60 * 60,
        vestingDuration: 0,
        msgValue: 0
      },
      airdrop: {
        enabled: false,
        merkleRoot: '0x0000000000000000000000000000000000000000000000000000000000000000',
        amount: 1000,
        lockupDuration: 24 * 60 * 60,
        vestingDuration: 0,
        entries: [],
        msgValue: 0
      },
      devBuy: {
        enabled: false,
        amount: 0.0001,
        amountOutMin: 0,
        recipient: address || ''
      },
      fees: {
        type: 'static',
        userFeeBps: 100,
        static: {
          clankerFeeBps: 100,
          pairedFeeBps: 100,
          customDistribution: false
        }
      },
      rewards: {
        recipients: [{
          recipient: address || '',
          admin: address || '',
          bps: 10000,
          token: 'Both'
        }],
        customDistribution: false,
        useSimpleDistribution: true
      },
      vanity: {
        enabled: false,
        suffix: '0x4b07',
        type: 'suffix',
        customSalt: undefined
      },
      advanced: {
        customHookData: false,
        hookData: undefined,
        customExtensions: [],
        gasOptimization: false
      }
    });
    setShowDraftModal(false);
  };

  // Memoized updateConfig to prevent unnecessary re-renders
  const updateConfig = useCallback((updates: Partial<TokenConfig>) => {
    setConfig(prev => ({ ...prev, ...updates, interfaceName: 'astropad' }));
  }, []);

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
            address={address}
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
            updateConfig={updateConfig}
          />
        );
      default:
        return <div>Step not implemented yet</div>;
    }
  };

  if (!connected && currentStep === 4) {
    return (
      <div className="text-center" style={{ padding: 'var(--spacing-3xl) 0' }}>
        <h2 className="text-2xl font-bold text-primary mb-md">Wallet Required for Deployment</h2>
        <p className="text-secondary mb-md">Please connect your wallet to deploy your token. You can configure everything else without a wallet.</p>
        <button className="btn btn-primary btn-lg" onClick={() => open()}>Connect Wallet</button>
      </div>
    );
  }

  return (
    <>
      {/* Draft Modal */}
      {showDraftModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.35)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div className="card animate-fade-in" style={{ maxWidth: 420, width: '90vw', textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
            <h2 className="text-xl font-bold text-primary mb-lg">Continue Previous Setup?</h2>
            <p className="text-secondary mb-lg">We found a saved token deployment draft for your wallet.<br/>Would you like to continue where you left off or start a new setup?</p>
            <div className="flex justify-center space-x-md mt-xl">
              <button className="btn btn-primary btn-lg" onClick={handleContinueDraft}>
                Continue
              </button>
              <button className="btn btn-secondary btn-lg" onClick={handleStartNew}>
                Start New
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Main Wizard UI */}
      <div className="space-y-xl" style={{ filter: showDraftModal ? 'blur(2px)' : undefined, pointerEvents: showDraftModal ? 'none' : undefined }}>
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
    </>
  );
}

export { TokenDeployWizard as default }; 