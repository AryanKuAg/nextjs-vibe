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

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % messages.length);
    }, 2000);

    return () => clearInterval(interval);
  }, [messages.length]);

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
      <span className="text-sm text-muted-foreground animate-pulse pt-0.5">
        {messages[currentMessageIndex]}
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
