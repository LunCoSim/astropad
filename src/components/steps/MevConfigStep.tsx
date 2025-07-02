import type { TokenConfig } from '../../../lib/types';
import { InfoTooltip } from '../ui/InfoTooltip';

interface MevConfigStepProps {
  config: TokenConfig;
  updateConfig: (updates: Partial<TokenConfig>) => void;
  onNext: () => void;
  onPrevious: () => void;
}

export function MevConfigStep({ config, updateConfig, onNext, onPrevious }: MevConfigStepProps) {
  const handleMevToggle = (enabled: boolean) => {
    updateConfig({
      mev: {
        ...config.mev,
        enabled
      }
    });
  };

  const handleModuleTypeChange = (moduleType: 'block-delay' | 'custom') => {
    updateConfig({
      mev: {
        ...config.mev,
        moduleType,
        // Reset custom fields when switching to block-delay
        ...(moduleType === 'block-delay' ? {
          customModule: undefined,
          customData: undefined
        } : {})
      }
    });
  };

  const handleBlockDelayChange = (blockDelay: number) => {
    updateConfig({
      mev: {
        ...config.mev,
        blockDelay
      }
    });
  };

  const handleCustomModuleChange = (customModule: string) => {
    updateConfig({
      mev: {
        ...config.mev,
        customModule
      }
    });
  };

  const handleCustomDataChange = (customData: string) => {
    updateConfig({
      mev: {
        ...config.mev,
        customData
      }
    });
  };

  return (
    <div className="space-y-2xl animate-fade-in">
      <div className="text-center space-y-md">
        <h2 className="text-4xl font-bold text-primary mb-md">
          MEV <span className="text-gradient">Protection</span>
        </h2>
        <p className="text-lg text-muted mx-auto" style={{ maxWidth: '48rem', lineHeight: '1.7' }}>
          Configure MEV protection for your token to prevent front-running and sandwich attacks.
        </p>
      </div>
      
      <div className="flex justify-between items-center mt-2xl">
        <button onClick={onPrevious} className="btn btn-secondary">
          ← Back
        </button>
        <button onClick={onNext} className="btn btn-primary btn-lg">
          Continue →
        </button>
      </div>
    </div>
  );
} 