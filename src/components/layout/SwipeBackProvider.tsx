import React, { useEffect, useState, useRef } from 'react';

interface SwipeBackProviderProps {
  children: React.ReactNode;
  onSwipeBack: () => void;
  canGoBack: boolean;
  activeTab?: 'dashboard' | 'master' | 'report';
  onTabChange?: (tab: 'dashboard' | 'master' | 'report') => void;
  renderPreviousScreen?: () => React.ReactNode;
  renderLeftTabScreen?: () => React.ReactNode;
  renderRightTabScreen?: () => React.ReactNode;
}

const TABS: ('dashboard' | 'master' | 'report')[] = ['dashboard', 'master', 'report'];

const isInsideScrollable = (el: HTMLElement | null): boolean => {
  let curr = el;
  while (curr && curr !== document.body) {
    if (
      curr.tagName === 'TABLE' ||
      curr.classList.contains('overflow-x-auto') ||
      curr.classList.contains('hide-scrollbar') ||
      curr.scrollWidth > curr.clientWidth
    ) {
      const style = window.getComputedStyle(curr);
      if (style.overflowX === 'auto' || style.overflowX === 'scroll') {
        return true;
      }
    }
    curr = curr.parentElement;
  }
  return false;
};

export const SwipeBackProvider: React.FC<SwipeBackProviderProps> = ({
  children,
  onSwipeBack,
  canGoBack,
  activeTab,
  onTabChange,
  renderPreviousScreen,
  renderLeftTabScreen,
  renderRightTabScreen,
}) => {
  const [dragX, setDragX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [swipeType, setSwipeType] = useState<'idle' | 'back' | 'tab'>('idle');
  const [settlingState, setSettlingState] = useState<'idle' | 'dragging' | 'settling_success' | 'settling_cancel'>('idle');
  
  const touchStartRef = useRef<{ x: number; y: number; time: number }>({ x: 0, y: 0, time: 0 });
  const isEligibleRef = useRef<boolean>(false);

  const EDGE_THRESHOLD = 30;  // iOS native gesture is initialized near the outer left boundary (30px)
  const CORNER_THRESHOLD = 40; // Corner check bounds

  useEffect(() => {
    // Reset state on canGoBack changes
    if (!canGoBack && swipeType === 'back') {
      setDragX(0);
      setIsSwiping(false);
      setSettlingState('idle');
      setSwipeType('idle');
    }
  }, [canGoBack, swipeType]);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (settlingState !== 'idle') return;

      const target = e.target as HTMLElement;
      if (isInsideScrollable(target)) {
        isEligibleRef.current = false;
        return;
      }

      const touch = e.touches[0];
      
      if (canGoBack) {
        // Swipe Back logic
        const isLeftEdge = touch.clientX < EDGE_THRESHOLD;
        const isTopLeftCorner = touch.clientX < CORNER_THRESHOLD && touch.clientY < 110;
        const isBottomLeftCorner = touch.clientX < CORNER_THRESHOLD && touch.clientY > (window.innerHeight - 110);

        if (isLeftEdge || isTopLeftCorner || isBottomLeftCorner) {
          touchStartRef.current = { 
            x: touch.clientX, 
            y: touch.clientY, 
            time: Date.now() 
          };
          isEligibleRef.current = true;
          setSwipeType('back');
        } else {
          isEligibleRef.current = false;
        }
      } else if (activeTab && onTabChange) {
        // Tab swiping logic
        touchStartRef.current = {
          x: touch.clientX,
          y: touch.clientY,
          time: Date.now()
        };
        isEligibleRef.current = true;
        setSwipeType('tab');
      } else {
        isEligibleRef.current = false;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isEligibleRef.current || settlingState === 'settling_success' || settlingState === 'settling_cancel') return;
      
      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);

      // Lock swipe engagement exclusively when horizontal slide dominates vertical scroll
      if (!isSwiping && Math.abs(deltaX) > 12 && deltaY < 8) {
        setIsSwiping(true);
        setSettlingState('dragging');
      }

      if (isSwiping || settlingState === 'dragging') {
        if (swipeType === 'back') {
          // Swipe back can only drag rightward (positive)
          const dragAmount = Math.max(0, deltaX);
          setDragX(dragAmount);
        } else if (swipeType === 'tab' && activeTab) {
          const tabIndex = TABS.indexOf(activeTab);
          let dragAmount = deltaX;

          // Apply elastic bounds friction constraint on boundaries
          if (tabIndex === 0 && deltaX > 0) {
            // First tab, cannot go further left
            dragAmount = deltaX * 0.25;
          } else if (tabIndex === TABS.length - 1 && deltaX < 0) {
            // Last tab, cannot go further right
            dragAmount = deltaX * 0.25;
          }

          setDragX(dragAmount);
        }

        // Prevent browser native forward/back history swipe behavior
        if (e.cancelable) {
          e.preventDefault();
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isEligibleRef.current || settlingState !== 'dragging') {
        isEligibleRef.current = false;
        setIsSwiping(false);
        setSettlingState('idle');
        setSwipeType('idle');
        return;
      }

      const touch = e.changedTouches[0];
      const deltaTime = Date.now() - touchStartRef.current.time;
      const deltaX = touch.clientX - touchStartRef.current.x;
      const velocityX = deltaX / (deltaTime || 1);

      const width = window.innerWidth || 375;

      if (swipeType === 'back') {
        const thresholdWidth = width * 0.28;
        const isSuccess = dragX > thresholdWidth || (velocityX > 0.40 && dragX > 20);

        if (isSuccess) {
          setSettlingState('settling_success');
          setDragX(width);
          
          setTimeout(() => {
            onSwipeBack();
            setDragX(0);
            setIsSwiping(false);
            setSettlingState('idle');
            setSwipeType('idle');
          }, 280);
        } else {
          setSettlingState('settling_cancel');
          setDragX(0);
          
          setTimeout(() => {
            setIsSwiping(false);
            setSettlingState('idle');
            setSwipeType('idle');
          }, 280);
        }
      } else if (swipeType === 'tab' && activeTab && onTabChange) {
        const tabIndex = TABS.indexOf(activeTab);
        const thresholdWidth = width * 0.25;
        
        let targetIndex = tabIndex;

        // Swipe left (dragging negative) -> Next tab
        if (dragX < -thresholdWidth || (velocityX < -0.35 && dragX < -20)) {
          if (tabIndex < TABS.length - 1) {
            targetIndex = tabIndex + 1;
          }
        }
        // Swipe right (dragging positive) -> Prev tab
        else if (dragX > thresholdWidth || (velocityX > 0.35 && dragX > 20)) {
          if (tabIndex > 0) {
            targetIndex = tabIndex - 1;
          }
        }

        if (targetIndex !== tabIndex) {
          setSettlingState('settling_success');
          // Smooth slide finish index movement
          const slideTarget = targetIndex > tabIndex ? -width : width;
          setDragX(slideTarget);

          setTimeout(() => {
            onTabChange(TABS[targetIndex]);
            setDragX(0);
            setIsSwiping(false);
            setSettlingState('idle');
            setSwipeType('idle');
          }, 280);
        } else {
          setSettlingState('settling_cancel');
          setDragX(0);

          setTimeout(() => {
            setIsSwiping(false);
            setSettlingState('idle');
            setSwipeType('idle');
          }, 280);
        }
      }

      isEligibleRef.current = false;
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [canGoBack, activeTab, isSwiping, dragX, settlingState, swipeType, onSwipeBack, onTabChange]);

  const width = window.innerWidth || 375;
  const progress = Math.min(1, Math.max(-1, dragX / width));
  
  // Underlay depth offset computation (for back swipe)
  const underlayX = -28 * (1 - Math.abs(progress)); 
  const underlayDimOpacity = 0.40 * (1 - Math.abs(progress));

  const transitionStyle = (settlingState === 'settling_success' || settlingState === 'settling_cancel')
    ? 'transform 280ms cubic-bezier(0.25, 1, 0.5, 1), opacity 280ms cubic-bezier(0.25, 1, 0.5, 1)'
    : 'none';

  const previousScreenNode = isSwiping && swipeType === 'back' && renderPreviousScreen ? renderPreviousScreen() : null;
  const leftTabScreenNode = isSwiping && swipeType === 'tab' && renderLeftTabScreen ? renderLeftTabScreen() : null;
  const rightTabScreenNode = isSwiping && swipeType === 'tab' && renderRightTabScreen ? renderRightTabScreen() : null;

  return (
    <div className="relative w-full flex-1 flex flex-col overflow-hidden bg-[var(--bg-app)]">
      {/* Background/Underlay dynamic preview for swipe back */}
      {isSwiping && swipeType === 'back' && dragX > 1 && (
        <div 
          className="absolute inset-0 z-0 pointer-events-none overflow-hidden select-none"
          style={{
            transform: `translate3d(${underlayX}%, 0px, 0px)`,
            background: 'var(--bg-app)',
            transition: transitionStyle,
          }}
        >
          {previousScreenNode && (
            <div className="absolute inset-0 w-full h-full opacity-70 scale-[0.98]">
              {previousScreenNode}
            </div>
          )}
          <div 
            className="absolute inset-0 bg-black/55"
            style={{
              opacity: underlayDimOpacity,
              transition: transitionStyle,
            }}
          />
        </div>
      )}

      {/* Main active container view */}
      <div
        className="relative flex-1 flex flex-col w-full z-10 overflow-hidden"
        style={{
          transform: isSwiping && Math.abs(dragX) > 0 
            ? `translate3d(${dragX}px, 0px, 0px)` 
            : 'none',
          pointerEvents: isSwiping ? 'none' : 'auto',
          willChange: isSwiping ? 'transform' : 'auto',
          boxShadow: isSwiping && swipeType === 'back' && dragX > 0 
            ? `-10px 0 32px rgba(0,0,0,${Math.min(0.22, 0.05 + progress * 0.17)})` 
            : isSwiping && swipeType === 'tab' && Math.abs(dragX) > 10
            ? '0 0 35px rgba(0,0,0,0.18)'
            : 'none',
          background: 'var(--bg-card)',
          transition: transitionStyle,
        }}
      >
        {children}

        {/* LEFT TAB PANE FOR SEAMLESS PANNING */}
        {leftTabScreenNode && (
          <div 
            className="absolute top-0 bottom-0 w-full h-full pointer-events-none select-none overflow-hidden"
            style={{
              left: '-100%',
            }}
          >
            {leftTabScreenNode}
          </div>
        )}

        {/* RIGHT TAB PANE FOR SEAMLESS PANNING */}
        {rightTabScreenNode && (
          <div 
            className="absolute top-0 bottom-0 w-full h-full pointer-events-none select-none overflow-hidden"
            style={{
              left: '100%',
            }}
          >
            {rightTabScreenNode}
          </div>
        )}
      </div>
    </div>
  );
};
