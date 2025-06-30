import type { TokenConfig } from '../TokenDeployWizard';
import { InfoTooltip } from '../ui/InfoTooltip';

interface AdvancedConfigStepProps {
  config: TokenConfig;
  updateConfig: (updates: Partial<TokenConfig>) => void;
  onNext: () => void;
  onPrevious: () => void;
}

export function AdvancedConfigStep({ config, updateConfig, onNext, onPrevious }: AdvancedConfigStepProps) {
  const addRewardRecipient = () => {
    updateConfig({
      rewardRecipients: [
        ...config.rewardRecipients,
        { recipient: '', admin: '', bps: 1000 }
      ]
    });
  };

  const removeRewardRecipient = (index: number) => {
    if (config.rewardRecipients.length > 1) {
      updateConfig({
        rewardRecipients: config.rewardRecipients.filter((_, i) => i !== index)
      });
    }
  };

  const updateRewardRecipient = (index: number, field: 'recipient' | 'admin' | 'bps', value: string | number) => {
    const newRecipients = [...config.rewardRecipients];
    newRecipients[index] = { ...newRecipients[index], [field]: value };
    updateConfig({ rewardRecipients: newRecipients });
  };

  const totalBps = config.rewardRecipients.reduce((sum, r) => sum + r.bps, 0);

  return (
    <div className="space-y-2xl animate-fade-in">
      {/* Header */}
      <div className="text-center space-y-md">
        <h2 className="text-4xl font-bold text-primary mb-md">
          Advanced <span className="text-gradient">Configuration</span>
        </h2>
        <p className="text-lg text-secondary mx-auto" style={{ maxWidth: '48rem', lineHeight: '1.7' }}>
          Fine-tune your token's economics with custom fees, reward distribution, and vanity address settings.
        </p>
      </div>

      {/* Fee Configuration */}
      <div className="card card-hover">
        <div className="flex items-center space-x-md mb-lg">
          <h3 className="text-xl font-bold text-primary">Fee Structure</h3>
          <InfoTooltip content="Configure trading fees and reward mechanisms" />
        </div>

        <div className="space-y-lg">
          <div className="form-group">
            <label className="form-label">Fee Type</label>
            <div className="flex space-x-md">
              <label className="flex items-center space-x-sm cursor-pointer">
                <input
                  type="radio"
                  value="static"
                  checked={config.fees.type === 'static'}
                  onChange={() => updateConfig({ fees: { ...config.fees, type: 'static' } })}
                  className="radio"
                />
                <span>Static Fees</span>
                <InfoTooltip content="Fixed fee percentages that don't change." />
              </label>
              <label className="flex items-center space-x-sm cursor-pointer">
                <input
                  type="radio"
                  value="dynamic"
                  checked={config.fees.type === 'dynamic'}
                  onChange={() => updateConfig({ fees: { ...config.fees, type: 'dynamic' } })}
                  className="radio"
                />
                <span>Dynamic Fees</span>
                <InfoTooltip content="Fees that adjust based on market conditions and activity." />
              </label>
            </div>
          </div>

          {config.fees.type === 'static' ? (
            <div className="grid grid-2 gap-lg">
              <div className="form-group">
                <label className="form-label">Clanker Fee (bps)</label>
                <input
                  type="number"
                  value={config.fees.static.clankerFeeBps}
                  onChange={(e) => updateConfig({
                    fees: {
                      ...config.fees,
                      static: { ...config.fees.static, clankerFeeBps: Number(e.target.value) }
                    }
                  })}
                  min="0"
                  max="10000"
                  className="input font-mono"
                />
                <div className="text-xs text-muted mt-xs">
                  {(config.fees.static.clankerFeeBps / 100).toFixed(2)}% fee
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Paired Token Fee (bps)</label>
                <input
                  type="number"
                  value={config.fees.static.pairedFeeBps}
                  onChange={(e) => updateConfig({
                    fees: {
                      ...config.fees,
                      static: { ...config.fees.static, pairedFeeBps: Number(e.target.value) }
                    }
                  })}
                  min="0"
                  max="10000"
                  className="input font-mono"
                />
                <div className="text-xs text-muted mt-xs">
                  {(config.fees.static.pairedFeeBps / 100).toFixed(2)}% fee
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-lg">
              <div className="grid grid-2 gap-lg">
                <div className="form-group">
                  <label className="form-label">Base Fee</label>
                  <input
                    type="number"
                    value={config.fees.dynamic.baseFee}
                    onChange={(e) => updateConfig({
                      fees: {
                        ...config.fees,
                        dynamic: { ...config.fees.dynamic, baseFee: Number(e.target.value) }
                      }
                    })}
                    min="0"
                    className="input font-mono"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Max LP Fee</label>
                  <input
                    type="number"
                    value={config.fees.dynamic.maxLpFee}
                    onChange={(e) => updateConfig({
                      fees: {
                        ...config.fees,
                        dynamic: { ...config.fees.dynamic, maxLpFee: Number(e.target.value) }
                      }
                    })}
                    min="0"
                    className="input font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-2 gap-lg">
                <div className="form-group">
                  <label className="form-label">Reset Period (seconds)</label>
                  <input
                    type="number"
                    value={config.fees.dynamic.resetPeriod}
                    onChange={(e) => updateConfig({
                      fees: {
                        ...config.fees,
                        dynamic: { ...config.fees.dynamic, resetPeriod: Number(e.target.value) }
                      }
                    })}
                    min="0"
                    className="input font-mono"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Decay Filter (bps)</label>
                  <input
                    type="number"
                    value={config.fees.dynamic.decayFilterBps}
                    onChange={(e) => updateConfig({
                      fees: {
                        ...config.fees,
                        dynamic: { ...config.fees.dynamic, decayFilterBps: Number(e.target.value) }
                      }
                    })}
                    min="0"
                    max="10000"
                    className="input font-mono"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reward Recipients */}
      <div className="card card-hover">
        <div className="flex items-center space-x-md mb-lg">
          <h3 className="text-xl font-bold text-primary">Reward Recipients</h3>
          <InfoTooltip content="Configure fee distribution to different parties" />
        </div>

        <div className="space-y-lg">
          <div className="space-y-md">
            {config.rewardRecipients.map((recipient, index) => (
              <div key={index} className="card" style={{ background: 'var(--bg-surface)' }}>
                <div className="grid grid-3 gap-md">
                  <div className="form-group">
                    <label className="form-label text-sm">Recipient Address</label>
                    <input
                      type="text"
                      value={recipient.recipient}
                      onChange={(e) => updateRewardRecipient(index, 'recipient', e.target.value)}
                      placeholder="0x... recipient address"
                      className="input font-mono text-sm"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label text-sm">Admin Address</label>
                    <input
                      type="text"
                      value={recipient.admin}
                      onChange={(e) => updateRewardRecipient(index, 'admin', e.target.value)}
                      placeholder="0x... admin address"
                      className="input font-mono text-sm"
                    />
                  </div>

                  <div className="flex gap-sm items-end">
                    <div className="form-group flex-1">
                      <label className="form-label text-sm">Basis Points</label>
                      <input
                        type="number"
                        value={recipient.bps}
                        onChange={(e) => updateRewardRecipient(index, 'bps', Number(e.target.value))}
                        min="0"
                        max="10000"
                        className="input font-mono text-sm"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeRewardRecipient(index)}
                      className="btn btn-secondary"
                      style={{ padding: 'var(--spacing-sm)' }}
                      disabled={config.rewardRecipients.length <= 1}
                    >
                      ✕
                    </button>
                  </div>
                </div>
                <div className="text-xs text-muted mt-sm">
                  {(recipient.bps / 100).toFixed(2)}% of fees
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={addRewardRecipient}
              className="btn btn-secondary text-sm"
            >
              + Add Recipient
            </button>

            <div className="text-sm">
              <span className="text-muted">Total: </span>
              <span className={totalBps === 10000 ? 'text-success' : totalBps > 10000 ? 'text-danger' : 'text-warning'}>
                {(totalBps / 100).toFixed(2)}%
              </span>
              {totalBps !== 10000 && (
                <span className="text-muted ml-sm">
                  (should be 100%)
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Vanity Address */}
      <div className="card card-hover">
        <div className="flex items-center space-x-md mb-lg">
          <h3 className="text-xl font-bold text-primary">Vanity Address</h3>
          <InfoTooltip content="Generate a custom token address with prefix/suffix" />
        </div>

        <div className="space-y-lg">
          <label className="flex items-center space-x-md cursor-pointer">
            <input
              type="checkbox"
              checked={config.vanity.enabled}
              onChange={(e) => updateConfig({ vanity: { ...config.vanity, enabled: e.target.checked } })}
              className="rounded"
            />
            <span className="form-label">Enable Vanity Address</span>
          </label>

          {config.vanity.enabled && (
            <div className="space-y-lg">
              <div className="grid grid-2 gap-lg">
                <div className="form-group">
                  <label className="form-label">Address Prefix</label>
                  <input
                    type="text"
                    value={config.vanity.prefix}
                    onChange={(e) => updateConfig({ vanity: { ...config.vanity, prefix: e.target.value } })}
                    placeholder="e.g., 0xCAFE"
                    className="input font-mono"
                    maxLength={8}
                  />
                  <div className="text-xs text-muted mt-xs">
                    Hex characters only (0-9, A-F)
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Address Suffix</label>
                  <input
                    type="text"
                    value={config.vanity.suffix}
                    onChange={(e) => updateConfig({ vanity: { ...config.vanity, suffix: e.target.value } })}
                    placeholder="e.g., BEEF"
                    className="input font-mono"
                    maxLength={8}
                  />
                  <div className="text-xs text-muted mt-xs">
                    Hex characters only (0-9, A-F)
                  </div>
                </div>
              </div>

              <div className="card" style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                <div className="text-sm space-y-xs">
                  <div className="font-semibold text-warning">Vanity Address Generation</div>
                  <div className="text-secondary">
                    Generating vanity addresses requires significant computation time and may increase deployment costs.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center mt-2xl">
        <button onClick={onPrevious} className="btn btn-secondary">
          ← Back to Extensions
        </button>
        
        <button
          onClick={onNext}
          className="btn btn-primary btn-lg"
          disabled={totalBps !== 10000}
        >
          Continue to Deploy →
        </button>
      </div>
    </div>
  );
} 