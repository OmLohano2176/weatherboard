import { useState, useEffect, useRef } from 'react';

/**
 * Animates a numeric value from its previous value to the target value
 * using requestAnimationFrame with ease-out timing.
 *
 * @param targetValue The numeric value to animate to.
 * @param duration Duration in ms (default: 600ms).
 * @param skipAnimation When true (e.g. first render from cache), skips animation.
 */
export function useCountUp(
  targetValue: number,
  duration = 600,
  skipAnimation = false
): number {
  const roundedTarget = Math.round(targetValue);
  const [displayValue, setDisplayValue] = useState<number>(roundedTarget);
  const prevValueRef = useRef<number>(roundedTarget);
  const hasMountedRef = useRef<boolean>(false);

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Skip animation if explicitly asked (e.g. initial cache load), under reduced motion,
    // or on first mount if target hasn't changed.
    if (skipAnimation || prefersReducedMotion || !hasMountedRef.current) {
      hasMountedRef.current = true;
      prevValueRef.current = roundedTarget;
      setDisplayValue(roundedTarget);
      return;
    }

    const startVal = prevValueRef.current;
    if (startVal === roundedTarget) {
      setDisplayValue(roundedTarget);
      return;
    }

    const startTime = performance.now();
    let frameId: number;

    // Cubic ease-out: 1 - (1 - t)^3
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const tick = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / duration);
      const easedProgress = easeOutCubic(progress);

      const currentVal = Math.round(startVal + (roundedTarget - startVal) * easedProgress);
      setDisplayValue(currentVal);

      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      } else {
        prevValueRef.current = roundedTarget;
        setDisplayValue(roundedTarget);
      }
    };

    frameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [roundedTarget, duration, skipAnimation]);

  return displayValue;
}
