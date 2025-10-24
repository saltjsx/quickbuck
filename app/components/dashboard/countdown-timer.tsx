"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { formatTimeRemaining, getTimeUntilNextTick } from "~/lib/game-utils";

interface CountdownTimerProps {
  lastTickTime?: number;
}

export function CountdownTimer({ lastTickTime }: CountdownTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  useEffect(() => {
    if (!lastTickTime) {
      // If no last tick time, assume next tick in 20 minutes
      setTimeRemaining(20 * 60 * 1000);
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Next Tick</CardTitle>
        <Clock className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {formatTimeRemaining(timeRemaining)}
        </div>
        <p className="text-xs text-muted-foreground">
          Markets update every 20 minutes
        </p>
      </CardContent>
    </Card>
  );
}
