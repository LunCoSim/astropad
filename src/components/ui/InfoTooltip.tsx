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
        className="rounded-full flex items-center justify-center font-bold transition cursor-pointer"
        style={{
          width: '2rem',
          height: '2rem',
          fontSize: '1.1rem',
          background: 'linear-gradient(135deg, #2563eb 60%, #7c3aed 100%)',
          marginLeft: '0.5rem',
          border: 'none',
          boxShadow: '0 2px 8px rgba(60,60,120,0.10)',
          color: '#fff',
          outline: isVisible ? '2px solid #2563eb' : 'none',
          transition: 'transform 0.15s, box-shadow 0.15s',
        }}
        onMouseOver={e => {
          e.currentTarget.style.transform = 'scale(1.15)';
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(60,60,120,0.18)';
        }}
        onMouseOut={e => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(60,60,120,0.10)';
        }}
        aria-label="More information"
        aria-describedby={isVisible ? 'tooltip-content' : undefined}
      >
        <svg style={{ width: '70%', height: '70%' }} fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <circle cx="10" cy="10" r="9" stroke="#fff" strokeWidth="2" fill="#2563eb" />
          <text x="10" y="15" textAnchor="middle" fontSize="12" fill="#fff">i</text>
        </svg>
      </button>
      
      {isVisible && (
        <div
          id="tooltip-content"
          role="tooltip"
          className="absolute z-[9999] animate-fade-in"
          style={{
            ...tooltipPositionClasses[position],
            maxWidth: '22rem',
            minWidth: '12rem',
            padding: '1rem',
            background: '#fff',
            color: '#222',
            fontSize: '1rem',
            fontWeight: 500,
            borderRadius: '0.75rem',
            boxShadow: '0 6px 32px rgba(60,60,120,0.18)',
            border: '1px solid #e0e7ef',
            whiteSpace: 'normal',
            lineHeight: 1.5,
            wordBreak: 'break-word',
            transition: 'opacity 0.2s, transform 0.2s',
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'scale(1)' : 'scale(0.98)',
          }}
        >
          <div className="relative">
            {content}
            <div
              className="absolute"
              style={{
                ...arrowStyles[position],
                width: 0,
                height: 0,
                borderTop: position === 'top' ? '8px solid #fff' : undefined,
                borderBottom: position === 'bottom' ? '8px solid #fff' : undefined,
                borderLeft: position === 'left' ? '8px solid #fff' : undefined,
                borderRight: position === 'right' ? '8px solid #fff' : undefined,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
} 