import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Variants } from 'framer-motion';

/**
 * Utility to merge className values with Tailwind classes
 * Combines clsx and tailwind-merge for clean class handling
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Constants for animation variants
 */
export const FADE_IN_ANIMATION_VARIANTS: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { type: 'spring' } },
};

export const FADE_IN_ANIMATION_CARD_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { 
    opacity: 1, 
    y: 0, 
    transition: { 
      type: 'spring',
      stiffness: 300,
      damping: 30
    } 
  },
};

export const FADE_UP_ANIMATION_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { 
    opacity: 1, 
    y: 0, 
    transition: { 
      type: 'spring',
      stiffness: 100,
      damping: 15
    } 
  },
};

export const STAGGER_ANIMATION_VARIANTS: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.1
    }
  }
};