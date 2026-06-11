import "remixicon/fonts/remixicon.css";
import { Fragment } from "@prisma/client";
import { Sandpack } from "@codesandbox/sandpack-react";

interface Props {
  data: Fragment;
};

export function FragmentWeb({ data }: Props) {
  const displayUrl = data.deploymentUrl || data.sandboxUrl;

  // Append a cache-buster so the browser doesn't load a stale index.html from disk cache
  const cacheBuster = data.updatedAt ? new Date(data.updatedAt).getTime() : Date.now();
  const finalUrl = displayUrl ? `${displayUrl}?v=${cacheBuster}` : undefined;

  // If this is a fast-path template that bypassed AI, render the iframe directly.
  // We can also fallback to the iframe if there are no files.
  const hasFiles = data.files && typeof data.files === "object" && Object.keys(data.files).length > 0;
  
  if (!hasFiles && finalUrl) {
    return (
      <div className="flex flex-col w-full h-full">
        <iframe
          key={data.id}
          className="h-full w-full border-none bg-white"
          sandbox="allow-forms allow-scripts allow-same-origin"
          loading="lazy"
          src={finalUrl}
        />
      </div>
    );
  }

  // Otherwise, this is an AI-generated site. Render it using Sandpack for instant execution!
  const files = (data.files as Record<string, string>) || {};
  
  return (
    <div className="flex flex-col w-full h-full bg-[#151515] overflow-hidden">
      <Sandpack
        template="react-ts"
        files={files}
        theme="dark"
        options={{
          showNavigator: true,
          showTabs: true,
          editorHeight: "100%", // Takes full height
        }}
        customSetup={{
          dependencies: {
            "lucide-react": "latest",
            "framer-motion": "latest",
            "zustand": "latest",
            "clsx": "latest",
            "tailwind-merge": "latest"
          }
        }}
      />
    </div>
  )
};