import { useAccount, useDisconnect } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import { TokenDeployWizard } from './components/TokenDeployWizard';
import { ManageTokens } from './components/ManageTokens';
import { useState } from 'react';
import './App.css';

type AppView = 'dashboard' | 'deploy' | 'manage-tokens';

function App() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { open } = useAppKit();
  const [currentView, setCurrentView] = useState<AppView>('dashboard');

  const dashboardCards = [
    {
      id: 'deploy' as const,
      title: 'Deploy New Token',
      description: 'Create and deploy a new Clanker v4 token with full configuration options',
      icon: (
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
        </svg>
      ),
      color: 'primary'
    },
    {
      id: 'manage-tokens' as const,
      title: 'Manage Deployed Tokens',
      description: 'Track manually added tokens, check fees, and manage settings',
      icon: (
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
          <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
          <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
        </svg>
      ),
      color: 'secondary'
    }
  ];

  const renderDashboard = () => (
    <div className="space-y-xl">
      <div className="text-center space-y-lg">
        <div className="animate-float mx-auto" style={{ width: '5rem', height: '5rem', background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))', borderRadius: 'var(--radius-2xl)' }}>
          <div className="flex items-center justify-center w-full h-full">
            <svg className="text-white" style={{ width: '2.5rem', height: '2.5rem' }} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
        <div className="space-y-md">
          <h2 className="text-4xl font-bold text-primary">
            Welcome to <span className="text-gradient">AstroPad</span>
          </h2>
          <p className="text-lg text-secondary mx-auto" style={{ maxWidth: '32rem' }}>
            Your complete toolkit for Clanker token management. Deploy, manage, and optimize your tokens with powerful tools.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg">
        {dashboardCards.map((card) => (
          <div
            key={card.id}
            className="card card-hover cursor-pointer"
            onClick={() => setCurrentView(card.id)}
            style={{ padding: 'var(--spacing-xl)' }}
          >
            <div className="space-y-md">
              <div className={`text-${card.color} opacity-80`}>
                {card.icon}
              </div>
              <div className="space-y-sm">
                <h3 className="text-xl font-semibold text-primary">
                  {card.title}
                </h3>
                <p className="text-secondary text-sm leading-relaxed">
                  {card.description}
                </p>
              </div>
              <div className="flex items-center text-sm text-primary font-medium">
                <span>Get Started</span>
                <svg className="w-4 h-4 ml-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return renderDashboard();
      case 'deploy':
        return (
          <div className="space-y-lg">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-bold text-primary">Deploy New Token</h2>
              <button
                onClick={() => setCurrentView('dashboard')}
                className="btn btn-secondary"
              >
                ← Back to Dashboard
              </button>
            </div>
            <TokenDeployWizard connected={isConnected} address={address} />
          </div>
        );
      case 'manage-tokens':
        return (
          <div className="space-y-lg">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-bold text-primary">Manage Deployed Tokens</h2>
              <button
                onClick={() => setCurrentView('dashboard')}
                className="btn btn-secondary"
              >
                ← Back to Dashboard
              </button>
            </div>
            <ManageTokens />
          </div>
        );
      default:
        return renderDashboard();
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 50%, var(--bg-tertiary) 100%)' }}>
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div 
            className="logo cursor-pointer" 
            onClick={() => setCurrentView('dashboard')}
          >
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
          renderCurrentView()
        ) : (
          <div className="text-center space-y-xl">
            <div className="animate-float mx-auto" style={{ width: '5rem', height: '5rem', background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))', borderRadius: 'var(--radius-2xl)' }}>
              <div className="flex items-center justify-center w-full h-full">
                <svg className="text-white" style={{ width: '2.5rem', height: '2.5rem' }} fill="currentColor" viewBox="0 0 20 20">
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
