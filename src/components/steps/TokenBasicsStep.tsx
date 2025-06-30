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
    <div className="space-y-10 animate-fade-in-up">
      {/* Enhanced Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-3xl shadow-lg shadow-primary-500/25 animate-floating">
          <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
          </svg>
        </div>
        <h2 className="text-4xl font-bold text-white mb-4">
          Configure Your <span className="text-gradient">Token</span>
        </h2>
        <p className="text-lg text-muted max-w-3xl mx-auto leading-relaxed">
          Set up your token's identity and core information. This forms the foundation of your project and how users will discover and interact with your token.
        </p>
      </div>

      {/* Basic Information Card */}
      <div className="card p-8 card-hover animate-slide-in-left">
        <div className="flex items-center space-x-4 mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center shadow-lg">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-white">Basic Information</h3>
            <p className="text-white/60 text-sm">Essential details for your token</p>
          </div>
          <div className="h-px bg-gradient-to-r from-white/30 to-transparent flex-1"></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-3">
            <label className="flex items-center text-sm font-semibold text-white/90">
              <span>Token Name</span>
              <span className="text-danger-400 ml-1">*</span>
            </label>
            <div className="relative group">
              <input
                type="text"
                value={config.name}
                onChange={(e) => updateConfig({ name: e.target.value })}
                placeholder="e.g., AstroPad Token"
                className="input w-full font-medium text-white placeholder-white/40 focus:shadow-glow"
                maxLength={50}
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-6">
                <div className="text-xs text-white/50 font-mono bg-white/10 px-2 py-1 rounded-md">
                  {config.name.length}/50
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <label className="flex items-center text-sm font-semibold text-white/90">
              <span>Symbol</span>
              <span className="text-danger-400 ml-1">*</span>
            </label>
            <div className="relative group">
              <input
                type="text"
                value={config.symbol}
                onChange={(e) => updateConfig({ symbol: e.target.value.toUpperCase() })}
                placeholder="e.g., ASTRO"
                className="input w-full font-mono text-white placeholder-white/40 uppercase tracking-wider focus:shadow-glow"
                maxLength={10}
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-6">
                <div className="text-xs text-white/50 font-mono bg-white/10 px-2 py-1 rounded-md">
                  {config.symbol.length}/10
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 space-y-3">
          <label className="flex items-center text-sm font-semibold text-white/90">
            <span>Token Admin</span>
            <span className="text-danger-400 ml-1">*</span>
            <InfoTooltip content="The wallet address that will control this token contract and receive admin privileges." />
          </label>
          <input
            type="text"
            value={config.admin}
            onChange={(e) => updateConfig({ admin: e.target.value })}
            placeholder="0x... (defaults to your connected wallet)"
            className="input w-full font-mono text-sm text-white placeholder-white/40 focus:shadow-glow"
          />
        </div>

        <div className="mt-8 space-y-3">
          <label className="flex items-center text-sm font-semibold text-white/90">
            <span>Token Image</span>
            <InfoTooltip content="IPFS URL for your token's logo. This will appear in wallets, DEX interfaces, and token lists." />
          </label>
          <div className="relative group">
            <input
              type="text"
              value={config.image}
              onChange={(e) => updateConfig({ image: e.target.value })}
              placeholder="ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf..."
              className="input w-full font-mono text-sm text-white placeholder-white/40 focus:shadow-glow pr-14"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-6">
              <div className="p-2 rounded-lg bg-white/10 group-hover:bg-white/20 transition-colors">
                <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Description & Branding Card */}
      <div className="card p-8 card-hover animate-slide-in-right">
        <div className="flex items-center space-x-4 mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-secondary-500 to-secondary-600 rounded-2xl flex items-center justify-center shadow-lg">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-white">Description & Branding</h3>
            <p className="text-white/60 text-sm">Tell your story and add social links</p>
          </div>
          <div className="h-px bg-gradient-to-r from-white/30 to-transparent flex-1"></div>
        </div>

        <div className="space-y-8">
          <div className="space-y-3">
            <label className="flex items-center text-sm font-semibold text-white/90">
              <span>Project Description</span>
              <InfoTooltip content="Describe your token's purpose, utility, and key features. This helps users understand your project." />
            </label>
            <div className="relative group">
              <textarea
                value={config.description}
                onChange={(e) => updateConfig({ description: e.target.value })}
                placeholder="Describe your token project, its unique features, and what makes it special..."
                className="input w-full resize-none text-white placeholder-white/40 focus:shadow-glow min-h-[120px]"
                rows={5}
                maxLength={300}
              />
              <div className="absolute bottom-4 right-6">
                <div className="text-xs text-white/50 font-mono bg-white/10 px-2 py-1 rounded-md">
                  {config.description.length}/300
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-white/90 flex items-center">
                <div className="w-8 h-8 bg-gradient-to-br from-success-500 to-success-600 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/>
                  </svg>
                </div>
                Social Media Links
              </label>
              <button
                type="button"
                onClick={addSocialUrl}
                className="btn-glass px-4 py-2 text-sm rounded-xl hover:scale-105 transition-transform"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Link
              </button>
            </div>

            <div className="space-y-4">
              {config.socialUrls.map((url, index) => (
                <div key={index} className="flex gap-3 animate-scale-in">
                  <div className="flex-1 relative group">
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => updateSocialUrl(index, e.target.value)}
                      placeholder="https://twitter.com/yourproject"
                      className="input w-full text-sm text-white placeholder-white/40 focus:shadow-glow pr-12"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                      <svg className="w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    </div>
                  </div>
                  {config.socialUrls.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSocialUrl(index)}
                      className="w-12 h-12 bg-danger-500/20 hover:bg-danger-500/30 text-danger-400 rounded-xl flex items-center justify-center transition-colors group"
                    >
                      <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-white/90 flex items-center">
                <div className="w-8 h-8 bg-gradient-to-br from-warning-500 to-warning-600 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                Audit Reports
              </label>
              <button
                type="button"
                onClick={addAuditUrl}
                className="btn-glass px-4 py-2 text-sm rounded-xl hover:scale-105 transition-transform"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Audit
              </button>
            </div>

            <div className="space-y-4">
              {config.auditUrls.map((url, index) => (
                <div key={index} className="flex gap-3 animate-scale-in">
                  <div className="flex-1 relative group">
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => updateAuditUrl(index, e.target.value)}
                      placeholder="https://your-audit-report.pdf"
                      className="input w-full text-sm text-white placeholder-white/40 focus:shadow-glow pr-12"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                      <svg className="w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                  </div>
                  {config.auditUrls.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeAuditUrl(index)}
                      className="w-12 h-12 bg-danger-500/20 hover:bg-danger-500/30 text-danger-400 rounded-xl flex items-center justify-center transition-colors group"
                    >
                      <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Next Button */}
      <div className="flex justify-end pt-8">
        <button
          onClick={onNext}
          disabled={!isValid}
          className={`
            btn px-8 py-4 text-lg font-semibold rounded-2xl transition-all duration-300 transform
            ${isValid 
              ? 'btn-primary hover:scale-105 shadow-glow' 
              : 'bg-white/10 text-white/50 cursor-not-allowed'
            }
          `}
        >
          <span>Continue to Liquidity Setup</span>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// Export with backward compatibility
export const TokenBasicsStep = CoinBasicsStep; 