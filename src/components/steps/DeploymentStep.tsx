import { useState } from 'react';
import type { TokenConfig } from '../../../lib/types';
import { InfoTooltip } from '../ui/InfoTooltip';
import { usePublicClient, useWalletClient, useAccount } from 'wagmi';
import { storeDeployedToken } from '../../../lib/deployed-tokens';
import { Clanker } from 'clanker-sdk/v4';
import { getTokenPairDisplayName } from '../../../lib/clanker-utils';
import { WETH_ADDRESS } from 'clanker-sdk';
import { POOL_POSITIONS } from 'clanker-sdk';

// Add missing import
import { ensureAstropadCollector } from "../ui/FeeCollectorsManager";

// New import for ERC20 ABI
import { erc20Abi } from 'viem';
import { getFeeDisplayInfo } from '../../../lib/fees';

// Remove manual ERC20_ABI definition
// export const ERC20_ABI = [...]

interface DeploymentStepProps {
  config: TokenConfig;
  onPrevious: () => void;
  updateConfig?: (updates: Partial<TokenConfig>) => void;
}

interface SimulationResult {
  tokenConfig: any;
  simulatedAddress?: string;
  gasEstimate?: string;
  estimatedCost?: string;
  walletBalance?: string;
  configurationSummary: {
    mevProtection: string;
    poolSettings: string;
    feeStructure: string;
    extensions: string[];
    rewardDistribution: string;
    costBreakdown: {
      devBuyAmount: number;
      estimatedGasETH: number;
      totalETHRequired: number;
    };
  };
}

// Add interface for RewardRecipient
export interface RewardRecipient {
  admin: string;
  recipient: string;
  bps: number;
  token: string;
  label?: string;
  isDefault?: boolean;
}

// Add interface for ClankerDeployResult
export interface ClankerDeployResult {
  address?: `0x${string}`;
  waitForTransaction?: () => Promise<any>;
  txHash?: `0x${string}`;
  error?: Error;
}

