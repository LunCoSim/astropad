import { useAccount, useDisconnect } from 'wagmi';
import { useWeb3Modal } from '@web3modal/wagmi/react';
import { TokenDeployWizard } from './components/TokenDeployWizard';
import './App.css';

function App() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { open } = useWeb3Modal();

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 50%, var(--bg-tertiary) 100%)' }}>
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <div className="logo-icon">
              A
            </div>
            <h1 className="logo-text">
              astro<span className="text-gradient">pad</span>
            </h1>
          </div>
          
          <div className="flex items-center space-x-md">
            {isConnected ? (
              <div className="flex items-center space-x-md">
                <div className="text-sm">
                  <div className="text-muted">Connected</div>
                  <div className="text-primary font-mono text-xs">
                    {address?.slice(0, 6)}...{address?.slice(-4)}
                  </div>
                </div>
                <button
                  onClick={() => disconnect()}
                  className="btn btn-secondary"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={() => open()}
                className="btn btn-primary"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container" style={{ paddingTop: 'var(--spacing-2xl)', paddingBottom: 'var(--spacing-2xl)' }}>
        {isConnected ? (
          <TokenDeployWizard 
            connected={isConnected}
            address={address}
          />
        ) : (
          <div className="text-center space-y-xl">
            <div className="animate-float mx-auto" style={{ width: '5rem', height: '5rem', background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))', borderRadius: 'var(--radius-2xl)' }}>
              <div className="flex items-center justify-center w-full h-full">
                <svg className="text-primary" style={{ width: '2.5rem', height: '2.5rem' }} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div className="space-y-md">
              <h2 className="text-4xl font-bold text-primary mb-md">
                Welcome to <span className="text-gradient">AstroPad</span>
              </h2>
              <p className="text-lg text-secondary mx-auto" style={{ maxWidth: '32rem' }}>
                Deploy and manage Clanker tokens with ease. Connect your wallet to get started with token deployment, liquidity setup, and fee management.
              </p>
            </div>
            <button
              onClick={() => open()}
              className="btn btn-primary btn-lg"
            >
              Connect Wallet to Start
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
