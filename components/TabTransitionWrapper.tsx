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
      if (dir > 0) {
        // Entering from right: slides on top of previous page
        return {
          x: '100%',
          scale: 1,
          opacity: 1,
          zIndex: 10,
        };
      } else {
        // Entering from left: was background screen, starting shifted slightly and slightly dimmed
        return {
          x: '-25%',
          scale: 0.97,
          opacity: 0.85,
          zIndex: 1,
        };
      }
    },
    center: {
      x: 0,
      scale: 1,
      opacity: 1,
      zIndex: 5,
      transition: {
        ...transition,
      },
    },
    exit: (dir: number) => {
      if (dir > 0) {
        // Exiting forward to left: becomes background, shifts and dims to back
        return {
          x: '-25%',
          scale: 0.97,
          opacity: 0.85,
          zIndex: 1,
          transition: {
            ...transition,
          },
        };
      } else {
        // Exiting backward to right: slides off screen completely to the right
        return {
          x: '100%',
          scale: 1,
          opacity: 1,
          zIndex: 10,
          transition: {
            ...transition,
          },
        };
      }
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
      className={`absolute inset-0 flex flex-col w-full h-full overflow-hidden bg-[var(--bg-card)] shadow-[-12px_0_36px_rgba(0,0,0,0.12)] dark:shadow-[-12px_                0_36px_rgba(0,0,0,0.4)] border-l border-[var(--border-ui)]/15 ${
        isHindi ? 'leading-relaxed' : ''
      }`}
    >
      {children}
    </motion.div>
  );
};
