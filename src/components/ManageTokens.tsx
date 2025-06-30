import { useState, useEffect } from 'react';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { syncTokensWithBlockchain, addTokenByAddress, removeStoredToken, type DeployedToken } from '../../lib/deployed-tokens';
import { getAvailableFees, claimFees } from '../../lib/fees';

interface FeeData {
  [symbol: string]: string;
}

export function ManageTokens() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  
  // Deployed tokens state
  const [deployedTokens, setDeployedTokens] = useState<DeployedToken[]>([]);
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [tokensError, setTokensError] = useState('');
  
  // Token fee checking state
  const [tokenFees, setTokenFees] = useState<{ [address: string]: FeeData | null }>({});
  const [loadingFees, setLoadingFees] = useState<{ [address: string]: boolean }>({});
  const [claimingFees, setClaimingFees] = useState<{ [address: string]: boolean }>({});
  const [tokenAdmins, setTokenAdmins] = useState<{ [address: string]: string | null }>({});
  
  // Manual token addition state
  const [showAddToken, setShowAddToken] = useState(false);
  const [newTokenAddress, setNewTokenAddress] = useState('');
  const [addingToken, setAddingToken] = useState(false);
  


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
      // Use blockchain query by default (reliable method)
      console.log('Loading deployed tokens via blockchain query...');
      const tokens = await syncTokensWithBlockchain(publicClient, address, false);
      
      setDeployedTokens(tokens);
      
      // Automatically check admin status for manually added tokens
      if (tokens.length > 0) {
        await checkAdminStatusForTokens(tokens.filter(t => t.source === 'manual'));
      }
    } catch (err: any) {
      setTokensError(err.message || 'Failed to load deployed tokens');
      console.error('Error loading deployed tokens:', err);
    } finally {
      setLoadingTokens(false);
    }
  };

  // Check admin status for multiple tokens
  const checkAdminStatusForTokens = async (tokens: DeployedToken[]) => {
    if (!publicClient || !address) return;

    const adminPromises = tokens.map(async (token) => {
      try {
        const adminAddress = await checkTokenAdmin(token.address);
        return { token, admin: adminAddress };
      } catch (error) {
        console.error(`Error checking admin for token ${token.address}:`, error);
        return { token, admin: null };
      }
    });

    const adminResults = await Promise.all(adminPromises);
    
    const newAdminData: { [address: string]: string | null } = {};
    const tokensForFeeCheck: DeployedToken[] = [];
    
    adminResults.forEach(({ token, admin }) => {
      newAdminData[token.address] = admin;
      
      // If user is admin of this token, add it to fee check list
      if (admin && admin.toLowerCase() === address.toLowerCase()) {
        tokensForFeeCheck.push(token);
      }
    });

    setTokenAdmins(prev => ({ ...prev, ...newAdminData }));
    
    // Automatically check fees for tokens where user is admin
    if (tokensForFeeCheck.length > 0) {
      await checkFeesForMultipleTokens(tokensForFeeCheck);
    }
  };

  // Check fees for multiple tokens automatically
  const checkFeesForMultipleTokens = async (tokens: DeployedToken[]) => {
    if (!publicClient || !address) return;

    // Set loading state for all tokens
    const loadingState: { [address: string]: boolean } = {};
    tokens.forEach(token => {
      loadingState[token.address] = true;
    });
    setLoadingFees(prev => ({ ...prev, ...loadingState }));

    // Check fees for each token in parallel
    const feePromises = tokens.map(async (token) => {
      try {
        const fees = await getAvailableFees(publicClient, address as `0x${string}`, token.address as `0x${string}`);
        return { address: token.address, fees, error: null };
      } catch (error) {
        console.error(`Error checking fees for token ${token.address}:`, error);
        return { address: token.address, fees: null, error };
      }
    });

    const feeResults = await Promise.all(feePromises);
    
    // Update fee data
    const newFeeData: { [address: string]: FeeData | null } = {};
    const newLoadingState: { [address: string]: boolean } = {};
    
    feeResults.forEach(({ address, fees }) => {
      newFeeData[address] = fees;
      newLoadingState[address] = false;
    });

    setTokenFees(prev => ({ ...prev, ...newFeeData }));
    setLoadingFees(prev => ({ ...prev, ...newLoadingState }));
  };

  const handleAddToken = async () => {
    if (!newTokenAddress || !address || !publicClient) return;
    
    setAddingToken(true);
    try {
      await addTokenByAddress(publicClient, newTokenAddress, address);
      await loadDeployedTokens(); // Refresh the list
      
      // Check admin status for the newly added token
      try {
        const adminAddress = await checkTokenAdmin(newTokenAddress);
        setTokenAdmins(prev => ({ ...prev, [newTokenAddress]: adminAddress }));
        
        // If user is admin, automatically check fees
        if (adminAddress && adminAddress.toLowerCase() === address.toLowerCase()) {
          setLoadingFees(prev => ({ ...prev, [newTokenAddress]: true }));
          
          try {
            const fees = await getAvailableFees(publicClient, address as `0x${string}`, newTokenAddress as `0x${string}`);
            setTokenFees(prev => ({ ...prev, [newTokenAddress]: fees }));
          } catch (error) {
            console.error('Error checking fees for newly added token:', error);
          } finally {
            setLoadingFees(prev => ({ ...prev, [newTokenAddress]: false }));
          }
        }
      } catch (error) {
        console.error('Error checking admin for newly added token:', error);
      }
      
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

  // Check if connected wallet is admin of the token
  const checkTokenAdmin = async (tokenAddress: string): Promise<string | null> => {
    if (!publicClient) return null;
    
    try {
      // Try to read the admin/owner property from the token contract
      const adminAbi = [
        {
          constant: true,
          inputs: [],
          name: 'admin',
          outputs: [{ name: '', type: 'address' }],
          type: 'function',
        },
        {
          constant: true,
          inputs: [],
          name: 'owner',
          outputs: [{ name: '', type: 'address' }],
          type: 'function',
        },
      ] as const;

      // Try 'admin' first, then 'owner'
      try {
        const admin = await publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: adminAbi,
          functionName: 'admin',
        });
        return admin as string;
      } catch {
        try {
          const owner = await publicClient.readContract({
            address: tokenAddress as `0x${string}`,
            abi: adminAbi,
            functionName: 'owner',
          });
          return owner as string;
        } catch {
          return null;
        }
      }
    } catch (error) {
      console.error('Error checking token admin:', error);
      return null;
    }
  };

  // Check fees for a specific token
  const checkTokenFees = async (token: DeployedToken) => {
    if (!publicClient || !address) return;
    
    setLoadingFees(prev => ({ ...prev, [token.address]: true }));
    
    try {
      // First check if connected wallet is admin
      let adminAddress = tokenAdmins[token.address];
      if (!adminAddress) {
        adminAddress = await checkTokenAdmin(token.address);
        setTokenAdmins(prev => ({ ...prev, [token.address]: adminAddress }));
      }
      
      if (!adminAddress) {
        alert('Could not determine token admin. This token might not support fee collection.');
        return;
      }

      // Check if connected wallet is the admin and show appropriate message
      if (adminAddress.toLowerCase() !== address.toLowerCase()) {
        const shortAdmin = `${adminAddress.slice(0, 6)}...${adminAddress.slice(-4)}`;
        alert(`You are not the admin of this token.\n\nAdmin address: ${shortAdmin}\nYour address: ${address.slice(0, 6)}...${address.slice(-4)}\n\nOnly the admin can check and claim fees for this token.`);
        return;
      }

      // Get available fees
      const fees = await getAvailableFees(publicClient, address as `0x${string}`, token.address as `0x${string}`);
      setTokenFees(prev => ({ ...prev, [token.address]: fees }));
      
    } catch (error: any) {
      console.error('Error checking fees:', error);
      alert(`Error checking fees: ${error.message}`);
    } finally {
      setLoadingFees(prev => ({ ...prev, [token.address]: false }));
    }
  };

  // Claim fees for a specific token
  const claimTokenFees = async (token: DeployedToken) => {
    if (!publicClient || !address) return;
    
    setClaimingFees(prev => ({ ...prev, [token.address]: true }));
    
    try {
      // Check if user is admin first
      const adminAddress = tokenAdmins[token.address];
      if (!adminAddress || adminAddress.toLowerCase() !== address.toLowerCase()) {
        alert('You must be the admin of this token to claim fees.');
        return;
      }

      // Try to claim fees
      try {
        const txHash = await claimFees(publicClient, walletClient, address as `0x${string}`, token.address as `0x${string}`);
        alert(`Fees claimed successfully!\nTransaction: ${txHash}`);
        // Refresh fees after claiming
        await checkTokenFees(token);
      } catch (error: any) {
        // If the Clanker SDK method isn't available, show manual claim option
        if (error.message.includes('not yet available')) {
          const shouldOpenAdmin = confirm(
            error.message
          );
          
          if (shouldOpenAdmin) {
            window.open(`https://www.clanker.world/clanker/${token.address}/admin`, '_blank');
          }
        } else {
          throw error;
        }
      }
      
    } catch (error: any) {
      console.error('Error claiming fees:', error);
      alert(`Error claiming fees: ${error.message}`);
    } finally {
      setClaimingFees(prev => ({ ...prev, [token.address]: false }));
    }
  };

  // Check if user is admin of token (cached or fresh check)
  const isUserAdmin = (token: DeployedToken): boolean => {
    const adminAddress = tokenAdmins[token.address];
    return adminAddress?.toLowerCase() === address?.toLowerCase();
  };

  // Check if we have fee data for a token
  const hasFeeData = (token: DeployedToken): boolean => {
    return !!tokenFees[token.address];
  };

  // Get total fee value for display
  const getTotalFeesValue = (token: DeployedToken): number => {
    const fees = tokenFees[token.address];
    if (!fees) return 0;
    return Object.values(fees).reduce((total, amount) => total + parseFloat(amount || '0'), 0);
  };

  return (
    <div className="space-y-xl">
      <div className="text-center space-y-md">
        <h2 className="text-3xl font-bold text-primary">
          Manage Deployed Tokens
        </h2>
        <p className="text-secondary">
          Automatically discover and manage your deployed Clanker tokens with reliable blockchain-based detection
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
                  <div className="space-y-md">
                    {/* Token Header */}
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
                    </div>

                    {/* Admin Information - Only for manually added tokens */}
                    {token.source === 'manual' && (
                      <div className="space-y-sm">
                        {/* Admin Status Card */}
                        {tokenAdmins[token.address] && (
                          <div className="card" style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)', padding: 'var(--spacing-md)' }}>
                            <div className="space-y-sm">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-sm">
                                  <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                  </svg>
                                  <span className="font-medium text-primary">Token Admin</span>
                                </div>
                                <span className="text-xs px-2 py-1 rounded-full" style={{ 
                                  background: isUserAdmin(token) ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                  color: isUserAdmin(token) ? 'var(--color-success)' : 'var(--color-danger)'
                                }}>
                                  {isUserAdmin(token) ? '👑 You are Admin' : '🔒 Not Admin'}
                                </span>
                              </div>
                              <div className="text-sm text-muted font-mono break-all">
                                {tokenAdmins[token.address]}
                              </div>
                              {!isUserAdmin(token) && (
                                <div className="text-xs text-muted">
                                  Only the admin can check and claim fees for this token
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Fee Information */}
                        {hasFeeData(token) && (
                          <div className="card" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: 'var(--spacing-md)' }}>
                            <div className="space-y-sm">
                              <div className="flex items-center space-x-sm">
                                <svg className="w-4 h-4 text-success" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                </svg>
                                <span className="font-medium text-success">Available Fees</span>
                                <span className="text-xs text-muted">
                                  Total: {getTotalFeesValue(token).toFixed(4)} tokens
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-sm">
                                {Object.entries(tokenFees[token.address] || {}).map(([symbol, amount]) => (
                                  <div key={symbol} className="flex items-center justify-between bg-white bg-opacity-50 px-sm py-xs rounded">
                                    <span className="text-sm font-medium">{symbol}</span>
                                    <span className="text-sm">{amount}</span>
                                  </div>
                                ))}
                              </div>
                              {getTotalFeesValue(token) === 0 && (
                                <div className="text-xs text-muted text-center py-sm">
                                  No fees available at this time
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-sm">
                        <button
                          onClick={() => navigator.clipboard.writeText(token.address)}
                          className="btn btn-secondary text-xs"
                        >
                          Copy Address
                        </button>
                        
                        <a
                          href={`https://basescan.org/address/${token.address}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-secondary text-xs"
                        >
                          View on Explorer
                        </a>
                      </div>

                      <div className="flex items-center space-x-sm">
                        {/* Fee management for manually added tokens */}
                        {token.source === 'manual' && (
                          <>
                            {!tokenAdmins[token.address] ? (
                              <button
                                onClick={async () => {
                                  try {
                                    const adminAddress = await checkTokenAdmin(token.address);
                                    setTokenAdmins(prev => ({ ...prev, [token.address]: adminAddress }));
                                    
                                    // If user is admin, automatically check fees
                                    if (adminAddress && adminAddress.toLowerCase() === address?.toLowerCase()) {
                                      setLoadingFees(prev => ({ ...prev, [token.address]: true }));
                                      
                                      try {
                                        const fees = await getAvailableFees(publicClient, address as `0x${string}`, token.address as `0x${string}`);
                                        setTokenFees(prev => ({ ...prev, [token.address]: fees }));
                                      } catch (error) {
                                        console.error('Error checking fees:', error);
                                      } finally {
                                        setLoadingFees(prev => ({ ...prev, [token.address]: false }));
                                      }
                                    }
                                  } catch (error) {
                                    console.error('Error checking admin:', error);
                                    alert('Failed to check token admin');
                                  }
                                }}
                                className="btn btn-secondary text-xs"
                              >
                                Check Admin
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => checkTokenFees(token)}
                                  disabled={loadingFees[token.address]}
                                  className="btn btn-primary text-xs"
                                >
                                  {loadingFees[token.address] ? 'Refreshing...' : 'Refresh Fees'}
                                </button>
                                
                                {hasFeeData(token) && isUserAdmin(token) && getTotalFeesValue(token) > 0 && (
                                  <button
                                    onClick={() => claimTokenFees(token)}
                                    disabled={claimingFees[token.address]}
                                    className="btn btn-success text-xs"
                                  >
                                    {claimingFees[token.address] ? 'Claiming...' : 'Claim Fees'}
                                  </button>
                                )}
                              </>
                            )}
                          </>
                        )}
                        
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
    </div>
  );
} 