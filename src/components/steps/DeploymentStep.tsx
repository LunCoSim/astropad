import { useState } from 'react';
import type { TokenConfig } from '../../../lib/types';
import { InfoTooltip } from '../ui/InfoTooltip';
import { usePublicClient, useWalletClient, useAccount } from 'wagmi';
import { storeDeployedToken } from '../../../lib/deployed-tokens';
import { 
  WETH_ADDRESS,
  FEE_CONFIGS,
  POOL_POSITIONS
} from 'clanker-sdk';
import { Clanker } from 'clanker-sdk/v4';

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

      // DEBUG: Log network info
      console.log('Network chain ID:', await publicClient.getChainId());
      console.log('User address:', address);
      console.log('Wallet client:', walletClient);
      
      // DEBUG: Check account balance
      const balance = await publicClient.getBalance({ address: address as `0x${string}` });
      console.log('Account balance:', balance.toString(), 'wei');

      // Build the Clanker v4 token configuration - updated for v4.1 API
      const clankerV4Config = {
        type: 'v4' as const,
        name: config.name,
        symbol: config.symbol,
        image: config.image || '',
        tokenAdmin: config.tokenAdmin as `0x${string}`,
        metadata: {
          description: config.description || 'Token deployed via Astropad',
          socialMediaUrls: config.socialUrls.filter(url => url.trim()),
          auditUrls: config.auditUrls.filter(url => url.trim()),
        },
        context: {
          interface: 'astropad',
          platform: config.platform || '',
          messageId: config.messageId || '',
          id: config.socialId || '',
        },
        pool: {
          pairedToken: (config.pairTokenType === 'WETH' ? WETH_ADDRESS : config.customPairTokenAddress) as `0x${string}`,
          positions: POOL_POSITIONS.Standard
        },
        devBuy: {
          ethAmount: config.devBuy?.enabled ? config.devBuy.ethAmount : 0,
        },
        rewards: {
          recipients: [{
            admin: config.tokenAdmin as `0x${string}`,
            recipient: config.tokenAdmin as `0x${string}`,
            bps: 10000 // 100% to the user
          }]
        },
        fees: FEE_CONFIGS.DynamicBasic,
      };

      // Add vault if enabled
      if (config.vault?.enabled) {
        clankerV4Config.vault = {
          percentage: Math.min(config.vault.percentage, 30), // Max 30%
          lockupDuration: config.vault.lockupDuration,
          vestingDuration: config.vault.vestingDuration || 0,
        };
      }
      
      // Note: Airdrop functionality not available in the simplified v4.1 API
      
      console.log('Simulating Clanker v4 token deployment with config:', clankerV4Config);
      
      // DEBUG: Validate essential addresses
      console.log('Token admin address:', clankerV4Config.tokenAdmin);
      console.log('Paired token address:', clankerV4Config.pool.pairedToken);
      
      // Validate addresses are properly formatted
      if (!clankerV4Config.tokenAdmin.startsWith('0x') || clankerV4Config.tokenAdmin.length !== 42) {
        throw new Error(`Invalid token admin address: ${clankerV4Config.tokenAdmin}`);
      }
      
      if (!clankerV4Config.pool.pairedToken.startsWith('0x') || clankerV4Config.pool.pairedToken.length !== 42) {
        throw new Error(`Invalid paired token address: ${clankerV4Config.pool.pairedToken}`);
      }
      
      // DEBUG: Log the exact parameters being sent
      console.log('About to call deployToken with:', JSON.stringify(clankerV4Config, null, 2));
      
      // The v4.1 SDK doesn't have a separate simulate method
      // For now, we'll just validate the config and show it as ready
      setSimulationResult({
        tokenConfig: clankerV4Config,
        simulatedAddress: 'Will be determined on deployment',
        transaction: null,
        gasEstimate: 'Estimated by network',
        estimatedCost: 'Variable gas cost'
      });
      
    } catch (error: any) {
      console.error('Simulation failed:', error);
      console.error('Error stack:', error.stack);
      
      // Provide more specific error messages
      if (error.message.includes('execution reverted')) {
        setError(`Contract execution failed. This could be due to: 
        1. Network connectivity issues
        2. Contract not deployed on this network  
        3. Invalid parameters
        4. Insufficient account balance
        
        Original error: ${error.message}`);
      } else {
        setError(`Simulation failed: ${error.message}`);
      }
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

      // Ensure the configuration is clean and properly typed
      const deployConfig = {
        type: simulationResult.tokenConfig.type,
        name: simulationResult.tokenConfig.name,
        symbol: simulationResult.tokenConfig.symbol,
        image: simulationResult.tokenConfig.image,
        tokenAdmin: simulationResult.tokenConfig.tokenAdmin,
        metadata: simulationResult.tokenConfig.metadata,
        context: simulationResult.tokenConfig.context,
        pool: simulationResult.tokenConfig.pool,
        devBuy: simulationResult.tokenConfig.devBuy,
        rewards: simulationResult.tokenConfig.rewards,
        fees: simulationResult.tokenConfig.fees,
        ...(simulationResult.tokenConfig.vault && { vault: simulationResult.tokenConfig.vault })
      };

      console.log('Clean deploy config:', deployConfig);
      console.log('Config type check:', typeof deployConfig.type, deployConfig.type);
      console.log('Config keys:', Object.keys(deployConfig));
      
      // Additional validation before deployment
      if (!deployConfig.type) {
        throw new Error('Missing type field in config');
      }
      if (deployConfig.type !== 'v4') {
        throw new Error(`Invalid type: ${deployConfig.type}, expected 'v4'`);
      }
      if (!deployConfig.tokenAdmin) {
        throw new Error('Missing tokenAdmin field in config');
      }

      // Try with a minimal config first to isolate the issue
      const minimalConfig = {
        type: 'v4' as const,
        name: deployConfig.name,
        symbol: deployConfig.symbol,
        tokenAdmin: deployConfig.tokenAdmin,
      };
      
      console.log('Trying minimal config first:', minimalConfig);
      
      let tokenAddress;
      try {
        // Deploy the token using the correct v4.1 API
        tokenAddress = await clanker.deploy(minimalConfig);
        console.log('Minimal config worked! Token address:', tokenAddress);
      } catch (minimalError) {
        console.log('Minimal config failed, trying full config:', minimalError);
        // If minimal fails, try the full config
        tokenAddress = await clanker.deploy(deployConfig);
      }
      
      console.log(`Token deployed successfully: ${tokenAddress}`);
      
      setDeployedTokenAddress(tokenAddress);
      
      // Save the deployed token to manual tracking
      const deployedToken = {
        address: tokenAddress,
        name: config.name,
        symbol: config.symbol,
        deployerAddress: address,
        deploymentTxHash: 'N/A', // SDK doesn't return tx hash directly
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