import type { TokenConfig } from '../TokenDeployWizard';
import { InfoTooltip } from '../ui/InfoTooltip';
import { addSocialUrl, removeSocialUrl, updateSocialUrl, addAuditUrl, removeAuditUrl, updateAuditUrl } from '../../../lib/array-utils';

interface CoinBasicsStepProps {
  config: TokenConfig;
  updateConfig: (updates: Partial<TokenConfig>) => void;
  onNext: () => void;
}

export function CoinBasicsStep({ config, updateConfig, onNext }: CoinBasicsStepProps) {
  const isValid = !!(config.name && config.symbol && config.admin);

  const handleAddSocialUrl = () => {
    updateConfig({
      socialUrls: addSocialUrl(config.socialUrls)
    });
  };

  const handleRemoveSocialUrl = (index: number) => {
    updateConfig({
      socialUrls: removeSocialUrl(config.socialUrls, index)
    });
  };

  const handleUpdateSocialUrl = (index: number, value: string) => {
    updateConfig({
      socialUrls: updateSocialUrl(config.socialUrls, index, value)
    });
  };

  const handleAddAuditUrl = () => {
    updateConfig({
      auditUrls: addAuditUrl(config.auditUrls)
    });
  };

  const handleRemoveAuditUrl = (index: number) => {
    updateConfig({
      auditUrls: removeAuditUrl(config.auditUrls, index)
    });
  };

  const handleUpdateAuditUrl = (index: number, value: string) => {
    updateConfig({
      auditUrls: updateAuditUrl(config.auditUrls, index, value)
    });
  };

  return (
    <div className="space-y-2xl animate-fade-in">
      {/* Enhanced Header */}
      <div className="text-center space-y-md">
        <div className="animate-float mx-auto" style={{ width: '5rem', height: '5rem', background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))', borderRadius: 'var(--radius-2xl)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg style={{ width: '2.5rem', height: '2.5rem' }} className="text-primary" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
          </svg>
        </div>
        <h2 className="text-4xl font-bold text-primary mb-md">
          Configure Your <span className="text-gradient">Token</span>
        </h2>
        <p className="text-lg text-muted mx-auto" style={{ maxWidth: '48rem', lineHeight: '1.7' }}>
          Set up your token's identity and core information. This forms the foundation of your project and how users will discover and interact with your token.
        </p>
      </div>

      {/* Basic Information Card */}
      <div className="card card-hover animate-slide-up">
        <div className="flex items-center space-x-md mb-xl">
          <div style={{ width: '3rem', height: '3rem', background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))', borderRadius: 'var(--radius-xl)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg style={{ width: '1.5rem', height: '1.5rem' }} className="text-primary" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-primary">Basic Information</h3>
            <p className="text-muted text-sm">Essential details for your token</p>
          </div>
        </div>

        <div className="grid grid-2 gap-xl">
          <div className="form-group">
            <label className="form-label">
              <span>Token Name</span>
              <span className="required">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={config.name}
                onChange={(e) => updateConfig({ name: e.target.value })}
                placeholder="e.g., AstroPad Token"
                className="input font-medium"
                maxLength={50}
              />
              <div className="absolute" style={{ top: '50%', right: 'var(--spacing-md)', transform: 'translateY(-50%)' }}>
                <div className="text-xs text-muted font-mono rounded-md" style={{ background: 'var(--bg-surface)', padding: 'var(--spacing-xs) var(--spacing-sm)' }}>
                  {config.name.length}/50
                </div>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              <span>Symbol</span>
              <span className="required">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={config.symbol}
                onChange={(e) => updateConfig({ symbol: e.target.value.toUpperCase() })}
                placeholder="e.g., ASTRO"
                className="input font-mono uppercase"
                style={{ letterSpacing: '0.1em' }}
                maxLength={10}
              />
              <div className="absolute" style={{ top: '50%', right: 'var(--spacing-md)', transform: 'translateY(-50%)' }}>
                <div className="text-xs text-muted font-mono rounded-md" style={{ background: 'var(--bg-surface)', padding: 'var(--spacing-xs) var(--spacing-sm)' }}>
                  {config.symbol.length}/10
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="form-group mt-xl">
          <label className="form-label">
            <span>Token Admin</span>
            <span className="required">*</span>
            <InfoTooltip content="The wallet address that will control this token contract and receive admin privileges." />
          </label>
          <input
            type="text"
            value={config.admin}
            onChange={(e) => updateConfig({ admin: e.target.value })}
            placeholder="0x... (defaults to your connected wallet)"
            className="input font-mono text-sm"
          />
        </div>

        <div className="form-group mt-xl">
          <label className="form-label">
            <span>Token Image</span>
            <InfoTooltip content="IPFS URL for your token's logo. This will appear in wallets, DEX interfaces, and token lists." />
          </label>
          <div className="relative">
            <input
              type="text"
              value={config.image}
              onChange={(e) => updateConfig({ image: e.target.value })}
              placeholder="ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf..."
              className="input font-mono text-sm"
              style={{ paddingRight: '3.5rem' }}
            />
            <div className="absolute" style={{ top: '50%', right: 'var(--spacing-md)', transform: 'translateY(-50%)' }}>
              <div className="rounded-lg transition" style={{ padding: 'var(--spacing-sm)', background: 'var(--bg-surface)' }}>
                <svg style={{ width: '1.25rem', height: '1.25rem' }} className="text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Description & Branding Card */}
      <div className="card card-hover animate-slide-up">
        <div className="flex items-center space-x-md mb-xl">
          <div style={{ width: '3rem', height: '3rem', background: 'linear-gradient(135deg, var(--color-secondary), var(--color-secondary-dark))', borderRadius: 'var(--radius-xl)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg style={{ width: '1.5rem', height: '1.5rem' }} className="text-primary" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-primary">Description & Branding</h3>
            <p className="text-muted text-sm">Tell your story and add social links</p>
          </div>
        </div>

        <div className="space-y-xl">
          <div className="form-group">
            <label className="form-label">
              <span>Project Description</span>
              <InfoTooltip content="Describe your token's purpose, utility, and key features. This helps users understand your project." />
            </label>
            <div className="relative">
              <textarea
                value={config.description}
                onChange={(e) => updateConfig({ description: e.target.value })}
                placeholder="Describe your token project, its unique features, and what makes it special..."
                className="input textarea"
                rows={5}
                maxLength={300}
              />
              <div className="absolute" style={{ bottom: 'var(--spacing-md)', right: 'var(--spacing-md)' }}>
                <div className="text-xs text-muted font-mono rounded-md" style={{ background: 'var(--bg-surface)', padding: 'var(--spacing-xs) var(--spacing-sm)' }}>
                  {config.description.length}/300
                </div>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              <span>Social Media Links</span>
              <InfoTooltip content="Add links to your project's social media, website, or community channels." />
            </label>
            <div className="space-y-md">
              {config.socialUrls.map((url, index) => (
                <div key={index} className="flex gap-md">
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => handleUpdateSocialUrl(index, e.target.value)}
                    placeholder="https://twitter.com/yourproject"
                    className="input flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveSocialUrl(index)}
                    className="btn btn-secondary"
                    style={{ padding: 'var(--spacing-sm)' }}
                    disabled={config.socialUrls.length <= 1}
                  >
                    <svg style={{ width: '1rem', height: '1rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddSocialUrl}
                className="btn btn-secondary text-sm"
              >
                <svg style={{ width: '1rem', height: '1rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Social Link
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              <span>Audit Reports</span>
              <InfoTooltip content="Links to security audits or documentation that builds trust in your project." />
            </label>
            <div className="space-y-md">
              {config.auditUrls.map((url, index) => (
                <div key={index} className="flex gap-md">
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => handleUpdateAuditUrl(index, e.target.value)}
                    placeholder="https://your-audit-report.pdf"
                    className="input flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveAuditUrl(index)}
                    className="btn btn-secondary"
                    style={{ padding: 'var(--spacing-sm)' }}
                    disabled={config.auditUrls.length <= 1}
                  >
                    <svg style={{ width: '1rem', height: '1rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddAuditUrl}
                className="btn btn-secondary text-sm"
              >
                <svg style={{ width: '1rem', height: '1rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Audit Report
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Continue Button */}
      <div className="text-center mt-2xl">
        <button
          onClick={onNext}
          disabled={!isValid}
          className="btn btn-primary btn-lg"
        >
          Continue to Liquidity Setup
          <svg style={{ width: '1rem', height: '1rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// Export with the name expected by the wizard
export { CoinBasicsStep as TokenBasicsStep }; 