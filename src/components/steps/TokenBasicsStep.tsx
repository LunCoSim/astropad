import type { TokenConfig } from '../TokenDeployWizard';
import { InfoTooltip } from '../ui/InfoTooltip';

interface TokenBasicsStepProps {
  config: TokenConfig;
  updateConfig: (updates: Partial<TokenConfig>) => void;
  onNext: () => void;
}

export function TokenBasicsStep({ config, updateConfig, onNext }: TokenBasicsStepProps) {
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
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-blue-600 rounded-3xl flex items-center justify-center text-white text-3xl mx-auto mb-4 shadow-lg">
          🎯
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Token Details</h2>
        <p className="text-gray-600 max-w-lg mx-auto">
          Set up your token's basic information. This will be visible to traders and investors.
        </p>
      </div>

      {/* Core Information */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
          Core Information
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-label flex items-center space-x-2">
              <span>Token Name</span>
              <span className="text-red-500">*</span>
              <InfoTooltip content="The full name of your token (e.g., 'My Awesome Project')" />
            </label>
            <input
              type="text"
              value={config.name}
              onChange={(e) => updateConfig({ name: e.target.value })}
              placeholder="My Awesome Token"
              className="input w-full"
              maxLength={50}
            />
            <div className="text-xs text-gray-500">{config.name.length}/50 characters</div>
          </div>

          <div className="space-y-2">
            <label className="text-label flex items-center space-x-2">
              <span>Token Symbol</span>
              <span className="text-red-500">*</span>
              <InfoTooltip content="The ticker symbol for your token (e.g., 'MAT'). Keep it short and memorable." />
            </label>
            <input
              type="text"
              value={config.symbol}
              onChange={(e) => updateConfig({ symbol: e.target.value.toUpperCase() })}
              placeholder="MAT"
              className="input w-full uppercase"
              maxLength={10}
            />
            <div className="text-xs text-gray-500">{config.symbol.length}/10 characters</div>
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <label className="text-label flex items-center space-x-2">
            <span>Token Admin</span>
            <span className="text-red-500">*</span>
            <InfoTooltip content="The wallet address that will control this token contract. Defaults to your connected wallet." />
          </label>
          <input
            type="text"
            value={config.admin}
            onChange={(e) => updateConfig({ admin: e.target.value })}
            placeholder="0x... (defaults to connected wallet)"
            className="input w-full font-mono text-sm"
          />
          <div className="text-xs text-gray-500">
            This address will have admin privileges for the token contract
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <label className="text-label flex items-center space-x-2">
            <span>Token Image</span>
            <InfoTooltip content="IPFS URL for your token's image. This will appear in wallets and DEX interfaces." />
          </label>
          <input
            type="text"
            value={config.image}
            onChange={(e) => updateConfig({ image: e.target.value })}
            placeholder="ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"
            className="input w-full text-sm"
          />
          <div className="text-xs text-gray-500">
            Upload your image to IPFS and paste the URL here
          </div>
        </div>
      </div>

      {/* Description & Metadata */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <span className="w-2 h-2 bg-purple-500 rounded-full mr-3"></span>
          Description & Metadata
        </h3>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-label flex items-center space-x-2">
              <span>Project Description</span>
              <InfoTooltip content="Describe your token project. This helps users understand what your token is about." />
            </label>
            <textarea
              value={config.description}
              onChange={(e) => updateConfig({ description: e.target.value })}
              placeholder="Describe your token project, its purpose, and key features..."
              className="input w-full min-h-[100px] resize-y"
              maxLength={500}
            />
            <div className="text-xs text-gray-500">{config.description.length}/500 characters</div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-label flex items-center space-x-2">
                <span>Social Media Links</span>
                <InfoTooltip content="Add links to your project's social media accounts and website." />
              </label>
              <button
                type="button"
                onClick={addSocialUrl}
                className="text-sm text-purple-600 hover:text-purple-700 font-medium"
              >
                + Add Link
              </button>
            </div>
            <div className="space-y-3">
              {config.socialUrls.map((url, index) => (
                <div key={index} className="flex space-x-2">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => updateSocialUrl(index, e.target.value)}
                    placeholder="https://twitter.com/yourproject"
                    className="input flex-1 text-sm"
                  />
                  {config.socialUrls.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSocialUrl(index)}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-label flex items-center space-x-2">
                <span>Audit Reports</span>
                <InfoTooltip content="Links to security audit reports for your project." />
              </label>
              <button
                type="button"
                onClick={addAuditUrl}
                className="text-sm text-purple-600 hover:text-purple-700 font-medium"
              >
                + Add Report
              </button>
            </div>
            <div className="space-y-3">
              {config.auditUrls.map((url, index) => (
                <div key={index} className="flex space-x-2">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => updateAuditUrl(index, e.target.value)}
                    placeholder="https://auditor.com/report.pdf"
                    className="input flex-1 text-sm"
                  />
                  {config.auditUrls.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeAuditUrl(index)}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Social Context (Optional) */}
      <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-2xl p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <span className="w-2 h-2 bg-gray-500 rounded-full mr-3"></span>
          Social Context
          <span className="ml-2 text-sm text-gray-500 font-normal">(Optional)</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-label">Interface Name</label>
            <input
              type="text"
              value={config.interfaceName}
              onChange={(e) => updateConfig({ interfaceName: e.target.value })}
              placeholder="Astropad"
              className="input"
            />
          </div>

          <div className="space-y-2">
            <label className="text-label">Platform</label>
            <input
              type="text"
              value={config.platform}
              onChange={(e) => updateConfig({ platform: e.target.value })}
              placeholder="farcaster"
              className="input"
            />
          </div>

          <div className="space-y-2">
            <label className="text-label">Message ID</label>
            <input
              type="text"
              value={config.messageId}
              onChange={(e) => updateConfig({ messageId: e.target.value })}
              placeholder="Message identifier"
              className="input"
            />
          </div>

          <div className="space-y-2">
            <label className="text-label">Social ID</label>
            <input
              type="text"
              value={config.socialId}
              onChange={(e) => updateConfig({ socialId: e.target.value })}
              placeholder="Social identifier"
              className="input"
            />
          </div>
        </div>
      </div>

      {/* Next Button */}
      <div className="flex justify-end">
        <button
          onClick={onNext}
          disabled={!isValid}
          className={`btn btn-lg ${isValid ? 'btn-primary' : 'btn-secondary'} px-8`}
        >
          <span>Continue to Liquidity Setup</span>
          <span className="text-xl">→</span>
        </button>
      </div>

      {/* Validation Message */}
      {!isValid && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center space-x-3">
            <span className="text-amber-600 text-xl">⚠️</span>
            <div>
              <p className="text-sm font-medium text-amber-800">Required fields missing</p>
              <p className="text-sm text-amber-700">
                Please fill in the token name, symbol, and admin address to continue.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 