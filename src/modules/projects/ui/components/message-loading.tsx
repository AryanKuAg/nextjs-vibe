

function formatTimer(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

export const ShimmerMessages = ({ text = "Working", showTimer = false, globalElapsedMs = 0 }: { text?: string, showTimer?: boolean, globalElapsedMs?: number }) => {
  const timeString = formatTimer(Math.floor(globalElapsedMs / 1000));

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

export const MessageLoading = ({
  globalElapsedMs = 0,
  text,
}: { globalElapsedMs?: number; text?: string }) => {
  return (
    <div className="flex group pb-4 px-3 items-start">
      <div className="flex flex-col gap-y-4 pt-0.5 w-full">
        <ShimmerMessages text={text} showTimer={true} globalElapsedMs={globalElapsedMs} />
      </div>
    </div>
  );
};
