import "remixicon/fonts/remixicon.css";
import { Fragment } from "@prisma/client";
import { SandpackProvider, SandpackLayout, SandpackPreview } from "@codesandbox/sandpack-react";

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
  const files = { ...((data.files as Record<string, string>) || {}) };

  // 1. Ensure there's an entry point if the AI generated src/App.tsx
  if (files["src/App.tsx"] && !files["/index.tsx"] && !files["index.tsx"]) {
    const hasGlobalCss = !!(files["src/index.css"] || files["src/globals.css"]);
    const cssImport = files["src/index.css"] ? 'import "./src/index.css";' : (files["src/globals.css"] ? 'import "./src/globals.css";' : '');
    
    files["/index.tsx"] = `
import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./src/App";
${cssImport}

// Force Tailwind CSS CDN and Dark Theme injection
if (!document.getElementById("tailwind-cdn")) {
  const script = document.createElement("script");
  script.id = "tailwind-cdn";
  script.src = "https://cdn.tailwindcss.com";
  document.head.appendChild(script);

  const style = document.createElement("style");
  style.innerHTML = "body { margin: 0; padding: 0; background: #0b0b0f; color: #fff; }";
  document.head.appendChild(style);
}

const rootElement = document.getElementById("root");
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
`;
  }

  // 2. Inject tsconfig.json to support @/* path aliases
  if (!files["/tsconfig.json"] && !files["tsconfig.json"]) {
    files["/tsconfig.json"] = JSON.stringify({
      compilerOptions: {
        target: "ES2020",
        useDefineForClassFields: true,
        lib: ["ES2020", "DOM", "DOM.Iterable"],
        module: "ESNext",
        skipLibCheck: true,
        moduleResolution: "bundler",
        allowImportingTsExtensions: true,
        resolveJsonModule: true,
        isolatedModules: true,
        noEmit: true,
        jsx: "react-jsx",
        baseUrl: ".",
        paths: {
          "@/*": ["./src/*"]
        }
      },
      include: ["src"]
    }, null, 2);
  }

  // 3. Inject Tailwind via CDN in index.html to ensure styling works
  if (!files["/public/index.html"] && !files["public/index.html"]) {
    files["/public/index.html"] = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Preview</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
      body { margin: 0; padding: 0; background: #000; color: #fff; }
    </style>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;
  }
  
  return (
    <div className="flex flex-col w-full h-full bg-[#151515] overflow-hidden">
      <SandpackProvider
        template="react-ts"
        files={files}
        theme="dark"
        customSetup={{
          dependencies: {
            "lucide-react": "latest",
            "framer-motion": "latest",
            "zustand": "latest",
            "clsx": "latest",
            "tailwind-merge": "latest"
          }
        }}
        style={{ height: "100%", width: "100%", display: "flex", flexDirection: "column" }}
      >
        <SandpackLayout style={{ height: "100%", width: "100%", border: "none", borderRadius: 0 }}>
          <SandpackPreview 
            showOpenInCodeSandbox={false}
            showRefreshButton={false}
            style={{ height: "100%", width: "100%", flexGrow: 1 }}
          />
        </SandpackLayout>
      </SandpackProvider>
    </div>
  )
};