import React, { useEffect, useState, useRef } from 'react';
import { RefreshCw } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({ onRefresh, children }) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startYRef = useRef(0);
  const isPullingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const TRIGGER_DISTANCE = 65; // Trigger pull refresh at 65px pull-down

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleTouchStart = (e: TouchEvent) => {
      // Only initiate gesture when scroll is at very top and we aren't already refreshing
      if (el.scrollTop <= 1 && !isRefreshing) {
        startYRef.current = e.touches[0].clientY;
        isPullingRef.current = true;
      } else {
        isPullingRef.current = false;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPullingRef.current || isRefreshing) return;

      const currentY = e.touches[0].clientY;
      const diffY = currentY - startYRef.current;

      if (diffY > 3) {
        // Friction multiplier to give tactile feel of pulling resistance
        const offset = Math.min(90, diffY * 0.4);
        setPullDistance(offset);

        // Cancel browser scroll bounce
        if (e.cancelable) {
          e.preventDefault();
        }
      } else {
        setPullDistance(0);
      }
    };

    const handleTouchEnd = async () => {
      if (!isPullingRef.current || isRefreshing) return;
      isPullingRef.current = false;

      if (pullDistance >= TRIGGER_DISTANCE) {
        setIsRefreshing(true);
        setPullDistance(TRIGGER_DISTANCE);
        try {
          await onRefresh();
        } catch (e) {
          console.error("Failed to refresh:", e);
        } finally {
          setIsRefreshing(false);
          setPullDistance(0);
        }
      } else {
        setPullDistance(0);
      }
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [pullDistance, isRefreshing, onRefresh]);

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto h-full relative flex flex-col scroll-smooth">
      {/* Visual Pull Refresh spinner node */}
      {(pullDistance > 0 || isRefreshing) && (
        <div 
          className="absolute left-0 right-0 flex justify-center items-center pointer-events-none z-50 transition-opacity"
          style={{ 
            height: `${Math.max(35, pullDistance)}px`,
            opacity: Math.min(1, pullDistance / 20),
            top: 0
          }}
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 rounded-full shadow-lg flex items-center justify-center">
            <RefreshCw 
              size={16} 
              className={`text-indigo-600 dark:text-indigo-400 ${isRefreshing ? 'animate-spin' : ''}`}
              style={{
                transform: isRefreshing ? undefined : `rotate(${pullDistance * 4}deg)`
              }}
            />
          </div>
        </div>
      )}
      <div 
        className="flex-1 flex flex-col transition-transform duration-200"
        style={{
          transform: isRefreshing ? `translate3d(0, ${TRIGGER_DISTANCE}px, 0)` : pullDistance > 0 ? `translate3d(0, ${pullDistance}px, 0)` : undefined
        }}
      >
        {children}
      </div>
    </div>
  );
};
