import React from 'react';

export function MarketingGuide() {
  const marketingSteps = [
    {
      step: '1',
      title: 'Use Multisig for Token Creation',
      icon: '🔐',
      content: [
        'For your project coin, create a multisig wallet and mint your new coin from the multisig',
        'Important: DO NOT use sponsored transactions on Safe',
        'Use an EOA (Externally Owned Account) like Metamask, Rainbow, etc.',
        'Why? Sponsored transactions can make your coin appear as a honeypot on Uniswap, resulting in fewer trades',
        'Additionally, you won\'t be able to verify your token on Basescan with sponsored transactions'
      ],
      tips: [
        'Consider using a 2-of-3 or 3-of-5 multisig for security',
        'Keep your multisig keys secure and distributed among trusted team members',
        'Document your multisig setup for transparency'
      ]
    },
    {
      step: '2',
      title: 'Verify on Basescan',
      icon: '✅',
      content: [
        'Once your token is minted, immediately verify it on Basescan',
        'Verification adds credibility and transparency to your project',
        'Users can view your contract source code and verify its legitimacy',
        'This helps build trust with potential investors and traders'
      ],
      tips: [
        'Have your contract source code and constructor parameters ready',
        'Use the same compiler version and optimization settings',
        'Verification usually takes a few minutes to process'
      ]
    },
    {
      step: '3',
      title: 'Get Listed on GeckoTerminal',
      icon: '🦎',
      content: [
        'Submit your token to GeckoTerminal for tracking and visibility',
        'GeckoTerminal is a popular DEX tracker that shows real-time data',
        'Being listed increases discoverability for traders',
        'Provides professional charts and analytics for your token'
      ],
      tips: [
        'Ensure you have some trading volume before submitting',
        'Provide accurate token information and social links',
        'Monitor your listing for any updates or requirements'
      ]
    },
    {
      step: '4',
      title: 'Use Noice App for Tips',
      icon: '💰',
      content: [
        'Leverage Noice App to receive tips and donations',
        'Great for building community engagement',
        'Allows supporters to contribute to your project development',
        'Creates an additional revenue stream for ongoing development'
      ],
      tips: [
        'Set up clear tip goals and explain how funds will be used',
        'Engage with your community regularly',
        'Show appreciation for all contributions, big or small'
      ]
    },
    {
      step: '5',
      title: 'Use DEXscreener Boosters',
      icon: '🚀',
      content: [
        'Purchase DEXscreener Boosters to increase your token\'s visibility',
        'Boosters promote your token on DEXscreener\'s trending and homepage sections',
        'Significantly increases organic discovery by traders and investors',
        'Different boost packages available depending on your marketing budget',
        'Creates FOMO and social proof when your token appears in trending sections'
      ],
      tips: [
        'Time your boosts strategically during high-activity periods',
        'Coordinate boosts with major announcements or milestones',
        'Monitor boost performance and adjust strategy accordingly',
        'Consider multiple smaller boosts vs one large boost for sustained visibility'
      ]
    },
    {
      step: '6',
      title: 'Use QR App (If You Have Budget)',
      icon: '📱',
      content: [
        'If your project has marketing budget, consider QR code campaigns',
        'QR codes can drive quick adoption and easy access',
        'Use for events, physical marketing materials, or digital campaigns',
        'Track QR code engagement to measure campaign effectiveness'
      ],
      tips: [
        'Make QR codes lead to a landing page with clear call-to-action',
        'Test QR codes thoroughly before printing or sharing',
        'Consider different QR code sizes for various use cases'
      ]
    },
    {
      step: '7',
      title: 'Social Media Marketing on X (Twitter)',
      icon: '🐦',
      content: [
        'Create a strong presence on X (formerly Twitter)',
        'Share regular updates about your project development',
        'Engage with the crypto and DeFi community',
        'Use relevant hashtags to increase discoverability',
        'Share charts, milestones, and community highlights'
      ],
      tips: [
        'Post consistently - aim for at least one quality post per day',
        'Engage with other projects and community members',
        'Use Twitter Spaces for live discussions',
        'Share behind-the-scenes development progress'
      ]
    },
    {
      step: '8',
      title: 'Community Building on Farcaster',
      icon: '💜',
      content: [
        'Establish your presence on Farcaster for the Web3 native audience',
        'Share authentic updates and engage with the decentralized social community',
        'Farcaster users are typically more engaged with crypto projects',
        'Use frames and other Farcaster-native features for engagement'
      ],
      tips: [
        'Be authentic - Farcaster community values genuine interactions',
        'Create valuable content beyond just promotion',
        'Collaborate with other builders in the ecosystem',
        'Use Farcaster frames for interactive experiences'
      ]
    }
  ];

  return (
    <div className="space-y-2xl animate-fade-in">
      {/* Header */}
      <div className="text-center space-y-md">
        <div className="animate-float mx-auto" style={{ 
          width: '5rem', 
          height: '5rem', 
          background: 'linear-gradient(135deg, var(--color-success), var(--color-secondary))', 
          borderRadius: 'var(--radius-2xl)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <span style={{ fontSize: '2.5rem' }}>📈</span>
        </div>
        <h2 className="text-4xl font-bold text-primary">
          Marketing & <span className="text-gradient">Builder Guide</span>
        </h2>
        <p className="text-lg text-secondary mx-auto" style={{ maxWidth: '48rem', lineHeight: '1.7' }}>
          Essential steps and best practices for successfully launching and promoting your Clanker token. 
          Follow this guide to maximize your project's visibility and community engagement.
        </p>
      </div>

      {/* Warning Card */}
      <div className="card" style={{ 
        background: 'rgba(239, 68, 68, 0.1)', 
        border: '1px solid rgba(239, 68, 68, 0.3)',
        padding: 'var(--spacing-xl)'
      }}>
        <div className="flex items-start space-x-md">
          <div style={{ fontSize: '1.5rem' }}>⚠️</div>
          <div>
            <h3 className="text-lg font-bold text-danger mb-sm">Important Security Notice</h3>
            <p className="text-secondary text-sm leading-relaxed">
              Always use EOA (Externally Owned Account) wallets like Metamask or Rainbow for token deployment. 
              Avoid sponsored transactions on Safe multisig as they can make your token appear as a honeypot, 
              reducing trading activity and preventing Basescan verification.
            </p>
          </div>
        </div>
      </div>

      {/* Marketing Steps */}
      <div className="space-y-xl">
        {marketingSteps.map((step, index) => (
          <div key={index} className="card card-hover animate-slide-up" style={{ 
            animationDelay: `${index * 100}ms`,
            padding: 'var(--spacing-xl)'
          }}>
            <div className="flex items-start space-x-lg">
              {/* Step Number & Icon */}
              <div className="flex-shrink-0">
                <div className="flex flex-col items-center space-y-sm">
                  <div style={{
                    width: '3rem',
                    height: '3rem',
                    background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                    borderRadius: 'var(--radius-xl)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '1rem'
                  }}>
                    {step.step}
                  </div>
                  <div style={{ fontSize: '2rem' }}>{step.icon}</div>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 space-y-md">
                <h3 className="text-xl font-bold text-primary">{step.title}</h3>
                
                {/* Main Content */}
                <div className="space-y-sm">
                  {step.content.map((item, itemIndex) => (
                    <div key={itemIndex} className="flex items-start space-x-sm text-secondary text-sm">
                      <span className="text-primary mt-1" style={{ fontSize: '0.5rem' }}>●</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>

                {/* Tips */}
                {step.tips && step.tips.length > 0 && (
                  <div className="mt-md p-md rounded-lg" style={{ 
                    background: 'rgba(59, 130, 246, 0.1)', 
                    border: '1px solid rgba(59, 130, 246, 0.2)' 
                  }}>
                    <h4 className="text-sm font-semibold text-primary mb-sm flex items-center">
                      <span style={{ marginRight: '0.5rem' }}>💡</span>
                      Pro Tips
                    </h4>
                    <div className="space-y-xs">
                      {step.tips.map((tip, tipIndex) => (
                        <div key={tipIndex} className="flex items-start space-x-sm text-xs text-secondary">
                          <span className="text-primary mt-1" style={{ fontSize: '0.3rem' }}>●</span>
                          <span>{tip}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Additional Resources */}
      <div className="card card-gradient" style={{ padding: 'var(--spacing-xl)' }}>
        <h3 className="text-xl font-bold text-primary mb-lg flex items-center">
          <span style={{ marginRight: '0.5rem', fontSize: '1.5rem' }}>🚀</span>
          Additional Resources
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
          <div className="space-y-md">
            <h4 className="font-semibold text-secondary">Essential Tools</h4>
            <div className="space-y-sm text-sm text-secondary">
              <div>• Basescan - Contract verification</div>
              <div>• GeckoTerminal - DEX tracking</div>
              <div>• DEXscreener - Trading analytics & boosters</div>
              <div>• Dextools - Alternative trading analytics</div>
              <div>• Noice App - Community tips</div>
            </div>
          </div>
          <div className="space-y-md">
            <h4 className="font-semibold text-secondary">Community Platforms</h4>
            <div className="space-y-sm text-sm text-secondary">
              <div>• X (Twitter) - Broad crypto audience</div>
              <div>• Farcaster - Web3 native community</div>
              <div>• Telegram - Direct community chat</div>
              <div>• Discord - Organized community</div>
            </div>
          </div>
        </div>
      </div>

      {/* Final CTA */}
      <div className="text-center">
        <div className="card" style={{ 
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1))', 
          border: '1px solid rgba(59, 130, 246, 0.3)',
          padding: 'var(--spacing-xl)'
        }}>
          <h3 className="text-lg font-bold text-primary mb-md">Ready to Launch Your Token?</h3>
          <p className="text-secondary text-sm mb-lg">
            Follow this guide step by step for the best chance of success. Remember, building a strong 
            community and maintaining transparency are key to long-term project success.
          </p>
          <div className="flex justify-center space-x-md">
            <div className="text-xs text-muted">
              💎 Good luck with your project! 💎
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 