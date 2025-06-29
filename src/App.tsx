import { useState, useMemo } from 'react';
import { useAccount, useDisconnect, usePublicClient, useWalletClient } from 'wagmi';
import { useWeb3Modal } from '@web3modal/wagmi/react';
import { TokenConfigV4Builder, WETH_ADDRESS, Clanker } from 'clanker-sdk';
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

function App() {
  const [tokenName, setTokenName] = useState('My Project Coin');
  const [tokenSymbol, setTokenSymbol] = useState('MPC');
  const [devBuyEthAmount, setDevBuyEthAmount] = useState(0.0001);
  const [deployedTokenAddress, setDeployedTokenAddress] = useState('');
  const [customClankerTokenAddress, setCustomClankerTokenAddress] = useState('0x699E27a42095D3cb9A6a23097E5C201E33E314B4');
  const [customFeeOwnerAddress, setCustomFeeOwnerAddress] = useState('0xCd2a99C6d6b27976537fC3737b0ef243E7C49946');

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

  const handleDeployToken = async () => {
    setDeployLoading(true);
    setDeployResult('');
    setDeployError('');
    setDeployedTokenAddress('');
    setFeesResult('');
    setFeesError('');

    if (!isConnected || !address) {
      setDeployError('Please connect your wallet first.');
      setDeployLoading(false);
      return;
    }

    if (!tokenName || !tokenSymbol) {
      setDeployError('Token Name and Symbol are required.');
      setDeployLoading(false);
      return;
    }
    if (isNaN(devBuyEthAmount) || devBuyEthAmount < 0) {
      setDeployError('Invalid Dev Buy ETH Amount.');
      setDeployLoading(false);
      return;
    }

    if (!publicClient || !walletClient || !clanker || !chain) {
      setDeployError('Viem clients or Clanker instance not available.');
      setDeployLoading(false);
      return;
    }

    try {
      const SAFE_MULTISIG_ADDRESS = address;

      const builder = new TokenConfigV4Builder()
        .withName(tokenName)
        .withSymbol(tokenSymbol)
        .withTokenAdmin(SAFE_MULTISIG_ADDRESS)
        .withStaticFeeConfig({
          clankerFeeBps: 100,
          pairedFeeBps: 100,
        })
        .withPoolConfig({
          pairedToken: WETH_ADDRESS,
        })
        .withDevBuy({
          ethAmount: devBuyEthAmount,
        })
        .withRewardsRecipients({
          recipients: [
            {
              admin: SAFE_MULTISIG_ADDRESS,
              recipient: SAFE_MULTISIG_ADDRESS,
              bps: 10000,
            },
          ],
        });

      const tokenConfig = builder.build();

      const simulationResult = await clanker.simulateDeployToken(tokenConfig, walletClient.account);

      if ('error' in simulationResult) {
        throw new Error(simulationResult.error);
      }

      const { transaction, simulatedAddress } = simulationResult;

      const hash = await walletClient.sendTransaction({
        to: transaction.to,
        value: transaction.value,
        data: transaction.data,
        account: walletClient.account,
      });

      setDeployedTokenAddress(simulatedAddress);
      setDeployResult(`Transaction sent! Hash: ${hash}\nSimulated Token Address: ${simulatedAddress}\nView on BaseScan: https://basescan.org/tx/${hash}`);
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
      <main className="max-w-5xl mx-auto px-8 pb-16">
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Deploy Token Card */}
          <div className="card animate-fade-in-up">
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
              <div className="space-y-3">
                <label className="text-label">Token Name</label>
                <input
                  type="text"
                  value={tokenName}
                  onChange={(e) => setTokenName(e.target.value)}
                  placeholder="My Awesome Token"
                  className="input"
                />
              </div>
              
              <div className="space-y-3">
                <label className="text-label">Token Symbol</label>
                <input
                  type="text"
                  value={tokenSymbol}
                  onChange={(e) => setTokenSymbol(e.target.value)}
                  placeholder="MAT"
                  className="input"
                />
              </div>
              
              <div className="space-y-3">
                <label className="text-label">Dev Buy ETH Amount</label>
                <input
                  type="number"
                  value={devBuyEthAmount}
                  onChange={(e) => setDevBuyEthAmount(parseFloat(e.target.value))}
                  step="0.0001"
                  placeholder="0.0001"
                  className="input"
                />
              </div>
              
              <button
                onClick={handleDeployToken}
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
                    <span>Deploy Token</span>
                  </>
                )}
              </button>
              
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