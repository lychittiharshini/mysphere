import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showWordmark?: boolean;
  lightText?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showWordmark = true,
  lightText,
}) => {
  const dim = size === 'sm' ? 28 : size === 'lg' ? 40 : 32;
  const textSize =
    size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-lg';

  return (
    <span className="inline-flex items-center gap-2.5 whitespace-nowrap shrink-0 select-none">
      <svg
        width={dim}
        height={dim}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <defs>
          <radialGradient id="mysphere-orb" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#C4B5FD" />
            <stop offset="55%" stopColor="#7C3AED" />
            <stop offset="100%" stopColor="#1E1B4B" />
          </radialGradient>
        </defs>
        <circle
          cx="20"
          cy="20"
          r="16.5"
          stroke="currentColor"
          strokeOpacity="0.22"
          strokeWidth="1.25"
        />
        <circle cx="20" cy="20" r="10.5" fill="url(#mysphere-orb)" />
        <ellipse
          cx="20"
          cy="20"
          rx="16.5"
          ry="6"
          transform="rotate(-24 20 20)"
          stroke="#A78BFA"
          strokeOpacity="0.65"
          strokeWidth="1.25"
        />
      </svg>
      {showWordmark && (
        <span
          className={`font-display font-semibold tracking-tight ${textSize} ${
            lightText
              ? 'text-white'
              : 'text-slate-900 dark:text-slate-50'
          }`}
        >
          MySphere
        </span>
      )}
    </span>
  );
};
