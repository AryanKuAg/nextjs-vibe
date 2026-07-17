import { useState, useEffect } from "react";

function formatTimer(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

export const ShimmerMessages = ({ text = "Working...", showTimer = false }: { text?: string, showTimer?: boolean }) => {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (!showTimer) return;
    const startTime = Date.now();

    const timerInterval = setInterval(() => {
      setElapsedMs(Date.now() - startTime);
    }, 1000);

    return () => {
      clearInterval(timerInterval);
    };
  }, [showTimer]);

  const timeString = formatTimer(Math.floor(elapsedMs / 1000));

  return (
    <div className="flex items-center gap-2 mb-0.5">
      <span className="font-medium text-[15px] bg-gradient-to-r from-white via-white/50 to-white bg-[length:200%_auto] animate-shimmer bg-clip-text text-transparent">
        {text}
      </span>
      {showTimer && (
        <>
          <span className="text-white/40 text-[13px]">&middot;</span>
          <span className="text-white/40 text-[13px]">{timeString}</span>
        </>
      )}
    </div>
  );
};

export const MessageLoading = () => {
  return (
    <div className="flex group pb-4 px-3 items-start">
      <div className="flex flex-col gap-y-4 pt-0.5 w-full">
        <ShimmerMessages />
      </div>
    </div>
  );
};
