import { useState, useMemo, useEffect } from 'react';
import { useAccount, useDisconnect, usePublicClient, useWalletClient } from 'wagmi';
import { useWeb3Modal } from '@web3modal/wagmi/react';
import { TokenConfigV4Builder, WETH_ADDRESS, Clanker, POOL_POSITIONS, FEE_CONFIGS, type FeeConfigs } from 'clanker-sdk';
import { formatUnits } from 'viem';
import './App.css';

// Generic ERC20 ABI for fetching decimals and symbol
const ERC20_ABI = [
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
];

async function getTokenDecimals(publicClient: ReturnType<typeof usePublicClient> | undefined, tokenAddress: `0x${string}`) {
  if (!publicClient) return 18; // Default if publicClient is not available
  try {
    const decimals = await publicClient.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'decimals',
    });
    return decimals;
  } catch (error: any) {
    console.warn(`Could not fetch decimals for ${tokenAddress}, assuming 18. Error:`, error);
    return 18; // Default to 18 if decimals cannot be fetched
  }
}

async function getTokenSymbol(publicClient: ReturnType<typeof usePublicClient> | undefined, tokenAddress: `0x${string}`) {
  if (!publicClient) return 'UNKNOWN'; // Default if publicClient is not available
  try {
    const symbol = await publicClient.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'symbol',
    });
    return symbol;
  } catch (error: any) {
    console.warn(`Could not fetch symbol for ${tokenAddress}, assuming 'UNKNOWN'. Error:`, error);
    return 'UNKNOWN';
  }
}

// AMM calculation function using constant product formula (x * y = k)
function calculateDevBuyTokens(
  devBuyEthAmount: number,
  marketCapEth: number,
  totalTokenSupply: number = 100_000_000_000 // 100 billion default supply
): { tokensReceived: number; priceImpact: number; newPrice: number; effectivePrice: number } {
  if (devBuyEthAmount <= 0 || marketCapEth <= 0) {
    return { tokensReceived: 0, priceImpact: 0, newPrice: 0, effectivePrice: 0 };
  }

  // In Clanker v4, the dev buy is a normal swap that happens AFTER liquidity is created
  // Initial liquidity pool setup (assuming no vault/airdrop extensions for simplicity)
  // Market cap = pool_eth_reserve * total_token_supply / pool_token_reserve
  // For simplicity, assume the full token supply goes to the pool initially
  const initialTokenReserve = totalTokenSupply;
  const initialEthReserve = marketCapEth;
  
  // Constant product: k = x * y
  const k = initialEthReserve * initialTokenReserve;
  
  // Dev buy swaps ETH for tokens: (eth_reserve + eth_in) * (token_reserve - token_out) = k
  // Solving for token_out: token_out = token_reserve - k / (eth_reserve + eth_in)
  const newEthReserve = initialEthReserve + devBuyEthAmount;
  const newTokenReserve = k / newEthReserve;
  const tokensReceived = initialTokenReserve - newTokenReserve;
  
  // Calculate prices and impact
  const initialPrice = initialEthReserve / initialTokenReserve; // ETH per token
  const newPrice = newEthReserve / newTokenReserve; // ETH per token after swap
  const priceImpact = ((newPrice - initialPrice) / initialPrice) * 100;
  
  // Effective price paid by dev buyer
  const effectivePrice = devBuyEthAmount / tokensReceived; // ETH per token
  
  return {
    tokensReceived,
    priceImpact,
    newPrice,
    effectivePrice
  };
}

