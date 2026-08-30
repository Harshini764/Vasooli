import { ReactNode } from 'react';

interface AnimatedCardProps {
  children: ReactNode;
  delay?: number;
  className?: string;
}

/**
 * Animated card that fades in and slides up on mount
 */
export function AnimatedCard({ children, delay = 0, className = '' }: AnimatedCardProps) {
  return (
    <div
      className={`fin-fade-up ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

interface GradientTextProps {
  children: ReactNode;
  className?: string;
  from?: string;
  to?: string;
}

/**
 * Gradient text component for emphasis
 */
export function GradientText({
  children,
  className = '',
  from = 'from-indigo-600',
  to = 'to-blue-600',
}: GradientTextProps) {
  return (
    <span
      className={`bg-gradient-to-r ${from} ${to} dark:${from.replace('600', '400')} dark:${to.replace('600', '400')} bg-clip-text text-transparent ${className}`}
    >
      {children}
    </span>
  );
}

interface GlowEffectProps {
  children: ReactNode;
  color?: 'indigo' | 'blue' | 'violet' | 'purple';
  intensity?: 'light' | 'medium' | 'strong';
  className?: string;
}

/**
 * Glow effect wrapper for elements
 */
export function GlowEffect({
  children,
  color = 'indigo',
  intensity = 'medium',
  className = '',
}: GlowEffectProps) {
  const glowMap = {
    light: 'shadow-lg',
    medium: 'shadow-xl',
    strong: 'shadow-2xl',
  };

  const colorMap = {
    indigo: 'shadow-indigo-500/50',
    blue: 'shadow-blue-500/50',
    violet: 'shadow-violet-500/50',
    purple: 'shadow-purple-500/50',
  };

  return (
    <div className={`${glowMap[intensity]} ${colorMap[color]} rounded-lg transition-all duration-300 hover:shadow-2xl ${className}`}>
      {children}
    </div>
  );
}

interface FloatingElementProps {
  children: ReactNode;
  duration?: number;
  delay?: number;
  className?: string;
}

/**
 * Element that floats up and down smoothly
 */
export function FloatingElement({
  children,
  duration = 6,
  delay = 0,
  className = '',
}: FloatingElementProps) {
  return (
    <div
      className={`animate-float ${className}`}
      style={{
        animation: `float ${duration}s ease-in-out ${delay}s infinite`,
      }}
    >
      {children}
    </div>
  );
}

interface PulseElementProps {
  children: ReactNode;
  duration?: number;
  className?: string;
}

/**
 * Element that pulses with a glow effect
 */
export function PulseElement({ children, duration = 2, className = '' }: PulseElementProps) {
  return (
    <div
      className={`animate-pulse ${className}`}
      style={{
        animationDuration: `${duration}s`,
      }}
    >
      {children}
    </div>
  );
}
