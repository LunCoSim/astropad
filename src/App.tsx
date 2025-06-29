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

async function getTokenDecimals(publicClient: ReturnType<typeof usePublicClient>, tokenAddress: `0x${string}`) {
  try {
    const decimals = await publicClient.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'decimals',
    });
    return decimals;
  } catch (error) {
    console.warn(`Could not fetch decimals for ${tokenAddress}, assuming 18. Error:`, error);
    return 18; // Default to 18 if decimals cannot be fetched
  }
}

async function getTokenSymbol(publicClient: ReturnType<typeof usePublicClient>, tokenAddress: `0x${string}`) {
  try {
    const symbol = await publicClient.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'symbol',
    });
    return symbol;
  } catch (error) {
    console.warn(`Could not fetch symbol for ${tokenAddress}, assuming 'UNKNOWN'. Error:`, error);
    return 'UNKNOWN';
  }
}

function App() {
  const [tokenName, setTokenName] = useState('My Project Coin');
  const [tokenSymbol, setTokenSymbol] = useState('MPC');
  const [devBuyEthAmount, setDevBuyEthAmount] = useState(0.0001);
  const [deployedTokenAddress, setDeployedTokenAddress] = useState('');

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

    if (!publicClient || !walletClient || !clanker) {
      setDeployError('Viem clients or Clanker instance not available.');
      setDeployLoading(false);
      return;
    }

    try {
      const SAFE_MULTISIG_ADDRESS = address;

      const builder = new TokenConfigV4Builder()
        .withName(tokenName)
        .withSymbol(tokenSymbol)
        .withChainId(chain?.id || 8453) // Default to Base Mainnet if chain is undefined
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

      const tokenConfig = await builder.build();

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

    if (!address || !deployedTokenAddress) {
      setFeesError('Fee Owner Address (your connected wallet) and a deployed Token Address are required.');
      setFeesLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/check-fees?feeOwnerAddress=${address}&clankerTokenAddress=${deployedTokenAddress}`);
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
    <div className="container">
      <h1>Clanker Token Tools</h1>

      <div className="section">
        <h2>Wallet Connection</h2>
        {!isConnected ? (
          <button onClick={() => open()}>Connect Wallet</button>
        ) : (
          <button onClick={() => disconnect()}>Disconnect Wallet</button>
        )}
        <p>Connected Account: <span id="connectedAccount">{address || 'None'}</span></p>
        <p>Connected Chain: <span id="connectedChain">{chain?.name || 'None'}</span></p>
        <div id="walletStatus" className="result">
          {isConnected ? 'Wallet Connected!' : 'Wallet Disconnected.'}
        </div>
      </div>

      <div className="section">
        <h2>Deploy Token</h2>
        <label htmlFor="tokenName">Token Name:</label>
        <input
          type="text"
          id="tokenName"
          value={tokenName}
          onChange={(e) => setTokenName(e.target.value)}
        />
        <label htmlFor="tokenSymbol">Token Symbol:</label>
        <input
          type="text"
          id="tokenSymbol"
          value={tokenSymbol}
          onChange={(e) => setTokenSymbol(e.target.value)}
        />
        <label htmlFor="devBuyEthAmount">Dev Buy ETH Amount:</label>
        <input
          type="number"
          id="devBuyEthAmount"
          value={devBuyEthAmount}
          onChange={(e) => setDevBuyEthAmount(parseFloat(e.target.value))}
          step="0.0001"
        />
        <button onClick={handleDeployToken} disabled={deployLoading}>
          {deployLoading ? 'Deploying...' : 'Deploy Token'}
        </button>
        {deployResult && <div id="deployResult" className="result" style={{ whiteSpace: 'pre-wrap' }}>{deployResult}</div>}
        {deployError && <div id="deployError" className="error">{deployError}</div>}
      </div>

      <div className="section">
        <h2>Check Fees</h2>
        <button onClick={handleCheckFees} disabled={!deployedTokenAddress || feesLoading}>
          {feesLoading ? 'Checking...' : 'Check Fees for Deployed Token'}
        </button>
        {feesResult && <div id="feesResult" className="result" style={{ whiteSpace: 'pre-wrap' }}>{feesResult}</div>}
        {feesError && <div id="feesError" className="error">{feesError}</div>}
      </div>
    </div>
  );
}

export default App;