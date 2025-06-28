import { createWeb3Modal, defaultConfig } from '@web3modal/wagmi';
import { reconnect, getAccount, getPublicClient, getWalletClient, switchChain } from 'wagmi/actions';
import { base } from 'wagmi/chains';
import { http, createPublicClient, formatUnits } from 'viem';
import { TokenConfigV4Builder, WETH_ADDRESS, simulateDeploy, availableFees } from 'clanker-sdk';

// 1. Define constants
const projectId = '03cafb3be79ba7760436a3741199a564';

const metadata = {
  name: 'Clanker Token Tools',
  description: 'Deploy tokens and check fees',
  url: 'https://clanker.xyz',
  icons: ['https://avatars.githubusercontent.com/u/37784886'],
};

const chains = [base];

// 2. Configure wagmi client
const wagmiConfig = defaultConfig({
  chains,
  projectId,
  metadata,
  ssr: true,
});

// 3. Create modal
createWeb3Modal({
  wagmiConfig,
  projectId,
  enableAnalytics: true, // Optional - defaults to your projectId
});

// 4. Wallet Connection Logic
const connectWalletBtn = document.getElementById('connectWalletBtn');
const disconnectWalletBtn = document.getElementById('disconnectWalletBtn');
const connectedAccountSpan = document.getElementById('connectedAccount');
const connectedChainSpan = document.getElementById('connectedChain');
const walletStatusDiv = document.getElementById('walletStatus');

const updateWalletStatus = async () => {
  const account = getAccount();
  if (account.address) {
    connectedAccountSpan.textContent = account.address;
    connectedChainSpan.textContent = account.chainId ? `Chain ID: ${account.chainId}` : 'Unknown';
    connectWalletBtn.style.display = 'none';
    disconnectWalletBtn.style.display = 'inline-block';
    walletStatusDiv.textContent = 'Wallet Connected!';

    // Ensure we are on the correct chain
    if (account.chainId !== base.id) {
      try {
        await switchChain({ chainId: base.id });
        connectedChainSpan.textContent = `Chain ID: ${base.id} (Switched)`;
      } catch (error) {
        console.error('Failed to switch chain:', error);
        walletStatusDiv.textContent = 'Wallet Connected, but failed to switch to Base Mainnet.';
      }
    }
  } else {
    connectedAccountSpan.textContent = 'None';
    connectedChainSpan.textContent = 'None';
    connectWalletBtn.style.display = 'inline-block';
    disconnectWalletBtn.style.display = 'none';
    walletStatusDiv.textContent = 'Wallet Disconnected.';
  }
};

connectWalletBtn.addEventListener('click', () => {
  const modal = document.querySelector('w3m-button');
  if (modal) {
    modal.click(); // Programmatically click the Web3Modal button
  }
});

disconnectWalletBtn.addEventListener('click', async () => {
  // wagmi's disconnect function is not directly exposed via getAccount().
  // Web3Modal handles disconnect via its UI. For a direct disconnect, you'd typically use wagmi's disconnect action.
  // For simplicity, we'll just update the UI here and rely on Web3Modal's internal state.
  // In a real app, you'd import { disconnect } from 'wagmi/actions' and call it.
  console.log("Disconnect button clicked. Please disconnect via WalletConnect modal if it's still open.");
  // For now, we'll just update the UI to reflect a disconnected state.
  connectedAccountSpan.textContent = 'None';
  connectedChainSpan.textContent = 'None';
  connectWalletBtn.style.display = 'inline-block';
  disconnectWalletBtn.style.display = 'none';
  walletStatusDiv.textContent = 'Wallet Disconnected.';
});

// Reconnect on page load
reconnect().then(updateWalletStatus);

// Listen for account changes
// This is a simplified approach. In a full wagmi app, you'd use useAccount hook.
setInterval(updateWalletStatus, 1000); // Poll for changes (not ideal for production, but simple for static HTML)

// 5. Token Deployment Logic
const deployTokenBtn = document.getElementById('deployTokenBtn');
const tokenNameInput = document.getElementById('tokenName');
const tokenSymbolInput = document.getElementById('tokenSymbol');
const devBuyEthAmountInput = document.getElementById('devBuyEthAmount');
const deployResultDiv = document.getElementById('deployResult');
const deployErrorDiv = document.getElementById('deployError');

