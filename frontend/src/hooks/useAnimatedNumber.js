import { useEffect, useMemo, useState } from "react";

export function useAnimatedNumber(target, duration = 700, decimals = 2) {
  const [value, setValue] = useState(0);

  const safeTarget = useMemo(() => Number(target ?? 0), [target]);

  useEffect(() => {
    const start = performance.now();
    const initial = value;
    const delta = safeTarget - initial;

    let raf;
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      const current = initial + delta * ease;
      setValue(Number(current.toFixed(decimals)));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeTarget]);

  return value;
}
