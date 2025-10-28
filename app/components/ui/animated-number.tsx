"use client";

import { useEffect, useRef, useState } from "react";
import { animate } from "motion";
import { cn } from "~/lib/utils";
import { formatCurrency, formatCompactCurrency } from "~/lib/game-utils";

type AnimatedNumberProps = {
  value: number;
  className?: string;
  compact?: boolean; // when true, use compact currency formatter
  prefix?: string;
  suffix?: string;
  duration?: number; // seconds
};

// Animates a number smoothly to the latest value and lightly pulses on change.
export function AnimatedNumber({
  value,
  className,
  compact = true,
  prefix = "",
  suffix = "",
  duration = 0.6,
}: AnimatedNumberProps) {
  const prev = useRef<number>(value);
  const [display, setDisplay] = useState<string>(() =>
    format(value, compact, prefix, suffix)
  );
  const [isPulsing, setIsPulsing] = useState(false);

  useEffect(() => {
    if (prev.current === value) return;

    setIsPulsing(true);
    const controls = animate(prev.current, value, {
      duration,
      ease: "easeOut",
      onUpdate: (latest) => {
        setDisplay(format(latest, compact, prefix, suffix));
      },
      onComplete: () => {
        setIsPulsing(false);
      },
    });
    prev.current = value;
    return () => controls.stop();
  }, [value, compact, prefix, suffix, duration]);

  return (
    <span
      className={cn(
        "inline-block transition-all will-change-transform",
        isPulsing && "scale-[1.015]",
        className
      )}
    >
      {display}
    </span>
  );
}

function format(v: number, compact: boolean, prefix: string, suffix: string) {
  const n = Number.isFinite(v) ? v : 0;
  const body = compact ? formatCompactCurrency(n) : formatCurrency(n);
  return `${prefix}${body}${suffix}`;
}
