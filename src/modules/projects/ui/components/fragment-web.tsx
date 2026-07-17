import "remixicon/fonts/remixicon.css";
import { Fragment } from "@prisma/client";

interface Props {
  data: Fragment;
};

export function FragmentWeb({ data }: Props) {
  const displayUrl = data.deploymentUrl || data.sandboxUrl;

  // Append a cache-buster so the browser doesn't load a stale index.html from disk cache
  const cacheBuster = data.updatedAt ? new Date(data.updatedAt).getTime() : Date.now();
  const finalUrl = displayUrl ? `${displayUrl}?v=${cacheBuster}` : undefined;

  return (
    <div className="flex flex-col w-full h-full overflow-hidden">
      <iframe
        key={data.id}
        className="h-full border-none"
        style={{ width: 'calc(100% + 20px)' }}
        sandbox="allow-forms allow-scripts allow-same-origin"
        loading="lazy"
        src={finalUrl}
      />
    </div>
  )
};