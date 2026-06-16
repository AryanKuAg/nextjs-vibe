import { useState, useEffect } from "react";
import Image from "next/image";

function formatTimer(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

const ShimmerMessages = () => {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    const startTime = Date.now();

    const timerInterval = setInterval(() => {
      setElapsedMs(Date.now() - startTime);
    }, 1000);

    return () => {
      clearInterval(timerInterval);
    };
  }, []);

  const timeString = formatTimer(Math.floor(elapsedMs / 1000));

  return (
    <div className="flex items-center gap-3 pl-1 ">
      <i className="ri-loader-4-line animate-spin text-2xl text-white/80" />
      <span className="text-white font-onest text-sm tracking-wide">
        Building <span className="text-white/40 mx-1.5">&middot;</span> {timeString}
      </span>
    </div>
  );
};

export const MessageLoading = () => {
  return (
    <div className="px-2 pb-4">
      <ShimmerMessages />
    </div>
  );
};