function App() {
  // ========== CORE TOKEN SETTINGS ==========
  const [tokenName, setTokenName] = useState('My Project Coin');
  const [tokenSymbol, setTokenSymbol] = useState('MPC');
  const [tokenAdmin, setTokenAdmin] = useState(''); // Will be set to connected address
  const [tokenImage, setTokenImage] = useState('');
  
  // ========== TOKEN METADATA ==========
  const [tokenDescription, setTokenDescription] = useState('');
  const [socialMediaUrls, setSocialMediaUrls] = useState<string[]>(['']);
  const [auditUrls, setAuditUrls] = useState<string[]>(['']);
  
  // ========== SOCIAL CONTEXT ==========
  const [interfaceName, setInterfaceName] = useState('Astropad');
  const [platform, setPlatform] = useState('');
  const [messageId, setMessageId] = useState('');
  const [socialId, setSocialId] = useState('');
  
  // ========== VAULT CONFIGURATION ==========
  const [vaultEnabled, setVaultEnabled] = useState(false);
  const [vaultPercentage, setVaultPercentage] = useState(10); // 0-90%
  const [vaultLockupDuration, setVaultLockupDuration] = useState(7 * 24 * 60 * 60); // 7 days in seconds
  const [vestingDuration, setVestingDuration] = useState(30 * 24 * 60 * 60); // 30 days in seconds
  
  // ========== AIRDROP CONFIGURATION ==========
  const [airdropEnabled, setAirdropEnabled] = useState(false);
  const [airdropPercentage, setAirdropPercentage] = useState(5); // % of total supply
  const [airdropEntries, setAirdropEntries] = useState<{address: string, amount: number}[]>([
    {address: '', amount: 1}
  ]);
  const [airdropLockupDuration, setAirdropLockupDuration] = useState(24 * 60 * 60); // 1 day
  const [airdropVestingDuration, setAirdropVestingDuration] = useState(30 * 24 * 60 * 60); // 30 days
  
  // ========== REWARD RECIPIENTS (Multiple) ==========
  const [rewardRecipients, setRewardRecipients] = useState<{
    recipient: string;
    admin: string;
    bps: number;
  }[]>([
    { recipient: '', admin: '', bps: 10000 } // Default: 100% to token admin
  ]);
  
  // ========== POOL CONFIGURATION ==========
  const [pairTokenType, setPairTokenType] = useState<'WETH' | 'custom'>('WETH');
  const [customPairTokenAddress, setCustomPairTokenAddress] = useState('');
  const [pairTokenValid, setPairTokenValid] = useState(false);
  const [pairTokenValidating, setPairTokenValidating] = useState(false);
  const [pairTokenInfo, setPairTokenInfo] = useState<{symbol: string, decimals: number} | null>(null);
  const [startingMarketCap, setStartingMarketCap] = useState<number | ''>(''); // in ETH
  const [poolPositionType, setPoolPositionType] = useState<'Standard' | 'Project' | 'Custom'>('Standard');
  
  // Custom LP positions (for advanced users)
  const [customPositions, setCustomPositions] = useState<{
    tickLower: number;
    tickUpper: number;
    positionBps: number;
  }[]>([
    { tickLower: -230400, tickUpper: -120000, positionBps: 10000 }
  ]);
  
  // ========== FEE CONFIGURATION ==========
  const [feeType, setFeeType] = useState<'static' | 'dynamic'>('static');
  
  // Static fees
  const [clankerFeeBps, setClankerFeeBps] = useState(100); // 1% default
  const [pairedFeeBps, setPairedFeeBps] = useState(100); // 1% default
  
  // Dynamic fees
  const [baseFee, setBaseFee] = useState(5000); // 0.5%
  const [maxLpFee, setMaxLpFee] = useState(50000); // 5%
  const [referenceTickFilterPeriod, setReferenceTickFilterPeriod] = useState(30); // 30 seconds
  const [resetPeriod, setResetPeriod] = useState(120); // 2 minutes
  const [resetTickFilter, setResetTickFilter] = useState(200); // 2% price movement
  const [feeControlNumerator, setFeeControlNumerator] = useState(500000000);
  const [decayFilterBps, setDecayFilterBps] = useState(7500); // 75%
  
  // ========== DEV BUY CONFIGURATION ==========
  const [devBuyEnabled, setDevBuyEnabled] = useState(true);
  const [devBuyEthAmount, setDevBuyEthAmount] = useState(0.0001);
  const [devBuyRecipient, setDevBuyRecipient] = useState(''); // Will default to token admin
  const [devBuyAmountOutMin, setDevBuyAmountOutMin] = useState(0); // Slippage protection
  
  // ========== ADVANCED OPTIONS ==========
  const [vanityEnabled, setVanityEnabled] = useState(false);
  const [vanityPrefix, setVanityPrefix] = useState('');
  const [vanitySuffix, setVanitySuffix] = useState('');
  
  // ========== UI STATE ==========
  const [currentStep, setCurrentStep] = useState(0);
  const [deployedTokenAddress, setDeployedTokenAddress] = useState('');

  // Step configuration
  const STEPS = [
    { id: 'basics', title: 'Token Details', icon: '🎯', description: 'Name, symbol, and branding' },
    { id: 'liquidity', title: 'Liquidity Setup', icon: '💧', description: 'Market cap and trading pair' },
    { id: 'features', title: 'Token Features', icon: '⚡', description: 'Vault, airdrops, and dev buy' },
    { id: 'advanced', title: 'Advanced Config', icon: '⚙️', description: 'Fees and rewards' },
    { id: 'deploy', title: 'Deploy', icon: '🚀', description: 'Review and launch' }
  ];
  const [customClankerTokenAddress, setCustomClankerTokenAddress] = useState('0x699E27a42095D3cb9A6a23097E5C201E33E314B4');
  const [customFeeOwnerAddress, setCustomFeeOwnerAddress] = useState('0xCd2a99C6d6b27976537fC3737b0ef243E7C49946');

  const [simulationResult, setSimulationResult] = useState<any>(null);
  const [simulationLoading, setSimulationLoading] = useState(false);
  const [simulationError, setSimulationError] = useState('');
  
  const [deployLoading, setDeployLoading] = useState(false);
  const [deployResult, setDeployResult] = useState('');
  const [deployError, setDeployError] = useState('');

  const [feesLoading, setFeesLoading] = useState(false);
  const [feesResult, setFeesResult] = useState('');
  const [feesError, setFeesError] = useState('');

  const { address, isConnected, chain } = useAccount();
  const { open } = useWeb3Modal();
  const { disconnect } = useDisconnect();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const clanker = useMemo(() => {
    if (publicClient && walletClient) {
      return new Clanker({
        publicClient: publicClient as any,
        wallet: walletClient as any,
      });
    }
    return null;
  }, [publicClient, walletClient]);

  // Validate ERC-20 token
  const validatePairToken = async (tokenAddress: string) => {
    if (!publicClient || !tokenAddress || tokenAddress.length !== 42) {
      setPairTokenValid(false);
      setPairTokenInfo(null);
      return;
    }

    setPairTokenValidating(true);
    try {
      const [symbol, decimals] = await Promise.all([
        getTokenSymbol(publicClient, tokenAddress as `0x${string}`),
        getTokenDecimals(publicClient, tokenAddress as `0x${string}`)
      ]);

      if (symbol !== 'UNKNOWN') {
        setPairTokenValid(true);
        setPairTokenInfo({ symbol: symbol as string, decimals: decimals as number });
      } else {
        setPairTokenValid(false);
        setPairTokenInfo(null);
      }
    } catch (error) {
      console.error('Token validation failed:', error);
      setPairTokenValid(false);
      setPairTokenInfo(null);
    } finally {
      setPairTokenValidating(false);
    }
  };

  // Effect to validate custom pair token when address changes
  useEffect(() => {
    if (pairTokenType === 'custom' && customPairTokenAddress) {
      const timeoutId = setTimeout(() => {
        validatePairToken(customPairTokenAddress);
      }, 500); // Debounce validation
      return () => clearTimeout(timeoutId);
    } else {
      setPairTokenValid(false);
      setPairTokenInfo(null);
    }
  }, [customPairTokenAddress, pairTokenType, publicClient]);

  // Set token admin to connected address
  useEffect(() => {
    if (address && !tokenAdmin) {
      setTokenAdmin(address);
    }
    
    // Set dev buy recipient to token admin if not set
    if (address && !devBuyRecipient) {
      setDevBuyRecipient(address);
    }
    
    // Update reward recipients if they're empty
    if (address && rewardRecipients[0].recipient === '') {
      setRewardRecipients([{ recipient: address, admin: address, bps: 10000 }]);
    }
  }, [address, tokenAdmin, devBuyRecipient, rewardRecipients]);

  // Clear starting market cap when switching away from WETH
  useEffect(() => {
    if (pairTokenType !== 'WETH' && startingMarketCap) {
      setStartingMarketCap('');
    }
  }, [pairTokenType]);

  // Utility functions for managing arrays
  // Step validation and navigation
  const isStepValid = (stepIndex: number): boolean => {
    switch (stepIndex) {
      case 0: // basics
        return !!(tokenName && tokenSymbol && tokenAdmin);
      case 1: // liquidity
        return !!(startingMarketCap && startingMarketCap > 0);
      case 2: // features
      case 3: // advanced
        return true; // Optional steps
      case 4: // deploy
        return isConnected;
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (currentStep < STEPS.length - 1 && isStepValid(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return renderBasicsStep();
      case 1:
        return renderLiquidityStep();
      case 2:
        return renderFeaturesStep();
      case 3:
        return renderAdvancedStep();
      case 4:
        return renderDeployStep();
      default:
        return null;
    }
  };

  const addSocialMediaUrl = () => {
    setSocialMediaUrls([...socialMediaUrls, '']);
  };

  const removeSocialMediaUrl = (index: number) => {
    setSocialMediaUrls(socialMediaUrls.filter((_, i) => i !== index));
  };

  const updateSocialMediaUrl = (index: number, value: string) => {
    const updated = [...socialMediaUrls];
    updated[index] = value;
    setSocialMediaUrls(updated);
  };

  const addAuditUrl = () => {
    setAuditUrls([...auditUrls, '']);
  };

  const removeAuditUrl = (index: number) => {
    setAuditUrls(auditUrls.filter((_, i) => i !== index));
  };

  const updateAuditUrl = (index: number, value: string) => {
    const updated = [...auditUrls];
    updated[index] = value;
    setAuditUrls(updated);
  };

  const addAirdropEntry = () => {
    setAirdropEntries([...airdropEntries, { address: '', amount: 1 }]);
  };

  const removeAirdropEntry = (index: number) => {
    setAirdropEntries(airdropEntries.filter((_, i) => i !== index));
  };

  const updateAirdropEntry = (index: number, field: 'address' | 'amount', value: string | number) => {
    const updated = [...airdropEntries];
    updated[index] = { ...updated[index], [field]: value };
    setAirdropEntries(updated);
  };

  const addRewardRecipient = () => {
    setRewardRecipients([...rewardRecipients, { recipient: '', admin: '', bps: 1000 }]);
  };

  const removeRewardRecipient = (index: number) => {
    setRewardRecipients(rewardRecipients.filter((_, i) => i !== index));
  };

  const updateRewardRecipient = (index: number, field: 'recipient' | 'admin' | 'bps', value: string | number) => {
    const updated = [...rewardRecipients];
    updated[index] = { ...updated[index], [field]: value };
    setRewardRecipients(updated);
  };

  const addCustomPosition = () => {
    setCustomPositions([...customPositions, { tickLower: -230400, tickUpper: -120000, positionBps: 1000 }]);
  };

  const removeCustomPosition = (index: number) => {
    setCustomPositions(customPositions.filter((_, i) => i !== index));
  };

  const updateCustomPosition = (index: number, field: 'tickLower' | 'tickUpper' | 'positionBps', value: number) => {
    const updated = [...customPositions];
    updated[index] = { ...updated[index], [field]: value };
    setCustomPositions(updated);
  };

  const handleSimulateToken = async () => {
    setSimulationLoading(true);
    setSimulationResult(null);
    setSimulationError('');
    setDeployResult('');
    setDeployError('');
    setDeployedTokenAddress('');
    setFeesResult('');
    setFeesError('');

    if (!isConnected || !address) {
      setSimulationError('Please connect your wallet first.');
      setSimulationLoading(false);
      return;
    }

    if (!tokenName || !tokenSymbol) {
      setSimulationError('Token Name and Symbol are required.');
      setSimulationLoading(false);
      return;
    }
    if (isNaN(devBuyEthAmount) || devBuyEthAmount < 0) {
      setSimulationError('Invalid Dev Buy ETH Amount.');
      setSimulationLoading(false);
      return;
    }

    if (pairTokenType === 'custom' && (!customPairTokenAddress || !pairTokenValid)) {
      setSimulationError('Please enter a valid ERC-20 token address for the pair token.');
      setSimulationLoading(false);
      return;
    }

    if (startingMarketCap && pairTokenType === 'WETH' && (startingMarketCap < 0.1 || startingMarketCap > 1000)) {
      setSimulationError('Starting market cap must be between 0.1 and 1000 ETH.');
      setSimulationLoading(false);
      return;
    }

    if (startingMarketCap && pairTokenType !== 'WETH') {
      setSimulationError('Starting market cap is only supported with WETH pair token.');
      setSimulationLoading(false);
      return;
    }

    // Debug logging
    console.log('Debug - Clients status:', {
      publicClient: !!publicClient,
      walletClient: !!walletClient,
      clanker: !!clanker,
      chain: !!chain,
      isConnected,
      address
    });

    if (!publicClient) {
      setSimulationError('Public client not available. Please try refreshing the page.');
      setSimulationLoading(false);
      return;
    }

    if (!walletClient) {
      setSimulationError('Wallet client not available. Please disconnect and reconnect your wallet.');
      setSimulationLoading(false);
      return;
    }

    if (!clanker) {
      setSimulationError('Clanker instance not available. Please try refreshing the page.');
      setSimulationLoading(false);
      return;
    }

    if (!chain) {
      setSimulationError('Chain information not available. Please ensure you are connected to Base network.');
      setSimulationLoading(false);
      return;
    }

    if (chain.id !== 8453) {
      setSimulationError(`Wrong network detected. Please switch to Base Mainnet (Chain ID: 8453). Currently on: ${chain.name} (${chain.id})`);
      setSimulationLoading(false);
      return;
    }

    try {
      const SAFE_MULTISIG_ADDRESS = address;

      // Determine pair token address
      const pairTokenAddress = pairTokenType === 'WETH' ? WETH_ADDRESS : customPairTokenAddress as `0x${string}`;
      const pairTokenDecimals = pairTokenType === 'WETH' ? 18 : (pairTokenInfo?.decimals || 18);

      // Determine LP positions
      let positions;
      if (poolPositionType === 'Standard') {
        positions = POOL_POSITIONS.Standard;
      } else if (poolPositionType === 'Project') {
        positions = POOL_POSITIONS.Project;
      } else {
        positions = customPositions;
      }

      const poolConfig: any = {
        pairedToken: pairTokenAddress,
        pairedTokenDecimals: pairTokenDecimals,
        positions: positions,
      };

      // Only add starting market cap if it's reasonable and using WETH
      // Custom market caps with custom tokens can cause tick incompatibilities
      if (startingMarketCap && startingMarketCap > 0 && pairTokenType === 'WETH') {
        // Only allow market caps that work with standard positions (roughly $10K to $10M range)
        if (startingMarketCap >= 0.1 && startingMarketCap <= 1000) {
          poolConfig.startingMarketCapInPairedToken = startingMarketCap;
        }
      }

      let builder = new TokenConfigV4Builder()
        .withName(tokenName)
        .withSymbol(tokenSymbol)
        .withTokenAdmin((tokenAdmin || SAFE_MULTISIG_ADDRESS) as `0x${string}`);

      // Add image if provided
      if (tokenImage) {
        builder = builder.withImage(tokenImage);
      }

      // Add metadata if provided
      const hasMetadata = tokenDescription || socialMediaUrls.some(url => url) || auditUrls.some(url => url);
      if (hasMetadata) {
        builder = builder.withMetadata({
          description: tokenDescription,
          socialMediaUrls: socialMediaUrls.filter(url => url),
          auditUrls: auditUrls.filter(url => url),
        });
      }

      // Add social context
      builder = builder.withContext({
        interface: interfaceName,
        platform: platform,
        messageId: messageId,
        id: socialId,
      });

      // Add vault configuration if enabled
      if (vaultEnabled) {
        builder = builder.withVault({
          percentage: vaultPercentage,
          lockupDuration: vaultLockupDuration,
          vestingDuration: vestingDuration,
        });
      }

      // Add airdrop configuration if enabled
      if (airdropEnabled && airdropEntries.some(entry => entry.address)) {
        // For now, we'll skip airdrop as it requires merkle tree generation
        // This would need additional implementation with AirdropExtension
        console.log('Airdrop configuration detected but not implemented in this demo');
      }

      // Configure fees
      if (feeType === 'static') {
        builder = builder.withStaticFeeConfig({
          clankerFeeBps: clankerFeeBps,
          pairedFeeBps: pairedFeeBps,
        });
      } else {
        builder = builder.withDynamicFeeConfig({
          baseFee: baseFee,
          maxLpFee: maxLpFee,
          referenceTickFilterPeriod: referenceTickFilterPeriod,
          resetPeriod: resetPeriod,
          resetTickFilter: resetTickFilter,
          feeControlNumerator: feeControlNumerator,
          decayFilterBps: decayFilterBps,
        });
      }

      // Configure pool
      builder = builder.withPoolConfig(poolConfig);

      // Configure dev buy if enabled
      if (devBuyEnabled && devBuyEthAmount > 0) {
        builder = builder.withDevBuy({
          ethAmount: devBuyEthAmount,
          // Add recipient and slippage protection when supported
        });
      }

      // Configure reward recipients
      const validRecipients = rewardRecipients.filter(r => r.recipient && r.admin);
      if (validRecipients.length > 0) {
        builder = builder.withRewardsRecipients({
          recipients: validRecipients.map(r => ({
            recipient: r.recipient as `0x${string}`,
            admin: r.admin as `0x${string}`,
            bps: r.bps
          })),
        });
      } else {
        // Default fallback
        builder = builder.withRewardsRecipients({
          recipients: [
            {
              admin: SAFE_MULTISIG_ADDRESS,
              recipient: SAFE_MULTISIG_ADDRESS,
              bps: 10000,
            },
          ],
        });
      }

      // Note: Vanity address generation is not available in the current SDK version

      const tokenConfig = builder.build();

      const simulateResult = await clanker.simulateDeployToken(tokenConfig, walletClient.account);

      if ('error' in simulateResult) {
        throw new Error(String(simulateResult.error));
      }

      setSimulationResult({
        tokenConfig,
        transaction: simulateResult.transaction,
        simulatedAddress: simulateResult.simulatedAddress,
      });
    } catch (error: any) {
      console.error('Simulation failed:', error);
      setSimulationError(`Simulation failed: ${error.message || error}`);
    } finally {
      setSimulationLoading(false);
    }
  };

  const handleConfirmDeploy = async () => {
    if (!simulationResult || !walletClient) {
      setDeployError('No simulation result available.');
      return;
    }

    setDeployLoading(true);
    setDeployResult('');
    setDeployError('');

    try {
      const { transaction, simulatedAddress } = simulationResult;

      const hash = await walletClient.sendTransaction({
        to: transaction.to,
        value: transaction.value,
        data: transaction.data,
        account: walletClient.account,
      });

      setDeployedTokenAddress(simulatedAddress);
      setDeployResult(`Transaction sent! Hash: ${hash}\nToken Address: ${simulatedAddress}\nView on BaseScan: https://basescan.org/tx/${hash}`);
      
      // Clear simulation after successful deployment
      setSimulationResult(null);
    } catch (error: any) {
      console.error('Deployment failed:', error);
      setDeployError(`Deployment failed: ${error.message || error}`);
    } finally {
      setDeployLoading(false);
    }
  };

  const handleCheckFees = async () => {
    setFeesLoading(true);
    setFeesResult('');
    setFeesError('');

    if (!customFeeOwnerAddress || !customClankerTokenAddress) {
      setFeesError('Fee Owner Address and Clanker Token Address are required.');
      setFeesLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/check-fees?feeOwnerAddress=${customFeeOwnerAddress}&clankerTokenAddress=${customClankerTokenAddress}`);
      const data = await response.json();

      if (response.ok) {
        let resultText = '';
        for (const [symbol, amount] of Object.entries(data)) {
          resultText += `Available fees for ${symbol}: ${amount}\n`;
        }
        setFeesResult(resultText);
      } else {
        throw new Error(data.error || 'Failed to check fees');
      }
    } catch (error: any) {
      console.error('Error checking fees:', error);
      setFeesError(`Error checking fees: ${error.message || error}`);
    }
    finally {
      setFeesLoading(false);
    }
  };

  // Step rendering functions
  const renderBasicsStep = () => (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Token Details</h2>
        <p className="text-gray-600 max-w-lg mx-auto">
          Set up your token's basic information. This will be visible to traders and investors.
        </p>
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
          Core Information
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-label flex items-center space-x-2">
              <span>Token Name</span>
              <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={tokenName}
              onChange={(e) => setTokenName(e.target.value)}
              placeholder="My Awesome Token"
              className="input w-full"
              maxLength={50}
            />
            <div className="text-xs text-gray-500">{tokenName.length}/50 characters</div>
          </div>

          <div className="space-y-2">
            <label className="text-label flex items-center space-x-2">
              <span>Token Symbol</span>
              <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={tokenSymbol}
              onChange={(e) => setTokenSymbol(e.target.value.toUpperCase())}
              placeholder="MAT"
              className="input w-full uppercase"
              maxLength={10}
            />
            <div className="text-xs text-gray-500">{tokenSymbol.length}/10 characters</div>
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <label className="text-label flex items-center space-x-2">
            <span>Token Admin</span>
            <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={tokenAdmin}
            onChange={(e) => setTokenAdmin(e.target.value)}
            placeholder={address ? `${address} (connected wallet)` : "0x... (defaults to connected wallet)"}
            className="input w-full font-mono text-sm"
          />
          <div className="text-xs text-gray-500">
            This address will have admin privileges for the token contract
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <label className="text-label">Token Image (IPFS)</label>
          <input
            type="text"
            value={tokenImage}
            onChange={(e) => setTokenImage(e.target.value)}
            placeholder="ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"
            className="input w-full text-sm"
          />
          <div className="text-xs text-gray-500">
            Upload your image to IPFS and paste the URL here
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={nextStep}
          disabled={!isStepValid(0)}
          className={`btn btn-lg ${isStepValid(0) ? 'btn-primary' : 'btn-secondary'} px-8`}
        >
          <span>Continue to Liquidity Setup</span>
          <span className="text-xl">→</span>
        </button>
      </div>

      {!isStepValid(0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center space-x-3">
            <span className="text-amber-600 text-xl">⚠️</span>
            <div>
              <p className="text-sm font-medium text-amber-800">Required fields missing</p>
              <p className="text-sm text-amber-700">
                Please fill in the token name, symbol, and admin address to continue.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderLiquidityStep = () => (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Liquidity Setup</h2>
        <p className="text-gray-600 max-w-lg mx-auto">
          Configure your token's initial liquidity and trading pair settings.
        </p>
      </div>

      <div className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-2xl p-6 border border-blue-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <span className="w-2 h-2 bg-cyan-500 rounded-full mr-3"></span>
          Market Cap & Trading Pair
        </h3>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-label flex items-center space-x-2">
              <span>Starting Market Cap (ETH)</span>
              <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={startingMarketCap}
              onChange={(e) => setStartingMarketCap(parseFloat(e.target.value) || '')}
              placeholder="1.0"
              className="input w-full"
              min="0.01"
              step="0.01"
            />
            <div className="text-xs text-gray-500">
              Minimum 0.01 ETH. This determines your token's initial price and liquidity.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setPairTokenType('WETH')}
              className={`p-4 rounded-xl border-2 transition-all ${
                pairTokenType === 'WETH'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  ETH
                </div>
                <div className="text-left">
                  <div className="font-semibold">Ethereum (WETH)</div>
                  <div className="text-sm opacity-75">Recommended</div>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setPairTokenType('custom')}
              className={`p-4 rounded-xl border-2 transition-all ${
                pairTokenType === 'custom'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  ?
                </div>
                <div className="text-left">
                  <div className="font-semibold">Custom Token</div>
                  <div className="text-sm opacity-75">Advanced</div>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <button onClick={prevStep} className="btn btn-secondary px-8">
          <span className="text-xl">←</span>
          <span>Back to Token Details</span>
        </button>
        <button
          onClick={nextStep}
          disabled={!isStepValid(1)}
          className={`btn btn-lg ${isStepValid(1) ? 'btn-primary' : 'btn-secondary'} px-8`}
        >
          <span>Continue to Features</span>
          <span className="text-xl">→</span>
        </button>
      </div>
    </div>
  );

  const renderFeaturesStep = () => (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Token Features</h2>
        <p className="text-gray-600 max-w-lg mx-auto">
          Configure optional features like vault, airdrops, and dev buy.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={`p-6 rounded-2xl border-2 transition-all ${
          vaultEnabled ? 'border-purple-500 bg-purple-50' : 'border-gray-200 bg-white'
        }`}>
          <div className="flex items-center space-x-3 mb-4">
            <input
              type="checkbox"
              id="vaultEnabled"
              checked={vaultEnabled}
              onChange={(e) => setVaultEnabled(e.target.checked)}
              className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
            />
            <label htmlFor="vaultEnabled" className="text-lg font-semibold text-gray-900">
              🔒 Vault
            </label>
          </div>
          <p className="text-sm text-gray-600 mb-4">Lock tokens with vesting schedule for team allocation</p>
          {vaultEnabled && (
            <div className="space-y-3">
              <input
                type="number"
                value={vaultPercentage}
                onChange={(e) => setVaultPercentage(parseInt(e.target.value) || 0)}
                placeholder="10"
                className="input w-full text-sm"
                min="0"
                max="90"
              />
              <div className="text-xs text-gray-500">{vaultPercentage}% of total supply</div>
            </div>
          )}
        </div>

        <div className={`p-6 rounded-2xl border-2 transition-all ${
          airdropEnabled ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white'
        }`}>
          <div className="flex items-center space-x-3 mb-4">
            <input
              type="checkbox"
              id="airdropEnabled"
              checked={airdropEnabled}
              onChange={(e) => setAirdropEnabled(e.target.checked)}
              className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
            />
            <label htmlFor="airdropEnabled" className="text-lg font-semibold text-gray-900">
              🎁 Airdrop
            </label>
          </div>
          <p className="text-sm text-gray-600 mb-4">Distribute tokens to specific addresses via merkle tree</p>
          {airdropEnabled && (
            <div className="space-y-3">
              <input
                type="number"
                value={airdropPercentage}
                onChange={(e) => setAirdropPercentage(parseInt(e.target.value) || 0)}
                placeholder="5"
                className="input w-full text-sm"
                min="0"
                max="50"
              />
              <div className="text-xs text-gray-500">{airdropPercentage}% of total supply</div>
            </div>
          )}
        </div>

        <div className={`p-6 rounded-2xl border-2 transition-all ${
          devBuyEnabled ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'
        }`}>
          <div className="flex items-center space-x-3 mb-4">
            <input
              type="checkbox"
              id="devBuyEnabled"
              checked={devBuyEnabled}
              onChange={(e) => setDevBuyEnabled(e.target.checked)}
              className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="devBuyEnabled" className="text-lg font-semibold text-gray-900">
              💰 Dev Buy
            </label>
          </div>
          <p className="text-sm text-gray-600 mb-4">Automatically buy tokens after deployment</p>
          {devBuyEnabled && (
            <div className="space-y-3">
              <input
                type="number"
                value={devBuyEthAmount}
                onChange={(e) => setDevBuyEthAmount(parseFloat(e.target.value) || 0)}
                placeholder="0.0001"
                className="input w-full text-sm"
                min="0"
                step="0.0001"
              />
              <div className="text-xs text-gray-500">{devBuyEthAmount} ETH purchase</div>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-between">
        <button onClick={prevStep} className="btn btn-secondary px-8">
          <span className="text-xl">←</span>
          <span>Back to Liquidity</span>
        </button>
        <button onClick={nextStep} className="btn btn-primary px-8">
          <span>Continue to Advanced</span>
          <span className="text-xl">→</span>
        </button>
      </div>
    </div>
  );

  const renderAdvancedStep = () => (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Advanced Configuration</h2>
        <p className="text-gray-600 max-w-lg mx-auto">
          Fine-tune fees, rewards, and other advanced settings.
        </p>
      </div>

      <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-2xl p-6 border border-orange-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <span className="w-2 h-2 bg-orange-500 rounded-full mr-3"></span>
          Fee Configuration
        </h3>

        <div className="flex space-x-4 mb-6">
          <button
            type="button"
            onClick={() => setFeeType('static')}
            className={`flex-1 p-4 rounded-xl border-2 transition-all ${
              feeType === 'static'
                ? 'border-orange-500 bg-orange-50 text-orange-700'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
            }`}
          >
            <div className="font-semibold mb-1">Static Fees</div>
            <div className="text-sm opacity-75">Fixed fee percentages</div>
          </button>

          <button
            type="button"
            onClick={() => setFeeType('dynamic')}
            className={`flex-1 p-4 rounded-xl border-2 transition-all ${
              feeType === 'dynamic'
                ? 'border-orange-500 bg-orange-50 text-orange-700'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
            }`}
          >
            <div className="font-semibold mb-1">Dynamic Fees</div>
            <div className="text-sm opacity-75">Adjusts based on volatility</div>
          </button>
        </div>

        {feeType === 'static' && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-label">Clanker Fee (bps)</label>
              <input
                type="number"
                value={clankerFeeBps}
                onChange={(e) => setClankerFeeBps(parseInt(e.target.value) || 0)}
                className="input w-full"
                min="0"
                max="10000"
              />
              <div className="text-xs text-gray-500">{(clankerFeeBps / 100).toFixed(2)}%</div>
            </div>

            <div className="space-y-2">
              <label className="text-label">Paired Fee (bps)</label>
              <input
                type="number"
                value={pairedFeeBps}
                onChange={(e) => setPairedFeeBps(parseInt(e.target.value) || 0)}
                className="input w-full"
                min="0"
                max="10000"
              />
              <div className="text-xs text-gray-500">{(pairedFeeBps / 100).toFixed(2)}%</div>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <button onClick={prevStep} className="btn btn-secondary px-8">
          <span className="text-xl">←</span>
          <span>Back to Features</span>
        </button>
        <button onClick={nextStep} className="btn btn-primary px-8">
          <span>Continue to Deploy</span>
          <span className="text-xl">→</span>
        </button>
      </div>
    </div>
  );

  const renderDeployStep = () => (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Deploy Your Token</h2>
        <p className="text-gray-600 max-w-lg mx-auto">
          Review your configuration and deploy your token to the blockchain.
        </p>
      </div>

      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
          Configuration Summary
        </h3>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Name:</span>
            <span className="font-semibold ml-2">{tokenName || 'Not set'}</span>
          </div>
          <div>
            <span className="text-gray-600">Symbol:</span>
            <span className="font-semibold ml-2">{tokenSymbol || 'Not set'}</span>
          </div>
          <div>
            <span className="text-gray-600">Market Cap:</span>
            <span className="font-semibold ml-2">{startingMarketCap ? `${startingMarketCap} ETH` : 'Not set'}</span>
          </div>
          <div>
            <span className="text-gray-600">Pair Token:</span>
            <span className="font-semibold ml-2">{pairTokenType === 'WETH' ? 'ETH (WETH)' : 'Custom'}</span>
          </div>
        </div>

        {(vaultEnabled || airdropEnabled || devBuyEnabled) && (
          <div className="mt-4 pt-4 border-t border-green-200">
            <div className="text-sm text-gray-600 mb-2">Enabled Features:</div>
            <div className="flex flex-wrap gap-2">
              {vaultEnabled && (
                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                  🔒 Vault ({vaultPercentage}%)
                </span>
              )}
              {airdropEnabled && (
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                  🎁 Airdrop ({airdropPercentage}%)
                </span>
              )}
              {devBuyEnabled && (
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                  💰 Dev Buy ({devBuyEthAmount} ETH)
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <button
          onClick={handleSimulateToken}
          disabled={simulationLoading || !isStepValid(0) || !isStepValid(1)}
          className="btn btn-secondary w-full"
        >
          {simulationLoading ? (
            <>
              <div className="spinner w-5 h-5"></div>
              <span>Simulating...</span>
            </>
          ) : (
            <>
              <span>🔍</span>
              <span>Simulate Deployment</span>
            </>
          )}
        </button>

        <button
          onClick={handleConfirmDeploy}
          disabled={deployLoading || !isConnected || !isStepValid(0) || !isStepValid(1)}
          className="btn btn-primary w-full btn-lg"
        >
          {deployLoading ? (
            <>
              <div className="spinner w-5 h-5"></div>
              <span>Deploying...</span>
            </>
          ) : (
            <>
              <span>🚀</span>
              <span>Deploy Token</span>
            </>
          )}
        </button>
      </div>

      <div className="flex justify-start">
        <button onClick={prevStep} className="btn btn-secondary px-8">
          <span className="text-xl">←</span>
          <span>Back to Advanced</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen" style={{background: 'var(--apple-gray-light)'}}>
      {/* Apple-style Header */}
      <header className="glass-strong sticky top-0 z-50 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg">
                🚀
              </div>
              <div>
                <h1 className="text-title font-bold text-gray-900">
                  ClankerTools
                </h1>
                <p className="text-caption">Token Management Platform</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {!isConnected ? (
                <button
                  onClick={() => open()}
                  className="btn btn-primary"
                >
                  <span className="btn-icon">🔗</span>
                  <span>Connect Wallet</span>
                </button>
              ) : (
                <div className="flex items-center space-x-4">
                  <div className="glass px-4 py-3 rounded-2xl flex items-center space-x-3">
                    <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-body font-mono text-sm">
                      {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Connected'}
                    </span>
                  </div>
                  <button
                    onClick={() => disconnect()}
                    className="btn btn-secondary"
                  >
                    Disconnect
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="pt-16 pb-12 px-8">
        <div className="max-w-4xl mx-auto text-center animate-fade-in-up">
          <h2 className="text-display font-bold text-gray-900 mb-6">
            Deploy & Manage
            <span style={{background: 'linear-gradient(135deg, var(--apple-blue), var(--apple-purple))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}}> Tokens</span>
          </h2>
          <p className="text-body text-gray-600 max-w-2xl mx-auto mb-12 leading-relaxed">
            Create and manage your Clanker tokens with our intuitive, Apple-inspired interface. 
            Built for simplicity, designed for power.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-8 pb-16">
        <div className="grid lg:grid-cols-3 gap-12">
          {/* Deploy Token Card */}
          <div className="card animate-fade-in-up lg:col-span-2">
            {/* Progress Header */}
            <div className="border-b border-gray-100 pb-6 mb-8">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center text-white text-2xl shadow-lg">
                  {STEPS[currentStep].icon}
                </div>
                <div>
                  <h3 className="text-title font-bold text-gray-900">Deploy Token</h3>
                  <p className="text-caption text-gray-600">Step {currentStep + 1} of {STEPS.length}: {STEPS[currentStep].title}</p>
                </div>
              </div>

              {/* Progress Steps */}
              <div className="flex items-center space-x-2 overflow-x-auto pb-2">
                {STEPS.map((step, index) => (
                  <div key={step.id} className="flex items-center">
                    <button
                      onClick={() => setCurrentStep(index)}
                      disabled={index > currentStep + 1}
                      className={`
                        flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap
                        ${index === currentStep 
                          ? 'bg-blue-100 text-blue-700 shadow-sm' 
                          : index < currentStep
                            ? 'bg-green-50 text-green-700 hover:bg-green-100'
                            : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                        }
                      `}
                    >
                      <span className="text-base">{step.icon}</span>
                      <span>{step.title}</span>
                      {index < currentStep && (
                        <span className="text-green-500">✓</span>
                      )}
                    </button>
                    {index < STEPS.length - 1 && (
                      <div className="w-3 h-px bg-gray-200 mx-1"></div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Step Content */}
            <div className="space-y-8">
              {renderCurrentStep()}
            </div>
          </div>
          {/* Check Fees Card */}
          <div className="card animate-fade-in-up" style={{animationDelay: '0.2s'}}>
            <div className="flex items-center space-x-4 mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-3xl flex items-center justify-center text-white text-2xl shadow-lg">
                💰
              </div>
              <div>
                <h3 className="text-title font-bold text-gray-900">Check Fees</h3>
                <p className="text-caption">Monitor your token earnings</p>
              </div>
            </div>
            
            <div className="space-y-8">
              <div className="space-y-3">
                <label className="text-label">Clanker Token Address</label>
                <input
                  type="text"
                  value={customClankerTokenAddress}
                  onChange={(e) => setCustomClankerTokenAddress(e.target.value)}
                  placeholder="0x..."
                  className="input font-mono text-sm"
                />
              </div>
              
              <div className="space-y-3">
                <label className="text-label">Fee Owner Address</label>
                <input
                  type="text"
                  value={customFeeOwnerAddress}
                  onChange={(e) => setCustomFeeOwnerAddress(e.target.value)}
                  placeholder="0x..."
                  className="input font-mono text-sm"
                />
              </div>
              
              <button
                onClick={handleCheckFees}
                disabled={feesLoading || !customClankerTokenAddress || !customFeeOwnerAddress}
                className="btn btn-primary btn-lg w-full"
              >
                {feesLoading ? (
                  <>
                    <div className="spinner"></div>
                    <span>Checking Fees...</span>
                  </>
                ) : (
                  <>
                    <span className="btn-icon">🔍</span>
                    <span>Check Fees</span>
                  </>
                )}
              </button>
              
              {feesResult && (
                <div className="status-message status-success animate-scale-in">
                  <div className="flex items-start space-x-3">
                    <span className="text-xl">📊</span>
                    <div>
                      <h4 className="text-headline font-semibold mb-2">Fee Information</h4>
                      <p className="text-body font-mono text-sm whitespace-pre-wrap">{feesResult}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {feesError && (
                <div className="status-message status-error animate-scale-in">
                  <div className="flex items-start space-x-3">
                    <span className="text-xl">❌</span>
                    <div>
                      <h4 className="text-headline font-semibold mb-2">Error</h4>
                      <p className="text-body text-sm">{feesError}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-20 text-center">
          <p className="text-caption">
            Built with ❤️ for the Clanker ecosystem
          </p>
        </div>
      </main>
    </div>
  );
}

export default App;
