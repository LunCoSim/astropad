import { useState, useEffect } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { syncTokensWithBlockchain, addTokenByAddress, removeStoredToken, type DeployedToken } from '../../lib/deployed-tokens';

interface FeeData {
  [symbol: string]: string;
}

export function ManageTokens() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  
  // Deployed tokens state
  const [deployedTokens, setDeployedTokens] = useState<DeployedToken[]>([]);
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [tokensError, setTokensError] = useState('');
  
  // Fee checker state
  const [tokenAddress, setTokenAddress] = useState('0x699E27a42095D3cb9A6a23097E5C201E33E314B4');
  const [feeOwnerAddress, setFeeOwnerAddress] = useState('0xCd2a99C6d6b27976537fC3737b0ef243E7C49946');
  const [fees, setFees] = useState<FeeData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Manual token addition state
  const [showAddToken, setShowAddToken] = useState(false);
  const [newTokenAddress, setNewTokenAddress] = useState('');
  const [addingToken, setAddingToken] = useState(false);
  
  // Discovery method preferences
  const [discoveryMethod, setDiscoveryMethod] = useState<'hybrid' | 'blockchain' | 'indexed'>('hybrid');
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  // Load deployed tokens when wallet connects
  useEffect(() => {
    if (address && publicClient) {
      loadDeployedTokens();
    }
  }, [address, publicClient]);

  const loadDeployedTokens = async () => {
    if (!address || !publicClient) return;
    
    setLoadingTokens(true);
    setTokensError('');
    
    try {
      let tokens: DeployedToken[] = [];
      
      switch (discoveryMethod) {
        case 'indexed':
          // Try indexed API first, fallback to blockchain
          try {
            const response = await fetch(`/api/indexed-tokens?wallet=${address}`);
            if (response.ok) {
              const data = await response.json();
              tokens = data.tokens?.map((token: any) => ({
                address: token.contract_address,
                name: token.name,
                symbol: token.symbol,
                deployerAddress: address,
                deploymentTxHash: token.transaction_hash,
                deploymentBlockNumber: token.block_number,
                deploymentTimestamp: token.timestamp * 1000,
                isVerified: true,
                source: 'blockchain' as const,
              })) || [];
            }
          } catch (error) {
            console.warn('Indexed API failed, falling back to blockchain query', error);
            tokens = await syncTokensWithBlockchain(publicClient, address, true);
          }
          break;
          
        case 'blockchain':
          tokens = await syncTokensWithBlockchain(publicClient, address, false);
          break;
          
        case 'hybrid':
        default:
          tokens = await syncTokensWithBlockchain(publicClient, address, true);
          break;
      }
      
      setDeployedTokens(tokens);
    } catch (err: any) {
      setTokensError(err.message || 'Failed to load deployed tokens');
      console.error('Error loading deployed tokens:', err);
    } finally {
      setLoadingTokens(false);
    }
  };

  const handleAddToken = async () => {
    if (!newTokenAddress || !address || !publicClient) return;
    
    setAddingToken(true);
    try {
      await addTokenByAddress(publicClient, newTokenAddress, address);
      await loadDeployedTokens(); // Refresh the list
      setNewTokenAddress('');
      setShowAddToken(false);
    } catch (err: any) {
      alert(err.message || 'Failed to add token');
    } finally {
      setAddingToken(false);
    }
  };

  const handleRemoveToken = async (tokenAddress: string) => {
    if (confirm('Are you sure you want to remove this token from your list?')) {
      removeStoredToken(tokenAddress);
      await loadDeployedTokens(); // Refresh the list
    }
  };

  const checkFees = async () => {
    if (!tokenAddress || !feeOwnerAddress) {
      setError('Please provide both token address and fee owner address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `/api/check-fees?feeOwnerAddress=${feeOwnerAddress}&clankerTokenAddress=${tokenAddress}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setFees(data);
    } catch (err: any) {
      setError(err.message || 'Failed to check fees');
      setFees(null);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTokenAddress('0x699E27a42095D3cb9A6a23097E5C201E33E314B4');
    setFeeOwnerAddress('0xCd2a99C6d6b27976537fC3737b0ef243E7C49946');
    setFees(null);
    setError('');
  };

  return (
    <div className="space-y-xl">
      <div className="text-center space-y-md">
        <h2 className="text-3xl font-bold text-primary">
          Manage Deployed Tokens
        </h2>
        <p className="text-secondary">
          Automatically discover and manage your deployed Clanker tokens
        </p>
      </div>

      {/* Deployed Tokens List */}
      <div className="card" style={{ padding: 'var(--spacing-xl)' }}>
        <div className="space-y-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-md">
              <svg className="w-6 h-6 text-primary" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-xl font-semibold text-primary">
                Your Deployed Tokens
              </h3>
            </div>
            
            <div className="flex items-center space-x-md">
              <button
                onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                className="btn btn-secondary text-sm"
              >
                ⚙️ Options
              </button>
              
              <button
                onClick={loadDeployedTokens}
                disabled={loadingTokens}
                className="btn btn-secondary text-sm"
              >
                {loadingTokens ? 'Refreshing...' : 'Refresh'}
              </button>
              
              <button
                onClick={() => setShowAddToken(!showAddToken)}
                className="btn btn-primary text-sm"
              >
                Add Token
              </button>
            </div>
          </div>

          {/* Advanced Options */}
          {showAdvancedOptions && (
            <div className="card" style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)', padding: 'var(--spacing-lg)' }}>
              <div className="space-y-md">
                <h4 className="font-semibold text-primary">Discovery Method</h4>
                <div className="space-y-sm">
                  <label className="flex items-center space-x-sm">
                    <input
                      type="radio"
                      name="discoveryMethod"
                      value="hybrid"
                      checked={discoveryMethod === 'hybrid'}
                      onChange={(e) => setDiscoveryMethod(e.target.value as any)}
                      className="form-radio"
                    />
                    <div>
                      <span className="font-medium">Hybrid (Recommended)</span>
                      <div className="text-xs text-muted">
                        Tries multiple methods for best results: indexed API → blockchain → transaction logs
                      </div>
                    </div>
                  </label>
                  
                  <label className="flex items-center space-x-sm">
                    <input
                      type="radio"
                      name="discoveryMethod"
                      value="indexed"
                      checked={discoveryMethod === 'indexed'}
                      onChange={(e) => setDiscoveryMethod(e.target.value as any)}
                      className="form-radio"
                    />
                    <div>
                      <span className="font-medium">Indexed API (Fastest)</span>
                      <div className="text-xs text-muted">
                        Uses pre-indexed blockchain data (Moralis, Alchemy, Bitquery) - minimal computation
                      </div>
                    </div>
                  </label>
                  
                  <label className="flex items-center space-x-sm">
                    <input
                      type="radio"
                      name="discoveryMethod"
                      value="blockchain"
                      checked={discoveryMethod === 'blockchain'}
                      onChange={(e) => setDiscoveryMethod(e.target.value as any)}
                      className="form-radio"
                    />
                    <div>
                      <span className="font-medium">Direct Blockchain</span>
                      <div className="text-xs text-muted">
                        Queries blockchain directly for all-time results - more computation intensive
                      </div>
                    </div>
                  </label>
                </div>
                
                <div className="flex items-center justify-between pt-md border-t border-opacity-20" style={{ borderColor: 'var(--color-primary)' }}>
                  <div className="text-sm">
                    <div className="font-medium text-primary">Current: {discoveryMethod.charAt(0).toUpperCase() + discoveryMethod.slice(1)}</div>
                    <div className="text-xs text-muted">
                      {discoveryMethod === 'hybrid' && 'Balances speed and reliability'}
                      {discoveryMethod === 'indexed' && 'Fastest, uses external APIs'}
                      {discoveryMethod === 'blockchain' && 'Most comprehensive, all-time discovery'}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => setShowAdvancedOptions(false)}
                    className="btn btn-secondary text-xs"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Add Token Form */}
          {showAddToken && (
            <div className="card" style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', padding: 'var(--spacing-lg)' }}>
              <div className="space-y-md">
                <h4 className="font-semibold text-primary">Add Token Manually</h4>
                <div className="form-group">
                  <label className="form-label">Token Contract Address</label>
                  <input
                    type="text"
                    value={newTokenAddress}
                    onChange={(e) => setNewTokenAddress(e.target.value)}
                    placeholder="0x... (deployed token contract address)"
                    className="input"
                  />
                  <div className="form-hint">
                    Add a token that wasn't automatically detected (deployed outside this app)
                  </div>
                </div>
                <div className="flex items-center space-x-md">
                  <button
                    onClick={handleAddToken}
                    disabled={addingToken || !newTokenAddress}
                    className="btn btn-primary text-sm"
                  >
                    {addingToken ? 'Adding...' : 'Add Token'}
                  </button>
                  <button
                    onClick={() => {
                      setShowAddToken(false);
                      setNewTokenAddress('');
                    }}
                    className="btn btn-secondary text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loadingTokens && (
            <div className="text-center py-lg">
              <div className="flex items-center justify-center space-x-md">
                <svg className="animate-pulse w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
                <span className="text-primary">Loading your deployed tokens...</span>
              </div>
            </div>
          )}

          {/* Error State */}
          {tokensError && (
            <div className="card" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: 'var(--spacing-md)' }}>
              <div className="flex items-center space-x-md">
                <svg className="w-5 h-5 text-danger" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <div className="font-medium text-danger">Error loading tokens</div>
                  <div className="text-sm text-secondary">{tokensError}</div>
                </div>
              </div>
            </div>
          )}

          {/* Tokens List */}
          {!loadingTokens && deployedTokens.length > 0 && (
            <div className="grid grid-cols-1 gap-md">
              {deployedTokens.map((token) => (
                <div
                  key={token.address}
                  className="card card-hover"
                  style={{ padding: 'var(--spacing-lg)', background: 'var(--bg-secondary)' }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-md">
                      <div className="w-10 h-10 rounded-full bg-primary bg-opacity-20 flex items-center justify-center">
                        <span className="font-bold text-primary text-sm">
                          {token.symbol.slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center space-x-sm">
                          <span className="font-semibold text-primary">{token.name}</span>
                          <span className="text-sm text-muted">({token.symbol})</span>
                          {token.isVerified && (
                            <svg className="w-4 h-4 text-success" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          )}
                          <span className="text-xs px-2 py-1 rounded-full" style={{ 
                            background: token.source === 'blockchain' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                            color: token.source === 'blockchain' ? 'var(--color-success)' : 'var(--color-primary)'
                          }}>
                            {token.source === 'blockchain' ? 'Auto-detected' : 'Manual'}
                          </span>
                        </div>
                        <div className="text-sm text-muted font-mono" style={{ wordBreak: 'break-all' }}>
                          {token.address}
                        </div>
                        <div className="text-xs text-muted">
                          Deployed {new Date(token.deploymentTimestamp).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-sm">
                      <button
                        onClick={() => {
                          setTokenAddress(token.address);
                          setFeeOwnerAddress(address || '');
                        }}
                        className="btn btn-primary text-xs"
                      >
                        Check Fees
                      </button>
                      
                      <button
                        onClick={() => navigator.clipboard.writeText(token.address)}
                        className="btn btn-secondary text-xs"
                      >
                        Copy
                      </button>
                      
                      <a
                        href={`https://basescan.org/address/${token.address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary text-xs"
                      >
                        Explorer
                      </a>
                      
                      {token.source === 'manual' && (
                        <button
                          onClick={() => handleRemoveToken(token.address)}
                          className="btn btn-danger text-xs"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loadingTokens && deployedTokens.length === 0 && !tokensError && (
            <div className="text-center py-2xl">
              <div className="w-16 h-16 mx-auto mb-md rounded-full bg-muted bg-opacity-20 flex items-center justify-center">
                <svg className="w-8 h-8 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-primary mb-sm">No tokens found</h4>
              <p className="text-secondary mb-lg">
                We couldn't find any tokens deployed by this wallet. Deploy your first token or add one manually.
              </p>
              <button
                onClick={() => setShowAddToken(true)}
                className="btn btn-primary"
              >
                Add Token Manually
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Fee Checker Section */}
      <div className="card" style={{ padding: 'var(--spacing-xl)' }}>
        <div className="space-y-lg">
          <div className="flex items-center space-x-md">
            <svg className="w-6 h-6 text-success" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
            <h3 className="text-xl font-semibold text-primary">
              Check Available Fees
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
            <div className="form-group">
              <label className="form-label">
                Fee Owner Address
                <span className="required">*</span>
              </label>
              <input
                type="text"
                value={feeOwnerAddress}
                onChange={(e) => setFeeOwnerAddress(e.target.value)}
                placeholder="0x... (your Gnosis Safe or wallet address)"
                className="input"
              />
              <div className="form-hint">
                The address that owns/receives the fees (usually your Gnosis Safe address)
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                Token Contract Address
                <span className="required">*</span>
              </label>
              <input
                type="text"
                value={tokenAddress}
                onChange={(e) => setTokenAddress(e.target.value)}
                placeholder="0x... (deployed token contract address)"
                className="input"
              />
              <div className="form-hint">
                The contract address of your deployed Clanker token
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-md">
              <button
                onClick={checkFees}
                disabled={loading || !tokenAddress || !feeOwnerAddress}
                className="btn btn-primary"
              >
                {loading ? (
                  <div className="flex items-center space-x-sm">
                    <svg className="animate-pulse w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                    </svg>
                    <span>Checking...</span>
                  </div>
                ) : (
                  'Check Fees'
                )}
              </button>
              
              {(fees || error) && (
                <button
                  onClick={resetForm}
                  className="btn btn-secondary"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {error && (
            <div className="card" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: 'var(--spacing-md)' }}>
              <div className="flex items-center space-x-md">
                <svg className="w-5 h-5 text-danger" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <div className="font-medium text-danger">Error</div>
                  <div className="text-sm text-secondary">{error}</div>
                </div>
              </div>
            </div>
          )}

          {fees && (
            <div className="card" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: 'var(--spacing-lg)' }}>
              <div className="space-y-md">
                <div className="flex items-center space-x-md">
                  <svg className="w-6 h-6 text-success" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <h4 className="text-lg font-semibold text-success">Available Fees</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                  {Object.entries(fees).map(([symbol, amount]) => (
                    <div key={symbol} className="card" style={{ padding: 'var(--spacing-md)', background: 'var(--bg-secondary)' }}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-sm">
                          <div className="w-8 h-8 rounded-full bg-primary bg-opacity-20 flex items-center justify-center">
                            <span className="font-bold text-primary text-sm">{symbol.slice(0, 2)}</span>
                          </div>
                          <div>
                            <div className="font-medium text-primary">{symbol}</div>
                            <div className="text-xs text-muted">Token</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-lg text-primary">{amount}</div>
                          <div className="text-xs text-muted">Available</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {Object.values(fees).every(amount => parseFloat(amount) === 0) && (
                  <div className="text-center py-md">
                    <div className="text-muted">No fees available to collect at this time</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Placeholder for additional token management features */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
        <div className="card" style={{ padding: 'var(--spacing-lg)' }}>
          <div className="space-y-md opacity-50">
            <div className="flex items-center space-x-md">
              <svg className="w-6 h-6 text-warning" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
              </svg>
              <h3 className="text-lg font-semibold text-primary">Collect Fees</h3>
            </div>
            <p className="text-secondary text-sm">
              Collect available fees from your deployed tokens (Coming Soon)
            </p>
          </div>
        </div>

        <div className="card" style={{ padding: 'var(--spacing-lg)' }}>
          <div className="space-y-md opacity-50">
            <div className="flex items-center space-x-md">
              <svg className="w-6 h-6 text-info" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <h3 className="text-lg font-semibold text-primary">Token Info</h3>
            </div>
            <p className="text-secondary text-sm">
              View detailed information about your deployed tokens (Coming Soon)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 