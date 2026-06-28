import React from 'react';
import { motion } from 'motion/react';

interface TabTransitionWrapperProps {
  direction: number;
  children: React.ReactNode;
}

export const TabTransitionWrapper: React.FC<TabTransitionWrapperProps> = ({ direction, children }) => {
  // Safe high-performance Bezier pacing corresponding to physical ease curves
  const transition = {
    duration: 0.42,
    ease: [0.32, 0.94, 0.6, 1], // ease-[cubic-bezier(0.32,0.94,0.6,1)]
  };

  const isHindi = document.documentElement.lang === 'hi' || document.body.classList.contains('lang-hi');

  const variants = {
    enter: (dir: number) => {
      if (dir === 0) {
        return {
          x: 0,
          opacity: 1,
        };
      }
      return {
        x: dir > 0 ? '100%' : '-100%',
        opacity: 0.95,
      };
    },
    center: {
      x: 0,
      opacity: 1,
      transition: {
        duration: 0.35,
        ease: [0.25, 1, 0.5, 1], // easeOutQuart: rapid but professional easing
      },
    },
    exit: (dir: number) => {
      if (dir === 0) {
        return {
          x: 0,
          opacity: 1,
          transition: {
            duration: 0,
          },
        };
      }
      return {
        x: dir > 0 ? '-100%' : '100%',
        opacity: 0.95,
        transition: {
          duration: 0.35,
          ease: [0.25, 1, 0.5, 1],
        },
      };
    },
  };

  return (
    <motion.div
      custom={direction}
      variants={variants}
      initial="enter"
      animate="center"
      exit="exit"
      style={{
        willChange: 'transform, opacity',
      }}
      className={`absolute inset-0 flex flex-col w-full h-full overflow-hidden bg-[var(--bg-app)] ${
        isHindi ? 'leading-relaxed' : ''
      }`}
    >
      {children}
    </motion.div>
  );
};
