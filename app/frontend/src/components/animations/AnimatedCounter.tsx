import { useEffect, useRef, useState } from 'react';

interface AnimatedCounterProps {
  /** Target number to count to */
  target: number;
  /** Duration of animation in milliseconds */
  duration?: number;
  /** Decimal places to show */
  decimals?: number;
  /** Suffix to append (e.g., %, +, etc.) */
  suffix?: string;
  /** Prefix to prepend (e.g., $, etc.) */
  prefix?: string;
  /** Custom className */
  className?: string;
  /** Delay before animation starts in ms */
  delay?: number;
}

export function AnimatedCounter({
  target,
  duration = 2000,
  decimals = 0,
  suffix = '',
  prefix = '',
  className = '',
  delay = 0,
}: AnimatedCounterProps) {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Intersection Observer for scroll animation
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [isVisible]);

  // Animation loop
  useEffect(() => {
    if (!isVisible) return;

    const startTime = Date.now() + delay;
    const animationFrame = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const current = Math.floor(target * progress * Math.pow(10, decimals)) / Math.pow(10, decimals);
      setCount(current);

      if (progress === 1) {
        clearInterval(animationFrame);
      }
    }, 16); // ~60fps

    return () => clearInterval(animationFrame);
  }, [isVisible, target, duration, decimals, delay]);

  return (
    <div ref={ref} className={className}>
      {prefix}
      {count.toFixed(decimals)}
      {suffix}
    </div>
  );
}
