import { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { GradientText, GlowEffect } from './AnimationUtils';

interface FeatureCard {
  icon: ReactNode;
  title: string;
  description: string;
  gradient?: string;
  delay?: number;
}

interface FeatureGridProps {
  features: FeatureCard[];
  className?: string;
}

/**
 * Feature cards grid with gradient backgrounds and glow effects
 */
export function FeatureGrid({ features, className = '' }: FeatureGridProps) {
  const gradients = [
    'from-indigo-600 to-indigo-700',
    'from-blue-600 to-cyan-600',
    'from-violet-600 to-purple-600',
    'from-indigo-600 to-blue-600',
  ];

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${className}`}>
      {features.map((feature, i) => {
        const gradient = gradients[i % gradients.length];
        return (
          <GlowEffect
            key={i}
            color={['indigo', 'blue', 'violet', 'indigo'][i % 4] as any}
            intensity="medium"
          >
            <div
              className="fin-fade-up rounded-lg p-6 bg-card border border-border/50 hover:border-border transition-all duration-300 hover:shadow-lg h-full"
              style={{ animationDelay: `${(feature.delay || i * 100)}ms` }}
            >
              <div
                className={`inline-flex p-3 rounded-lg bg-gradient-to-br ${gradient} mb-4`}
              >
                <div className="text-white">{feature.icon}</div>
              </div>

              <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground mb-4">{feature.description}</p>

              <button className="group inline-flex items-center gap-1 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:gap-2 transition-all duration-300">
                Learn more
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </GlowEffect>
        );
      })}
    </div>
  );
}

interface StatsDisplayProps {
  stats: Array<{
    value: string | number;
    label: string;
    icon?: ReactNode;
  }>;
  className?: string;
}

/**
 * Animated stats counter display
 */
export function StatsDisplay({ stats, className = '' }: StatsDisplayProps) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-3 gap-8 py-12 ${className}`}>
      {stats.map((stat, i) => (
        <div
          key={i}
          className="fin-fade-up text-center"
          style={{ animationDelay: `${i * 150}ms` }}
        >
          {stat.icon && (
            <div className="flex justify-center mb-3 text-indigo-600 dark:text-indigo-400">
              {stat.icon}
            </div>
          )}
          <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 dark:from-indigo-400 dark:to-blue-400 bg-clip-text text-transparent mb-2">
            {stat.value}
          </div>
          <div className="text-sm text-muted-foreground font-medium">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}

interface GradientButtonProps {
  children: ReactNode;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary';
  className?: string;
}

/**
 * Animated gradient button with hover effects
 */
export function GradientButton({
  children,
  onClick,
  size = 'md',
  variant = 'primary',
  className = '',
}: GradientButtonProps) {
  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  const variantClasses = {
    primary:
      'bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:from-indigo-700 hover:to-blue-700 shadow-lg hover:shadow-xl',
    secondary:
      'bg-gradient-to-r from-indigo-500/10 to-blue-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:border-indigo-300 dark:hover:border-indigo-700',
  };

  return (
    <button
      onClick={onClick}
      className={`rounded-lg font-semibold transition-all duration-300 hover:scale-105 active:scale-95 ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
