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
  // ========== CORE COIN SETTINGS ==========
  const [coinName, setCoinName] = useState('My Project Coin');
  const [coinSymbol, setCoinSymbol] = useState('MPC');
  const [coinAdmin, setCoinAdmin] = useState(''); // Will be set to connected address
  const [coinImage, setCoinImage] = useState('');
  
  // ========== COIN METADATA ==========
  const [coinDescription, setCoinDescription] = useState('');
  const [socialMediaUrls, setSocialMediaUrls] = useState<string[]>(['']);
  const [auditUrls, setAuditUrls] = useState<string[]>(['']);
  
  // ========== SOCIAL CONTEXT ==========
  const [interfaceName, setInterfaceName] = useState('astropad');
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
            { recipient: '', admin: '', bps: 10000 } // Default: 100% to coin admin
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
  const [devBuyRecipient, setDevBuyRecipient] = useState(''); // Will default to coin admin
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
    { id: 'basics', title: 'Coin Details', icon: '🪙', description: 'Name, symbol, and branding' },
    { id: 'liquidity', title: 'Liquidity Setup', icon: '💧', description: 'Market cap and trading pair' },
    { id: 'features', title: 'Coin Features', icon: '⚡', description: 'Vault, airdrops, and dev buy' },
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

  // Effect to validate custom pair coin when address changes
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

  // Set coin admin to connected address
  useEffect(() => {
    if (address && !coinAdmin) {
      setCoinAdmin(address);
    }
    
    // Set dev buy recipient to coin admin if not set
    if (address && !devBuyRecipient) {
      setDevBuyRecipient(address);
    }
    
    // Update reward recipients if they're empty
    if (address && rewardRecipients[0].recipient === '') {
      setRewardRecipients([{ recipient: address, admin: address, bps: 10000 }]);
    }
  }, [address, coinAdmin, devBuyRecipient, rewardRecipients]);

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
      case 0: // Basics
        return !!(coinName && coinSymbol && coinAdmin);
      case 1: // Liquidity
        return !!(startingMarketCap && startingMarketCap > 0);
      case 2: // Features
        return true; // Optional features
      case 3: // Advanced
        return true; // Has defaults
      case 4: // Deploy
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

    if (!coinName || !coinSymbol) {
      setSimulationError('Coin Name and Symbol are required.');
      setSimulationLoading(false);
      return;
    }
    if (isNaN(devBuyEthAmount) || devBuyEthAmount < 0) {
      setSimulationError('Invalid Dev Buy ETH Amount.');
      setSimulationLoading(false);
      return;
    }

    if (pairTokenType === 'custom' && (!customPairTokenAddress || !pairTokenValid)) {
              setSimulationError('Please enter a valid ERC-20 coin address for the pair coin.');
      setSimulationLoading(false);
      return;
    }

    if (startingMarketCap && pairTokenType === 'WETH' && (startingMarketCap < 0.1 || startingMarketCap > 1000)) {
      setSimulationError('Starting market cap must be between 0.1 and 1000 ETH.');
      setSimulationLoading(false);
      return;
    }

    if (startingMarketCap && pairTokenType !== 'WETH') {
              setSimulationError('Starting market cap is only supported with WETH pair coin.');
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

      // Determine pair coin address
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
      // Custom market caps with custom coins can cause tick incompatibilities
      if (startingMarketCap && startingMarketCap > 0 && pairTokenType === 'WETH') {
        // Only allow market caps that work with standard positions (roughly $10K to $10M range)
        if (startingMarketCap >= 0.1 && startingMarketCap <= 1000) {
          poolConfig.startingMarketCapInPairedToken = startingMarketCap;
        }
      }

      let builder = new TokenConfigV4Builder()
        .withName(coinName)
        .withSymbol(coinSymbol)
        .withTokenAdmin((coinAdmin || SAFE_MULTISIG_ADDRESS) as `0x${string}`);

      // Add image if provided
      if (coinImage) {
        builder = builder.withImage(coinImage);
      }

      // Add metadata if provided
      const hasMetadata = coinDescription || socialMediaUrls.some(url => url) || auditUrls.some(url => url);
      if (hasMetadata) {
        builder = builder.withMetadata({
          description: coinDescription,
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
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Coin Details</h2>
        <p className="text-gray-600 text-sm">
          Set up your coin's basic information and branding
        </p>
      </div>

      <div className="bg-gray-50 rounded-xl p-4 space-y-4">
        <h3 className="text-sm font-medium text-gray-900 flex items-center">
          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></span>
          Basic Information
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700 flex items-center">
              <span>Coin Name</span>
              <span className="text-red-500 ml-1">*</span>
            </label>
            <input
              type="text"
              value={coinName}
              onChange={(e) => setCoinName(e.target.value)}
              placeholder="My Project Coin"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700 flex items-center">
              <span>Symbol</span>
              <span className="text-red-500 ml-1">*</span>
            </label>
            <input
              type="text"
              value={coinSymbol}
              onChange={(e) => setCoinSymbol(e.target.value.toUpperCase())}
              placeholder="MPC"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-700 flex items-center">
            <span>Coin Admin</span>
            <span className="text-red-500 ml-1">*</span>
          </label>
          <input
            type="text"
            value={coinAdmin}
            onChange={(e) => setCoinAdmin(e.target.value)}
            placeholder={address ? `${address} (connected wallet)` : "0x... (defaults to connected wallet)"}
            className="w-full px-3 py-2 text-xs font-mono border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div className="text-xs text-gray-500">
            This address will have admin privileges for the coin contract
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-700">Coin Image (IPFS)</label>
          <input
            type="text"
            value={coinImage}
            onChange={(e) => setCoinImage(e.target.value)}
            placeholder="ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"
            className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div className="text-xs text-gray-500">
            Upload your image to IPFS and paste the URL here
          </div>
        </div>
      </div>

      <div className="bg-gray-50 rounded-xl p-4 space-y-4">
        <h3 className="text-sm font-medium text-gray-900 flex items-center">
          <span className="w-1.5 h-1.5 bg-purple-500 rounded-full mr-2"></span>
          Description & Social Links
        </h3>

        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-700">Project Description</label>
          <textarea
            value={coinDescription}
            onChange={(e) => setCoinDescription(e.target.value)}
            placeholder="Describe your coin project, its purpose, and key features..."
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={3}
            maxLength={300}
          />
          <div className="text-xs text-gray-500">{coinDescription.length}/300 characters</div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-700">Social Media URLs</label>
          {socialMediaUrls.map((url, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="url"
                value={url}
                onChange={(e) => updateSocialMediaUrl(index, e.target.value)}
                placeholder="https://twitter.com/yourproject"
                className="flex-1 px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {socialMediaUrls.length > 1 && (
                <button
                  onClick={() => removeSocialMediaUrl(index)}
                  className="px-2 py-1 text-red-600 hover:bg-red-50 rounded text-xs"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          <button
            onClick={addSocialMediaUrl}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            + Add URL
          </button>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-700">Audit URLs</label>
          {auditUrls.map((url, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="url"
                value={url}
                onChange={(e) => updateAuditUrl(index, e.target.value)}
                placeholder="https://audit.example.com/report"
                className="flex-1 px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {auditUrls.length > 1 && (
                <button
                  onClick={() => removeAuditUrl(index)}
                  className="px-2 py-1 text-red-600 hover:bg-red-50 rounded text-xs"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          <button
            onClick={addAuditUrl}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            + Add URL
          </button>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={nextStep}
          disabled={!isStepValid(0)}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            isStepValid(0) 
              ? 'bg-blue-600 text-white hover:bg-blue-700' 
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          Continue to Liquidity Setup →
        </button>
      </div>
    </div>
  );

  const renderLiquidityStep = () => (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Liquidity Setup</h2>
        <p className="text-gray-600 max-w-lg mx-auto">
          Configure your coin's initial liquidity and trading pair settings.
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
              Minimum 0.01 ETH. This determines your coin's initial price and liquidity.
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
                                      <div className="font-semibold">Custom Coin</div>
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
          <span>Back to Coin Details</span>
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
      {/* Modern Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-4">
          Coin <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Features</span>
        </h2>
        <p className="text-blue-200 text-lg max-w-2xl mx-auto">
          Enhance your coin with powerful features like vaults, airdrops, and automated purchases.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Vault Feature */}
        <div className={`relative bg-white/10 backdrop-blur-md border-2 rounded-2xl p-8 transition-all duration-300 transform hover:scale-105 ${
          vaultEnabled 
            ? 'border-purple-400/50 shadow-lg shadow-purple-500/20' 
            : 'border-white/20 hover:border-white/30'
        }`}>
          <div className="absolute top-4 right-4">
            <div className={`w-3 h-3 rounded-full transition-all duration-300 ${
              vaultEnabled ? 'bg-purple-400 animate-pulse' : 'bg-white/30'
            }`}></div>
          </div>
          
          <div className="flex items-center space-x-4 mb-6">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${
              vaultEnabled 
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg' 
                : 'bg-white/20'
            }`}>
              <span className="text-2xl">🔒</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Coin Vault</h3>
              <p className="text-sm text-white/60">Team allocation</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 mb-4">
            <input
              type="checkbox"
              id="vaultEnabled"
              checked={vaultEnabled}
              onChange={(e) => setVaultEnabled(e.target.checked)}
              className="w-5 h-5 text-purple-600 bg-white/10 border-white/30 rounded focus:ring-purple-500 focus:ring-2"
            />
            <label htmlFor="vaultEnabled" className="text-white font-medium cursor-pointer">
              Enable Vault System
            </label>
          </div>

          <p className="text-white/70 mb-6 leading-relaxed">
            Lock coins with customizable vesting schedule for team allocation and long-term incentives.
          </p>

          {vaultEnabled && (
            <div className="space-y-4 bg-white/5 backdrop-blur-sm rounded-xl p-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Vault Allocation (% of total supply)
                </label>
                <input
                  type="number"
                  value={vaultPercentage}
                  onChange={(e) => setVaultPercentage(parseInt(e.target.value) || 0)}
                  placeholder="10"
                  className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                  min="0"
                  max="90"
                />
                <div className="mt-2 flex justify-between text-xs text-white/60">
                  <span>{vaultPercentage}% locked in vault</span>
                  <span>{100 - vaultPercentage}% available for trading</span>
                </div>
              </div>
              
              <div className="bg-purple-500/20 border border-purple-400/30 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-2">
                  <svg className="w-4 h-4 text-purple-300" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <span className="text-xs font-semibold text-purple-300">Vault Benefits</span>
                </div>
                <ul className="text-xs text-purple-200 space-y-1">
                  <li>• Builds investor confidence</li>
                  <li>• Prevents token dumping</li>
                  <li>• Customizable vesting schedule</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Airdrop Feature */}
        <div className={`relative bg-white/10 backdrop-blur-md border-2 rounded-2xl p-8 transition-all duration-300 transform hover:scale-105 ${
          airdropEnabled 
            ? 'border-green-400/50 shadow-lg shadow-green-500/20' 
            : 'border-white/20 hover:border-white/30'
        }`}>
          <div className="absolute top-4 right-4">
            <div className={`w-3 h-3 rounded-full transition-all duration-300 ${
              airdropEnabled ? 'bg-green-400 animate-pulse' : 'bg-white/30'
            }`}></div>
          </div>
          
          <div className="flex items-center space-x-4 mb-6">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${
              airdropEnabled 
                ? 'bg-gradient-to-r from-green-500 to-emerald-500 shadow-lg' 
                : 'bg-white/20'
            }`}>
              <span className="text-2xl">🎁</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Airdrop System</h3>
              <p className="text-sm text-white/60">Token distribution</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 mb-4">
            <input
              type="checkbox"
              id="airdropEnabled"
              checked={airdropEnabled}
              onChange={(e) => setAirdropEnabled(e.target.checked)}
              className="w-5 h-5 text-green-600 bg-white/10 border-white/30 rounded focus:ring-green-500 focus:ring-2"
            />
            <label htmlFor="airdropEnabled" className="text-white font-medium cursor-pointer">
              Enable Airdrops
            </label>
          </div>

          <p className="text-white/70 mb-6 leading-relaxed">
            Distribute coins to specific addresses using secure merkle tree technology for fair token allocation.
          </p>

          {airdropEnabled && (
            <div className="space-y-4 bg-white/5 backdrop-blur-sm rounded-xl p-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Airdrop Allocation (% of total supply)
                </label>
                <input
                  type="number"
                  value={airdropPercentage}
                  onChange={(e) => setAirdropPercentage(parseInt(e.target.value) || 0)}
                  placeholder="5"
                  className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
                  min="0"
                  max="50"
                />
                <div className="mt-2 text-xs text-white/60">
                  {airdropPercentage}% reserved for community airdrops
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-white">Airdrop Recipients</label>
                  <button
                    type="button"
                    onClick={addAirdropEntry}
                    className="px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-medium rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all duration-200"
                  >
                    + Add
                  </button>
                </div>
                
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {airdropEntries.map((entry, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={entry.address}
                        onChange={(e) => updateAirdropEntry(index, 'address', e.target.value)}
                        placeholder="0x..."
                        className="flex-1 px-3 py-2 bg-white/10 border border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-1 focus:ring-green-400 text-xs font-mono"
                      />
                      <input
                        type="number"
                        value={entry.amount}
                        onChange={(e) => updateAirdropEntry(index, 'amount', parseFloat(e.target.value) || 0)}
                        placeholder="1000"
                        className="w-20 px-2 py-2 bg-white/10 border border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-1 focus:ring-green-400 text-xs"
                        min="0"
                      />
                      {airdropEntries.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeAirdropEntry(index)}
                          className="w-8 h-8 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg flex items-center justify-center"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-green-500/20 border border-green-400/30 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-2">
                  <svg className="w-4 h-4 text-green-300" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-xs font-semibold text-green-300">Airdrop Features</span>
                </div>
                <ul className="text-xs text-green-200 space-y-1">
                  <li>• Gas-efficient merkle tree distribution</li>
                  <li>• Prevents double claims</li>
                  <li>• Community engagement boost</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Dev Buy Feature */}
        <div className={`relative bg-white/10 backdrop-blur-md border-2 rounded-2xl p-8 transition-all duration-300 transform hover:scale-105 ${
          devBuyEnabled 
            ? 'border-blue-400/50 shadow-lg shadow-blue-500/20' 
            : 'border-white/20 hover:border-white/30'
        }`}>
          <div className="absolute top-4 right-4">
            <div className={`w-3 h-3 rounded-full transition-all duration-300 ${
              devBuyEnabled ? 'bg-blue-400 animate-pulse' : 'bg-white/30'
            }`}></div>
          </div>
          
          <div className="flex items-center space-x-4 mb-6">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${
              devBuyEnabled 
                ? 'bg-gradient-to-r from-blue-500 to-cyan-500 shadow-lg' 
                : 'bg-white/20'
            }`}>
              <span className="text-2xl">🛒</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Dev Buy</h3>
              <p className="text-sm text-white/60">Auto purchase</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 mb-4">
            <input
              type="checkbox"
              id="devBuyEnabled"
              checked={devBuyEnabled}
              onChange={(e) => setDevBuyEnabled(e.target.checked)}
              className="w-5 h-5 text-blue-600 bg-white/10 border-white/30 rounded focus:ring-blue-500 focus:ring-2"
            />
            <label htmlFor="devBuyEnabled" className="text-white font-medium cursor-pointer">
              Enable Dev Buy
            </label>
          </div>

          <p className="text-white/70 mb-6 leading-relaxed">
            Automatically purchase coins immediately after deployment to establish initial price action and confidence.
          </p>

          {devBuyEnabled && (
            <div className="space-y-4 bg-white/5 backdrop-blur-sm rounded-xl p-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Purchase Amount (ETH)
                </label>
                <input
                  type="number"
                  value={devBuyEthAmount}
                  onChange={(e) => setDevBuyEthAmount(parseFloat(e.target.value) || 0)}
                  placeholder="0.0001"
                  className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent font-mono"
                  min="0"
                  step="0.0001"
                />
                <div className="mt-2 text-xs text-white/60">
                  Will buy {devBuyEthAmount} ETH worth of coins after deployment
                </div>
              </div>

              <div className="bg-blue-500/20 border border-blue-400/30 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-2">
                  <svg className="w-4 h-4 text-blue-300" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="text-xs font-semibold text-blue-300">Dev Buy Benefits</span>
                </div>
                <ul className="text-xs text-blue-200 space-y-1">
                  <li>• Creates initial trading volume</li>
                  <li>• Establishes price floor</li>
                  <li>• Shows developer commitment</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between pt-8">
        <button 
          onClick={prevStep} 
          className="px-8 py-4 text-white hover:text-blue-200 font-semibold rounded-xl hover:bg-white/10 transition-all duration-200 flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span>Back to Liquidity</span>
        </button>
        
        <button 
          onClick={nextStep} 
          className="px-8 py-4 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg shadow-blue-500/30 flex items-center space-x-2"
        >
          <span>Continue to Advanced</span>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
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
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Deploy Your Coin</h2>
        <p className="text-gray-600 text-sm">
          Review your configuration and deploy your coin to the blockchain.
        </p>
      </div>

      <div className="bg-green-50 rounded-xl p-4 border border-green-200">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2"></span>
          Configuration Summary
        </h3>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-600">Name:</span>
            <span className="font-medium">{coinName || 'Not set'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Symbol:</span>
            <span className="font-medium">{coinSymbol || 'Not set'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Market Cap:</span>
            <span className="font-medium">{startingMarketCap ? `${startingMarketCap} ETH` : 'Not set'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Pair Coin:</span>
            <span className="font-medium">{pairTokenType === 'WETH' ? 'ETH (WETH)' : 'Custom'}</span>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-green-200">
          <h4 className="text-xs font-medium text-gray-700 mb-2">Enabled Features:</h4>
          <div className="flex flex-wrap gap-1">
            {vaultEnabled && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                🔒 Vault ({vaultPercentage}%)
              </span>
            )}
            {airdropEnabled && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800">
                🎁 Airdrop ({airdropPercentage}%)
              </span>
            )}
            {devBuyEnabled && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                🛒 Dev Buy ({devBuyEthAmount} ETH)
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <button
          onClick={handleSimulateToken}
          disabled={simulationLoading || !isStepValid(0) || !isStepValid(1)}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {simulationLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
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
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {deployLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Deploying...</span>
            </>
          ) : (
            <>
              <span>🚀</span>
              <span>Deploy Coin</span>
            </>
          )}
        </button>
      </div>

      <div className="flex justify-start">
        <button 
          onClick={prevStep} 
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
        >
          ← Back to Advanced
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900">
      {/* Modern Header */}
      <header className="bg-white/10 backdrop-blur-md border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-lg">A</span>
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">astropad</h1>
                <p className="text-xs text-blue-200">Next-Gen Coin Deployment</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {isConnected ? (
                <div className="flex items-center space-x-3">
                  <div className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl px-4 py-2">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <div className="text-sm">
                        <div className="font-semibold text-white">
                          {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Connected'}
                        </div>
                        <div className="text-xs text-blue-200">
                          {chain?.name || 'Unknown Network'}
                        </div>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => disconnect()}
                    className="px-4 py-2 text-sm text-red-200 hover:text-white hover:bg-red-500/20 rounded-xl transition-all duration-200"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => open()}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                >
                  Connect Wallet
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-cyan-600/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h2 className="text-5xl font-bold text-white mb-6">
              Deploy & Manage <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">Coins</span>
            </h2>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto mb-8">
              Create professional-grade tokens with advanced features like airdrops, vaults, and liquidity management - all in one intuitive platform.
            </p>
            <div className="flex items-center justify-center space-x-8 text-blue-200">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm">Audited Contracts</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                <span className="text-sm">Instant Deployment</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                <span className="text-sm">Advanced Features</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Deploy Coin Card */}
          <div className="lg:col-span-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl shadow-2xl overflow-hidden">
            {/* Modern Progress Header */}
            <div className="bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-sm border-b border-white/20 p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center space-x-6">
                  <div className="relative">
                    <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg">
                      {STEPS[currentStep].icon}
                    </div>
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg">
                      {currentStep + 1}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-2">Deploy Your Coin</h3>
                    <p className="text-blue-200 font-medium">
                      {STEPS[currentStep].title} • Step {currentStep + 1} of {STEPS.length}
                    </p>
                  </div>
                </div>
                <div className="hidden sm:block bg-white/10 backdrop-blur-sm rounded-2xl px-6 py-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{Math.round(((currentStep + 1) / STEPS.length) * 100)}%</div>
                    <div className="text-xs text-blue-200">Complete</div>
                  </div>
                </div>
              </div>

              {/* Modern Progress Steps */}
              <div className="flex items-center justify-between">
                {STEPS.map((step, index) => (
                  <div key={step.id} className="flex items-center flex-1">
                    <button
                      onClick={() => setCurrentStep(index)}
                      disabled={index > currentStep && !isStepValid(index - 1)}
                      className={`
                        group relative flex items-center justify-center w-12 h-12 rounded-2xl font-bold text-lg transition-all duration-300 transform hover:scale-110
                        ${index === currentStep 
                          ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/50' 
                          : isStepValid(index)
                            ? 'bg-gradient-to-r from-green-400 to-emerald-400 text-white shadow-lg shadow-green-400/50'
                            : index < currentStep
                              ? 'bg-white/20 text-white hover:bg-white/30'
                              : 'bg-white/10 text-white/50 cursor-not-allowed'
                        }
                      `}
                    >
                      {isStepValid(index) && index !== currentStep ? (
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <span>{step.icon}</span>
                      )}
                      <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs text-white/80 whitespace-nowrap font-medium">
                        {step.title}
                      </div>
                    </button>
                    {index < STEPS.length - 1 && (
                      <div className="flex-1 h-1 mx-4 bg-white/20 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-500 ${
                            index < currentStep ? 'bg-gradient-to-r from-green-400 to-emerald-400' : 'bg-transparent'
                          }`}
                        ></div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Modern Step Content */}
            <div className="p-8">
              {renderCurrentStep()}
            </div>
          </div>

          {/* Modern Sidebar */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center text-white text-xl shadow-lg">
                💰
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">Fee Analytics</h3>
                <p className="text-sm text-blue-200">Monitor your earnings</p>
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="block text-sm font-medium text-white mb-2">
                  Clanker Coin Address
                </label>
                <input
                  type="text"
                  value={customClankerTokenAddress}
                  onChange={(e) => setCustomClankerTokenAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/30 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 font-mono text-sm"
                />
              </div>
              
              <div className="space-y-3">
                <label className="block text-sm font-medium text-white mb-2">
                  Fee Owner Address
                </label>
                <input
                  type="text"
                  value={customFeeOwnerAddress}
                  onChange={(e) => setCustomFeeOwnerAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/30 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 font-mono text-sm"
                />
              </div>
              
              <button
                onClick={handleCheckFees}
                disabled={feesLoading || !customClankerTokenAddress || !customFeeOwnerAddress}
                className={`w-full px-4 py-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 ${
                  feesLoading || !customClankerTokenAddress || !customFeeOwnerAddress
                    ? 'bg-white/10 text-white/50 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-lg shadow-blue-500/30'
                }`}
              >
                {feesLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Analyzing...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span>Check Fees</span>
                  </div>
                )}
              </button>
              
              {feesResult && (
                <div className="bg-green-500/20 backdrop-blur-sm border border-green-400/30 rounded-xl p-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-green-300 mb-2">Fee Analytics</h4>
                      <p className="text-sm text-green-200 font-mono whitespace-pre-wrap">{feesResult}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {feesError && (
                <div className="bg-red-500/20 backdrop-blur-sm border border-red-400/30 rounded-xl p-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-red-300 mb-2">Error</h4>
                      <p className="text-sm text-red-200">{feesError}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Stats */}
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 mt-8">
                <h4 className="text-sm font-semibold text-white mb-4 flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z"/>
                    <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z"/>
                  </svg>
                  Platform Stats
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-white/60">Active Coins</span>
                    <span className="text-sm font-semibold text-white">1,247</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-white/60">Total Volume</span>
                    <span className="text-sm font-semibold text-white">$12.4M</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-white/60">Avg. Deploy Time</span>
                    <span className="text-sm font-semibold text-white">2.3s</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 text-center">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 max-w-4xl mx-auto">
            <div className="flex items-center justify-center space-x-8 mb-6">
              <div className="flex items-center space-x-2 text-blue-200">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium">Audited & Secure</span>
              </div>
              <div className="flex items-center space-x-2 text-cyan-200">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium">Lightning Fast</span>
              </div>
              <div className="flex items-center space-x-2 text-green-200">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <span className="text-sm font-medium">Gas Optimized</span>
              </div>
            </div>
            <p className="text-white/80 mb-4">
              Built with ❤️ for the <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400 font-semibold">Clanker ecosystem</span>
            </p>
            <p className="text-white/60 text-sm">
              Empowering creators to launch professional tokens with enterprise-grade features
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
