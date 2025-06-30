import { useState } from 'react';
import type { TokenConfig } from '../TokenDeployWizard';
import { InfoTooltip } from '../ui/InfoTooltip';
import { usePublicClient, useWalletClient } from 'wagmi';
import { getAvailableFees } from '../../../lib/fees';

interface DeploymentStepProps {
  config: TokenConfig;
  onPrevious: () => void;
}

export function DeploymentStep({ config, onPrevious }: DeploymentStepProps) {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  
  const [simulationResult, setSimulationResult] = useState<any>(null);
  const [deployedTokenAddress, setDeployedTokenAddress] = useState('');
  const [customClankerTokenAddress, setCustomClankerTokenAddress] = useState('0x699E27a42095D3cb9A6a23097E5C201E33E314B4');
  const [customFeeOwnerAddress, setCustomFeeOwnerAddress] = useState('0xCd2a99C6d6b27976537fC3737b0ef243E7C49946');
  const [isSimulating, setIsSimulating] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [isCheckingFees, setIsCheckingFees] = useState(false);

  const handleSimulateToken = async () => {
    if (!publicClient) {
      alert('Wallet not connected');
      return;
    }

    setIsSimulating(true);
    try {
      // Simulate deployment logic here
      // This would typically call the Clanker contract's simulation function
      console.log('Simulating token deployment with config:', config);
      
      // Mock simulation result for now
      const mockResult = {
        transaction: {
          to: '0x1234567890123456789012345678901234567890',
          value: BigInt(0),
          data: '0x1234567890abcdef',
        },
        simulatedAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
        gasEstimate: BigInt(500000),
        estimatedCost: '0.01 ETH'
      };
      
      setSimulationResult(mockResult);
      alert('Simulation successful! Ready to deploy.');
    } catch (error: any) {
      console.error('Simulation failed:', error);
      alert(`Simulation failed: ${error.message}`);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleConfirmDeploy = async () => {
    if (!simulationResult || !walletClient) {
      alert('Please simulate deployment first');
      return;
    }

    setIsDeploying(true);
    try {
      const hash = await walletClient.sendTransaction({
        to: simulationResult.transaction.to,
        value: simulationResult.transaction.value,
        data: simulationResult.transaction.data,
        account: walletClient.account,
      });

      setDeployedTokenAddress(simulationResult.simulatedAddress);
      alert(`Token deployed! Transaction hash: ${hash}`);
    } catch (error: any) {
      console.error('Deployment failed:', error);
      alert(`Deployment failed: ${error.message}`);
    } finally {
      setIsDeploying(false);
    }
  };

  const handleCheckFees = async () => {
    if (!publicClient) {
      alert('Wallet not connected');
      return;
    }

    setIsCheckingFees(true);
    try {
      const fees = await getAvailableFees(
        publicClient,
        customFeeOwnerAddress as `0x${string}`,
        customClankerTokenAddress as `0x${string}`
      );

      const feesList = Object.entries(fees)
        .map(([symbol, amount]) => `${symbol}: ${amount}`)
        .join('\n');
      
      alert(`Available fees:\n${feesList}`);
    } catch (error: any) {
      console.error('Error checking fees:', error);
      alert(`Error checking fees: ${error.message}`);
    } finally {
      setIsCheckingFees(false);
    }
  };

  return (
    <div className="space-y-2xl animate-fade-in">
      {/* Header */}
      <div className="text-center space-y-md">
        <h2 className="text-4xl font-bold text-primary mb-md">
          Deploy Your <span className="text-gradient">Token</span>
        </h2>
        <p className="text-lg text-secondary mx-auto" style={{ maxWidth: '48rem', lineHeight: '1.7' }}>
          Review your configuration, simulate the deployment, and launch your token to the world.
        </p>
      </div>

      {/* Configuration Summary */}
      <div className="card card-hover">
        <div className="flex items-center space-x-md mb-lg">
          <h3 className="text-xl font-bold text-primary">Configuration Summary</h3>
          <InfoTooltip content="Review your token configuration before deployment" />
        </div>

        <div className="grid grid-2 gap-lg">
          <div className="space-y-sm">
            <div className="text-sm">
              <span className="text-muted">Token Name:</span>
              <span className="ml-sm font-semibold text-primary">{config.name}</span>
            </div>
            <div className="text-sm">
              <span className="text-muted">Symbol:</span>
              <span className="ml-sm font-semibold text-primary">{config.symbol}</span>
            </div>
            <div className="text-sm">
              <span className="text-muted">Market Cap:</span>
              <span className="ml-sm font-semibold text-primary">{config.startingMarketCap} ETH</span>
            </div>
            <div className="text-sm">
              <span className="text-muted">Pair Token:</span>
              <span className="ml-sm font-semibold text-primary">{config.pairTokenType}</span>
            </div>
          </div>

          <div className="space-y-sm">
            <div className="text-sm">
              <span className="text-muted">Vault:</span>
              <span className="ml-sm font-semibold text-primary">
                {config.vault.enabled ? `${config.vault.percentage}%` : 'Disabled'}
              </span>
            </div>
            <div className="text-sm">
              <span className="text-muted">Airdrop:</span>
              <span className="ml-sm font-semibold text-primary">
                {config.airdrop.enabled ? `${config.airdrop.percentage}%` : 'Disabled'}
              </span>
            </div>
            <div className="text-sm">
              <span className="text-muted">Dev Buy:</span>
              <span className="ml-sm font-semibold text-primary">
                {config.devBuy.enabled ? `${config.devBuy.ethAmount} ETH` : 'Disabled'}
              </span>
            </div>
            <div className="text-sm">
              <span className="text-muted">Fee Type:</span>
              <span className="ml-sm font-semibold text-primary">{config.fees.type}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Fee Checking Section */}
      <div className="card card-hover">
        <div className="flex items-center space-x-md mb-lg">
          <h3 className="text-xl font-bold text-primary">Check Available Fees</h3>
          <InfoTooltip content="Check fees available for withdrawal from existing tokens" />
        </div>

        <div className="space-y-lg">
          <div className="grid grid-2 gap-lg">
            <div className="form-group">
              <label className="form-label">Fee Owner Address</label>
              <input
                type="text"
                value={customFeeOwnerAddress}
                onChange={(e) => setCustomFeeOwnerAddress(e.target.value)}
                placeholder="0x... fee owner address"
                className="input font-mono text-sm"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Clanker Token Address</label>
              <input
                type="text"
                value={customClankerTokenAddress}
                onChange={(e) => setCustomClankerTokenAddress(e.target.value)}
                placeholder="0x... token address"
                className="input font-mono text-sm"
              />
            </div>
          </div>

          <button 
            onClick={handleCheckFees} 
            className="btn btn-secondary"
            disabled={isCheckingFees}
          >
            {isCheckingFees ? 'Checking...' : 'Check Available Fees'}
          </button>
        </div>
      </div>

      {/* Deployment Actions */}
      <div className="card card-hover">
        <div className="flex items-center space-x-md mb-lg">
          <h3 className="text-xl font-bold text-primary">Deploy Token</h3>
          <InfoTooltip content="Simulate and deploy your token to the blockchain" />
        </div>

        <div className="space-y-lg">
          <div className="flex space-x-md">
            <button
              onClick={handleSimulateToken}
              className="btn btn-secondary"
              disabled={isSimulating}
            >
              {isSimulating ? 'Simulating...' : 'Simulate Deployment'}
            </button>
            
            <button
              onClick={handleConfirmDeploy}
              className="btn btn-primary"
              disabled={!simulationResult || isDeploying}
            >
              {isDeploying ? 'Deploying...' : 'Confirm Deploy'}
            </button>
          </div>

          {simulationResult && (
            <div className="card" style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
              <div className="space-y-xs">
                <div className="font-semibold text-primary">Simulation Results:</div>
                <div className="text-sm text-secondary">
                  Estimated Gas: {simulationResult.gasEstimate?.toString() || 'N/A'}
                </div>
                <div className="text-sm text-secondary">
                  Estimated Cost: {simulationResult.estimatedCost || 'N/A'}
                </div>
                <div className="text-sm text-secondary">
                  Token Address: {simulationResult.simulatedAddress || 'N/A'}
                </div>
              </div>
            </div>
          )}
          
          {deployedTokenAddress && (
            <div className="card" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              <div className="space-y-xs">
                <div className="font-semibold text-success">Token Deployed Successfully! 🎉</div>
                <div className="text-sm text-secondary" style={{ wordBreak: 'break-all' }}>
                  Address: {deployedTokenAddress}
                </div>
                <div className="flex space-x-md mt-md">
                  <button 
                    onClick={() => navigator.clipboard.writeText(deployedTokenAddress)}
                    className="btn btn-secondary text-xs"
                  >
                    Copy Address
                  </button>
                  <a 
                    href={`https://etherscan.io/address/${deployedTokenAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary text-xs"
                  >
                    View on Etherscan
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center mt-2xl">
        <button onClick={onPrevious} className="btn btn-secondary">
          ← Back to Advanced Config
        </button>
        
        {deployedTokenAddress && (
          <button 
            onClick={() => window.location.reload()}
            className="btn btn-primary btn-lg"
          >
            Deploy Another Token
          </button>
        )}
      </div>
    </div>
  );
} 