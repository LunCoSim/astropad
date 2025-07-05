import React, { useState } from 'react';
import { InfoTooltip } from './ui/InfoTooltip';

interface PresaleParticipationProps {
  presaleStatus: 'not_started' | 'active' | 'successful_minimum' | 'successful_maximum' | 'failed' | 'claimable';
  minEthGoal: number;
  maxEthGoal: number;
  ethRaised: number;
  userContribution: number;
  claimableTokens: number;
  isAdmin: boolean;
  onBuy: (amount: number) => Promise<void>;
  onClaim: () => Promise<void>;
  onAdminEndPresale?: () => Promise<void>;
  onAdminWithdraw?: () => Promise<void>;
  loading?: boolean;
}

export const PresaleParticipation: React.FC<PresaleParticipationProps> = ({
  presaleStatus,
  minEthGoal,
  maxEthGoal,
  ethRaised,
  userContribution,
  claimableTokens,
  isAdmin,
  onBuy,
  onClaim,
  onAdminEndPresale,
  onAdminWithdraw,
  loading
}) => {
  const [buyAmount, setBuyAmount] = useState('');
  const [buying, setBuying] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [adminAction, setAdminAction] = useState(false);
  const [error, setError] = useState('');

  const handleBuy = async () => {
    setBuying(true);
    setError('');
    try {
      await onBuy(Number(buyAmount));
      setBuyAmount('');
    } catch (e: any) {
      setError(e.message || 'Buy failed');
    } finally {
      setBuying(false);
    }
  };

  const handleClaim = async () => {
    setClaiming(true);
    setError('');
    try {
      await onClaim();
    } catch (e: any) {
      setError(e.message || 'Claim failed');
    } finally {
      setClaiming(false);
    }
  };

  const handleAdminEndPresale = async () => {
    if (!onAdminEndPresale) return;
    setAdminAction(true);
    setError('');
    try {
      await onAdminEndPresale();
    } catch (e: any) {
      setError(e.message || 'Admin action failed');
    } finally {
      setAdminAction(false);
    }
  };

  const handleAdminWithdraw = async () => {
    if (!onAdminWithdraw) return;
    setAdminAction(true);
    setError('');
    try {
      await onAdminWithdraw();
    } catch (e: any) {
      setError(e.message || 'Admin action failed');
    } finally {
      setAdminAction(false);
    }
  };

  const progress = Math.min(100, (ethRaised / maxEthGoal) * 100);

  return (
    <div className="space-y-md">
      <div className="flex items-center space-x-md">
        <h4 className="font-semibold text-primary">Presale Status</h4>
        <InfoTooltip content="Participate in the presale, view progress, and claim tokens after the presale ends." />
      </div>
      <div className="flex items-center space-x-md">
        <div className="w-full bg-gray-200 rounded h-2">
          <div
            className="bg-blue-500 h-2 rounded"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs font-mono">{ethRaised} / {maxEthGoal} ETH</span>
      </div>
      <div className="flex items-center space-x-md text-sm">
        <span>Min Goal: {minEthGoal} ETH</span>
        <span>Max Cap: {maxEthGoal} ETH</span>
        <span>Status: <strong>{presaleStatus.replace('_', ' ')}</strong></span>
      </div>
      <div className="text-xs text-muted">Your Contribution: {userContribution} ETH</div>
      {claimableTokens > 0 && (
        <div className="text-xs text-success">Claimable Tokens: {claimableTokens}</div>
      )}
      {error && (
        <div className="text-xs text-danger">{error}</div>
      )}
      {presaleStatus === 'active' && (
        <div className="flex items-center space-x-md mt-sm">
          <input
            type="number"
            value={buyAmount}
            onChange={e => setBuyAmount(e.target.value)}
            placeholder="ETH amount"
            className="input w-32"
            min={0.01}
            step={0.01}
            disabled={buying || loading}
          />
          <button
            onClick={handleBuy}
            className="btn btn-primary btn-sm"
            disabled={buying || loading || !buyAmount || Number(buyAmount) <= 0}
          >
            {buying ? 'Buying...' : 'Buy In'}
          </button>
        </div>
      )}
      {presaleStatus === 'claimable' && claimableTokens > 0 && (
        <button
          onClick={handleClaim}
          className="btn btn-success btn-sm mt-sm"
          disabled={claiming || loading}
        >
          {claiming ? 'Claiming...' : 'Claim Tokens'}
        </button>
      )}
      {isAdmin && (
        <div className="space-y-xs mt-md">
          <div className="text-xs text-primary">Admin Controls</div>
          {presaleStatus === 'active' && (
            <button
              onClick={handleAdminEndPresale}
              className="btn btn-warning btn-xs"
              disabled={adminAction || loading}
            >
              {adminAction ? 'Ending...' : 'End Presale'}
            </button>
          )}
          {presaleStatus === 'claimable' && (
            <button
              onClick={handleAdminWithdraw}
              className="btn btn-warning btn-xs"
              disabled={adminAction || loading}
            >
              {adminAction ? 'Withdrawing...' : 'Withdraw ETH'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}; 