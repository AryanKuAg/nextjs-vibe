import { useState } from "react";
import { ExternalLinkIcon, RefreshCcwIcon } from "lucide-react";

import { Hint } from "@/components/hint";
import { Fragment } from "@/generated/prisma";
import { Button } from "@/components/ui/button";

interface Props {
  data: Fragment;
};

export function FragmentWeb({ data }: Props) {
  const [copied, setCopied] = useState(false);
  const [fragmentKey, setFragmentKey] = useState(0);

  const onRefresh = () => {
    setFragmentKey((prev) => prev + 1);
  };

  const handleCopy = () => {
    const urlToCopy = data.deploymentUrl || data.sandboxUrl;
    navigator.clipboard.writeText(urlToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayUrl = data.deploymentUrl || data.sandboxUrl;

  return (
    <div className="flex flex-col w-full h-full">
      <div className="p-2 border-b bg-sidebar flex items-center gap-x-2">
        <Hint text="Refresh" side="bottom" align="start">
          <Button size="sm" variant="outline" onClick={onRefresh}>
            <RefreshCcwIcon />
          </Button>
        </Hint>
        <Hint text="Click to copy" side="bottom">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleCopy}
            disabled={!displayUrl || copied}
            className="flex-1 justify-start text-start font-normal"
          >
            <span className="truncate">
              {displayUrl}
            </span>
          </Button>
        </Hint>
        {data.deploymentUrl && (
            <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full font-medium ml-2">Permanent</span>
        )}
        <Hint text="Open in a new tab" side="bottom" align="start">
          <Button
            size="sm"
            disabled={!displayUrl}
            variant="outline"
            onClick={() => {
              if (!displayUrl) return;
              window.open(displayUrl, "_blank");
            }}
          >
            <ExternalLinkIcon />
          </Button>
        </Hint>
      </div>
      <iframe
        key={`${data.id}-${fragmentKey}`}
        className="h-full w-full"
        sandbox="allow-forms allow-scripts allow-same-origin"
        loading="lazy"
        src={displayUrl}
      />
    </div>
  )
};