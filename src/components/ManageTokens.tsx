import { useState, useEffect } from 'react';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { addTokenByAddress, getStoredTokens, removeStoredToken } from '../../lib/deployed-tokens';
import { getAvailableFees } from '../../lib/fees';
import type { DeployedToken, FeeData } from '../../lib/types';
import { AddTokenForm } from './AddTokenForm';
import { TokenCard } from './TokenCard';

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
  // Remove newTokenAddress and addingToken states

  // Add handler for when token is added in sub-component
  const handleTokenAdded = async (addedToken: DeployedToken) => {
    await loadDeployedTokens(); // Refresh the list
    // Check admin status for the newly added token
    try {
      const adminAddress = await checkTokenAdmin(addedToken.address);
      setTokenAdmins(prev => ({ ...prev, [addedToken.address]: adminAddress }));
      // If user is admin, automatically check fees
      if (adminAddress && adminAddress.toLowerCase() === address.toLowerCase()) {
        setLoadingFees(prev => ({ ...prev, [addedToken.address]: true }));
        try {
          const fees = await getAvailableFees(publicClient, address as `0x${string}`, addedToken.address as `0x${string}`);
          setTokenFees(prev => ({ ...prev, [addedToken.address]: fees }));
        } catch (error) {
          console.error('Error checking fees for newly added token:', error);
        } finally {
          setLoadingFees(prev => ({ ...prev, [addedToken.address]: false }));
        }
      }
    } catch (error) {
      console.error('Error checking admin for newly added token:', error);
    }
    setShowAddToken(false);
  };

  // Load deployed tokens when wallet connects
  useEffect(() => {
    if (address && publicClient) {
      loadDeployedTokens();
    }
  }, [address, publicClient]);

  const loadDeployedTokens = async () => {
    setLoadingTokens(true);
    setTokensError('');
    try {
      const tokens = getStoredTokens(address!);
      setDeployedTokens(tokens);
      if (tokens.length > 0) {
        await checkAdminStatusForTokens(tokens);
      }
    } catch (error: any) {
      setTokensError(error.message || 'Failed to load deployed tokens');
      setDeployedTokens([]);
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

  // Wrapper for check admin with auto fee check
  const handleCheckAdmin = async (token: DeployedToken) => {
    try {
      const adminAddress = await checkTokenAdmin(token.address);
      setTokenAdmins(prev => ({ ...prev, [token.address]: adminAddress }));
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
  };

  return (
    <div className="space-y-xl">
      <div className="text-center space-y-md">
        <h2 className="text-3xl font-bold text-primary">
          Manage Deployed Tokens
        </h2>
        <p className="text-secondary">
          Manage your deployed tokens manually. Add tokens by address to track fees and manage settings.
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
            <AddTokenForm
              publicClient={publicClient!}
              address={address!}
              onTokenAdded={handleTokenAdded}
              onCancel={() => setShowAddToken(false)}
            />
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
                <TokenCard
                  key={token.address}
                  token={token}
                  adminAddress={tokenAdmins[token.address]}
                  fees={tokenFees[token.address]}
                  isLoadingFees={loadingFees[token.address] ?? false}
                  isClaimingFees={claimingFees[token.address] ?? false}
                  onRemove={handleRemoveToken}
                  onCheckAdmin={() => handleCheckAdmin(token)}
                  onCheckFees={() => checkTokenFees(token)}
                  onClaimFees={() => claimTokenFees?.(token) ?? alert('Claim functionality not implemented')}
                />
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