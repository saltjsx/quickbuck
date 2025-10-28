"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { formatTimeRemaining, getTimeUntilNextTick } from "~/lib/game-utils";

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

  useEffect(() => {
    if (!lastTickTime) {
      // If no last tick time, assume next tick in 5 minutes
      setTimeRemaining(5 * 60 * 1000);
      return;
    }

    // Update immediately
    setTimeRemaining(getTimeUntilNextTick(lastTickTime));

    // Update every second
    const interval = setInterval(() => {
      setTimeRemaining(getTimeUntilNextTick(lastTickTime));
    }, 1000);

    return () => clearInterval(interval);
  }, [lastTickTime]);

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
