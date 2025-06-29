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
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({
    core: true,
    metadata: false,
    social: false,
    vault: false,
    airdrop: false,
    rewards: false,
    pool: true,
    fees: false,
    devbuy: true,
    advanced: false
  });
  
  // Existing state variables
  const [deployedTokenAddress, setDeployedTokenAddress] = useState('');
  const [customClankerTokenAddress, setCustomClankerTokenAddress] = useState('0x699E27a42095D3cb9A6a23097E5C201E33E314B4');
  const [customFeeOwnerAddress, setCustomFeeOwnerAddress] = useState('0xCd2a99C6d6b27976537fC3737b0ef243E7C49946');

  const [simulateLoading, setSimulateLoading] = useState(false);
  const [simulationResult, setSimulationResult] = useState<any>(null);
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
        setPairTokenInfo({ symbol, decimals });
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
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
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
    setSimulateLoading(true);
    setSimulationResult(null);
    setSimulationError('');
    setDeployResult('');
    setDeployError('');
    setDeployedTokenAddress('');
    setFeesResult('');
    setFeesError('');

    if (!isConnected || !address) {
      setSimulationError('Please connect your wallet first.');
      setSimulateLoading(false);
      return;
    }

    if (!tokenName || !tokenSymbol) {
      setSimulationError('Token Name and Symbol are required.');
      setSimulateLoading(false);
      return;
    }
    if (isNaN(devBuyEthAmount) || devBuyEthAmount < 0) {
      setSimulationError('Invalid Dev Buy ETH Amount.');
      setSimulateLoading(false);
      return;
    }

    if (pairTokenType === 'custom' && (!customPairTokenAddress || !pairTokenValid)) {
      setSimulationError('Please enter a valid ERC-20 token address for the pair token.');
      setSimulateLoading(false);
      return;
    }

    if (startingMarketCap && pairTokenType === 'WETH' && (startingMarketCap < 0.1 || startingMarketCap > 1000)) {
      setSimulationError('Starting market cap must be between 0.1 and 1000 ETH.');
      setSimulateLoading(false);
      return;
    }

    if (startingMarketCap && pairTokenType !== 'WETH') {
      setSimulationError('Starting market cap is only supported with WETH pair token.');
      setSimulateLoading(false);
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
      setSimulateLoading(false);
      return;
    }

    if (!walletClient) {
      setSimulationError('Wallet client not available. Please disconnect and reconnect your wallet.');
      setSimulateLoading(false);
      return;
    }

    if (!clanker) {
      setSimulationError('Clanker instance not available. Please try refreshing the page.');
      setSimulateLoading(false);
      return;
    }

    if (!chain) {
      setSimulationError('Chain information not available. Please ensure you are connected to Base network.');
      setSimulateLoading(false);
      return;
    }

    if (chain.id !== 8453) {
      setSimulationError(`Wrong network detected. Please switch to Base Mainnet (Chain ID: 8453). Currently on: ${chain.name} (${chain.id})`);
      setSimulateLoading(false);
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
        .withTokenAdmin(tokenAdmin || SAFE_MULTISIG_ADDRESS);

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
          recipients: validRecipients,
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

      // Add vanity address generation if enabled
      if (vanityEnabled) {
        builder = builder.withVanity();
      }

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
      setSimulateLoading(false);
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
            <div className="flex items-center space-x-4 mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-3xl flex items-center justify-center text-white text-2xl shadow-lg">
                🎯
              </div>
              <div>
                <h3 className="text-title font-bold text-gray-900">Deploy Token</h3>
                <p className="text-caption">Create your new token in seconds</p>
              </div>
            </div>
            
            <div className="space-y-8">
              <div className="space-y-6">
                {/* CORE TOKEN SETTINGS */}
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleSection('core')}
                    className="w-full px-6 py-4 bg-gray-50 text-left flex items-center justify-between hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-xl">🎯</span>
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">Core Token Settings</h4>
                        <p className="text-sm text-gray-600">Name, symbol, admin, and image</p>
                      </div>
                    </div>
                    <span className={`transform transition-transform ${expandedSections.core ? 'rotate-180' : ''}`}>
                      ⌄
                    </span>
                  </button>
                  
                  {expandedSections.core && (
                    <div className="p-6 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-label">Token Name *</label>
                          <input
                            type="text"
                            value={tokenName}
                            onChange={(e) => setTokenName(e.target.value)}
                            placeholder="My Awesome Token"
                            className="input"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-label">Token Symbol *</label>
                          <input
                            type="text"
                            value={tokenSymbol}
                            onChange={(e) => setTokenSymbol(e.target.value)}
                            placeholder="MAT"
                            className="input"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-label">Token Admin</label>
                        <input
                          type="text"
                          value={tokenAdmin}
                          onChange={(e) => setTokenAdmin(e.target.value)}
                          placeholder="0x... (defaults to connected wallet)"
                          className="input font-mono text-sm"
                        />
                        <span className="text-xs text-gray-500">Address that will control the token contract</span>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-label">Token Image (IPFS)</label>
                        <input
                          type="text"
                          value={tokenImage}
                          onChange={(e) => setTokenImage(e.target.value)}
                          placeholder="ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"
                          className="input text-sm"
                        />
                        <span className="text-xs text-gray-500">IPFS URL for the token image</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* METADATA */}
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleSection('metadata')}
                    className="w-full px-6 py-4 bg-gray-50 text-left flex items-center justify-between hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-xl">📄</span>
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">Token Metadata</h4>
                        <p className="text-sm text-gray-600">Description, social links, and audit reports</p>
                      </div>
                    </div>
                    <span className={`transform transition-transform ${expandedSections.metadata ? 'rotate-180' : ''}`}>
                      ⌄
                    </span>
                  </button>
                  
                  {expandedSections.metadata && (
                    <div className="p-6 space-y-4">
                      <div className="space-y-2">
                        <label className="text-label">Description</label>
                        <textarea
                          value={tokenDescription}
                          onChange={(e) => setTokenDescription(e.target.value)}
                          placeholder="Describe your token project..."
                          className="input min-h-[80px] resize-y"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-label">Social Media URLs</label>
                          <button
                            type="button"
                            onClick={addSocialMediaUrl}
                            className="text-blue-600 text-sm hover:underline"
                          >
                            + Add URL
                          </button>
                        </div>
                        {socialMediaUrls.map((url, index) => (
                          <div key={index} className="flex space-x-2">
                            <input
                              type="url"
                              value={url}
                              onChange={(e) => updateSocialMediaUrl(index, e.target.value)}
                              placeholder="https://twitter.com/yourproject"
                              className="input flex-1 text-sm"
                            />
                            {socialMediaUrls.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeSocialMediaUrl(index)}
                                className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-label">Audit Report URLs</label>
                          <button
                            type="button"
                            onClick={addAuditUrl}
                            className="text-blue-600 text-sm hover:underline"
                          >
                            + Add URL
                          </button>
                        </div>
                        {auditUrls.map((url, index) => (
                          <div key={index} className="flex space-x-2">
                            <input
                              type="url"
                              value={url}
                              onChange={(e) => updateAuditUrl(index, e.target.value)}
                              placeholder="https://auditor.com/report.pdf"
                              className="input flex-1 text-sm"
                            />
                            {auditUrls.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeAuditUrl(index)}
                                className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* SOCIAL CONTEXT */}
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleSection('social')}
                    className="w-full px-6 py-4 bg-gray-50 text-left flex items-center justify-between hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-xl">🌐</span>
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">Social Context</h4>
                        <p className="text-sm text-gray-600">Platform information and identifiers</p>
                      </div>
                    </div>
                    <span className={`transform transition-transform ${expandedSections.social ? 'rotate-180' : ''}`}>
                      ⌄
                    </span>
                  </button>
                  
                  {expandedSections.social && (
                    <div className="p-6 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-label">Interface Name</label>
                          <input
                            type="text"
                            value={interfaceName}
                            onChange={(e) => setInterfaceName(e.target.value)}
                            placeholder="Astropad"
                            className="input"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-label">Platform</label>
                          <input
                            type="text"
                            value={platform}
                            onChange={(e) => setPlatform(e.target.value)}
                            placeholder="farcaster, X, discord"
                            className="input"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-label">Message ID</label>
                          <input
                            type="text"
                            value={messageId}
                            onChange={(e) => setMessageId(e.target.value)}
                            placeholder="Cast hash, tweet URL, etc."
                            className="input"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-label">Social ID</label>
                          <input
                            type="text"
                            value={socialId}
                            onChange={(e) => setSocialId(e.target.value)}
                            placeholder="FID, X handle, Discord ID"
                            className="input"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* VAULT CONFIGURATION */}
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleSection('vault')}
                    className="w-full px-6 py-4 bg-gray-50 text-left flex items-center justify-between hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-xl">🔒</span>
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">Vault Configuration</h4>
                        <p className="text-sm text-gray-600">Lock tokens with vesting schedule</p>
                      </div>
                    </div>
                    <span className={`transform transition-transform ${expandedSections.vault ? 'rotate-180' : ''}`}>
                      ⌄
                    </span>
                  </button>
                  
                  {expandedSections.vault && (
                    <div className="p-6 space-y-4">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id="vaultEnabled"
                          checked={vaultEnabled}
                          onChange={(e) => setVaultEnabled(e.target.checked)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="vaultEnabled" className="text-label">Enable Vault</label>
                      </div>
                      
                      {vaultEnabled && (
                        <div className="space-y-4 pl-7">
                          <div className="space-y-2">
                            <label className="text-label">Vault Percentage (0-90%)</label>
                            <input
                              type="number"
                              value={vaultPercentage}
                              onChange={(e) => setVaultPercentage(parseInt(e.target.value) || 0)}
                              min="0"
                              max="90"
                              className="input"
                            />
                            <span className="text-xs text-gray-500">Percentage of total token supply to lock in vault</span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-label">Lockup Duration (days)</label>
                              <input
                                type="number"
                                value={Math.floor(vaultLockupDuration / (24 * 60 * 60))}
                                onChange={(e) => setVaultLockupDuration((parseInt(e.target.value) || 7) * 24 * 60 * 60)}
                                min="7"
                                className="input"
                              />
                              <span className="text-xs text-gray-500">Minimum 7 days before vesting starts</span>
                            </div>
                            
                            <div className="space-y-2">
                              <label className="text-label">Vesting Duration (days)</label>
                              <input
                                type="number"
                                value={Math.floor(vestingDuration / (24 * 60 * 60))}
                                onChange={(e) => setVestingDuration((parseInt(e.target.value) || 0) * 24 * 60 * 60)}
                                min="0"
                                className="input"
                              />
                              <span className="text-xs text-gray-500">Linear vesting period (0 for instant unlock)</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* AIRDROP CONFIGURATION */}
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleSection('airdrop')}
                    className="w-full px-6 py-4 bg-gray-50 text-left flex items-center justify-between hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-xl">🎁</span>
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">Airdrop Configuration</h4>
                        <p className="text-sm text-gray-600">Distribute tokens via merkle tree</p>
                      </div>
                    </div>
                    <span className={`transform transition-transform ${expandedSections.airdrop ? 'rotate-180' : ''}`}>
                      ⌄
                    </span>
                  </button>
                  
                  {expandedSections.airdrop && (
                    <div className="p-6 space-y-4">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id="airdropEnabled"
                          checked={airdropEnabled}
                          onChange={(e) => setAirdropEnabled(e.target.checked)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="airdropEnabled" className="text-label">Enable Airdrop</label>
                      </div>
                      
                      {airdropEnabled && (
                        <div className="space-y-4 pl-7">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-label">Airdrop Percentage</label>
                              <input
                                type="number"
                                value={airdropPercentage}
                                onChange={(e) => setAirdropPercentage(parseInt(e.target.value) || 0)}
                                min="0"
                                max="50"
                                className="input"
                              />
                              <span className="text-xs text-gray-500">% of total supply for airdrop</span>
                            </div>
                            
                            <div className="space-y-2">
                              <label className="text-label">Lockup Duration (days)</label>
                              <input
                                type="number"
                                value={Math.floor(airdropLockupDuration / (24 * 60 * 60))}
                                onChange={(e) => setAirdropLockupDuration((parseInt(e.target.value) || 1) * 24 * 60 * 60)}
                                min="1"
                                className="input"
                              />
                              <span className="text-xs text-gray-500">Minimum 1 day</span>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <label className="text-label">Vesting Duration (days)</label>
                            <input
                              type="number"
                              value={Math.floor(airdropVestingDuration / (24 * 60 * 60))}
                              onChange={(e) => setAirdropVestingDuration((parseInt(e.target.value) || 0) * 24 * 60 * 60)}
                              min="0"
                              className="input"
                            />
                            <span className="text-xs text-gray-500">Linear vesting period (0 for instant unlock)</span>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="text-label">Airdrop Recipients</label>
                              <button
                                type="button"
                                onClick={addAirdropEntry}
                                className="text-blue-600 text-sm hover:underline"
                              >
                                + Add Recipient
                              </button>
                            </div>
                            {airdropEntries.map((entry, index) => (
                              <div key={index} className="flex space-x-2">
                                <input
                                  type="text"
                                  value={entry.address}
                                  onChange={(e) => updateAirdropEntry(index, 'address', e.target.value)}
                                  placeholder="0x... (recipient address)"
                                  className="input flex-1 font-mono text-sm"
                                />
                                <input
                                  type="number"
                                  value={entry.amount}
                                  onChange={(e) => updateAirdropEntry(index, 'amount', parseFloat(e.target.value) || 0)}
                                  placeholder="Amount"
                                  className="input w-24 text-sm"
                                  min="0"
                                  step="0.1"
                                />
                                {airdropEntries.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => removeAirdropEntry(index)}
                                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                                  >
                                    ×
                                  </button>
                                )}
                              </div>
                            ))}
                            <div className="text-xs text-yellow-600 bg-yellow-50 p-3 rounded-lg">
                              ⚠️ Airdrop requires merkle tree generation - currently for display only
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* REWARD RECIPIENTS */}
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleSection('rewards')}
                    className="w-full px-6 py-4 bg-gray-50 text-left flex items-center justify-between hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-xl">💎</span>
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">Reward Recipients</h4>
                        <p className="text-sm text-gray-600">Configure fee distribution</p>
                      </div>
                    </div>
                    <span className={`transform transition-transform ${expandedSections.rewards ? 'rotate-180' : ''}`}>
                      ⌄
                    </span>
                  </button>
                  
                  {expandedSections.rewards && (
                    <div className="p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-label">Fee Recipients</label>
                        <button
                          type="button"
                          onClick={addRewardRecipient}
                          className="text-blue-600 text-sm hover:underline"
                        >
                          + Add Recipient
                        </button>
                      </div>
                      
                      {rewardRecipients.map((recipient, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">Recipient #{index + 1}</span>
                            {rewardRecipients.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeRewardRecipient(index)}
                                className="text-red-600 text-sm hover:underline"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <label className="text-sm text-gray-600">Recipient Address</label>
                              <input
                                type="text"
                                value={recipient.recipient}
                                onChange={(e) => updateRewardRecipient(index, 'recipient', e.target.value)}
                                placeholder="0x... (receives fees)"
                                className="input text-sm font-mono"
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <label className="text-sm text-gray-600">Admin Address</label>
                              <input
                                type="text"
                                value={recipient.admin}
                                onChange={(e) => updateRewardRecipient(index, 'admin', e.target.value)}
                                placeholder="0x... (can claim fees)"
                                className="input text-sm font-mono"
                              />
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <label className="text-sm text-gray-600">Allocation (BPS)</label>
                            <input
                              type="number"
                              value={recipient.bps}
                              onChange={(e) => updateRewardRecipient(index, 'bps', parseInt(e.target.value) || 0)}
                              min="0"
                              max="10000"
                              className="input text-sm"
                            />
                            <span className="text-xs text-gray-500">
                              {(recipient.bps / 100).toFixed(2)}% • Total: {(rewardRecipients.reduce((sum, r) => sum + r.bps, 0) / 100).toFixed(2)}%
                            </span>
                          </div>
                        </div>
                      ))}
                      
                      <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded-lg">
                        💡 Total BPS must equal 10000 (100%) for valid configuration
                      </div>
                    </div>
                  )}
                </div>

                {/* POOL CONFIGURATION */}
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleSection('pool')}
                    className="w-full px-6 py-4 bg-gray-50 text-left flex items-center justify-between hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-xl">🏊</span>
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">Pool Configuration</h4>
                        <p className="text-sm text-gray-600">Liquidity pool and pair token settings</p>
                      </div>
                    </div>
                    <span className={`transform transition-transform ${expandedSections.pool ? 'rotate-180' : ''}`}>
                      ⌄
                    </span>
                  </button>
                  
                  {expandedSections.pool && (
                    <div className="p-6 space-y-4">
                      {/* Pair Token Selection */}
                      <div className="space-y-3">
                        <label className="text-label">Pair Token</label>
                        <div className="flex space-x-3">
                          <button
                            type="button"
                            onClick={() => setPairTokenType('WETH')}
                            className={`flex-1 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                              pairTokenType === 'WETH' 
                                ? 'border-blue-500 bg-blue-50 text-blue-700' 
                                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                            }`}
                          >
                            WETH (Recommended)
                          </button>
                          <button
                            type="button"
                            onClick={() => setPairTokenType('custom')}
                            className={`flex-1 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                              pairTokenType === 'custom' 
                                ? 'border-blue-500 bg-blue-50 text-blue-700' 
                                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                            }`}
                          >
                            Custom Token
                          </button>
                        </div>

                        {pairTokenType === 'custom' && (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={customPairTokenAddress}
                              onChange={(e) => setCustomPairTokenAddress(e.target.value)}
                              placeholder="0x... (ERC-20 token address)"
                              className="input font-mono text-sm"
                            />
                            {pairTokenValidating && (
                              <div className="flex items-center space-x-2 text-sm text-gray-500">
                                <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                                <span>Validating token...</span>
                              </div>
                            )}
                            {pairTokenInfo && pairTokenValid && (
                              <div className="flex items-center space-x-2 text-sm text-green-600">
                                <span>✅</span>
                                <span>Valid ERC-20: {pairTokenInfo.symbol} ({pairTokenInfo.decimals} decimals)</span>
                              </div>
                            )}
                            {customPairTokenAddress && !pairTokenValid && !pairTokenValidating && (
                              <div className="flex items-center space-x-2 text-sm text-red-600">
                                <span>❌</span>
                                <span>Invalid or non-ERC-20 token</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Starting Market Cap */}
                      <div className="space-y-2">
                        <label className="text-label">Starting Market Cap (ETH)</label>
                        <input
                          type="number"
                          value={startingMarketCap}
                          onChange={(e) => setStartingMarketCap(parseFloat(e.target.value) || '')}
                          placeholder="Leave empty for default (~10 ETH)"
                          min="0.1"
                          max="1000"
                          step="0.1"
                          className="input"
                          disabled={pairTokenType !== 'WETH'}
                        />
                        <span className="text-xs text-gray-500">
                          {pairTokenType === 'WETH' 
                            ? 'Range: 0.1-1000 ETH (only works with WETH pairs)'
                            : 'Only available with WETH pair token'
                          }
                        </span>
                      </div>

                      {/* LP Position Type */}
                      <div className="space-y-3">
                        <label className="text-label">LP Position Strategy</label>
                        <div className="space-y-2">
                          {(['Standard', 'Project', 'Custom'] as const).map((type) => (
                            <label key={type} className="flex items-center space-x-3">
                              <input
                                type="radio"
                                name="poolPositionType"
                                value={type}
                                checked={poolPositionType === type}
                                onChange={(e) => setPoolPositionType(e.target.value as any)}
                                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                              />
                              <span className="text-sm font-medium">{type}</span>
                              <span className="text-xs text-gray-500">
                                {type === 'Standard' && '(Recommended for most tokens)'}
                                {type === 'Project' && '(Wider range for project tokens)'}
                                {type === 'Custom' && '(Advanced: Define your own ranges)'}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Custom Positions */}
                      {poolPositionType === 'Custom' && (
                        <div className="space-y-3 pl-7">
                          <div className="flex items-center justify-between">
                            <label className="text-label">Custom LP Positions</label>
                            <button
                              type="button"
                              onClick={addCustomPosition}
                              className="text-blue-600 text-sm hover:underline"
                            >
                              + Add Position
                            </button>
                          </div>
                          {customPositions.map((position, index) => (
                            <div key={index} className="border border-gray-200 rounded-lg p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-700">Position #{index + 1}</span>
                                {customPositions.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => removeCustomPosition(index)}
                                    className="text-red-600 text-sm hover:underline"
                                  >
                                    Remove
                                  </button>
                                )}
                              </div>
                              <div className="grid grid-cols-3 gap-2">
                                <div>
                                  <label className="text-xs text-gray-600">Tick Lower</label>
                                  <input
                                    type="number"
                                    value={position.tickLower}
                                    onChange={(e) => updateCustomPosition(index, 'tickLower', parseInt(e.target.value) || 0)}
                                    className="input text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-gray-600">Tick Upper</label>
                                  <input
                                    type="number"
                                    value={position.tickUpper}
                                    onChange={(e) => updateCustomPosition(index, 'tickUpper', parseInt(e.target.value) || 0)}
                                    className="input text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-gray-600">BPS</label>
                                  <input
                                    type="number"
                                    value={position.positionBps}
                                    onChange={(e) => updateCustomPosition(index, 'positionBps', parseInt(e.target.value) || 0)}
                                    min="0"
                                    max="10000"
                                    className="input text-sm"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* FEE CONFIGURATION */}
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleSection('fees')}
                    className="w-full px-6 py-4 bg-gray-50 text-left flex items-center justify-between hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-xl">💰</span>
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">Fee Configuration</h4>
                        <p className="text-sm text-gray-600">Static or dynamic fee structure</p>
                      </div>
                    </div>
                    <span className={`transform transition-transform ${expandedSections.fees ? 'rotate-180' : ''}`}>
                      ⌄
                    </span>
                  </button>
                  
                  {expandedSections.fees && (
                    <div className="p-6 space-y-4">
                      {/* Fee Type Selection */}
                      <div className="space-y-3">
                        <label className="text-label">Fee Type</label>
                        <div className="flex space-x-3">
                          <button
                            type="button"
                            onClick={() => setFeeType('static')}
                            className={`flex-1 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                              feeType === 'static' 
                                ? 'border-blue-500 bg-blue-50 text-blue-700' 
                                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                            }`}
                          >
                            Static Fees
                          </button>
                          <button
                            type="button"
                            onClick={() => setFeeType('dynamic')}
                            className={`flex-1 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                              feeType === 'dynamic' 
                                ? 'border-blue-500 bg-blue-50 text-blue-700' 
                                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                            }`}
                          >
                            Dynamic Fees
                          </button>
                        </div>
                      </div>

                      {feeType === 'static' ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-label">Clanker Fee (BPS)</label>
                              <input
                                type="number"
                                value={clankerFeeBps}
                                onChange={(e) => setClankerFeeBps(parseInt(e.target.value) || 0)}
                                min="0"
                                max="10000"
                                className="input"
                              />
                              <span className="text-xs text-gray-500">Current: {(clankerFeeBps / 100).toFixed(2)}%</span>
                            </div>
                            
                            <div className="space-y-2">
                              <label className="text-label">Paired Token Fee (BPS)</label>
                              <input
                                type="number"
                                value={pairedFeeBps}
                                onChange={(e) => setPairedFeeBps(parseInt(e.target.value) || 0)}
                                min="0"
                                max="10000"
                                className="input"
                              />
                              <span className="text-xs text-gray-500">Current: {(pairedFeeBps / 100).toFixed(2)}%</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-label">Base Fee (BPS)</label>
                              <input
                                type="number"
                                value={baseFee}
                                onChange={(e) => setBaseFee(parseInt(e.target.value) || 0)}
                                min="0"
                                max="100000"
                                className="input"
                              />
                              <span className="text-xs text-gray-500">Minimum fee: {(baseFee / 100).toFixed(2)}%</span>
                            </div>
                            
                            <div className="space-y-2">
                              <label className="text-label">Max LP Fee (BPS)</label>
                              <input
                                type="number"
                                value={maxLpFee}
                                onChange={(e) => setMaxLpFee(parseInt(e.target.value) || 0)}
                                min="0"
                                max="100000"
                                className="input"
                              />
                              <span className="text-xs text-gray-500">Maximum fee: {(maxLpFee / 100).toFixed(2)}%</span>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-label">Ref Tick Filter Period (s)</label>
                              <input
                                type="number"
                                value={referenceTickFilterPeriod}
                                onChange={(e) => setReferenceTickFilterPeriod(parseInt(e.target.value) || 0)}
                                min="1"
                                className="input"
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <label className="text-label">Reset Period (s)</label>
                              <input
                                type="number"
                                value={resetPeriod}
                                onChange={(e) => setResetPeriod(parseInt(e.target.value) || 0)}
                                min="1"
                                className="input"
                              />
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <label className="text-label">Reset Tick Filter</label>
                              <input
                                type="number"
                                value={resetTickFilter}
                                onChange={(e) => setResetTickFilter(parseInt(e.target.value) || 0)}
                                min="0"
                                className="input"
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <label className="text-label">Fee Control Numerator</label>
                              <input
                                type="number"
                                value={feeControlNumerator}
                                onChange={(e) => setFeeControlNumerator(parseInt(e.target.value) || 0)}
                                min="0"
                                className="input"
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <label className="text-label">Decay Filter (BPS)</label>
                              <input
                                type="number"
                                value={decayFilterBps}
                                onChange={(e) => setDecayFilterBps(parseInt(e.target.value) || 0)}
                                min="0"
                                max="10000"
                                className="input"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* DEV BUY CONFIGURATION */}
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleSection('devbuy')}
                    className="w-full px-6 py-4 bg-gray-50 text-left flex items-center justify-between hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-xl">🚀</span>
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">Dev Buy Configuration</h4>
                        <p className="text-sm text-gray-600">Immediate token purchase after deployment</p>
                      </div>
                    </div>
                    <span className={`transform transition-transform ${expandedSections.devbuy ? 'rotate-180' : ''}`}>
                      ⌄
                    </span>
                  </button>
                  
                  {expandedSections.devbuy && (
                    <div className="p-6 space-y-4">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id="devBuyEnabled"
                          checked={devBuyEnabled}
                          onChange={(e) => setDevBuyEnabled(e.target.checked)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="devBuyEnabled" className="text-label">Enable Dev Buy</label>
                      </div>
                      
                      {devBuyEnabled && (
                        <div className="space-y-4 pl-7">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-label">ETH Amount</label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={devBuyEthAmount}
                                onChange={(e) => setDevBuyEthAmount(parseFloat(e.target.value) || 0)}
                                placeholder="e.g., 0.1"
                                className="input"
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <label className="text-label">Recipient Address</label>
                              <input
                                type="text"
                                value={devBuyRecipient}
                                onChange={(e) => setDevBuyRecipient(e.target.value)}
                                placeholder="0x... (defaults to token admin)"
                                className="input font-mono text-sm"
                              />
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <label className="text-label">Minimum Amount Out</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={devBuyAmountOutMin}
                              onChange={(e) => setDevBuyAmountOutMin(parseFloat(e.target.value) || 0)}
                              placeholder="0 (slippage protection)"
                              className="input"
                            />
                            <span className="text-xs text-gray-500">Minimum tokens to receive (slippage protection)</span>
                          </div>
                          
                          <div className="text-xs text-blue-600 bg-blue-50 p-3 rounded-lg space-y-2">
                            <div className="flex items-start space-x-2">
                              <span>💡</span>
                              <div>
                                <div className="font-medium">About Dev Buy</div>
                                <div>The dev buy is a swap that happens immediately after liquidity is created, using the constant product formula (x × y = k).</div>
                              </div>
                            </div>
                            <div className="text-xs">
                              • <strong>Swap Mechanics:</strong> Your ETH swaps against the initial pool liquidity to get tokens<br/>
                              • <strong>Price Impact:</strong> Larger purchases cause exponentially higher price increases<br/>
                              • <strong>Effective Price:</strong> The actual ETH-per-token rate you pay (higher than initial price due to slippage)
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* ADVANCED OPTIONS */}
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleSection('advanced')}
                    className="w-full px-6 py-4 bg-gray-50 text-left flex items-center justify-between hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-xl">⚡</span>
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">Advanced Options</h4>
                        <p className="text-sm text-gray-600">Vanity addresses and advanced features</p>
                      </div>
                    </div>
                    <span className={`transform transition-transform ${expandedSections.advanced ? 'rotate-180' : ''}`}>
                      ⌄
                    </span>
                  </button>
                  
                  {expandedSections.advanced && (
                    <div className="p-6 space-y-4">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id="vanityEnabled"
                          checked={vanityEnabled}
                          onChange={(e) => setVanityEnabled(e.target.checked)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="vanityEnabled" className="text-label">Generate Vanity Address</label>
                      </div>
                      
                      {vanityEnabled && (
                        <div className="space-y-4 pl-7">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-label">Prefix</label>
                              <input
                                type="text"
                                value={vanityPrefix}
                                onChange={(e) => setVanityPrefix(e.target.value)}
                                placeholder="e.g., 0x1337"
                                className="input font-mono text-sm"
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <label className="text-label">Suffix</label>
                              <input
                                type="text"
                                value={vanitySuffix}
                                onChange={(e) => setVanitySuffix(e.target.value)}
                                placeholder="e.g., cafe"
                                className="input font-mono text-sm"
                              />
                            </div>
                          </div>
                          
                          <div className="text-xs text-yellow-600 bg-yellow-50 p-3 rounded-lg">
                            ⚠️ Vanity address generation may take time and increase gas costs
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Continue with other sections in the next part... */}
                
                {/* For now, add a basic dev buy section to maintain functionality */}
                <div className="border border-blue-200 bg-blue-50 rounded-xl p-6" style={{ display: 'none' }}>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <span className="text-xl">💰</span>
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">Dev Buy</h4>
                        <p className="text-sm text-gray-600">Immediate token purchase after deployment</p>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <label className="text-label">Dev Buy ETH Amount</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={devBuyEthAmount}
                        onChange={(e) => setDevBuyEthAmount(parseFloat(e.target.value) || 0)}
                        placeholder="e.g., 0.1"
                        className="input"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 1: Simulate Deploy */}
              {!simulationResult && (
                <button
                  onClick={handleSimulateToken}
                  disabled={simulateLoading}
                  className="btn btn-primary btn-lg w-full"
                >
                  {simulateLoading ? (
                    <>
                      <div className="spinner"></div>
                      <span>Simulating...</span>
                    </>
                  ) : (
                    <>
                      <span className="btn-icon">🔮</span>
                      <span>Simulate Deploy</span>
                    </>
                  )}
                </button>
              )}

              {/* Simulation Results */}
              {simulationResult && (
                <div className="status-message status-info animate-scale-in">
                  <div className="flex items-start space-x-3">
                    <span className="text-xl">🔮</span>
                    <div className="w-full">
                      <h4 className="text-headline font-semibold mb-3">Simulation Results</h4>
                      <div className="space-y-3 text-sm">
                        <div>
                          <span className="font-semibold">Token Name:</span> {simulationResult.tokenConfig.name}
                        </div>
                        <div>
                          <span className="font-semibold">Token Symbol:</span> {simulationResult.tokenConfig.symbol}
                        </div>
                        <div>
                          <span className="font-semibold">Predicted Address:</span> 
                          <span className="font-mono text-xs block mt-1">{simulationResult.simulatedAddress}</span>
                        </div>
                        <div>
                          <span className="font-semibold">Pair Token:</span> {pairTokenType === 'WETH' ? 'WETH' : `${pairTokenInfo?.symbol} (${customPairTokenAddress.slice(0, 6)}...${customPairTokenAddress.slice(-4)})`}
                        </div>
                        <div>
                          <span className="font-semibold">Fees:</span> {(clankerFeeBps / 100).toFixed(2)}% Clanker, {(pairedFeeBps / 100).toFixed(2)}% Paired
                        </div>
                        <div>
                          <span className="font-semibold">Initial Market Cap:</span> {
                            startingMarketCap && pairTokenType === 'WETH' 
                              ? `${startingMarketCap} ETH (Custom)` 
                              : pairTokenType === 'WETH' 
                                ? '~10 ETH (Default)'
                                : 'Default pricing'
                          }
                        </div>
                        <div>
                          <span className="font-semibold">Dev Buy Amount:</span> {devBuyEthAmount} ETH
                        </div>
                        <div>
                          <span className="font-semibold">Dev Buy Analysis:</span> {
                            (() => {
                              if (pairTokenType !== 'WETH') {
                                return 'Variable (depends on pair token liquidity)';
                              }
                              
                              const marketCap = startingMarketCap || 10; // Default ~10 ETH
                              const ammResult = calculateDevBuyTokens(devBuyEthAmount, marketCap);
                              
                              if (ammResult.tokensReceived === 0) {
                                return 'No tokens (invalid parameters)';
                              }
                              
                              const tokensInBillions = (ammResult.tokensReceived / 1_000_000_000).toFixed(2);
                              const supplyPercentage = ((ammResult.tokensReceived / 100_000_000_000) * 100).toFixed(2);
                              
                              // Risk assessment based on price impact
                              let riskLevel = '';
                              if (ammResult.priceImpact >= 100) {
                                riskLevel = ' (⚠️ Extreme price impact!)';
                              } else if (ammResult.priceImpact >= 50) {
                                riskLevel = ' (⚠️ Very high price impact!)';
                              } else if (ammResult.priceImpact >= 20) {
                                riskLevel = ' (High price impact)';
                              } else if (ammResult.priceImpact >= 5) {
                                riskLevel = ' (Moderate price impact)';
                              }
                              
                              return `${tokensInBillions}B tokens (${supplyPercentage}% of supply)${riskLevel}`;
                            })()
                          }
                        </div>
                        <div>
                          <span className="font-semibold">Price Impact:</span> {
                            (() => {
                              if (pairTokenType !== 'WETH') {
                                return 'Variable (depends on pair token)';
                              }
                              
                              const marketCap = startingMarketCap || 10;
                              const ammResult = calculateDevBuyTokens(devBuyEthAmount, marketCap);
                              
                              if (ammResult.priceImpact === 0) {
                                return 'N/A';
                              }
                              
                              const effectivePriceFormatted = (ammResult.effectivePrice * 1e12).toFixed(8);
                              return `+${ammResult.priceImpact.toFixed(2)}% (effective price: ${effectivePriceFormatted} ETH per token)`;
                            })()
                          }
                        </div>
                        <div>
                          <span className="font-semibold">Transaction Value:</span> {(Number(simulationResult.transaction.value) / 1e18).toFixed(6)} ETH
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Confirm Deploy */}
              {simulationResult && (
                <div className="space-y-4">
                  <button
                    onClick={handleConfirmDeploy}
                    disabled={deployLoading}
                    className="btn btn-success btn-lg w-full"
                  >
                    {deployLoading ? (
                      <>
                        <div className="spinner"></div>
                        <span>Deploying Token...</span>
                      </>
                    ) : (
                      <>
                        <span className="btn-icon">🚀</span>
                        <span>Confirm Deploy</span>
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={() => setSimulationResult(null)}
                    disabled={deployLoading}
                    className="btn btn-secondary btn-sm w-full"
                  >
                    ↩️ Back to Edit
                  </button>
                </div>
              )}
              
              {/* Success Message */}
              {deployResult && (
                <div className="status-message status-success animate-scale-in">
                  <div className="flex items-start space-x-3">
                    <span className="text-xl">✅</span>
                    <div>
                      <h4 className="text-headline font-semibold mb-2">Deployment Successful!</h4>
                      <p className="text-body font-mono text-sm whitespace-pre-wrap">{deployResult}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Error Messages */}
              {simulationError && (
                <div className="status-message status-error animate-scale-in">
                  <div className="flex items-start space-x-3">
                    <span className="text-xl">❌</span>
                    <div>
                      <h4 className="text-headline font-semibold mb-2">Simulation Failed</h4>
                      <p className="text-body text-sm">{simulationError}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {deployError && (
                <div className="status-message status-error animate-scale-in">
                  <div className="flex items-start space-x-3">
                    <span className="text-xl">❌</span>
                    <div>
                      <h4 className="text-headline font-semibold mb-2">Deployment Failed</h4>
                      <p className="text-body text-sm">{deployError}</p>
                    </div>
                  </div>
                </div>
              )}
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