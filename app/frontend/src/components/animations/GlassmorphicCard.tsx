import React, { ReactNode } from 'react';

interface GlassmorphicCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  glow?: 'none' | 'indigo' | 'blue' | 'purple';
  interactive?: boolean;
}

export function GlassmorphicCard({
  children,
  className = '',
  hover = true,
  glow = 'indigo',
  interactive = false,
}: GlassmorphicCardProps) {
  const glowClass = {
    none: '',
    indigo: 'hover:shadow-[0_0_30px_rgba(79,70,229,0.2)]',
    blue: 'hover:shadow-[0_0_30px_rgba(37,99,235,0.2)]',
    purple: 'hover:shadow-[0_0_30px_rgba(168,85,247,0.2)]',
  }[glow];

  const hoverClass = hover ? glowClass : '';
  const cursorClass = interactive ? 'cursor-pointer' : '';

  return (
    <div
      className={`
        relative rounded-2xl border border-white/20 dark:border-white/10
        bg-gradient-to-br from-white/40 dark:from-white/5 to-white/20 dark:to-white/10
        backdrop-blur-xl backdrop-saturate-150
        shadow-[0_8px_32px_0_rgba(31,38,135,0.2)]
        dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]
        transition-all duration-300
        ${hoverClass}
        ${hover && !interactive ? 'hover:border-white/40 dark:hover:border-white/20' : ''}
        ${interactive && hover ? 'hover:border-white/40 dark:hover:border-white/20 active:scale-95' : ''}
        ${cursorClass}
        ${className}
      `}
    >
      {/* Animated gradient border on hover */}
      <div
        className={`
          absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300
          bg-gradient-to-r from-indigo-500/20 via-transparent to-blue-500/20
          pointer-events-none
          ${hover ? 'group-hover:opacity-100' : ''}
        `}
      />

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
