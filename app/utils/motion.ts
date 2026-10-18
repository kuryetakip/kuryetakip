/**
 * KuryeTakip Motion Design Tokens & Variants
 * Powered by motion.dev (motion-v)
 * Provides centralized springs, durations, easings, and reusable variants.
 */

export const MotionSpring = {
  snappy: { type: 'spring', stiffness: 400, damping: 30 },
  gentle: { type: 'spring', stiffness: 260, damping: 25 },
  bouncy: { type: 'spring', stiffness: 350, damping: 18 },
  dialog: { type: 'spring', stiffness: 320, damping: 28 },
} as const

export const MotionTransition = {
  fast: { duration: 0.15, ease: [0.16, 1, 0.3, 1] },
  normal: { duration: 0.25, ease: [0.16, 1, 0.3, 1] },
  smooth: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
} as const

export const fadeInVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: MotionTransition.normal },
  exit: { opacity: 0, transition: MotionTransition.fast },
}

export const fadeUpVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: MotionTransition.smooth },
  exit: { opacity: 0, y: -8, transition: MotionTransition.fast },
}

export const scaleInVariants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1, transition: MotionSpring.dialog },
  exit: { opacity: 0, scale: 0.96, transition: MotionTransition.fast },
}

export const drawerRightVariants = {
  initial: { opacity: 0, x: 40 },
  animate: { opacity: 1, x: 0, transition: MotionSpring.dialog },
  exit: { opacity: 0, x: 40, transition: MotionTransition.fast },
}

export const staggerContainerVariants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.02,
    },
  },
}

export const bentoCardVariants = {
  initial: { opacity: 0, y: 14, scale: 0.98 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: MotionSpring.gentle,
  },
}

export const hoverLiftProps = {
  whileHover: { y: -3, transition: { duration: 0.15, ease: 'easeOut' } },
  whileTap: { scale: 0.98 },
}

export const buttonPressProps = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.97 },
}
