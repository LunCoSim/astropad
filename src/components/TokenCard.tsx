import type { DeployedToken, FeeData } from '../../lib/types';

type TokenCardProps = {
  token: DeployedToken;
  adminAddress: string | null;
  fees: FeeData | null;
  isLoadingFees: boolean;
  isClaimingFees: boolean;
  onRemove: (address: string) => void;
  onCheckAdmin: () => void;
  onCheckFees: () => void;
  onClaimFees: () => void;
};

export function TokenCard({
  token,
  adminAddress,
  fees,
  isLoadingFees,
  isClaimingFees,
  onRemove,
  onCheckAdmin,
  onCheckFees,
  onClaimFees,
}: TokenCardProps) {
  const isAdmin = adminAddress?.toLowerCase() === token.deployerAddress.toLowerCase();
  const hasFees = !!fees;
  const totalFees = fees ? Object.values(fees).reduce((total, amount) => total + parseFloat(amount || '0'), 0) : 0;

  return (
    <div className="card card-hover" style={{ padding: 'var(--spacing-lg)', background: 'var(--bg-secondary)' }}>
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
            {adminAddress && (
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
                      background: isAdmin ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                      color: isAdmin ? 'var(--color-success)' : 'var(--color-danger)'
                    }}>
                      {isAdmin ? '👑 You are Admin' : '🔒 Not Admin'}
                    </span>
                  </div>
                  <div className="text-sm text-muted font-mono break-all">
                    {adminAddress}
                  </div>
                  {!isAdmin && (
                    <div className="text-xs text-muted">
                      Only the admin can check and claim fees for this token
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Fee Information */}
            {hasFees && (
              <div className="card" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: 'var(--spacing-md)' }}>
                <div className="space-y-sm">
                  <div className="flex items-center space-x-sm">
                    <svg className="w-4 h-4 text-success" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium text-success">Available Fees</span>
                    <span className="text-xs text-muted">
                      Total: {totalFees.toFixed(4)} tokens
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-sm">
                    {Object.entries(fees || {}).map(([symbol, amount]) => (
                      <div key={symbol} className="flex items-center justify-between bg-white bg-opacity-50 px-sm py-xs rounded">
                        <span className="text-sm font-medium">{symbol}</span>
                        <span className="text-sm">{amount}</span>
                      </div>
                    ))}
                  </div>
                  {totalFees === 0 && (
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
                {!adminAddress ? (
                  <button
                    onClick={onCheckAdmin}
                    className="btn btn-secondary text-xs"
                  >
                    Check Admin
                  </button>
                ) : (
                  <>
                    <button
                      onClick={onCheckFees}
                      disabled={isLoadingFees}
                      className="btn btn-primary text-xs"
                    >
                      {isLoadingFees ? 'Refreshing...' : 'Refresh Fees'}
                    </button>
                    
                    {hasFees && isAdmin && totalFees > 0 && (
                      <button
                        onClick={onClaimFees}
                        disabled={isClaimingFees}
                        className="btn btn-success text-xs"
                      >
                        {isClaimingFees ? 'Claiming...' : 'Claim Fees'}
                      </button>
                    )}
                  </>
                )}
              </>
            )}
            
            {token.source === 'manual' && (
              <button
                onClick={() => onRemove(token.address)}
                className="btn btn-danger text-xs"
              >
                Remove
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 