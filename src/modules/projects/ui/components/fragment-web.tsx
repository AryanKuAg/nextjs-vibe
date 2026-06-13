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
          src={finalUrl}
          allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
          sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
        />
      </div>
    );
  }

  // Otherwise, this is an AI-generated site. Render it using Sandpack for instant execution!
  const files = { ...(data.files as { [path: string]: string }) };

  const hasGlobalCss = !!(files["src/index.css"] || files["src/globals.css"]);
  const cssImport = files["src/index.css"] ? 'import "./src/index.css";\n' : (files["src/globals.css"] ? 'import "./src/globals.css";\n' : '');

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
  let indexHtmlContent = files["/index.html"] || files["index.html"];
  const indexHtmlKey = files["/index.html"] !== undefined ? "/index.html" : "index.html";

  const baseHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Preview</title>
    <style>
      body { margin: 0; padding: 0; background: #0b0b0f; color: #fff; }
      #root { opacity: 0; animation: fadeIn 0.5s ease-in forwards 0.3s; }
      @keyframes fadeIn { to { opacity: 1; } }
    </style>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;

  if (!indexHtmlContent) {
    files["/index.html"] = baseHtml;
  } else {
    files[indexHtmlKey] = indexHtmlContent;
  }

  // Force Tailwind CDN injection programmatically to bypass Webpack/Sandpack HTML parser issues.
  // We also explicitly map the Sandpack entry point to the AI's src/App.tsx, and include any CSS imports.
  files["/index.tsx"] = `import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
${cssImport}import App from "./src/App";

// Dynamically inject Tailwind CSS
if (!document.getElementById("tailwind-cdn")) {
  const script = document.createElement("script");
  script.id = "tailwind-cdn";
  script.src = "https://cdn.tailwindcss.com";
  document.head.appendChild(script);
}

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}`;

  return (
    <div className="flex flex-col w-full h-full bg-[#151515] overflow-hidden">
      <style>{`
        /* Hide default Sandpack spinning cube and text */
        .sp-cube-wrapper { display: none !important; }
        .sp-loading > p { display: none !important; }
        .sp-loading > div { display: none !important; }

        /* Add our custom spinner to Sandpack's internal overlay */
        .sp-loading {
          background: #151515 !important;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        }

        .sp-loading::before {
          content: "";
          width: 32px;
          height: 32px;
          border: 2px solid transparent;
          border-bottom-color: white;
          border-right-color: white;
          border-radius: 50%;
          animation: custom-spin 1s linear infinite;
          margin-bottom: 16px;
        }

        .sp-loading::after {
          content: "Compiling...";
          color: #9ca3af;
          font-size: 14px;
          font-weight: 500;
        }

        @keyframes custom-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
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
            "tailwind-merge": "latest",
            "react-router-dom": "latest"
          }
        }}
        style={{ height: "100%", width: "100%", display: "flex", flexDirection: "column" }}
      >
        <SandpackLayout style={{ height: "100%", width: "100%", border: "none", borderRadius: 0, position: "relative" }}>
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