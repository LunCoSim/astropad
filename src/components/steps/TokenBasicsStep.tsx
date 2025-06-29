import type { TokenConfig } from '../TokenDeployWizard';
import { InfoTooltip } from '../ui/InfoTooltip';

interface CoinBasicsStepProps {
  config: TokenConfig;
  updateConfig: (updates: Partial<TokenConfig>) => void;
  onNext: () => void;
}

export function CoinBasicsStep({ config, updateConfig, onNext }: CoinBasicsStepProps) {
  const isValid = !!(config.name && config.symbol && config.admin);

  const addSocialUrl = () => {
    updateConfig({
      socialUrls: [...config.socialUrls, '']
    });
  };

  const removeSocialUrl = (index: number) => {
    if (config.socialUrls.length > 1) {
      updateConfig({
        socialUrls: config.socialUrls.filter((_, i) => i !== index)
      });
    }
  };

  const updateSocialUrl = (index: number, value: string) => {
    const newUrls = [...config.socialUrls];
    newUrls[index] = value;
    updateConfig({ socialUrls: newUrls });
  };

  const addAuditUrl = () => {
    updateConfig({
      auditUrls: [...config.auditUrls, '']
    });
  };

  const removeAuditUrl = (index: number) => {
    if (config.auditUrls.length > 1) {
      updateConfig({
        auditUrls: config.auditUrls.filter((_, i) => i !== index)
      });
    }
  };

  const updateAuditUrl = (index: number, value: string) => {
    const newUrls = [...config.auditUrls];
    newUrls[index] = value;
    updateConfig({ auditUrls: newUrls });
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Coin Details</h2>
        <p className="text-gray-600 text-sm">
          Set up your coin's basic information and branding
        </p>
      </div>

      <div className="bg-gray-50 rounded-xl p-4 space-y-4">
        <h3 className="text-sm font-medium text-gray-900 flex items-center">
          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></span>
          Basic Information
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700 flex items-center">
              <span>Coin Name</span>
              <span className="text-red-500 ml-1">*</span>
            </label>
            <input
              type="text"
              value={config.name}
              onChange={(e) => updateConfig({ name: e.target.value })}
              placeholder="My Project Coin"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              maxLength={50}
            />
            <div className="text-xs text-gray-500">{config.name.length}/50 characters</div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700 flex items-center">
              <span>Symbol</span>
              <span className="text-red-500 ml-1">*</span>
            </label>
            <input
              type="text"
              value={config.symbol}
              onChange={(e) => updateConfig({ symbol: e.target.value.toUpperCase() })}
              placeholder="MPC"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
              maxLength={10}
            />
            <div className="text-xs text-gray-500">{config.symbol.length}/10 characters</div>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-700 flex items-center">
            <span>Coin Admin</span>
            <span className="text-red-500 ml-1">*</span>
            <InfoTooltip content="The wallet address that will control this coin contract. Defaults to your connected wallet." />
          </label>
          <input
            type="text"
            value={config.admin}
            onChange={(e) => updateConfig({ admin: e.target.value })}
            placeholder="0x... (defaults to connected wallet)"
            className="w-full px-3 py-2 text-xs font-mono border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div className="text-xs text-gray-500">
            This address will have admin privileges for the coin contract
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-700 flex items-center">
            <span>Coin Image (IPFS)</span>
            <InfoTooltip content="IPFS URL for your coin's image. This will appear in wallets and DEX interfaces." />
          </label>
          <input
            type="text"
            value={config.image}
            onChange={(e) => updateConfig({ image: e.target.value })}
            placeholder="ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"
            className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div className="text-xs text-gray-500">
            Upload your image to IPFS and paste the URL here
          </div>
        </div>
      </div>

      <div className="bg-gray-50 rounded-xl p-4 space-y-4">
        <h3 className="text-sm font-medium text-gray-900 flex items-center">
          <span className="w-1.5 h-1.5 bg-purple-500 rounded-full mr-2"></span>
          Description & Social Links
        </h3>

        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-700 flex items-center">
            <span>Project Description</span>
            <InfoTooltip content="Describe your coin project. This helps users understand what your coin is about." />
          </label>
          <textarea
            value={config.description}
            onChange={(e) => updateConfig({ description: e.target.value })}
            placeholder="Describe your coin project, its purpose, and key features..."
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={3}
            maxLength={300}
          />
          <div className="text-xs text-gray-500">{config.description.length}/300 characters</div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-gray-700">Social Media URLs</label>
            <button
              type="button"
              onClick={addSocialUrl}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              + Add URL
            </button>
          </div>
          {config.socialUrls.map((url, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="url"
                value={url}
                onChange={(e) => updateSocialUrl(index, e.target.value)}
                placeholder="https://twitter.com/yourproject"
                className="flex-1 px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {config.socialUrls.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeSocialUrl(index)}
                  className="px-2 py-1 text-red-600 hover:bg-red-50 rounded text-xs"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-gray-700">Audit URLs</label>
            <button
              type="button"
              onClick={addAuditUrl}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              + Add Report
            </button>
          </div>
          {config.auditUrls.map((url, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="url"
                value={url}
                onChange={(e) => updateAuditUrl(index, e.target.value)}
                placeholder="https://audit.example.com/report"
                className="flex-1 px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {config.auditUrls.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeAuditUrl(index)}
                  className="px-2 py-1 text-red-600 hover:bg-red-50 rounded text-xs"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gray-50 rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-medium text-gray-900 flex items-center">
          <span className="w-1.5 h-1.5 bg-gray-500 rounded-full mr-2"></span>
          Social Context <span className="text-xs text-gray-500 ml-2">(Optional)</span>
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">Interface Name</label>
            <input
              type="text"
              value={config.interfaceName}
              onChange={(e) => updateConfig({ interfaceName: e.target.value })}
                             placeholder="astropad"
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">Platform</label>
            <input
              type="text"
              value={config.platform}
              onChange={(e) => updateConfig({ platform: e.target.value })}
              placeholder="Farcaster"
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">Message ID</label>
            <input
              type="text"
              value={config.messageId}
              onChange={(e) => updateConfig({ messageId: e.target.value })}
              placeholder="Message identifier"
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">Social ID</label>
            <input
              type="text"
              value={config.socialId}
              onChange={(e) => updateConfig({ socialId: e.target.value })}
              placeholder="Social identifier"
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={onNext}
          disabled={!isValid}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            isValid 
              ? 'bg-blue-600 text-white hover:bg-blue-700' 
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          Continue to Liquidity Setup →
        </button>
      </div>
    </div>
  );
}

// Export with backward compatibility
export const TokenBasicsStep = CoinBasicsStep; 