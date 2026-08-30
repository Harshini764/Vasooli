import React from 'react';
import { ActivitySquare } from 'lucide-react';

interface StatusIndicatorProps {
  status?: 'online' | 'offline' | 'processing';
  label?: string;
  animated?: boolean;
}

export function StatusIndicator({
  status = 'online',
  label = 'Live',
  animated = true,
}: StatusIndicatorProps) {
  const statusColors = {
    online: 'bg-green-500',
    offline: 'bg-red-500',
    processing: 'bg-amber-500',
  };

  const statusLabel = {
    online: 'Live',
    offline: 'Offline',
    processing: 'Processing',
  };

  const pulseClass = animated ? 'animate-pulse' : '';

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        {/* Outer pulse ring for online status */}
        {status === 'online' && (
          <div className="absolute inset-0 rounded-full bg-green-500/30 animate-pulse" />
        )}

        {/* Status dot */}
        <div
          className={`w-2.5 h-2.5 rounded-full ${statusColors[status]} ${
            status === 'processing' ? 'animate-pulse' : ''
          } shadow-lg`}
        />
      </div>

      <span className="text-xs font-semibold text-muted-foreground">
        {label || statusLabel[status]}
      </span>

      {/* Connection icon */}
      {status === 'online' && (
        <ActivitySquare className="h-3 w-3 text-green-500 animate-pulse" />
      )}
    </div>
  );
}
