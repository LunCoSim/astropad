import { useState } from 'react';

import type { PublicClient } from 'viem';
import { addTokenByAddress } from '../../lib/deployed-tokens';

import type { DeployedToken } from '../../lib/types';

type AddTokenFormProps = {
  publicClient: PublicClient;
  address: string;
  onTokenAdded: (token: DeployedToken) => void;
  onCancel: () => void;
};

export function AddTokenForm({ publicClient, address, onTokenAdded, onCancel }: AddTokenFormProps) {
  const [newTokenAddress, setNewTokenAddress] = useState('');
  const [addingToken, setAddingToken] = useState(false);
  
  const handleAddToken = async () => {
    if (!newTokenAddress || !address || !publicClient) return;
    
    setAddingToken(true);
    try {
      const addedToken = await addTokenByAddress(publicClient, newTokenAddress, address);
      onTokenAdded(addedToken);
      setNewTokenAddress('');
    } catch (err: any) {
      alert(err.message || 'Failed to add token');
    } finally {
      setAddingToken(false);
    }
  };

  return (
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
            Add a token deployed with this or other interfaces to track fees and manage settings
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
            onClick={onCancel}
            className="btn btn-secondary text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
} 