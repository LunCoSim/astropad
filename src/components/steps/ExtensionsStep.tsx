import type { TokenConfig } from '../../../lib/types';
import { InfoTooltip } from '../ui/InfoTooltip';
import { addAirdropEntry, removeAirdropEntry, updateAirdropEntry } from '../../../lib/array-utils';
import { calculateDevBuyEstimate } from '../../../lib/calculations';

interface ExtensionsStepProps {
  config: TokenConfig;
  updateConfig: (updates: Partial<TokenConfig>) => void;
  onNext: () => void;
  onPrevious: () => void;
}

export function ExtensionsStep({ config, updateConfig, onNext, onPrevious }: ExtensionsStepProps) {
  const handleAddAirdropEntry = () => {
    updateConfig({
      airdrop: {
        ...config.airdrop,
        entries: addAirdropEntry(config.airdrop.entries)
      }
    });
  };

  const handleRemoveAirdropEntry = (index: number) => {
    updateConfig({
      airdrop: {
        ...config.airdrop,
        entries: removeAirdropEntry(config.airdrop.entries, index)
      }
    });
  };

  const handleUpdateAirdropEntry = (index: number, field: 'address' | 'amount', value: string | number) => {
    updateConfig({
      airdrop: {
        ...config.airdrop,
        entries: updateAirdropEntry(config.airdrop.entries, index, field, value)
      }
    });
  };

  const devBuyEstimate = calculateDevBuyEstimate(
    config.devBuy.ethAmount,
    Number(config.startingMarketCap)
  );

  return (
    <div className="space-y-2xl animate-fade-in">
      {/* Header */}
      <div className="text-center space-y-md">
        <h2 className="text-4xl font-bold text-primary mb-md">
          Token <span className="text-gradient">Extensions</span>
        </h2>
        <p className="text-lg text-secondary mx-auto" style={{ maxWidth: '48rem', lineHeight: '1.7' }}>
          Configure optional features like token vault, airdrops, and automated dev purchases.
        </p>
      </div>

      {/* Vault Configuration */}
      <div className="card card-hover">
        <div className="flex items-center space-x-md mb-lg">
          <h3 className="text-xl font-bold text-primary">Token Vault</h3>
          <InfoTooltip content="Lock tokens for team/project treasury with vesting" />
        </div>

        <div className="space-y-lg">
          <label className="flex items-center space-x-md cursor-pointer">
            <input
              type="checkbox"
              checked={config.vault.enabled}
              onChange={(e) => updateConfig({ vault: { ...config.vault, enabled: e.target.checked } })}
              className="rounded"
            />
            <span className="form-label">Enable Token Vault</span>
          </label>

          {config.vault.enabled && (
            <div className="space-y-lg">
              <div className="grid grid-2 gap-lg">
                <div className="form-group">
                  <label className="form-label">Vault Percentage (%)</label>
                  <input
                    type="number"
                    value={config.vault.percentage}
                    onChange={(e) => updateConfig({ vault: { ...config.vault, percentage: Number(e.target.value) } })}
                    min="0"
                    max="50"
                    step="0.1"
                    className="input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Lockup Duration (days)</label>
                  <input
                    type="number"
                    value={config.vault.lockupDuration / (24 * 60 * 60)}
                    onChange={(e) => updateConfig({ vault: { ...config.vault, lockupDuration: Number(e.target.value) * 24 * 60 * 60 } })}
                    min="0"
                    className="input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Vesting Duration (days)</label>
                <input
                  type="number"
                  value={config.vault.vestingDuration / (24 * 60 * 60)}
                  onChange={(e) => updateConfig({ vault: { ...config.vault, vestingDuration: Number(e.target.value) * 24 * 60 * 60 } })}
                  min="0"
                  className="input"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Airdrop Configuration */}
      <div className="card card-hover">
        <div className="flex items-center space-x-md mb-lg">
          <h3 className="text-xl font-bold text-primary">Token Airdrop</h3>
          <InfoTooltip content="Distribute tokens to specific addresses" />
        </div>

        <div className="space-y-lg">
          <label className="flex items-center space-x-md cursor-pointer">
            <input
              type="checkbox"
              checked={config.airdrop.enabled}
              onChange={(e) => updateConfig({ airdrop: { ...config.airdrop, enabled: e.target.checked } })}
              className="rounded"
            />
            <span className="form-label">Enable Airdrop</span>
          </label>

          {config.airdrop.enabled && (
            <div className="space-y-lg">
              <div className="grid grid-2 gap-lg">
                <div className="form-group">
                  <label className="form-label">Airdrop Percentage (%)</label>
                  <input
                    type="number"
                    value={config.airdrop.percentage}
                    onChange={(e) => updateConfig({ airdrop: { ...config.airdrop, percentage: Number(e.target.value) } })}
                    min="0"
                    max="25"
                    step="0.1"
                    className="input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Lockup Duration (days)</label>
                  <input
                    type="number"
                    value={config.airdrop.lockupDuration / (24 * 60 * 60)}
                    onChange={(e) => updateConfig({ airdrop: { ...config.airdrop, lockupDuration: Number(e.target.value) * 24 * 60 * 60 } })}
                    min="0"
                    className="input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Airdrop Recipients</label>
                <div className="space-y-md">
                  {config.airdrop.entries.map((entry, index) => (
                    <div key={index} className="flex gap-md">
                      <input
                        type="text"
                        value={entry.address}
                        onChange={(e) => handleUpdateAirdropEntry(index, 'address', e.target.value)}
                        placeholder="0x... recipient address"
                        className="input flex-1 font-mono text-sm"
                      />
                      <input
                        type="number"
                        value={entry.amount}
                        onChange={(e) => handleUpdateAirdropEntry(index, 'amount', Number(e.target.value))}
                        placeholder="Amount"
                        className="input"
                        style={{ width: '8rem' }}
                        min="0"
                        step="0.1"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveAirdropEntry(index)}
                        className="btn btn-secondary"
                        style={{ padding: 'var(--spacing-sm)' }}
                        disabled={config.airdrop.entries.length <= 1}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={handleAddAirdropEntry}
                    className="btn btn-secondary text-sm"
                  >
                    + Add Recipient
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dev Buy Configuration */}
      <div className="card card-hover">
        <div className="flex items-center space-x-md mb-lg">
          <h3 className="text-xl font-bold text-primary">Dev Buy</h3>
          <InfoTooltip content="Automatically purchase tokens after deployment" />
        </div>

        <div className="space-y-lg">
          <label className="flex items-center space-x-md cursor-pointer">
            <input
              type="checkbox"
              checked={config.devBuy.enabled}
              onChange={(e) => updateConfig({ devBuy: { ...config.devBuy, enabled: e.target.checked } })}
              className="rounded"
            />
            <span className="form-label">Enable Dev Buy</span>
          </label>

          {config.devBuy.enabled && (
            <div className="space-y-lg">
              <div className="grid grid-2 gap-lg">
                <div className="form-group">
                  <label className="form-label">ETH Amount</label>
                  <input
                    type="number"
                    value={config.devBuy.ethAmount}
                    onChange={(e) => updateConfig({ devBuy: { ...config.devBuy, ethAmount: Number(e.target.value) } })}
                    min="0"
                    step="0.0001"
                    className="input font-mono"
                    placeholder="0.0001"
                  />
                  <div className="form-hint">
                    Minimum: 0.0001 ETH (avoids precision issues)
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Recipient Address</label>
                  <input
                    type="text"
                    value={config.devBuy.recipient}
                    onChange={(e) => updateConfig({ devBuy: { ...config.devBuy, recipient: e.target.value } })}
                    placeholder="0x... recipient address"
                    className="input font-mono text-sm"
                  />
                </div>
              </div>

              {devBuyEstimate && (
                <div className="card" style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                  <div className="text-sm space-y-xs">
                    <div className="font-semibold text-primary">Estimated Purchase:</div>
                    <div className="text-secondary">
                      ~{(devBuyEstimate.tokensReceived / 1_000_000_000).toFixed(2)}B tokens 
                      ({devBuyEstimate.priceImpact.toFixed(2)}% of supply)
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center mt-2xl">
        <button onClick={onPrevious} className="btn btn-secondary">
          ← Back to Liquidity
        </button>
        
        <button onClick={onNext} className="btn btn-primary btn-lg">
          Continue to Advanced Config →
        </button>
      </div>
    </div>
  );
} 