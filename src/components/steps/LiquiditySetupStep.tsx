import { useState, useEffect } from 'react';
import { usePublicClient } from 'wagmi';
import type { TokenConfig } from '../../../lib/types';
import { InfoTooltip } from '../ui/InfoTooltip';

// Updated imports
import { BASE_NETWORK } from '../../../lib/clanker-utils';
import { POOL_POSITIONS } from 'clanker-sdk';

import { validatePairToken } from '../../../lib/validation';
import { addCustomPosition, removeCustomPosition, updateCustomPosition } from '../../../lib/clanker-utils';

// --- Dev Buy Configuration (moved from ExtensionsStep) ---
import { calculateDevBuyTokens } from '../../../lib/calculations';

const POOL_POSITION_OPTIONS = [
  { label: 'Standard', value: 'Standard', description: 'Single wide position for maximum liquidity.' },
  { label: 'Project', value: 'Project', description: 'Multiple positions for project-style liquidity.' },
  { label: 'Custom', value: 'Custom', description: 'Manually configure advanced positions.' },
];

interface LiquiditySetupStepProps {
  config: TokenConfig;
  updateConfig: (updates: Partial<TokenConfig>) => void;
  onNext: () => void;
  onPrevious: () => void;
}

export function LiquiditySetupStep({ config, updateConfig, onNext, onPrevious }: LiquiditySetupStepProps) {
  const publicClient = usePublicClient();
  const [pairTokenInfo, setPairTokenInfo] = useState<{symbol: string, decimals: number} | null>(null);
  const [pairTokenValidating, setPairTokenValidating] = useState(false);
  const [pairTokenValid, setPairTokenValid] = useState(false);

  // Add state for selected pool position type
  const [poolPositionType, setPoolPositionType] = useState<'Standard' | 'Project' | 'Custom'>(
    config.pool.positions === POOL_POSITIONS.Project
      ? 'Project'
      : config.customPositions && config.customPositions.length > 0
      ? 'Custom'
      : 'Standard'
  );

  const isValid = true; // Pool configuration is always valid with default values

  // Validate custom pair token
  useEffect(() => {
    const validateToken = async () => {
      if (config.pairTokenType === 'custom' && config.customPairTokenAddress && publicClient) {
        try {
          setPairTokenValidating(true);
          const tokenAddress = config.customPairTokenAddress as `0x${string}`;
          const tokenInfo = await validatePairToken(publicClient, tokenAddress);
          
          if (tokenInfo) {
            setPairTokenInfo(tokenInfo);
            setPairTokenValid(true);
            // Update the pool configuration
            updateConfig({
              pool: {
                ...config.pool,
                pairedToken: tokenAddress
              }
            });
          } else {
            setPairTokenInfo(null);
            setPairTokenValid(false);
          }
        } catch (error) {
          setPairTokenInfo(null);
          setPairTokenValid(false);
        } finally {
          setPairTokenValidating(false);
        }
      } else {
        setPairTokenInfo(null);
        setPairTokenValid(config.pairTokenType === 'WETH');
        if (config.pairTokenType === 'WETH') {
          // Update to WETH address
          updateConfig({
            pool: {
              ...config.pool,
              pairedToken: BASE_NETWORK.WETH_ADDRESS
            }
          });
        }
      }
    };

    validateToken();
  }, [config.pairTokenType, config.customPairTokenAddress, publicClient]);

  const handleAddCustomPosition = () => {
    updateConfig({
      customPositions: addCustomPosition(config.customPositions ?? [])
    });
  };

  const handleRemoveCustomPosition = (index: number) => {
    updateConfig({
      customPositions: removeCustomPosition(config.customPositions ?? [], index)
    });
  };

  const handleUpdateCustomPosition = (index: number, field: 'tickLower' | 'tickUpper' | 'positionBps', value: number) => {
    updateConfig({
      customPositions: updateCustomPosition(config.customPositions ?? [], index, field, value)
    });
  };

  // Token distribution calculation removed for v4 - handled automatically by extensions

  const defaultDevBuy = {
    enabled: false,
    amount: 0.1,
    amountOutMin: 0,
    recipient: config.tokenAdmin || '',
  };
  const devBuy = { ...defaultDevBuy, ...(config.devBuy ?? {}) };

  // Calculate available supply for dev buy (subtract vault and airdrop)
  const totalTokenSupply = 100_000_000_000; // Default supply
  let availableSupply = totalTokenSupply;
  if (config.vault?.enabled && config.vault.percentage > 0) {
    availableSupply -= (totalTokenSupply * config.vault.percentage) / 100;
  }
  if (config.airdrop?.enabled && config.airdrop.amount > 0) {
    availableSupply -= config.airdrop.amount;
  }
  if (availableSupply < 0) availableSupply = 0;

  // Set a default value for startingMarketCap if not set
  const defaultMarketCap = config.pairTokenType === 'WETH' ? 10 : 1000000000;
  const startingMarketCap = typeof config.startingMarketCap === 'number' && !isNaN(config.startingMarketCap)
    ? config.startingMarketCap
    : defaultMarketCap;

  // Use the accurate AMM constant product formula for dev buy estimate
  let devBuyEstimate = null;
  const devBuyAmount = Number(config.devBuy?.amount);
  if (
    devBuyAmount > 0 &&
    startingMarketCap > 0 &&
    !isNaN(devBuyAmount) &&
    !isNaN(startingMarketCap) &&
    availableSupply > 0
  ) {
    try {
      devBuyEstimate = calculateDevBuyTokens(devBuyAmount, startingMarketCap, availableSupply);
      if (devBuyEstimate.tokensReceived > availableSupply) {
        devBuyEstimate.tokensReceived = availableSupply;
      }
    } catch {}
  }

  // Save estimated tokens to config for later use (if dev buy is enabled)
  useEffect(() => {
    if (
      config.devBuy?.enabled &&
      devBuyEstimate &&
      isFinite(devBuyEstimate.tokensReceived) &&
      devBuyEstimate.tokensReceived > 0
    ) {
      updateConfig({ devBuy: { ...devBuy, estimatedTokens: devBuyEstimate.tokensReceived } });
    }
  }, [config.devBuy?.enabled, devBuyEstimate?.tokensReceived]);

  return (
    <div className="space-y-2xl animate-fade-in">
      {/* Enhanced Header */}
      <div className="text-center space-y-md">
        <div className="animate-float mx-auto" style={{ width: '5rem', height: '5rem', background: 'linear-gradient(135deg, var(--color-secondary), var(--color-success))', borderRadius: 'var(--radius-2xl)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg style={{ width: '2.5rem', height: '2.5rem' }} className="text-primary" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
            <path fillRule="evenodd" d="M4 5a2 2 0 012-2v1a3 3 0 003 3h2a3 3 0 003-3V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zM8 8a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1zm1 3a1 1 0 100 2h2a1 1 0 100-2H9z" clipRule="evenodd"/>
          </svg>
        </div>
        <h2 className="text-4xl font-bold text-primary mb-md">
          Pool <span className="text-gradient">Configuration</span>
        </h2>
        <p className="text-lg text-secondary mx-auto" style={{ maxWidth: '48rem', lineHeight: '1.7' }}>
          Configure your token's liquidity pool settings. Choose the trading pair and liquidity position strategy for optimal market making.
        </p>
      </div>

      {/* Trading Pair Configuration */}
      <div className="card card-hover animate-slide-up">
        <div className="flex items-center space-x-md mb-xl">
          <div style={{ width: '3rem', height: '3rem', background: 'linear-gradient(135deg, var(--color-secondary), var(--color-secondary-dark))', borderRadius: 'var(--radius-xl)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg style={{ width: '1.5rem', height: '1.5rem' }} className="text-primary" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 2a2 2 0 00-2 2v11a3 3 0 106 0V4a2 2 0 00-2-2H4zM3 15a1 1 0 011-1h1a1 1 0 011 1v1a1 1 0 01-1 1H4a1 1 0 01-1-1v-1zm7-11a1 1 0 000 2h5a1 1 0 000-2h-5zM9 9a1 1 0 100 2h5a1 1 0 100-2H9zm0 4a1 1 0 100 2h5a1 1 0 100-2H9z" clipRule="evenodd"/>
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-primary">Trading Pair Setup</h3>
            <p className="text-muted text-sm">Choose your trading pair and initial market parameters</p>
          </div>
        </div>

        <div className="grid grid-2 gap-xl">
          {/* Pair Token Selection */}
          <div className="form-group">
            <label className="form-label">
              Pair Token
              <InfoTooltip content="The token your new token will be paired with in the liquidity pool." />
            </label>
            
            <div className="space-y-md">
              <div className="flex gap-md">
                <button
                  type="button"
                  onClick={() => updateConfig({ pairTokenType: 'WETH' })}
                  className={`flex-1 card-hover transition ${config.pairTokenType === 'WETH' ? 'card-gradient' : 'card'}`}
                  style={{ 
                    padding: 'var(--spacing-md)', 
                    borderRadius: 'var(--radius-xl)',
                    border: `2px solid ${config.pairTokenType === 'WETH' ? 'var(--color-primary)' : 'var(--border-primary)'}`
                  }}
                >
                  <div className="flex items-center space-x-md">
                    <div style={{ width: '2.5rem', height: '2.5rem', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span className="text-primary font-bold text-sm">ETH</span>
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-primary">WETH</div>
                      <div className="text-xs text-muted">Most liquid pair</div>
                    </div>
                  </div>
                </button>
                
                <button
                  type="button"
                  onClick={() => updateConfig({ pairTokenType: 'custom' })}
                  className={`flex-1 card-hover transition ${config.pairTokenType === 'custom' ? 'card-gradient' : 'card'}`}
                  style={{ 
                    padding: 'var(--spacing-md)', 
                    borderRadius: 'var(--radius-xl)',
                    border: `2px solid ${config.pairTokenType === 'custom' ? 'var(--color-primary)' : 'var(--border-primary)'}`
                  }}
                >
                  <div className="flex items-center space-x-md">
                    <div style={{ width: '2.5rem', height: '2.5rem', background: 'linear-gradient(135deg, var(--color-secondary), var(--color-secondary-dark))', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg style={{ width: '1.25rem', height: '1.25rem' }} className="text-primary" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/>
                      </svg>
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-primary">Custom</div>
                      <div className="text-xs text-muted">Other ERC20</div>
                    </div>
                  </div>
                </button>
              </div>

              {config.pairTokenType === 'custom' && (
                <div className="space-y-md animate-slide-up">
                  <input
                    type="text"
                    value={config.customPairTokenAddress}
                    onChange={(e) => updateConfig({ customPairTokenAddress: e.target.value })}
                    placeholder="0x... (Custom token address)"
                    className="input font-mono text-sm"
                  />
                  
                  {pairTokenValidating && (
                    <div className="flex items-center space-x-sm" style={{ color: 'var(--color-secondary)' }}>
                      <div className="animate-pulse" style={{ width: '1rem', height: '1rem', border: '2px solid var(--color-secondary)', borderTop: '2px solid transparent', borderRadius: '50%' }}></div>
                      <span className="text-sm">Validating token...</span>
                    </div>
                  )}
                  
                  {pairTokenInfo && (
                    <div className="card" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: 'var(--spacing-md)' }}>
                      <div className="text-sm" style={{ color: 'var(--color-success)' }}>
                        ✓ Valid token: {pairTokenInfo.symbol} ({pairTokenInfo.decimals} decimals)
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Starting Market Cap */}
          <div className="form-group">
            <label className="form-label">
              Initial Market Cap
              <span className="required">*</span>
              <InfoTooltip content={`Starting market capitalization in ${config.pairTokenType === 'WETH' ? 'ETH' : (pairTokenInfo?.symbol || 'the selected token')}. This determines the initial price of your token. You can use large values (e.g., billions).`} />
            </label>
            
            <div className="relative">
              <input
                type="number"
                value={config.startingMarketCap ?? defaultMarketCap}
                onChange={e => {
                  const value = e.target.value;
                  updateConfig({ startingMarketCap: value === '' ? undefined : parseFloat(value) });
                }}
                placeholder={config.pairTokenType === 'WETH' ? '10.0' : '1000000000'}
                step="0.001"
                min="0.001"
                className="input font-mono"
                style={{ paddingRight: '4rem' }}
              />
              <div className="absolute" style={{ top: '50%', right: 'var(--spacing-md)', transform: 'translateY(-50%)' }}>
                <div style={{ background: 'var(--bg-surface)', padding: 'var(--spacing-xs) var(--spacing-md)', borderRadius: 'var(--radius-md)' }}>
                  <span className="text-sm font-mono text-secondary">{config.pairTokenType === 'WETH' ? 'ETH' : (pairTokenInfo?.symbol || 'TOKEN')}</span>
                </div>
              </div>
            </div>
            
            <div className="form-hint space-y-xs">
              <div>• Minimum: 0.001 {config.pairTokenType === 'WETH' ? 'ETH' : (pairTokenInfo?.symbol || 'TOKEN')}</div>
              <div>• Recommended: 1-10 ETH for WETH, or set an appropriate value for your custom token (billions supported)</div>
            </div>
          </div>
        </div>
      </div>

      {/* Dev Buy Configuration (moved from ExtensionsStep) */}
      <div className="card card-hover animate-slide-up mt-xl">
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
                    min="0.00001"
                    step="0.00001"
                    className="input font-mono"
                    placeholder={config.pairTokenType === 'WETH' ? '0.00001' : '1000'}
                  />
                  <div className="form-hint">
                    Minimum: 0.00001 {config.pairTokenType === 'WETH' ? 'ETH' : (pairTokenInfo?.symbol || 'TOKEN')} (avoids precision issues)
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
              {/* Robust NaN/invalid handling for dev buy estimate */}
              {devBuyEstimate &&
                isFinite(devBuyEstimate.tokensReceived) &&
                isFinite(devBuyEstimate.priceImpact) &&
                devBuyEstimate.tokensReceived > 0 &&
                devBuyEstimate.priceImpact >= 0 &&
                devBuyEstimate.tokensReceived < availableSupply * 0.9999 &&
                devBuyEstimate.priceImpact < 99.99 ? (
                <div className="card" style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                  <div className="text-sm space-y-xs">
                    <div className="font-semibold text-primary">Estimated Purchase:</div>
                    <div className="text-secondary">
                      ~{(devBuyEstimate.tokensReceived / 1_000_000_000).toFixed(2)}B tokens 
                      ({((devBuyEstimate.tokensReceived / totalTokenSupply) * 100).toFixed(2)}% of supply)
                    </div>
                  </div>
                </div>
              ) :
                devBuyEstimate &&
                isFinite(devBuyEstimate.tokensReceived) &&
                isFinite(devBuyEstimate.priceImpact) &&
                (devBuyEstimate.tokensReceived >= availableSupply * 0.9999 || devBuyEstimate.priceImpact >= 99.99) ? (
                <div className="card" style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                  <div className="text-sm text-danger font-semibold">
                    Error: Dev buy amount is too high and would consume nearly all of the available supply. Please reduce the dev buy amount.
                  </div>
                </div>
              ) : (
                <div className="card" style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                  <div className="text-sm text-danger">
                    Unable to estimate dev buy. Please check that both the dev buy amount and starting market cap are set and valid, and that available supply is positive.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Pool Position Strategy */}
      <div className="card card-hover animate-slide-up mt-xl">
        <div className="flex items-center space-x-md mb-xl">
          <div style={{ width: '3rem', height: '3rem', background: 'linear-gradient(135deg, var(--color-primary), var(--color-success))', borderRadius: 'var(--radius-xl)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg style={{ width: '1.5rem', height: '1.5rem' }} className="text-primary" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 12H9v-2h2v2zm0-4H9V7h2v3z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-primary">Pool Position Strategy</h3>
            <p className="text-muted text-sm">Choose a preset or configure custom positions for your liquidity pool.</p>
          </div>
        </div>
        <div className="space-y-md">
          {POOL_POSITION_OPTIONS.map(opt => (
            <label key={opt.value} className="flex items-center space-x-md cursor-pointer">
              <input
                type="radio"
                name="poolPositionType"
                value={opt.value}
                checked={poolPositionType === opt.value}
                onChange={() => {
                  setPoolPositionType(opt.value as 'Standard' | 'Project' | 'Custom');
                  if (opt.value === 'Standard') {
                    updateConfig({ pool: { ...config.pool, positions: POOL_POSITIONS.Standard } });
                  } else if (opt.value === 'Project') {
                    updateConfig({ pool: { ...config.pool, positions: POOL_POSITIONS.Project } });
                  }
                  // For custom, don't update positions here
                }}
                className="mr-md"
              />
              <span className="font-semibold text-primary">{opt.label}</span>
              <span className="text-muted text-xs">{opt.description}</span>
            </label>
          ))}
          {poolPositionType === 'Project' && (
            <div className="mt-md card animate-fade-in" style={{ background: 'var(--bg-surface)', padding: 'var(--spacing-md)' }}>
              <div className="font-semibold text-primary mb-xs">How Project Liquidity is Spread:</div>
              <ul className="text-sm text-muted space-y-xs list-disc pl-lg">
                <li>10% in a tight range near the starting price (~$27K–$130K market cap) for initial trading.</li>
                <li>50% spread broadly (~$130K–$50M) for general trading and price discovery.</li>
                <li><b>+15% extra</b> concentrated in a mid-range (~$450K–$50M), providing additional depth where more trading is expected (overlaps with the 50% band).</li>
                <li>20% covers a wide range (~$50M–$1.5B) for large price swings and long-term liquidity.</li>
                <li><b>+5% extra</b> in the upper end (~$200M–$1.5B) to ensure liquidity even at extreme prices (overlaps with the 20% band).</li>
              </ul>
              <div className="text-xs text-secondary mt-xs">This strategy uses overlapping bands to concentrate more liquidity where it's most useful, balancing initial trading, price discovery, and long-term support for your token.</div>
            </div>
          )}
        </div>
      </div>

      {/* Custom Positions (Advanced) */}
      {poolPositionType === 'Custom' && (
        <div className="card card-hover animate-slide-up mt-xl">
          <div className="flex items-center space-x-md mb-xl">
            <div style={{ width: '3rem', height: '3rem', background: 'linear-gradient(135deg, var(--color-primary), var(--color-success))', borderRadius: 'var(--radius-xl)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg style={{ width: '1.5rem', height: '1.5rem' }} className="text-primary" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 12H9v-2h2v2zm0-4H9V7h2v3z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-primary">Custom Pool Positions <span className='text-sm text-muted'>(Advanced)</span></h3>
              <p className="text-muted text-sm">Add, edit, or remove custom liquidity positions for advanced market making strategies.</p>
            </div>
          </div>
          <div className="space-y-md">
            {config.customPositions && config.customPositions.length > 0 && config.customPositions.map((pos, idx) => (
              <div key={idx} className="grid grid-3 gap-md items-center">
                <input
                  type="number"
                  value={pos.tickLower}
                  onChange={e => handleUpdateCustomPosition(idx, 'tickLower', Number(e.target.value))}
                  placeholder="Tick Lower"
                  className="input font-mono text-xs"
                />
                <input
                  type="number"
                  value={pos.tickUpper}
                  onChange={e => handleUpdateCustomPosition(idx, 'tickUpper', Number(e.target.value))}
                  placeholder="Tick Upper"
                  className="input font-mono text-xs"
                />
                <input
                  type="number"
                  value={pos.positionBps}
                  onChange={e => handleUpdateCustomPosition(idx, 'positionBps', Number(e.target.value))}
                  placeholder="Position Bps"
                  className="input font-mono text-xs"
                  min={1}
                  max={10000}
                />
                <button type="button" onClick={() => handleRemoveCustomPosition(idx)} className="btn btn-secondary" style={{ padding: 'var(--spacing-sm)' }}>
                  <svg style={{ width: '1rem', height: '1rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
            <button type="button" onClick={handleAddCustomPosition} className="btn btn-secondary text-sm mt-md">
              <svg style={{ width: '1rem', height: '1rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Custom Position
            </button>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center mt-2xl">
        <button
          onClick={onPrevious}
          className="btn btn-secondary"
        >
          <svg style={{ width: '1rem', height: '1rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
          </svg>
          Back to Token Details
        </button>
        
        <button
          onClick={onNext}
          disabled={!isValid}
          className="btn btn-primary btn-lg"
        >
          Continue to Extensions
          <svg style={{ width: '1rem', height: '1rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </button>
      </div>
    </div>
  );
} 