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
    <div className="space-y-8">
      {/* Modern Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-4">
          Configure Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">Coin</span>
        </h2>
        <p className="text-blue-200 text-lg max-w-2xl mx-auto">
          Set up your coin's identity, branding, and core information. This forms the foundation of your token.
        </p>
      </div>

      {/* Basic Information Card */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 shadow-xl">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white">Basic Information</h3>
          <div className="flex-1 h-px bg-gradient-to-r from-white/30 to-transparent"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="flex items-center text-sm font-medium text-white mb-2">
              <span>Coin Name</span>
              <span className="text-red-400 ml-1">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={config.name}
                onChange={(e) => updateConfig({ name: e.target.value })}
                placeholder="e.g., AstroPad Token"
                className="w-full px-4 py-4 bg-white/10 backdrop-blur-sm border border-white/30 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
                maxLength={50}
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                <div className="text-xs text-white/60 font-mono">
                  {config.name.length}/50
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center text-sm font-medium text-white mb-2">
              <span>Symbol</span>
              <span className="text-red-400 ml-1">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={config.symbol}
                onChange={(e) => updateConfig({ symbol: e.target.value.toUpperCase() })}
                placeholder="e.g., ASTRO"
                className="w-full px-4 py-4 bg-white/10 backdrop-blur-sm border border-white/30 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 uppercase font-mono"
                maxLength={10}
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                <div className="text-xs text-white/60 font-mono">
                  {config.symbol.length}/10
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <label className="flex items-center text-sm font-medium text-white mb-2">
            <span>Coin Admin</span>
            <span className="text-red-400 ml-1">*</span>
            <InfoTooltip content="The wallet address that will control this coin contract and receive admin privileges." />
          </label>
          <input
            type="text"
            value={config.admin}
            onChange={(e) => updateConfig({ admin: e.target.value })}
            placeholder="0x... (defaults to your connected wallet)"
            className="w-full px-4 py-4 bg-white/10 backdrop-blur-sm border border-white/30 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 font-mono text-sm"
          />
        </div>

        <div className="mt-6 space-y-2">
          <label className="flex items-center text-sm font-medium text-white mb-2">
            <span>Coin Image</span>
            <InfoTooltip content="IPFS URL for your coin's logo. This will appear in wallets, DEX interfaces, and token lists." />
          </label>
          <div className="relative">
            <input
              type="text"
              value={config.image}
              onChange={(e) => updateConfig({ image: e.target.value })}
              placeholder="ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf..."
              className="w-full px-4 py-4 bg-white/10 backdrop-blur-sm border border-white/30 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 font-mono text-sm"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-4">
              <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Description & Branding Card */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 shadow-xl">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white">Description & Branding</h3>
          <div className="flex-1 h-px bg-gradient-to-r from-white/30 to-transparent"></div>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="flex items-center text-sm font-medium text-white mb-2">
              <span>Project Description</span>
              <InfoTooltip content="Describe your coin's purpose, utility, and key features. This helps users understand your project." />
            </label>
            <div className="relative">
              <textarea
                value={config.description}
                onChange={(e) => updateConfig({ description: e.target.value })}
                placeholder="Describe your coin project, its unique features, and what makes it special..."
                className="w-full px-4 py-4 bg-white/10 backdrop-blur-sm border border-white/30 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 resize-none"
                rows={4}
                maxLength={300}
              />
              <div className="absolute bottom-4 right-4 text-xs text-white/60 font-mono">
                {config.description.length}/300
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-white flex items-center">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                Social Media Links
              </label>
              <button
                type="button"
                onClick={addSocialUrl}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white text-sm font-medium rounded-lg transition-all duration-200 transform hover:scale-105"
              >
                + Add Link
              </button>
            </div>
            
            <div className="space-y-3">
              {config.socialUrls.map((url, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <div className="flex-1 relative">
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => updateSocialUrl(index, e.target.value)}
                      placeholder="https://twitter.com/yourproject"
                      className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/30 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                      <svg className="w-4 h-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    </div>
                  </div>
                  {config.socialUrls.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSocialUrl(index)}
                      className="w-10 h-10 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-all duration-200 flex items-center justify-center"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-white flex items-center">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Audit Reports
              </label>
              <button
                type="button"
                onClick={addAuditUrl}
                className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white text-sm font-medium rounded-lg transition-all duration-200 transform hover:scale-105"
              >
                + Add Report
              </button>
            </div>
            
            <div className="space-y-3">
              {config.auditUrls.map((url, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <div className="flex-1 relative">
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => updateAuditUrl(index, e.target.value)}
                      placeholder="https://audit.example.com/report"
                      className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/30 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                      <svg className="w-4 h-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                  </div>
                  {config.auditUrls.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeAuditUrl(index)}
                      className="w-10 h-10 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-all duration-200 flex items-center justify-center"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Social Context Card */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-8 h-8 bg-gradient-to-r from-gray-500 to-gray-600 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white">Social Context</h3>
          <span className="text-sm text-white/60 bg-white/10 px-3 py-1 rounded-full">Optional</span>
          <div className="flex-1 h-px bg-gradient-to-r from-white/30 to-transparent"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-white">Interface Name</label>
            <input
              type="text"
              value={config.interfaceName}
              onChange={(e) => updateConfig({ interfaceName: e.target.value })}
              placeholder="astropad"
              className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/30 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-white">Platform</label>
            <input
              type="text"
              value={config.platform}
              onChange={(e) => updateConfig({ platform: e.target.value })}
              placeholder="Farcaster"
              className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/30 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-white">Message ID</label>
            <input
              type="text"
              value={config.messageId}
              onChange={(e) => updateConfig({ messageId: e.target.value })}
              placeholder="Message identifier"
              className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/30 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-white">Social ID</label>
            <input
              type="text"
              value={config.socialId}
              onChange={(e) => updateConfig({ socialId: e.target.value })}
              placeholder="Social identifier"
              className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/30 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end pt-6">
        <button
          onClick={onNext}
          disabled={!isValid}
          className={`px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-200 transform hover:scale-105 ${
            isValid 
              ? 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-lg shadow-blue-500/30' 
              : 'bg-white/10 text-white/50 cursor-not-allowed'
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