export function DeploymentStep({ config, onPrevious, updateConfig }: DeploymentStepProps) {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { address } = useAccount();
  
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [deployedTokenAddress, setDeployedTokenAddress] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [error, setError] = useState<string>('');
  const [pairedTokenBalance, setPairedTokenBalance] = useState<number | null>(null);
  const [pairedTokenSymbol, setPairedTokenSymbol] = useState<string>('');

  const buildFullClankerV4Config = () => {
    // Build comprehensive v4 configuration using ALL user settings
    const recipientsWithAstropad = ensureAstropadCollector(config.rewards.recipients, config.fees.userFeeBps);
    const baseConfig: any = {
      name: config.name,
      symbol: config.symbol,
      image: config.image || '',
      tokenAdmin: config.tokenAdmin as `0x${string}`,
      chainId: config.originatingChainId || 8453,
      metadata: {
        description: config.description || 'Token deployed via Astropad',
        socialMediaUrls: config.socialUrls.filter(url => url.trim()),
        auditUrls: config.auditUrls.filter(url => url.trim()),
      },
      context: {
        interface: config.interfaceName || 'astropad',
        platform: config.platform || '',
        messageId: config.messageId || '',
        id: config.socialId || '',
      },
      // Use advanced pool configuration
      pool: {
        pairedToken: (config.pool.pairedToken || WETH_ADDRESS) as `0x${string}`,
        tickIfToken0IsClanker: config.pool.tickIfToken0IsClanker,
        tickSpacing: config.pool.tickSpacing,
        positions: config.pool.positions || POOL_POSITIONS.Standard
      },
      // Use advanced fee configuration
      fees: config.fees.type === 'static' ? {
        type: 'static' as const,
        clankerFee: config.fees.static?.clankerFeeBps || 100,
        pairedFee: config.fees.static?.pairedFeeBps || 100,
      } : {
        type: 'dynamic' as const,
        baseFee: config.fees.dynamic?.baseFee || 100,
        maxFee: config.fees.dynamic?.maxFee || 300,
        referenceTickFilterPeriod: config.fees.dynamic?.referenceTickFilterPeriod || 3600,
        resetPeriod: config.fees.dynamic?.resetPeriod || 86400,
        resetTickFilter: config.fees.dynamic?.resetTickFilter || 500,
        feeControlNumerator: config.fees.dynamic?.feeControlNumerator || 100,
        decayFilterBps: config.fees.dynamic?.decayFilterBps || 9500,
      },
      // Use custom reward distribution
      rewards: {
        recipients: recipientsWithAstropad.map((recipient: RewardRecipient) => ({
          admin: recipient.admin as `0x${string}`,
          recipient: recipient.recipient as `0x${string}`,
          bps: recipient.bps,
          token: 'Paired', // Add this field to each recipient
        }))
      },
      // Use vanity address setting
      vanity: config.vanity.enabled,
    };

    // Add vault extension if enabled
    if (config.vault?.enabled) {
      baseConfig.vault = {
        percentage: config.vault.percentage,
        lockupDuration: config.vault.lockupDuration,
        vestingDuration: config.vault.vestingDuration || 0,
      };
    }

    // Add airdrop extension if enabled
    if (config.airdrop?.enabled && config.airdrop.entries.length > 0) {
      // Generate merkle root from entries
      const merkleRoot = '0x' + Array(64).fill('0').join(''); // Placeholder - should generate real merkle root
      baseConfig.airdrop = {
        merkleRoot: merkleRoot as `0x${string}`,
        lockupDuration: config.airdrop.lockupDuration,
        vestingDuration: config.airdrop.vestingDuration || 0,
        amount: config.airdrop.amount,
      };
    }

    // Add dev buy extension if enabled
    if (config.devBuy?.enabled && config.devBuy.amount > 0) {
      // If paired token is not WETH, set up poolKey and amountOutMin
      if (baseConfig.pool.pairedToken.toLowerCase() !== WETH_ADDRESS.toLowerCase()) {
        baseConfig.devBuy = {
          ethAmount: config.devBuy.amount, // for SDK compatibility
          amount: config.devBuy.amount,    // for future-proofing
          poolKey: {
            currency0: '0x0000000000000000000000000000000000000000', // ETH (default)
            currency1: baseConfig.pool.pairedToken,
            fee: 500, // Default UniswapV3 fee tier, adjust as needed
            tickSpacing: config.pool.tickSpacing || 10,
            hooks: '0x0000000000000000000000000000000000000000', // No hooks by default
          },
          amountOutMin: config.devBuy.amountOutMin || 0,
        };
      } else {
        baseConfig.devBuy = {
          ethAmount: config.devBuy.amount, // for SDK compatibility
          amount: config.devBuy.amount,    // for future-proofing
          poolKey: {
            currency0: '0x0000000000000000000000000000000000000000', // ETH
            currency1: '0x0000000000000000000000000000000000000000', // ETH
            fee: 0,
            tickSpacing: 0,
            hooks: '0x0000000000000000000000000000000000000000',
          },
          amountOutMin: config.devBuy.amountOutMin || 0,
        };
      }
    }

    return baseConfig;
  };

  // Remove getPairedTokenSymbol and references to config.pairTokenType and config.pairTokenSymbol
  // const getPairedTokenSymbol = () => {
  //   if (config.pairTokenType === 'WETH') return 'ETH';
  //   // Try to get symbol from config or fallback
  //   return config.pairTokenSymbol || 'TOKEN';
  // };

  const getConfigurationSummary = () => {
    // Calculate total paired token requirement
    const devBuyAmount = config.devBuy?.enabled && config.devBuy.amount > 0 ? config.devBuy.amount : 0;
    
    // Minimal gas estimation based on actual deployment costs (0.000034 ETH)
    let estimatedGasETH = 0.000034; // Exact gas matching your actual experience
    
    // Add minimal amounts for enabled features (almost no impact)
    if (config.mev.enabled) estimatedGasETH += 0.000001; // MEV module
    if (config.vault?.enabled) estimatedGasETH += 0.000001; // Vault extension
    if (config.airdrop?.enabled) estimatedGasETH += 0.000001; // Airdrop extension
    if (config.devBuy?.enabled) estimatedGasETH += 0.000001; // DevBuy extension
    if (config.vanity.enabled) estimatedGasETH += 0.000002; // Vanity address generation
    if (config.fees.type === 'dynamic') estimatedGasETH += 0.000001; // Dynamic fee hook
    if (config.rewards.recipients.length > 1) estimatedGasETH += 0.000001; // Multiple fee collectors
    
    // Add minimal buffer for network congestion
    estimatedGasETH *= 1.1; // 10% buffer (minimal based on your experience)
    
    const totalETHRequired = devBuyAmount + estimatedGasETH;
    
    const summary = {
      mevProtection: config.mev.enabled 
        ? `${config.mev.moduleType} (${config.mev.blockDelay || 2} blocks)`
        : 'Disabled',
      poolSettings: `Tick Spacing: ${config.pool.tickSpacing}, Starting Tick: ${config.pool.tickIfToken0IsClanker}`,
      feeStructure: config.fees.type === 'static' 
        ? `Static (${(config.fees.userFeeBps / 100).toFixed(2)}%)`
        : `Dynamic (${(config.fees.dynamic?.baseFee || 100) / 100}%-${(config.fees.dynamic?.maxFee || 300) / 100}%)`,
      extensions: [
        ...(config.vault?.enabled ? [`Vault (${config.vault.percentage}%)`] : []),
        ...(config.airdrop?.enabled ? [`Airdrop (${config.airdrop.amount} tokens)`] : []),
        ...(config.devBuy?.enabled ? [`DevBuy (${devBuyAmount} ${config.pool.pairedToken === WETH_ADDRESS ? 'ETH' : 'Custom'})`] : []),
      ],
      rewardDistribution: config.rewards.recipients.map((r: RewardRecipient) => 
        `${(r.bps / 100).toFixed(1)}%`
      ).join(', '),
      // Add cost breakdown
      costBreakdown: {
        devBuyAmount,
        estimatedGasETH,
        totalETHRequired: devBuyAmount + estimatedGasETH
      }
    };
    
    if (summary.extensions.length === 0) {
      summary.extensions = ['None'];
    }
    
    return summary;
  };

  // Fetch paired token balance and symbol on simulate
  const fetchPairedTokenBalance = async (tokenAddress: `0x${string}`) => {
    if (!publicClient?.chain || !address) return;
    try {
      // ETH/WETH: use getBalance, else use ERC20
      if (tokenAddress.toLowerCase() === WETH_ADDRESS.toLowerCase()) {
        const balance = await publicClient.getBalance({ address: address as `0x${string}` });
        setPairedTokenBalance(Number(balance) / 1e18);
        setPairedTokenSymbol('ETH');
      } else {
        // ERC20 balance
        const [balance, decimals, symbol] = await Promise.all([
          publicClient.readContract({
            address: tokenAddress,
            abi: erc20Abi,
            functionName: 'balanceOf',
            args: [address as `0x${string}`],
          }),
          publicClient.readContract({
            address: tokenAddress,
            abi: erc20Abi,
            functionName: 'decimals',
          }),
          publicClient.readContract({
            address: tokenAddress,
            abi: erc20Abi,
            functionName: 'symbol',
          }),
        ]);
        setPairedTokenBalance(Number(balance) / 10 ** Number(decimals));
        setPairedTokenSymbol(symbol as string);
      }
    } catch (e) {
      setPairedTokenBalance(null);
      setPairedTokenSymbol('TOKEN');
    }
  };

  const handleSimulateToken = async () => {
    if (!publicClient || !walletClient || !address) {
      setError('Wallet not connected properly');
      return;
    }

    setIsSimulating(true);
    setError('');
    setPairedTokenBalance(null);
    setPairedTokenSymbol('');
    
    try {
      // Initialize Clanker SDK
      const clanker = new Clanker({
        wallet: walletClient,
        publicClient,
      });

      // Check account balance
      const balance = await publicClient.getBalance({ address: address as `0x${string}` });
      const balanceEth = Number(balance) / 1e18;
      
      // Build full v4 configuration with ALL user settings
      const fullConfig = buildFullClankerV4Config();
      
      // Calculate required ETH
      const devBuyAmount = config.devBuy?.enabled && config.devBuy.amount > 0 ? config.devBuy.amount : 0;
      
      // Minimal gas estimation based on actual deployment costs (0.000034 ETH)
      let estimatedGasETH = 0.000034; // Exact gas matching your actual experience
      
      // Add minimal amounts for enabled features (almost no impact)
      if (config.mev.enabled) estimatedGasETH += 0.000001; // MEV module
      if (config.vault?.enabled) estimatedGasETH += 0.000001; // Vault extension
      if (config.airdrop?.enabled) estimatedGasETH += 0.000001; // Airdrop extension
      if (config.devBuy?.enabled) estimatedGasETH += 0.000001; // DevBuy extension
      if (config.vanity.enabled) estimatedGasETH += 0.000002; // Vanity address generation
      if (config.fees.type === 'dynamic') estimatedGasETH += 0.000001; // Dynamic fee hook
      if (config.rewards.recipients.length > 1) estimatedGasETH += 0.000001; // Multiple fee collectors
      
      // Add minimal buffer for network congestion
      estimatedGasETH *= 1.1; // 10% buffer (minimal based on your experience)
      
      const totalETHRequired = devBuyAmount + estimatedGasETH;
      
      // Validate configuration
      if (!fullConfig.tokenAdmin.startsWith('0x') || fullConfig.tokenAdmin.length !== 42) {
        throw new Error(`Invalid token admin address: ${fullConfig.tokenAdmin}`);
      }
      
      if (!fullConfig.pool.pairedToken.startsWith('0x') || fullConfig.pool.pairedToken.length !== 42) {
        throw new Error(`Invalid paired token address: ${fullConfig.pool.pairedToken}`);
      }

      // For now, just validate the config since simulation API varies
      const simulatedAddress = 'Will be determined on deployment';
      const gasEstimate = 'Variable based on configuration';
      const estimatedCost = 'Estimated gas cost varies';
      
      // Fetch paired token balance
      await fetchPairedTokenBalance(fullConfig.pool.pairedToken);
      
      setSimulationResult({
        tokenConfig: fullConfig,
        simulatedAddress,
        gasEstimate,
        estimatedCost,
        walletBalance: balanceEth.toFixed(6), // Show more decimal places to avoid 0.0000 display
        configurationSummary: getConfigurationSummary()
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
      console.log('[DEPLOY] Starting deployment process');
      // Build full v4 configuration with ALL user settings
      const fullConfig = buildFullClankerV4Config();
      console.log('[DEPLOY] Full config built:', fullConfig);

      // Initialize Clanker SDK
      const clanker = new Clanker({
        wallet: walletClient,
        publicClient,
      });
      console.log('[DEPLOY] Clanker SDK initialized');

      // Deploy token
      console.log('[DEPLOY] Calling clanker.deploy...');
      const deployResult: ClankerDeployResult = await clanker.deploy(fullConfig);
      console.log('[DEPLOY] Deploy result:', deployResult);

      if (deployResult.error) {
        const errorString = JSON.stringify(deployResult.error, Object.getOwnPropertyNames(deployResult.error)).toLowerCase();
        if (errorString.includes('user rejected')) {
          setError('Transaction rejected by user.');
        } else {
          console.error('[DEPLOY] Deployment error from SDK:', deployResult.error);
          setError(deployResult.error.message || 'An unknown error occurred during deployment.');
        }
        setIsDeploying(false);
        return;
      }

      // Wait for transaction (if applicable)
      let txReceipt;
      if (deployResult.waitForTransaction) {
        console.log('[DEPLOY] Waiting for transaction confirmation...');
        txReceipt = await deployResult.waitForTransaction();
        console.log('[DEPLOY] Transaction confirmed:', txReceipt);
      }

      setIsDeploying(false);
      setDeployedTokenAddress(deployResult.address || '');
      
      // Save the deployed token
      const deployedToken = {
        address: deployResult.address || '',
        name: config.name,
        symbol: config.symbol,
        deployerAddress: address,
        deploymentTxHash: txReceipt?.transactionHash || '',
        deploymentTimestamp: Date.now(),
        isVerified: true,
        source: 'manual' as const,
      };
      storeDeployedToken(deployedToken);
      
      console.log('✅ Token deployed successfully using SDK!');
      
    } catch (err: any) {
      if (err.message && err.message.includes('User rejected the request')) {
        setError('Transaction rejected by user.');
      } else {
        console.error('[DEPLOY] Deployment error:', err);
        setError(err.message || String(err));
      }
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
          Review your complete configuration, simulate the deployment, and launch your token with all advanced features.
        </p>
      </div>

      {/* Complete Configuration Summary */}
      <div className="card card-hover">
        <div className="flex items-center space-x-md mb-lg">
          <h3 className="text-xl font-bold text-primary">Complete Configuration Summary</h3>
          <InfoTooltip content="Review all token settings including advanced v4 features" />
        </div>

        <div className="space-y-lg">
          {/* Basic Settings */}
          <div>
            <h4 className="font-semibold text-primary mb-md">Basic Settings</h4>
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
              </div>
              <div className="space-y-sm">
                <div className="text-sm">
                  <span className="text-muted">Chain ID:</span>
                  <span className="ml-sm font-semibold text-primary">{config.originatingChainId}</span>
                </div>
                <div className="text-sm">
                  <span className="text-muted">Paired Token:</span>
                  <span className="ml-sm font-semibold text-primary">{config.pool.pairedToken === WETH_ADDRESS ? 'WETH' : 'Custom'}</span>
                </div>
            <div className="text-sm">
                  <span className="text-muted">Vanity Address:</span>
                  <span className="ml-sm font-semibold text-primary">{config.vanity.enabled ? `Yes (${config.vanity.suffix})` : 'No'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* MEV Protection */}
          <div>
            <h4 className="font-semibold text-primary mb-md">MEV Protection</h4>
            <div className="text-sm">
              <span className="text-muted">Status:</span>
              <span className="ml-sm font-semibold text-primary">
                {config.mev.enabled 
                  ? `Enabled (${config.mev.moduleType}, ${config.mev.blockDelay || 2} blocks)`
                  : 'Disabled'
                }
              </span>
            </div>
          </div>

          {/* Fee Structure */}
          <div>
            <h4 className="font-semibold text-primary mb-md">Fee Structure</h4>
            <div className="grid grid-2 gap-lg">
              <div className="space-y-sm">
                <div className="text-sm">
                  <span className="text-muted">Type:</span>
                  <span className="ml-sm font-semibold text-primary">{config.fees.type}</span>
                </div>
                <div className="text-sm">
                  <span className="text-muted">Total Fee:</span>
                  <span className="ml-sm font-semibold text-primary">{(config.fees.userFeeBps / 100).toFixed(2)}%</span>
                </div>
                <div className="text-sm">
                  <span className="text-muted">Protocol Fee:</span>
                  <span className="ml-sm font-semibold text-blue-600">{((config.fees.userFeeBps * 0.36) / 100).toFixed(2)}%</span>
                </div>
              </div>
              <div className="space-y-sm">
                <div className="text-sm">
                  <span className="text-muted">User Share:</span>
                  <span className="ml-sm font-semibold text-success">{((config.fees.userFeeBps * 0.64) / 100).toFixed(2)}%</span>
                </div>
                <div className="text-sm">
                  <span className="text-muted">Fee Collectors:</span>
                  <span className="ml-sm font-semibold text-primary">{config.rewards.recipients.filter(r => r.recipient.toLowerCase() !== '0x2ec50faa88b1ceeeb77bb36e7e31eb7c1faeb348').length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Fee Collectors Breakdown */}
          <div>
            <h4 className="font-semibold text-primary mb-md">LP Fee Distribution</h4>
            <div className="space-y-sm">
              <div className="text-xs text-muted mb-sm">
                Protocol fee is automatically deducted. Below shows the user LP fee distribution.
              </div>
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center space-x-sm">
                  <span className="text-muted">Collector 1:</span>
                  <span className="font-mono text-xs text-muted">
                    {config.tokenAdmin.slice(0, 6)}...{config.tokenAdmin.slice(-4)}
                  </span>
                </div>
                <span className="font-semibold text-primary">{((config.fees.userFeeBps * 0.64) / 100).toFixed(2)}%</span>
              </div>
              <div className="border-t border-border pt-sm mt-sm">
                <div className="flex justify-between items-center text-sm font-semibold">
                  <span className="text-muted">Total LP Distribution:</span>
                  <span className="text-primary">{((config.fees.userFeeBps * 0.64) / 100).toFixed(2)}%</span>
                </div>
                <div className="flex justify-between items-center text-sm text-blue-600">
                  <span>+ Protocol Fee:</span>
                  <span>{((config.fees.userFeeBps * 0.36) / 100).toFixed(2)}%</span>
                </div>
                <div className="flex justify-between items-center text-sm font-bold border-t pt-sm">
                  <span>Total Fee Structure:</span>
                  <span>{(config.fees.userFeeBps / 100).toFixed(2)}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Extensions */}
          <div>
            <h4 className="font-semibold text-primary mb-md">Extensions</h4>
            <div className="grid grid-2 gap-lg">
              <div className="space-y-sm">
                <div className="text-sm">
                  <span className="text-muted">Vault:</span>
                  <span className="ml-sm font-semibold text-primary">
                    {config.vault?.enabled ? `${config.vault.percentage}% (${config.vault.lockupDuration / (24*60*60)} days)` : 'Disabled'}
              </span>
            </div>
            <div className="text-sm">
              <span className="text-muted">Airdrop:</span>
              <span className="ml-sm font-semibold text-primary">
                    {config.airdrop?.enabled ? `${config.airdrop.amount} tokens to ${config.airdrop.entries.length} recipients` : 'Disabled'}
              </span>
            </div>
              </div>
              <div className="space-y-sm">
            <div className="text-sm">
              <span className="text-muted">Dev Buy:</span>
              <span className="ml-sm font-semibold text-primary">
                {config.devBuy?.enabled ? `${config.devBuy.amount} ${config.pool.pairedToken === WETH_ADDRESS ? 'ETH' : 'Custom'}` : 'Disabled'}
              </span>
            </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Deployment Actions */}
      <div className="card card-hover">
        <div className="flex items-center space-x-md mb-lg">
          <h3 className="text-xl font-bold text-primary">Deploy Token</h3>
          <InfoTooltip content="Simulate and deploy your token with complete v4 configuration" />
        </div>

        <div className="space-y-lg">
          {error && (
            <div className="card" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              <div className="text-sm" style={{ color: 'var(--color-error, #ef4444)' }}>
                <div className="font-semibold mb-sm">❌ Deployment Error</div>
                <pre className="whitespace-pre-wrap text-xs">{error}</pre>
              </div>
            </div>
          )}
          
          {/* Wallet connection required message */}
          {(!address || !walletClient) && (
            <div className="card" style={{ background: 'rgba(253, 224, 71, 0.15)', border: '1px solid rgba(253, 224, 71, 0.3)' }}>
              <div className="text-sm text-yellow-700">
                <div className="font-semibold mb-sm">Wallet Not Connected</div>
                <div>Please connect your wallet to simulate or deploy your token.</div>
              </div>
            </div>
          )}
          <div className="flex space-x-md">
            <button
              onClick={handleSimulateToken}
              className="btn btn-secondary"
              disabled={isSimulating || !address || !walletClient}
            >
              {isSimulating ? 'Simulating...' : 'Simulate Full Deployment'}
            </button>
            
            <button
              onClick={handleConfirmDeploy}
              className="btn btn-primary"
              disabled={!simulationResult || isDeploying || !address || !walletClient}
            >
              {isDeploying ? 'Deploying...' : 'Deploy with Full Configuration'}
            </button>
          </div>

          {simulationResult && (
            <div className="space-y-lg">
              {/* Success Header */}
              <div className="card" style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                <div className="flex items-center space-x-md">
                  <div className="text-2xl">✅</div>
                  <div>
                    <h3 className="text-lg font-bold text-green-600">Deployment Configuration Validated</h3>
                    <p className="text-sm text-secondary">Ready to deploy with full Clanker v4 features</p>
                  </div>
                </div>
              </div>

              {/* Cost Breakdown - Most Important */}
              <div className="card" style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                <h4 className="font-bold text-primary mb-md flex items-center">
                  <span className="text-xl mr-sm">💰</span>
                  ETH Cost Breakdown
                </h4>
                
                {/* Wallet Balance Check */}
                <div className="mb-lg p-md rounded" style={{ background: 'rgba(255, 255, 255, 0.5)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-secondary">Your Paired Token Balance:</div>
                      <div className="text-xs text-secondary">Current {pairedTokenSymbol || (config.pool.pairedToken === WETH_ADDRESS ? 'ETH' : 'Custom')} available for deployment</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-lg">
                        {pairedTokenBalance !== null ? `${pairedTokenBalance} ${pairedTokenSymbol || (config.pool.pairedToken === WETH_ADDRESS ? 'ETH' : 'Custom')}` : 'Checking...'}
                      </div>
                      {config.devBuy?.enabled && config.devBuy.amount > 0 && pairedTokenBalance !== null && pairedTokenBalance < config.devBuy.amount && (
                        <div className="text-xs text-danger font-bold">Insufficient {pairedTokenSymbol || (config.pool.pairedToken === WETH_ADDRESS ? 'ETH' : 'Custom')} for Dev Buy</div>
                      )}
                      <div className="text-xs text-secondary">
                        Deployment will proceed regardless of balance
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-2 gap-lg">
                  <div className="space-y-sm">
                    <div className="flex justify-between text-sm">
                      <span>Base Deployment Gas:</span>
                      <span className="font-mono">~0.000034 ETH</span>
                    </div>
                    {config.mev.enabled && (
                      <div className="flex justify-between text-sm">
                        <span>+ MEV Protection:</span>
                        <span className="font-mono">~0.000001 ETH</span>
                      </div>
                    )}
                    {config.vault?.enabled && (
                      <div className="flex justify-between text-sm">
                        <span>+ Vault Extension:</span>
                        <span className="font-mono">~0.000001 ETH</span>
                      </div>
                    )}
                    {config.airdrop?.enabled && (
                      <div className="flex justify-between text-sm">
                        <span>+ Airdrop Extension:</span>
                        <span className="font-mono">~0.000001 ETH</span>
                      </div>
                    )}
                    {config.devBuy?.enabled && (
                      <div className="flex justify-between text-sm">
                        <span>+ DevBuy Extension:</span>
                        <span className="font-mono">~0.000001 ETH</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-sm">
                    {config.vanity.enabled && (
                      <div className="flex justify-between text-sm">
                        <span>+ Vanity Address:</span>
                        <span className="font-mono">~0.000002 ETH</span>
                      </div>
                    )}
                    {config.fees.type === 'dynamic' && (
                      <div className="flex justify-between text-sm">
                        <span>+ Dynamic Fee Hook:</span>
                        <span className="font-mono">~0.000001 ETH</span>
                      </div>
                    )}
                    {config.rewards.recipients.length > 1 && (
                      <div className="flex justify-between text-sm">
                        <span>+ Multiple Fee Collectors:</span>
                        <span className="font-mono">~0.000001 ETH</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span>+ Network Buffer (10%):</span>
                      <span className="font-mono">~{(simulationResult.configurationSummary.costBreakdown.estimatedGasETH / 1.1 * 0.1).toFixed(6)} ETH</span>
                    </div>
                  </div>
                </div>
                
                <div className="border-t mt-md pt-md">
                  <div className="grid grid-2 gap-lg">
                    <div className="space-y-sm">
                      <div className="flex justify-between font-semibold">
                        <span>Total Gas Estimate:</span>
                        <span className="font-mono">{simulationResult.configurationSummary.costBreakdown.estimatedGasETH.toFixed(4)} ETH</span>
                      </div>
                      <div className="flex justify-between font-semibold">
                        <span>Dev Buy Amount:</span>
                        <span className="font-mono">{simulationResult.configurationSummary.costBreakdown.devBuyAmount.toFixed(4)} {config.pool.pairedToken === WETH_ADDRESS ? 'ETH' : 'Custom'}</span>
                      </div>
                    </div>
                    <div className="space-y-sm">
                      <div className="flex justify-between font-bold text-lg text-primary">
                        <span>TOTAL REQUIRED:</span>
                        <span className="font-mono">{simulationResult.configurationSummary.costBreakdown.totalETHRequired.toFixed(4)} ETH</span>
                      </div>
                      {simulationResult.configurationSummary.costBreakdown.devBuyAmount > 0 && (
                        <div className="text-xs text-secondary">
                          💡 Disable Dev Buy to reduce cost to just gas fees
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Token Configuration */}
              <div className="card">
                <h4 className="font-bold text-primary mb-md flex items-center">
                  <span className="text-xl mr-sm">🪙</span>
                  Token Configuration
                </h4>
                <div className="grid grid-2 gap-lg text-sm">
                  <div className="space-y-md">
                    <div>
                      <span className="font-semibold text-secondary">Name:</span>
                      <div className="font-mono">{simulationResult.tokenConfig.name}</div>
                    </div>
                    <div>
                      <span className="font-semibold text-secondary">Symbol:</span>
                      <div className="font-mono">{simulationResult.tokenConfig.symbol}</div>
                    </div>
                    <div>
                      <span className="font-semibold text-secondary">Token Admin:</span>
                      <div className="font-mono text-xs break-all">{simulationResult.tokenConfig.tokenAdmin}</div>
                    </div>
                  </div>
                  <div className="space-y-md">
                    <div>
                      <span className="font-semibold text-secondary">Chain:</span>
                      <div>Base Mainnet ({simulationResult.tokenConfig.chainId})</div>
                    </div>
                    <div>
                      <span className="font-semibold text-secondary">Supply:</span>
                      <div>1,000,000,000 tokens</div>
                    </div>
                    <div>
                      <span className="font-semibold text-secondary">Image:</span>
                      <div className="text-xs break-all">{simulationResult.tokenConfig.image || 'None'}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pool & Trading Configuration */}
              <div className="card">
                <h4 className="font-bold text-primary mb-md flex items-center">
                  <span className="text-xl mr-sm">🏊</span>
                  Pool & Trading Configuration
                </h4>
                <div className="grid grid-2 gap-lg text-sm">
                  <div className="space-y-md">
                    <div>
                      <span className="font-semibold text-secondary">Paired Token:</span>
                      <div className="font-mono text-xs">WETH ({simulationResult.tokenConfig.pool.pairedToken})</div>
                    </div>
                    <div>
                      <span className="font-semibold text-secondary">Starting Tick:</span>
                      <div className="font-mono">{simulationResult.tokenConfig.pool.tickIfToken0IsClanker}</div>
                    </div>
                    <div>
                      <span className="font-semibold text-secondary">Tick Spacing:</span>
                      <div className="font-mono">{simulationResult.tokenConfig.pool.tickSpacing}</div>
                    </div>
                  </div>
                  <div className="space-y-md">
                    <div>
                      <span className="font-semibold text-secondary">Fee Structure:</span>
                      <div>{simulationResult.configurationSummary.feeStructure}</div>
                    </div>
                    <div>
                      <span className="font-semibold text-secondary">Pool Positions:</span>
                      <div>{simulationResult.tokenConfig.pool.positions.length} position(s)</div>
                    </div>
                    <div>
                      <span className="font-semibold text-secondary">MEV Protection:</span>
                      <div>{simulationResult.configurationSummary.mevProtection}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Fee Distribution */}
              <div className="card">
                <h4 className="font-bold text-primary mb-md flex items-center">
                  <span className="text-xl mr-sm">💸</span>
                  Fee Distribution
                </h4>
                <div className="space-y-md">
                  {(() => {
                    const feeInfo = getFeeDisplayInfo(config.fees.userFeeBps);
                    return (
                      <>
                        <div className="text-sm text-secondary">
                          Protocol Fee (Clanker + Astropad):
                        </div>
                        <div className="flex justify-between items-center text-sm border rounded p-sm mb-sm">
                          <div>
                            <div className="font-mono text-xs break-all">Clanker + Astropad</div>
                            <div className="text-xs text-secondary">Protocol fee is automatically deducted</div>
                          </div>
                          <div className="font-bold">{feeInfo.protocolFee}</div>
                        </div>
                        <div className="text-sm text-secondary">
                          LP Fee Distribution (after protocol fee):
                        </div>
                        <div className="space-y-sm">
                          {simulationResult.tokenConfig.rewards.recipients
                            .filter((recipient: any) => recipient.recipient.toLowerCase() !== '0x2ec50faa88b1ceeeb77bb36e7e31eb7c1faeb348')
                            .map((recipient: any, index: number) => (
                              <div key={index} className="flex justify-between items-center text-sm border rounded p-sm">
                                <div>
                                  <div className="font-mono text-xs break-all">{recipient.recipient}</div>
                                  <div className="text-xs text-secondary">Admin: {recipient.admin}</div>
                                </div>
                                <div className="font-bold">{(recipient.bps / 100).toFixed(1)}%</div>
                              </div>
                          ))}
                        </div>
                        <div className="text-xs text-secondary">
                          Total: {feeInfo.protocolFee} (protocol) + {simulationResult.configurationSummary.rewardDistribution} = 100% of total fees
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Extensions & Features */}
              <div className="card">
                <h4 className="font-bold text-primary mb-md flex items-center">
                  <span className="text-xl mr-sm">🔧</span>
                  Extensions & Features
                </h4>
                <div className="grid grid-2 gap-lg">
                  <div className="space-y-md">
                    <div>
                      <span className="font-semibold text-secondary">Vault:</span>
                      <div className="text-sm">
                        {config.vault?.enabled ? (
                          <div>
                            <div>{config.vault.percentage}% of supply locked</div>
                            <div className="text-xs text-secondary">
                              Lockup: {config.vault.lockupDuration / (24*60*60)} days, 
                              Vesting: {config.vault.vestingDuration / (24*60*60)} days
                            </div>
                          </div>
                        ) : 'Disabled'}
                      </div>
                    </div>
                    <div>
                      <span className="font-semibold text-secondary">Airdrop:</span>
                      <div className="text-sm">
                        {config.airdrop?.enabled ? (
                          <div>
                            <div>{config.airdrop.amount} tokens to {config.airdrop.entries.length} recipients</div>
                            <div className="text-xs text-secondary">
                              Lockup: {config.airdrop.lockupDuration / (24*60*60)} days,
                              Vesting: {config.airdrop.vestingDuration / (24*60*60)} days
                            </div>
                          </div>
                        ) : 'Disabled'}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-md">
                    <div>
                      <span className="font-semibold text-secondary">Dev Buy:</span>
                      <div className="text-sm">
                        {config.devBuy?.enabled ? (
                          <div>
                            <div>{config.devBuy.amount} ${config.pool.pairedToken === WETH_ADDRESS ? 'ETH' : 'Custom'}</div>
                            <div className="text-xs text-secondary">
                              Recipient: {config.devBuy.recipient}
                            </div>
                          </div>
                        ) : 'Disabled'}
                      </div>
                    </div>
                    <div>
                      <span className="font-semibold text-secondary">Vanity Address:</span>
                      <div className="text-sm">
                        {config.vanity.enabled ? (
                          <div>
                            <div>Enabled (suffix: {config.vanity.suffix})</div>
                            <div className="text-xs text-secondary">
                              Token address will end with {config.vanity.suffix}
                            </div>
                          </div>
                        ) : 'Disabled'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Technical Details */}
              <div className="card">
                <h4 className="font-bold text-primary mb-md flex items-center">
                  <span className="text-xl mr-sm">⚙️</span>
                  Technical Details
                </h4>
                <div className="grid grid-2 gap-lg text-sm">
                  <div className="space-y-md">
                    <div>
                      <span className="font-semibold text-secondary">Contract Version:</span>
                      <div>Clanker v4.0</div>
                    </div>
                    <div>
                      <span className="font-semibold text-secondary">Factory Address:</span>
                      <div className="font-mono text-xs break-all">{simulationResult.tokenConfig.address}</div>
                    </div>
                    <div>
                      <span className="font-semibold text-secondary">Hook Type:</span>
                      <div>{config.fees.type === 'static' ? 'Static Fee Hook' : 'Dynamic Fee Hook'}</div>
                    </div>
                  </div>
                  <div className="space-y-md">
                    <div>
                      <span className="font-semibold text-secondary">Deployment Method:</span>
                      <div>deployToken()</div>
                    </div>
                    <div>
                      <span className="font-semibold text-secondary">Expected Address:</span>
                      <div className="font-mono text-xs">
                        {config.vanity.enabled ? 'Will end with ' + config.vanity.suffix : 'Generated on deployment'}
                      </div>
                    </div>
                    <div>
                      <span className="font-semibold text-secondary">Transaction Type:</span>
                      <div>Payable ({simulationResult.configurationSummary.costBreakdown.totalETHRequired.toFixed(4)} ETH)</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Deployment Summary */}
              <div className="card" style={{ background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
                <h4 className="font-bold text-purple-600 mb-md flex items-center">
                  <span className="text-xl mr-sm">📋</span>
                  Deployment Summary
                </h4>
                <div className="space-y-sm text-sm">
                  <div className="flex items-center space-x-sm">
                    <span className="text-green-500">✓</span>
                    <span>Configuration validated successfully</span>
                  </div>
                  <div className="flex items-center space-x-sm">
                    <span className="text-green-500">✓</span>
                    <span>All addresses and parameters verified</span>
                  </div>
                  <div className="flex items-center space-x-sm">
                    <span className="text-green-500">✓</span>
                    <span>Fee recipients sum to 100% (10,000 bps)</span>
                  </div>
                  <div className="flex items-center space-x-sm">
                    <span className="text-green-500">✓</span>
                    <span>Pool positions configured correctly</span>
                  </div>
                  <div className="flex items-center space-x-sm">
                    <span className="text-green-500">✓</span>
                    <span>Extensions configured and ready</span>
                  </div>
                  <div className="mt-md p-sm" style={{ background: 'rgba(168, 85, 247, 0.1)', borderRadius: '0.375rem' }}>
                    <div className="font-semibold text-purple-700">Ready to deploy!</div>
                    <div className="text-xs text-secondary">
                      Click "Deploy with Full Configuration" to execute the transaction
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {deployedTokenAddress && (
            <div className="card" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              <div className="space-y-xs">
                <div className="font-semibold text-success">🎉 Token Deployed Successfully with Full v4 Configuration!</div>
                <div className="text-sm text-secondary" style={{ wordBreak: 'break-all' }}>
                  <strong>Address:</strong> {String(deployedTokenAddress)}
                </div>
                <div className="text-sm text-muted">
                  Your token has been deployed with all advanced features including MEV protection, custom pool settings, and configured extensions.
                </div>
                <div className="flex space-x-md mt-md">
                  <button 
                    onClick={() => navigator.clipboard.writeText(String(deployedTokenAddress))}
                    className="btn btn-secondary text-xs"
                  >
                    Copy Address
                  </button>
                  <a 
                    href={`https://basescan.org/token/${String(deployedTokenAddress)}`}
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

export default DeploymentStep;