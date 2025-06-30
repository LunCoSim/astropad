import { useState } from 'react';
import { useAccount } from 'wagmi';

interface FeeData {
  [symbol: string]: string;
}

export function ManageTokens() {
  const { address } = useAccount();
  const [tokenAddress, setTokenAddress] = useState('0x699E27a42095D3cb9A6a23097E5C201E33E314B4');
  const [feeOwnerAddress, setFeeOwnerAddress] = useState('0xCd2a99C6d6b27976537fC3737b0ef243E7C49946');
  const [fees, setFees] = useState<FeeData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
          Check available fees and manage your deployed Clanker tokens
        </p>
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