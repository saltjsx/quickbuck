"use client";

import { useEffect, useState, useRef } from "react";
import { motion } from "motion/react";
import { Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { formatTimeRemaining } from "~/lib/game-utils";

interface CountdownTimerProps {
  lastTickTime?: number;
  /** height in pixels to force the card to match another element */
  heightPx?: number | undefined;
}

export function CountdownTimer({
  lastTickTime,
  heightPx,
}: CountdownTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const lastTickTimeRef = useRef<number | undefined>(lastTickTime);
  const TICK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

  useEffect(() => {
    // Track when lastTickTime changes
    if (lastTickTime !== lastTickTimeRef.current) {
      lastTickTimeRef.current = lastTickTime;
    }
  }, [lastTickTime]);

  useEffect(() => {
    if (!lastTickTimeRef.current) {
      // If no last tick time, assume next tick in 5 minutes
      setTimeRemaining(TICK_INTERVAL_MS);
      return;
    }

    // Helper to update the time
    const updateTime = () => {
      const now = Date.now();
      const tickTime = lastTickTimeRef.current;

      if (!tickTime || tickTime <= 0) {
        setTimeRemaining(TICK_INTERVAL_MS);
        return;
      }

      const timeSinceLastTick = now - tickTime;

      // If time since last tick is negative, return full interval
      if (timeSinceLastTick < 0) {
        setTimeRemaining(TICK_INTERVAL_MS);
        return;
      }

      // Calculate time until next tick
      const moduloTime = timeSinceLastTick % TICK_INTERVAL_MS;
      const timeUntilNextTick = TICK_INTERVAL_MS - moduloTime;

      // If we're very close to 0 or overflow (just completed tick), show full interval
      // This prevents the frozen timer at 00:00
      if (
        timeUntilNextTick <= 500 ||
        timeUntilNextTick > TICK_INTERVAL_MS - 500
      ) {
        setTimeRemaining(TICK_INTERVAL_MS);
        return;
      }

      setTimeRemaining(Math.max(timeUntilNextTick, 0));
    };

    // Update immediately
    updateTime();

    // Update every second
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, [TICK_INTERVAL_MS]);

  return (
    <motion.div
      className="h-full"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      style={heightPx ? { height: `${heightPx}px` } : undefined}
    >
      <Card className={heightPx ? "h-full" : undefined}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Next Tick</CardTitle>
          <div className="rounded-lg bg-muted p-2 text-muted-foreground">
            <Clock className="h-5 w-5" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-semibold">
            {formatTimeRemaining(timeRemaining)}
          </div>
          <p className="text-xs text-muted-foreground">
            Markets update every 5 minutes
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
