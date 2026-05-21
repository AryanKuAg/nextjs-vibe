import { useState, useEffect } from "react";
import Image from "next/image";


const ShimmerMessages = () => {
  const messages = [
    "Thinking...",
    "Loading...",
    "Generating...",
    "Analyzing your request...",
    "Building your website...",
    "Crafting components...",
    "Optimizing layout...",
    "Adding final touches...",
    "Almost ready...",
  ];

  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    const startTime = Date.now();

    const messageInterval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % messages.length);
    }, 2000);

    const timerInterval = setInterval(() => {
      setElapsedMs(Date.now() - startTime);
    }, 10);

    return () => {
      clearInterval(messageInterval);
      clearInterval(timerInterval);
    };
  }, [messages.length]);

  const timeString = `${(elapsedMs / 1000).toFixed(1)}s`;

  return (
    <div className="flex items-start pl-1 gap-2.5">
      <div className="flex-shrink-0 mt-0.5">
        <Image
          src="/logo.png"
          alt="Vibe"
          width={24}
          height={24}
          className="shrink-0"
        />
      </div>
      <span className="text-sm pt-0.5">
        <span className="text-white font-mono mr-2  text-[12px] inline-block">{timeString}</span>
        <span className="text-muted-foreground animate-pulse">{messages[currentMessageIndex]}</span>
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
