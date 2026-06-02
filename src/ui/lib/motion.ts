export const pageVariants = {
  initial: {opacity: 0, y: 8},
  animate: {opacity: 1, y: 0},
  exit: {opacity: 0, y: -4},
};

export const pageTransition = {
  duration: 0.25,
  ease: [0.4, 0, 0.2, 1] as const,
};
