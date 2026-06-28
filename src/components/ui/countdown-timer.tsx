"use client";

import { useEffect, useMemo, useState } from "react";

type CountdownTimerProps = {
  locksAt: string | null;
  className?: string;
};

function formatDuration(milliseconds: number) {
  const totalMinutes = Math.max(0, Math.ceil(milliseconds / 60000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  const parts = [
    days > 0 ? `${days}d` : null,
    days > 0 || hours > 0 ? `${hours}h` : null,
    `${minutes}m`,
  ].filter(Boolean);

  return parts.join(" ");
}

export function CountdownTimer({ locksAt, className }: CountdownTimerProps) {
  const targetTime = useMemo(() => {
    const parsed = locksAt ? new Date(locksAt).getTime() : Number.NaN;
    return Number.isNaN(parsed) ? null : parsed;
  }, [locksAt]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!targetTime || now >= targetTime) return;

    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 30000);

    return () => window.clearInterval(interval);
  }, [now, targetTime]);

  if (!targetTime) {
    return (
      <span className={className}>
        Winner prediction lock time is not set.
      </span>
    );
  }

  if (now >= targetTime) {
    return (
      <span className={className}>Winner predictions are locked.</span>
    );
  }

  return (
    <span className={className}>
      Winner predictions lock in {formatDuration(targetTime - now)}
    </span>
  );
}
