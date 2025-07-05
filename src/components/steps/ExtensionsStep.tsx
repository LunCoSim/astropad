import type { TokenConfig } from '../../../lib/types';
import { InfoTooltip } from '../ui/InfoTooltip';
import { addAirdropEntry, removeAirdropEntry, updateAirdropEntry } from '../../../lib/array-utils';
import { calculateDevBuyEstimate } from '../../../lib/calculations';
import { useState, useEffect } from 'react';
import { usePublicClient } from 'wagmi';
import { validatePairToken } from '../../../lib/token-validation';

interface ExtensionsStepProps {
  config: TokenConfig;
  updateConfig: (updates: Partial<TokenConfig>) => void;
  onNext: () => void;
  onPrevious: () => void;
}

export function ExtensionsStep({ config, updateConfig, onNext, onPrevious }: ExtensionsStepProps) {
  const publicClient = usePublicClient();
  const [pairTokenInfo, setPairTokenInfo] = useState<{symbol: string, decimals: number} | null>(null);
  const [pairTokenValidating, setPairTokenValidating] = useState(false);

  useEffect(() => {
    const validateToken = async () => {
      if (config.pairTokenType === 'custom' && config.customPairTokenAddress && publicClient) {
        try {
          setPairTokenValidating(true);
          const tokenAddress = config.customPairTokenAddress as `0x${string}`;
          const tokenInfo = await validatePairToken(publicClient, tokenAddress);
          if (tokenInfo) {
            setPairTokenInfo(tokenInfo);
          } else {
            setPairTokenInfo(null);
          }
        } catch (error) {
          setPairTokenInfo(null);
        } finally {
          setPairTokenValidating(false);
        }
      } else {
        setPairTokenInfo(null);
      }
    };
    validateToken();
  }, [config.pairTokenType, config.customPairTokenAddress, publicClient]);

  const handleAddAirdropEntry = () => {
    updateConfig({
      airdrop: { ...defaultAirdrop, ...airdrop, entries: addAirdropEntry(airdrop.entries) }
    });
  };

  const handleRemoveAirdropEntry = (index: number) => {
    updateConfig({
      airdrop: { ...defaultAirdrop, ...airdrop, entries: removeAirdropEntry(airdrop.entries, index) }
    });
  };

  const handleUpdateAirdropEntry = (index: number, field: 'address' | 'amount', value: string | number) => {
    updateConfig({
      airdrop: { ...defaultAirdrop, ...airdrop, entries: updateAirdropEntry(airdrop.entries, index, field, value) }
    });
  };

  const devBuyEstimate = calculateDevBuyEstimate(
    config.devBuy?.amount ?? 0,
    Number(config.startingMarketCap)
  );

  // Save estimated tokens to config for later use (if dev buy is enabled)
  useEffect(() => {
    if (config.devBuy?.enabled && devBuyEstimate) {
      updateConfig({ devBuy: { ...devBuy, estimatedTokens: devBuyEstimate.tokensReceived } });
    }
  }, [config.devBuy?.enabled, devBuyEstimate?.tokensReceived]);

  // Ensure all extension configs are always defined for safe access
  const presale = config.presale || {
    enabled: false,
    minEthGoal: 1,
    maxEthGoal: 10,
    presaleDuration: 7 * 24 * 60 * 60,
    recipient: config.tokenAdmin || '',
    lockupDuration: 0,
    vestingDuration: 0,
  };
  const vault = config.vault || {
    enabled: false,
    percentage: 5,
    lockupDuration: 7 * 24 * 60 * 60,
    vestingDuration: 0,
  };
  const defaultAirdrop = {
    enabled: false,
    merkleRoot: '0x0000000000000000000000000000000000000000000000000000000000000000',
    amount: 1000,
    lockupDuration: 24 * 60 * 60,
    vestingDuration: 0,
    entries: [{ address: '', amount: 1 }],
  };
  const airdrop = { ...defaultAirdrop, ...(config.airdrop ?? {}) };
  const defaultDevBuy = {
    enabled: false,
    amount: 0.1,
    amountOutMin: 0,
    recipient: config.tokenAdmin || '',
  };
  const devBuy = { ...defaultDevBuy, ...(config.devBuy ?? {}) };

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

      {/* Presale Extension Configuration */}
      <div className="card card-hover">
        <div className="flex items-center space-x-md mb-lg">
          <h3 className="text-xl font-bold text-primary">Presale Extension</h3>
          <InfoTooltip content="Enable a presale for your token. Users can buy in with ETH before launch. Tokens are distributed after the presale ends and goals are met. Supports lockup and vesting." />
        </div>
        <div className="space-y-lg">
          <label className="flex items-center space-x-md cursor-pointer">
            <input
              type="checkbox"
              checked={presale.enabled}
              onChange={e => updateConfig({ presale: { ...presale, enabled: e.target.checked } })}
              className="rounded"
            />
            <span className="form-label">Enable Presale</span>
          </label>
          {presale.enabled && (
            <div className="space-y-lg">
              <div className="grid grid-2 gap-lg">
                <div className="form-group">
                  <label className="form-label">
                    Min ETH Goal
                    <InfoTooltip content="Minimum ETH required for the presale to succeed. If not reached, presale fails and funds are refundable." />
                  </label>
                  <input
                    type="number"
                    value={presale.minEthGoal}
                    onChange={e => updateConfig({ presale: { ...presale, minEthGoal: Number(e.target.value) } })}
                    min="0"
                    step="0.01"
                    className="input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    Max ETH Cap
                    <InfoTooltip content="Maximum ETH that can be raised. Presale ends early if this is reached." />
                  </label>
                  <input
                    type="number"
                    value={presale.maxEthGoal}
                    onChange={e => updateConfig({ presale: { ...presale, maxEthGoal: Number(e.target.value) } })}
                    min={presale.minEthGoal}
                    step="0.01"
                    className="input"
                  />
                </div>
              </div>
              <div className="grid grid-2 gap-lg">
                <div className="form-group">
                  <label className="form-label">
                    Presale Duration (days)
                    <InfoTooltip content="How long the presale will last. Users can buy in during this period." />
                  </label>
                  <input
                    type="number"
                    value={presale.presaleDuration / (24 * 60 * 60)}
                    onChange={e => updateConfig({ presale: { ...presale, presaleDuration: Number(e.target.value) * 24 * 60 * 60 } })}
                    min="1"
                    max="42"
                    className="input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    Presale Recipient
                    <InfoTooltip content="Address that will receive the raised ETH if the presale succeeds." />
                  </label>
                  <input
                    type="text"
                    value={presale.recipient}
                    onChange={e => updateConfig({ presale: { ...presale, recipient: e.target.value } })}
                    placeholder="0x... recipient address"
                    className="input font-mono text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-2 gap-lg">
                <div className="form-group">
                  <label className="form-label">
                    Lockup Duration (days)
                    <InfoTooltip content="How long presale tokens are locked before claimable." />
                  </label>
                  <input
                    type="number"
                    value={presale.lockupDuration / (24 * 60 * 60)}
                    onChange={e => updateConfig({ presale: { ...presale, lockupDuration: Number(e.target.value) * 24 * 60 * 60 } })}
                    min="0"
                    className="input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    Vesting Duration (days)
                    <InfoTooltip content="After lockup, tokens vest linearly over this period." />
                  </label>
                  <input
                    type="number"
                    value={presale.vestingDuration / (24 * 60 * 60)}
                    onChange={e => updateConfig({ presale: { ...presale, vestingDuration: Number(e.target.value) * 24 * 60 * 60 } })}
                    min="0"
                    className="input"
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">
                  ETH Value to Send (msg.value)
                  <InfoTooltip content="Advanced: Amount of ETH to send with the presale extension call. Usually 0. Only change if instructed by advanced documentation." />
                </label>
                <input
                  type="number"
                  value={presale.msgValue ?? 0}
                  onChange={e => updateConfig({ presale: { ...presale, msgValue: Number(e.target.value) } })}
                  min="0"
                  step="0.0001"
                  className="input font-mono"
                  placeholder="0"
                />
                <div className="form-hint">Leave as 0 unless you know you need to send ETH with the presale extension.</div>
              </div>
            </div>
          )}
        </div>
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
              checked={vault.enabled}
              onChange={(e) => updateConfig({ vault: { ...vault, enabled: e.target.checked } })}
              className="rounded"
            />
            <span className="form-label">Enable Token Vault</span>
          </label>

          {vault.enabled && (
            <div className="space-y-lg">
              <div className="grid grid-2 gap-lg">
                <div className="form-group">
                  <label className="form-label">Vault Percentage (%)</label>
                  <input
                    type="number"
                    value={vault.percentage}
                    onChange={(e) => updateConfig({ vault: { ...vault, percentage: Number(e.target.value) } })}
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
                    value={vault.lockupDuration / (24 * 60 * 60)}
                    onChange={(e) => updateConfig({ vault: { ...vault, lockupDuration: Number(e.target.value) * 24 * 60 * 60 } })}
                    min="0"
                    className="input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Vesting Duration (days)</label>
                <input
                  type="number"
                  value={vault.vestingDuration / (24 * 60 * 60)}
                  onChange={(e) => updateConfig({ vault: { ...vault, vestingDuration: Number(e.target.value) * 24 * 60 * 60 } })}
                  min="0"
                  className="input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  ETH Value to Send (msg.value)
                  <InfoTooltip content="Advanced: Amount of ETH to send with the vault extension call. Usually 0. Only change if instructed by advanced documentation." />
                </label>
                <input
                  type="number"
                  value={vault.msgValue ?? 0}
                  onChange={e => updateConfig({ vault: { ...vault, msgValue: Number(e.target.value) } })}
                  min="0"
                  step="0.0001"
                  className="input font-mono"
                  placeholder="0"
                />
                <div className="form-hint">Leave as 0 unless you know you need to send ETH with the vault extension.</div>
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
              checked={airdrop.enabled}
              onChange={(e) => updateConfig({ airdrop: { ...defaultAirdrop, ...airdrop, enabled: e.target.checked } })}
              className="rounded"
            />
            <span className="form-label">Enable Airdrop</span>
          </label>
          {airdrop.enabled && (
            <div className="space-y-lg">
              <div className="grid grid-2 gap-lg">
                <div className="form-group">
                  <label className="form-label">Airdrop Amount (tokens)</label>
                  <input
                    type="number"
                    value={airdrop.amount}
                    onChange={(e) => updateConfig({ airdrop: { ...defaultAirdrop, ...airdrop, amount: Number(e.target.value) } })}
                    min="0"
                    className="input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Lockup Duration (days)</label>
                  <input
                    type="number"
                    value={airdrop.lockupDuration / (24 * 60 * 60)}
                    onChange={(e) => updateConfig({ airdrop: { ...defaultAirdrop, ...airdrop, lockupDuration: Number(e.target.value) * 24 * 60 * 60 } })}
                    min="0"
                    className="input"
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Airdrop Recipients</label>
                <div className="space-y-md">
                  {airdrop.entries.map((entry, index) => (
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
                        disabled={airdrop.entries.length <= 1}
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
              <div className="form-group">
                <label className="form-label">
                  ETH Value to Send (msg.value)
                  <InfoTooltip content="Advanced: Amount of ETH to send with the airdrop extension call. Usually 0. Only change if instructed by advanced documentation." />
                </label>
                <input
                  type="number"
                  value={airdrop.msgValue ?? 0}
                  onChange={e => updateConfig({ airdrop: { ...defaultAirdrop, ...airdrop, msgValue: Number(e.target.value) } })}
                  min="0"
                  step="0.0001"
                  className="input font-mono"
                  placeholder="0"
                />
                <div className="form-hint">Leave as 0 unless you know you need to send ETH with the airdrop extension.</div>
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
              checked={devBuy.enabled}
              onChange={(e) => updateConfig({ devBuy: { ...devBuy, enabled: e.target.checked } })}
              className="rounded"
            />
            <span className="form-label">Enable Dev Buy</span>
          </label>

          {devBuy.enabled && (
            <div className="space-y-lg">
              <div className="grid grid-2 gap-lg">
                <div className="form-group">
                  <label className="form-label">
                    {config.pairTokenType === 'WETH' ? 'ETH Amount' : `${pairTokenInfo?.symbol || 'Token'} Amount`}
                  </label>
                  <input
                    type="number"
                    value={(config.devBuy?.amount ?? defaultDevBuy.amount)}
                    onChange={(e) => updateConfig({ devBuy: { ...defaultDevBuy, ...(config.devBuy ?? {}), amount: Number(e.target.value) } })}
                    min="0"
                    step="0.0001"
                    className="input font-mono"
                    placeholder={config.pairTokenType === 'WETH' ? '0.0001' : '1000'}
                  />
                  <div className="form-hint">
                    Minimum: 0.0001 {config.pairTokenType === 'WETH' ? 'ETH' : (pairTokenInfo?.symbol || 'TOKEN')} (avoids precision issues)
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Recipient Address</label>
                  <input
                    type="text"
                    value={devBuy.recipient}
                    onChange={(e) => updateConfig({ devBuy: { ...devBuy, recipient: e.target.value } })}
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