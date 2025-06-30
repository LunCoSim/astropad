import { useState } from 'react';

interface InfoTooltipProps {
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  size?: 'sm' | 'md' | 'lg';
}

export function InfoTooltip({ content, position = 'top', size = 'md' }: InfoTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  const sizeClasses = {
    sm: { width: '1rem', height: '1rem', fontSize: '0.75rem' },
    md: { width: '1.25rem', height: '1.25rem', fontSize: '0.75rem' },
    lg: { width: '1.5rem', height: '1.5rem', fontSize: '0.875rem' }
  };

  const tooltipPositionClasses = {
    top: { bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 'var(--spacing-sm)' },
    bottom: { top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: 'var(--spacing-sm)' },
    left: { right: '100%', top: '50%', transform: 'translateY(-50%)', marginRight: 'var(--spacing-sm)' },
    right: { left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: 'var(--spacing-sm)' }
  };

  const arrowStyles = {
    top: { top: '100%', left: '50%', transform: 'translateX(-50%)', borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: '4px solid var(--bg-surface)', borderBottom: 'none' },
    bottom: { bottom: '100%', left: '50%', transform: 'translateX(-50%)', borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderBottom: '4px solid var(--bg-surface)', borderTop: 'none' },
    left: { left: '100%', top: '50%', transform: 'translateY(-50%)', borderTop: '4px solid transparent', borderBottom: '4px solid transparent', borderLeft: '4px solid var(--bg-surface)', borderRight: 'none' },
    right: { right: '100%', top: '50%', transform: 'translateY(-50%)', borderTop: '4px solid transparent', borderBottom: '4px solid transparent', borderRight: '4px solid var(--bg-surface)', borderLeft: 'none' }
  };

  const currentSize = sizeClasses[size];

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        className="rounded-full flex items-center justify-center text-primary font-bold transition cursor-pointer"
        style={{
          width: currentSize.width,
          height: currentSize.height,
          fontSize: currentSize.fontSize,
          background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
          marginLeft: 'var(--spacing-sm)',
          border: 'none',
          boxShadow: 'var(--shadow-md)'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
          e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = 'var(--shadow-md)';
        }}
        aria-label="More information"
        aria-describedby={isVisible ? 'tooltip-content' : undefined}
      >
        <svg 
          style={{ width: '75%', height: '75%' }}
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
          className="absolute z-50 animate-fade-in"
          style={{
            ...tooltipPositionClasses[position],
            maxWidth: '18rem',
            padding: 'var(--spacing-md)',
            background: 'var(--bg-surface)',
            backdropFilter: 'blur(10px)',
            color: 'var(--text-primary)',
            fontSize: '0.875rem',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-xl)',
            border: '1px solid var(--border-secondary)',
            whiteSpace: 'normal'
          }}
        >
          <div className="relative">
            {content}
            <div 
              className="absolute"
              style={{
                ...arrowStyles[position],
                width: 0,
                height: 0
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
} 