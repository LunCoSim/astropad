import { useState } from 'react';

interface InfoTooltipProps {
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  size?: 'sm' | 'md' | 'lg';
}

export function InfoTooltip({ content, position = 'top', size = 'md' }: InfoTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  const sizeClasses = {
    sm: 'w-4 h-4 text-xs',
    md: 'w-5 h-5 text-xs',
    lg: 'w-6 h-6 text-sm'
  };

  const tooltipPositionClasses = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-3',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-3',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-3',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-3'
  };

  const arrowClasses = {
    top: 'top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-cosmos-800',
    bottom: 'bottom-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-b-4 border-transparent border-b-cosmos-800',
    left: 'left-full top-1/2 transform -translate-y-1/2 border-t-4 border-b-4 border-l-4 border-transparent border-l-cosmos-800',
    right: 'right-full top-1/2 transform -translate-y-1/2 border-t-4 border-b-4 border-r-4 border-transparent border-r-cosmos-800'
  };

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        className={`
          ${sizeClasses[size]} 
          bg-gradient-to-br from-primary-400 to-secondary-400 
          hover:from-primary-500 hover:to-secondary-500
          rounded-full 
          flex items-center justify-center 
          text-white font-bold 
          transition-all duration-300 
          transform hover:scale-110 
          shadow-lg shadow-primary-500/25
          hover:shadow-xl hover:shadow-primary-500/40
          focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 focus:ring-offset-transparent
          animate-pulse-slow
          ml-2
        `}
        aria-label="More information"
        aria-describedby={isVisible ? 'tooltip-content' : undefined}
      >
        <svg 
          className="w-3/4 h-3/4" 
          fill="currentColor" 
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path 
            fillRule="evenodd" 
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" 
            clipRule="evenodd" 
          />
        </svg>
      </button>
      
      {isVisible && (
        <div 
          id="tooltip-content"
          role="tooltip"
          className={`
            absolute ${tooltipPositionClasses[position]}
            px-4 py-3 
            bg-cosmos-800/95 backdrop-blur-md
            text-white text-sm 
            rounded-xl 
            shadow-2xl shadow-cosmos-900/50
            z-50 
            max-w-xs 
            whitespace-normal 
            border border-cosmos-600/30
            animate-fade-in-up
            transition-all duration-200 ease-out
          `}
          style={{
            animation: isVisible ? 'fadeInUp 0.2s ease-out' : 'fadeOut 0.2s ease-out'
          }}
        >
          <div className="relative">
            {content}
            <div className={`absolute ${arrowClasses[position]} w-0 h-0`}></div>
          </div>
        </div>
      )}
    </div>
  );
} 