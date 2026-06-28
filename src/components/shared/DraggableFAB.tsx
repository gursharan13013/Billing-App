import React, { useState, useEffect, useRef } from 'react';

interface DraggableFABProps {
  id: string;
  defaultPosition: (width: number, height: number) => { x: number; y: number };
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  persistPosition?: boolean;
}

export const DraggableFAB: React.FC<DraggableFABProps> = ({ id, defaultPosition, onClick, children, className, persistPosition = true }) => {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [isMounted, setIsMounted] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [parentSize, setParentSize] = useState({ width: 0, height: 0 });
  const dragRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number; hasMoved: boolean } | null>(null);
  const hasLoadedRef = useRef(false);

  const fabRef = useRef<HTMLDivElement>(null);

  const getBounds = () => {
    if (parentSize.width > 0) {
      return {
        maxX: parentSize.width - 56,
        maxY: parentSize.height - 56
      };
    }
    if (fabRef.current && fabRef.current.parentElement) {
      const parent = fabRef.current.parentElement;
      return {
        maxX: parent.clientWidth - 56,
        maxY: parent.clientHeight - 56
      };
    }
    return {
      maxX: window.innerWidth - 56,
      maxY: window.innerHeight - 56
    };
  };

  useEffect(() => {
    const parent = fabRef.current?.parentElement;
    if (!parent) return;

    const observer = new ResizeObserver(() => {
      const parentEl = fabRef.current?.parentElement;
      if (parentEl) {
        setParentSize({
          width: parentEl.clientWidth,
          height: parentEl.clientHeight
        });
      }
    });

    observer.observe(parent);
    
    setParentSize({
      width: parent.clientWidth,
      height: parent.clientHeight
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (parentSize.width === 0 || parentSize.height === 0) return;

    if (!persistPosition) {
      setPos(defaultPosition(parentSize.width, parentSize.height));
      setIsMounted(true);
    } else if (!hasLoadedRef.current) {
      const savedPos = localStorage.getItem(`fab_pos_${id}`);
      if (savedPos) {
        try {
          const parsed = JSON.parse(savedPos);
          const maxX = parentSize.width - 56;
          const maxY = parentSize.height - 56;
          setPos({
              x: Math.max(0, Math.min(parsed.x, maxX)),
              y: Math.max(0, Math.min(parsed.y, maxY))
          });
        } catch (e) {
          setPos(defaultPosition(parentSize.width, parentSize.height));
        }
      } else {
        setPos(defaultPosition(parentSize.width, parentSize.height));
      }
      hasLoadedRef.current = true;
      setIsMounted(true);
    } else {
      setPos(currentPos => {
        const maxX = parentSize.width - 56;
        const maxY = parentSize.height - 56;
        return {
          x: Math.max(0, Math.min(currentPos.x, maxX)),
          y: Math.max(0, Math.min(currentPos.y, maxY))
        };
      });
    }
  }, [id, persistPosition, parentSize, defaultPosition]);

  const handleStart = (clientX: number, clientY: number) => {
    dragRef.current = {
      startX: clientX,
      startY: clientY,
      initialX: pos.x,
      initialY: pos.y,
      hasMoved: false
    };
    setIsDragging(true);
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!isDragging || !dragRef.current) return;
    
    const dx = clientX - dragRef.current.startX;
    const dy = clientY - dragRef.current.startY;
    
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      dragRef.current.hasMoved = true;
    }

    let newX = dragRef.current.initialX + dx;
    let newY = dragRef.current.initialY + dy;

    const { maxX, maxY } = getBounds();
    
    newX = Math.max(0, Math.min(newX, maxX));
    newY = Math.max(0, Math.min(newY, maxY));

    setPos({ x: newX, y: newY });
  };

  const handleEnd = () => {
    setIsDragging(false);
    if (persistPosition && dragRef.current && dragRef.current.hasMoved) {
      localStorage.setItem(`fab_pos_${id}`, JSON.stringify(pos));
    }
    setTimeout(() => {
        if (dragRef.current) dragRef.current.hasMoved = false;
    }, 50);
  };

  const onMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
  const onMouseUp = () => handleEnd();
  const onTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientX, e.touches[0].clientY);
  const onTouchEnd = () => handleEnd();

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      window.addEventListener('touchmove', onTouchMove, { passive: false });
      window.addEventListener('touchend', onTouchEnd);
    } else {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [isDragging, pos]);

  const handleClick = (e: React.MouseEvent) => {
    if (dragRef.current?.hasMoved) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    onClick();
  };

  if (!isMounted) return null;

  return (
    <div
      ref={fabRef}
      className={`absolute z-40 cursor-grab active:cursor-grabbing ${className || ''}`}
      style={{ left: pos.x, top: pos.y, touchAction: 'none' }}
      onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
      onTouchStart={(e) => handleStart(e.touches[0].clientX, e.touches[0].clientY)}
      onClick={handleClick}
    >
      {children}
    </div>
  );
};
