import { useState } from 'react';
import type { TokenConfig } from '../../../lib/types';
import { InfoTooltip } from '../ui/InfoTooltip';
import { usePublicClient, useWalletClient, useAccount } from 'wagmi';
import { storeDeployedToken } from '../../../lib/deployed-tokens';
import { Clanker } from 'clanker-sdk/v4';
import { 
  WETH_ADDRESS, 
  FEE_CONFIGS, 
  POOL_POSITIONS,
  CLANKER_LOCKER_V4,
  CLANKER_VAULT_V4,
  CLANKER_AIRDROP_V4,
  CLANKER_DEVBUY_V4
} from 'clanker-sdk';
import type { ClankerTokenV4 } from 'clanker-sdk';

interface DeploymentStepProps {
  config: TokenConfig;
  onPrevious: () => void;
}

export function DeploymentStep({ config, onPrevious }: DeploymentStepProps) {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { address } = useAccount();
  
  const [simulationResult, setSimulationResult] = useState<any>(null);
  const [deployedTokenAddress, setDeployedTokenAddress] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [error, setError] = useState<string>('');

  const handleSimulateToken = async () => {
    if (!publicClient || !walletClient || !address) {
      setError('Wallet not connected properly');
      return;
    }

    setIsSimulating(true);
    setError('');
    
    try {
      // Initialize Clanker SDK
      const clanker = new Clanker({
        wallet: walletClient,
        publicClient,
      });

      // Build the Clanker v4 token configuration
      const clankerV4Config: ClankerTokenV4 = {
        type: 'v4',
        name: config.name,
        symbol: config.symbol,
        image: config.image || '',
        chainId: 8453, // Base chain
        tokenAdmin: config.tokenAdmin as `0x${string}`,
        
        // Metadata
        metadata: {
          description: config.description || 'Token deployed via Astropad',
          socialMediaUrls: config.socialUrls.filter(url => url.trim()),
          auditUrls: config.auditUrls.filter(url => url.trim()),
        },
        
        // Social context
        context: {
          interface: 'astropad',
          platform: config.platform || '',
          messageId: config.messageId || '',
          id: config.socialId || '',
        },
        
        // Pool configuration
        pool: {
          pairedToken: (config.pairTokenType === 'WETH' ? WETH_ADDRESS : config.customPairTokenAddress) as `0x${string}`,
          positions: POOL_POSITIONS.Standard
        },
        
        // Token locker (required for v4)
        locker: {
          locker: CLANKER_LOCKER_V4,
          lockerData: '0x'
        },
        
        // Fee configuration
        fees: config.fees.type === 'static' ? {
          type: 'static',
          clankerFee: config.fees.userFeeBps,
          pairedFee: config.fees.userFeeBps
        } : FEE_CONFIGS.DynamicBasic,
        
        // Rewards
        rewards: {
          recipients: config.rewards.recipients.map(r => ({
            admin: r.admin as `0x${string}`,
            recipient: r.recipient as `0x${string}`,
            bps: r.bps
          }))
        },
        
        // Vanity address
        vanity: config.vanity.enabled
      };

      // Add extensions if enabled
      if (config.vault?.enabled) {
        clankerV4Config.vault = {
          percentage: config.vault.percentage,
          lockupDuration: config.vault.lockupDuration,
          vestingDuration: config.vault.vestingDuration
        };
      }
      
      if (config.airdrop?.enabled && config.airdrop.merkleRoot !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
        clankerV4Config.airdrop = {
          merkleRoot: config.airdrop.merkleRoot as `0x${string}`,
          amount: config.airdrop.amount,
          lockupDuration: config.airdrop.lockupDuration,
          vestingDuration: config.airdrop.vestingDuration
        };
      }
      
      if (config.devBuy?.enabled && config.devBuy.ethAmount > 0) {
        clankerV4Config.devBuy = {
          ethAmount: config.devBuy.ethAmount
        };
      }

      console.log('Simulating Clanker v4 token deployment with config:', clankerV4Config);
      
      // Simulate the deployment
      const simulation = await clanker.deploySimulate(clankerV4Config);
      
      if (simulation.error) {
        throw new Error(simulation.error.message || 'Simulation failed');
      }
      
      if (!simulation.result) {
        throw new Error('No simulation result returned');
      }

      setSimulationResult({
        tokenConfig: clankerV4Config,
        simulatedAddress: simulation.result,
        gasEstimate: 'Estimated by network',
        estimatedCost: 'Variable gas cost'
      });
      
    } catch (error: any) {
      console.error('Simulation failed:', error);
      setError(`Simulation failed: ${error.message}`);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleConfirmDeploy = async () => {
    if (!simulationResult || !walletClient || !address) {
      setError('Please simulate deployment first and ensure wallet is connected');
      return;
    }

    setIsDeploying(true);
    setError('');
    
    try {
      // Initialize Clanker SDK
      const clanker = new Clanker({
        wallet: walletClient,
        publicClient,
      });

      console.log('Deploying token with v4 config:', simulationResult.tokenConfig);

      // Deploy the token
      const deployment = await clanker.deploy(simulationResult.tokenConfig);
      
      if (deployment.error) {
        throw new Error(deployment.error.message || 'Deployment failed');
      }
      
      if (!deployment.txHash) {
        throw new Error('No transaction hash returned');
      }

      console.log(`Token deployment transaction: ${deployment.txHash}`);
      
      // Wait for the transaction to be mined
      const result = await deployment.waitForTransaction();
      const tokenAddress = result.address;
      
      if (!tokenAddress) {
        throw new Error('Token address not found in deployment result');
      }
      
      console.log(`Token deployed successfully: ${tokenAddress}`);
      
      setDeployedTokenAddress(tokenAddress);
      
      // Save the deployed token to manual tracking
      const deployedToken = {
        address: tokenAddress,
        name: config.name,
        symbol: config.symbol,
        deployerAddress: address,
        deploymentTxHash: deployment.txHash,
        deploymentTimestamp: Date.now(),
        isVerified: true,
        source: 'manual' as const,
      };
      storeDeployedToken(deployedToken);
      
    } catch (error: any) {
      console.error('Deployment failed:', error);
      setError(`Deployment failed: ${error.message}`);
    } finally {
      setIsDeploying(false);
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
              <span className="text-muted">Token Admin:</span>
              <span className="ml-sm font-semibold text-primary font-mono text-xs">{config.tokenAdmin}</span>
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
                {config.vault?.enabled ? `${config.vault.percentage}%` : 'Disabled'}
              </span>
            </div>
            <div className="text-sm">
              <span className="text-muted">Airdrop:</span>
              <span className="ml-sm font-semibold text-primary">
                {config.airdrop?.enabled ? `${config.airdrop.amount} tokens` : 'Disabled'}
              </span>
            </div>
            <div className="text-sm">
              <span className="text-muted">Dev Buy:</span>
              <span className="ml-sm font-semibold text-primary">
                {config.devBuy?.enabled ? `${config.devBuy.ethAmount} ETH` : 'Disabled'}
              </span>
            </div>
            <div className="text-sm">
              <span className="text-muted">Fee Type:</span>
              <span className="ml-sm font-semibold text-primary">{config.fees.type}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Deployment Actions */}
      <div className="card card-hover">
        <div className="flex items-center space-x-md mb-lg">
          <h3 className="text-xl font-bold text-primary">Deploy Token</h3>
          <InfoTooltip content="Simulate and deploy your token to the blockchain" />
        </div>

        <div className="space-y-lg">
          {error && (
            <div className="card" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              <div className="text-sm" style={{ color: 'var(--color-error, #ef4444)' }}>
                ❌ {error}
              </div>
            </div>
          )}
          
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
                <div className="font-semibold text-primary">✅ Simulation Successful!</div>
                <div className="text-sm text-secondary">
                  Estimated Token Address: {simulationResult.simulatedAddress || 'N/A'}
                </div>
                <div className="text-sm text-secondary">
                  Gas Cost: {simulationResult.estimatedCost || 'Variable'}
                </div>
                <div className="text-sm text-muted">
                  Ready to deploy! Click "Confirm Deploy" to proceed.
                </div>
              </div>
            </div>
          )}
          
          {deployedTokenAddress && (
            <div className="card" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              <div className="space-y-xs">
                <div className="font-semibold text-success">🎉 Token Deployed Successfully!</div>
                <div className="text-sm text-secondary" style={{ wordBreak: 'break-all' }}>
                  <strong>Address:</strong> {deployedTokenAddress}
                </div>
                <div className="flex space-x-md mt-md">
                  <button 
                    onClick={() => navigator.clipboard.writeText(deployedTokenAddress)}
                    className="btn btn-secondary text-xs"
                  >
                    Copy Address
                  </button>
                  <a 
                    href={`https://basescan.org/token/${deployedTokenAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary text-xs"
                  >
                    View on BaseScan
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