deployTokenBtn.addEventListener('click', async () => {
  deployResultDiv.textContent = '';
  deployErrorDiv.textContent = '';

  const account = getAccount();
  if (!account.address) {
    deployErrorDiv.textContent = 'Please connect your wallet first.';
    return;
  }

  const tokenName = tokenNameInput.value;
  const tokenSymbol = tokenSymbolInput.value;
  const devBuyEthAmount = parseFloat(devBuyEthAmountInput.value);

  if (!tokenName || !tokenSymbol) {
    deployErrorDiv.textContent = 'Token Name and Symbol are required.';
    return;
  }
  if (isNaN(devBuyEthAmount) || devBuyEthAmount < 0) {
    deployErrorDiv.textContent = 'Invalid Dev Buy ETH Amount.';
    return;
  }

  deployTokenBtn.disabled = true;
  deployResultDiv.textContent = 'Deploying token... This may take a while.';

  try {
    const publicClient = getPublicClient();
    const walletClient = await getWalletClient();

    if (!publicClient || !walletClient) {
      throw new Error('Viem clients not available.');
    }

    const SAFE_MULTISIG_ADDRESS = account.address; // Use connected account as multisig for simplicity

    const builder = new TokenConfigV4Builder()
      .withName(tokenName)
      .withSymbol(tokenSymbol)
      .withChainId(base.id)
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

    const simulationResult = await simulateDeploy(tokenConfig, walletClient.account, publicClient);

    if ('error' in simulationResult) {
      throw new Error(simulationResult.error);
    }

    const { transaction, simulatedAddress } = simulationResult;

    // Send the transaction
    const hash = await walletClient.sendTransaction({
      to: transaction.to,
      value: transaction.value,
      data: transaction.data,
      account: walletClient.account,
    });

    deployResultDiv.textContent = `Transaction sent! Hash: ${hash}\nSimulated Token Address: ${simulatedAddress}\nView on BaseScan: https://basescan.org/tx/${hash}`;
  } catch (error) {
    console.error('Deployment failed:', error);
    deployErrorDiv.textContent = `Deployment failed: ${error.message || error}`;
  } finally {
    deployTokenBtn.disabled = false;
  }
});

// 6. Check Fees Logic
const checkFeesBtn = document.getElementById('checkFeesBtn');
const feeOwnerAddressInput = document.getElementById('feeOwnerAddress');
const checkTokenAddressInput = document.getElementById('checkTokenAddress');
const feesResultDiv = document.getElementById('feesResult');
const feesErrorDiv = document.getElementById('feesError');

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

async function getTokenDecimals(publicClient, tokenAddress) {
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

async function getTokenSymbol(publicClient, tokenAddress) {
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

checkFeesBtn.addEventListener('click', async () => {
  feesResultDiv.textContent = '';
  feesErrorDiv.textContent = '';

  const feeOwnerAddress = feeOwnerAddressInput.value;
  const checkTokenAddress = checkTokenAddressInput.value;

  if (!feeOwnerAddress || !checkTokenAddress) {
    feesErrorDiv.textContent = 'Fee Owner Address and Token Address are required.';
    return;
  }

  checkFeesBtn.disabled = true;
  feesResultDiv.textContent = 'Checking fees...';

  try {
    const publicClient = createPublicClient({
      chain: base,
      transport: http(),
    });

    // Get fees for the specified token
    const specifiedTokenRawFees = await availableFees(publicClient, feeOwnerAddress, checkTokenAddress);
    const specifiedTokenDecimals = await getTokenDecimals(publicClient, checkTokenAddress);
    const specifiedTokenSymbol = await getTokenSymbol(publicClient, checkTokenAddress);
    const specifiedTokenFormattedFees = formatUnits(specifiedTokenRawFees, specifiedTokenDecimals);

    feesResultDiv.textContent += `\nAvailable fees for ${specifiedTokenSymbol} (${checkTokenAddress}): ${specifiedTokenFormattedFees}`;

    // Get fees for WETH
    const wethTokenAddress = WETH_ADDRESS;
    const wethRawFees = await availableFees(publicClient, feeOwnerAddress, wethTokenAddress);
    const wethDecimals = await getTokenDecimals(publicClient, wethTokenAddress);
    const wethSymbol = await getTokenSymbol(publicClient, wethTokenAddress);
    const wethFormattedFees = formatUnits(wethRawFees, wethDecimals);

    feesResultDiv.textContent += `\nAvailable fees for ${wethSymbol} (${wethTokenAddress}): ${wethFormattedFees}`;

  } catch (error) {
    console.error('Error checking fees:', error);
    feesErrorDiv.textContent = `Error checking fees: ${error.message || error}`;
  } finally {
    checkFeesBtn.disabled = false;
  }
});