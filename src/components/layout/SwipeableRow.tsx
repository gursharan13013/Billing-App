import React, { useState } from 'react';
import { motion, useAnimation, PanInfo } from 'motion/react';
import { Trash2, Edit } from 'lucide-react';

interface SwipeableRowProps {
  children: React.ReactNode;
  onDelete?: () => void;
  onEdit?: () => void;
  enabled?: boolean;
}

export const SwipeableRow: React.FC<SwipeableRowProps> = ({
  children,
  onDelete,
  onEdit,
  enabled = true,
}) => {
  const controls = useAnimation();
  const [isOpen, setIsOpen] = useState(false);
  const ACTION_WIDTH = 110; // Total width in pixels of active button container

  const handleDragEnd = async (event: any, info: PanInfo) => {
    if (!enabled) return;

    const offset = info.offset.x;
    const velocity = info.velocity.x;
    const threshold = -40;

    // Trigger open if dragged past threshold leftwards OR high velocity leftwards
    if (offset < threshold || velocity < -120) {
      await controls.start({ x: -ACTION_WIDTH });
      setIsOpen(true);
    } else {
      await controls.start({ x: 0 });
      setIsOpen(false);
    }
  };

  const closeActions = async () => {
    await controls.start({ x: 0 });
    setIsOpen(false);
  };

  return (
    <div className="relative overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-900 shadow-sm">
      {/* Background Actions Drawer */}
      {enabled && (
        <div className="absolute inset-0 flex justify-end items-stretch bg-transparent z-0 select-none">
          <div className="flex w-[110px] h-full">
            {onEdit && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                  closeActions();
                }}
                className="flex-1 bg-gradient-to-br from-indigo-500 to-blue-600 text-white flex flex-col items-center justify-center transition-opacity hover:opacity-90 active:scale-95 duration-100 outline-none"
                title="Edit Item"
                aria-label="Edit Item"
              >
                <Edit size={18} />
                <span className="text-[9px] font-extrabold tracking-wider uppercase mt-1">Edit</span>
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                  closeActions();
                }}
                className="flex-1 bg-gradient-to-br from-red-500 to-rose-600 text-white flex flex-col items-center justify-center transition-opacity hover:opacity-90 active:scale-95 duration-100 outline-none"
                title="Delete Item"
                aria-label="Delete Item"
              >
                <Trash2 size={18} />
                <span className="text-[9px] font-extrabold tracking-wider uppercase mt-1">Del</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Foreground Draggable Card */}
      <motion.div
        drag={enabled ? "x" : false}
        dragConstraints={{ left: -ACTION_WIDTH, right: 0 }}
        dragElastic={{ left: 0.1, right: 0.02 }}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        animate={controls}
        className="relative z-10 w-full"
      >
        {children}
      </motion.div>
    </div>
  );
};
