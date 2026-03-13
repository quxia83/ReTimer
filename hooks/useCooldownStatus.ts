// hooks/useCooldownStatus.ts
import { useState, useEffect, useCallback } from "react";
import { differenceInSeconds } from "date-fns";

export type CooldownStatus = "green" | "yellow" | "red" | "overdue";

interface CooldownState {
  status: CooldownStatus;
  remainingSeconds: number;
  elapsedSeconds: number;
  overdueSeconds: number;
  lastTakenAt: Date | null;
}

export function useCooldownStatus(
  lastTakenAt: string | null,
  cooldownMin: number, // minutes
  cooldownMax: number  // minutes
): CooldownState {
  const calculate = useCallback((): CooldownState => {
    if (!lastTakenAt) {
      return { status: "green", remainingSeconds: 0, elapsedSeconds: 0, overdueSeconds: 0, lastTakenAt: null };
    }

    const taken = new Date(lastTakenAt);
    const elapsed = differenceInSeconds(new Date(), taken);
    const minSeconds = cooldownMin * 60;
    const maxSeconds = cooldownMax * 60;

    // "Overdue" = past max by more than 50% of the cooldown window
    // This distinguishes "just became ready" from "significantly overdue"
    const overdueThreshold = maxSeconds + (maxSeconds - minSeconds) * 0.5;

    let status: CooldownStatus;
    if (elapsed >= overdueThreshold && maxSeconds > 0) {
      status = "overdue";
    } else if (elapsed >= maxSeconds) {
      status = "green";
    } else if (elapsed >= minSeconds) {
      status = "yellow";
    } else {
      status = "red";
    }

    return {
      status,
      remainingSeconds: Math.max(0, maxSeconds - elapsed),
      elapsedSeconds: elapsed,
      overdueSeconds: Math.max(0, elapsed - maxSeconds),
      lastTakenAt: taken,
    };
  }, [lastTakenAt, cooldownMin, cooldownMax]);

  const [state, setState] = useState(calculate);

  useEffect(() => {
    setState(calculate());
    if (!lastTakenAt) return;

    // Dynamic tick: every second for < 1 hour, every minute for < 1 day, every hour otherwise
    let timeout: ReturnType<typeof setTimeout>;
    const tick = () => {
      const newState = calculate();
      setState(newState);
      if (newState.status === "green") return;
      const r = newState.remainingSeconds;
      const delay = r > 86400 ? 3600000 : r > 3600 ? 60000 : 1000;
      timeout = setTimeout(tick, delay);
    };
    const r0 = calculate().remainingSeconds;
    const delay0 = r0 > 86400 ? 3600000 : r0 > 3600 ? 60000 : 1000;
    timeout = setTimeout(tick, delay0);

    return () => clearTimeout(timeout);
  }, [calculate, lastTakenAt]);

  return state;
}
