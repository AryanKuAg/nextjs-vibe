"use client";

import Link from "next/link";
import { Suspense, useState, useTransition, useEffect } from "react";
import "remixicon/fonts/remixicon.css";
import { useQuery } from "@tanstack/react-query";

import { useTRPC } from "@/trpc/client";
import { Fragment } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { UserControl } from "@/components/user-control";
import { FileExplorer } from "@/components/file-explorer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

import { FragmentWeb } from "../components/fragment-web";
import { ProjectHeader } from "../components/project-header";
import { MessagesContainer } from "../components/messages-container";
import { ErrorBoundary } from "react-error-boundary";

interface Props {
  projectId: string;
};

export const ProjectView = ({ projectId }: Props) => {
  const trpc = useTRPC();

  // Load project to get initial state
  const { data: project } = useQuery(
    trpc.projects.getOne.queryOptions({ id: projectId })
  );

  const { data: usage } = useQuery(trpc.usage.status.queryOptions());

  const [activeFragment, setActiveFragment] = useState<Fragment | null>(null);
  const [fragmentKey, setFragmentKey] = useState(0);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const displayUrl = activeFragment?.deploymentUrl;

  const handleCopyUrl = () => {
    if (!displayUrl) return;
    navigator.clipboard.writeText(displayUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };
  
  const [tabState, setTabState] = useState<"preview" | "code">("preview");
  const [isDownloading, startTransition] = useTransition();

  const handleDownloadZip = () => {
    if (!activeFragment?.files) return;

    startTransition(async () => {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      // Add all code files from the fragment
      const files = activeFragment.files as { [path: string]: string };
      Object.entries(files).forEach(([path, content]) => {
        if (content !== "BINARY_ASSET_OMITTED_FROM_SYNC") {
          zip.file(path, content);
        }
      });

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `project-${projectId}.zip`;
      document.body.appendChild(a);
      a.click();

      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  };

  const [windowWidth, setWindowWidth] = useState(1440);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setWindowWidth(window.innerWidth);
      const handleResize = () => setWindowWidth(window.innerWidth);
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  const sidebarDefaultSize = (360 / windowWidth) * 100;
  const sidebarMinSize = (360 / windowWidth) * 100;
  const sidebarMaxSize = (360 / windowWidth) * 100;

  if (!project) return null;

  return (
    <div className="h-screen bg-[#0a0a0a] relative">
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel
          defaultSize={sidebarDefaultSize}
          minSize={sidebarMinSize}
          maxSize={sidebarMaxSize}
          className="flex flex-col min-h-0 bg-[#0a0a0a]"
        >
          <ErrorBoundary fallback={<p>Project header error</p>}>
            <Suspense fallback={<p>Loading project...</p>}>
              <ProjectHeader projectId={projectId} />
            </Suspense>
          </ErrorBoundary>

          <ErrorBoundary fallback={<p>Messages container error</p>}>
            <Suspense fallback={<div className="flex-1 flex items-center justify-center"><i className="ri-loader-4-line animate-spin inline-block text-2xl text-white" /></div>}>
              <MessagesContainer
                projectId={projectId}
                activeFragment={activeFragment}
                setActiveFragment={setActiveFragment}
                stage="SITE"
                initialPrompt={""}
              />
            </Suspense>
          </ErrorBoundary>
        </ResizablePanel>

        <ResizableHandle className="bg-[#282825]" />

        <ResizablePanel
          defaultSize={100 - sidebarDefaultSize}
          minSize={30}
          className="bg-background relative"
        >
          <Tabs
            className="h-full flex flex-col gap-0"
            defaultValue="preview"
            value={tabState}
            onValueChange={(value) => setTabState(value as "preview" | "code")}
          >
            <div className="w-full flex items-center p-2.5 gap-x-2 bg-background h-[56px] shrink-0 border-b border-[#282825]">
              <TabsList className="h-8 p-0.5 rounded-[8px] bg-[#272725]">
                <TabsTrigger value="preview" className="rounded-[8px] data-[state=active]:border-transparent dark:data-[state=active]:border-transparent data-[state=active]:shadow-none dark:data-[state=active]:bg-background">
                  <i className="ri-eye-line" />
                </TabsTrigger>
                <TabsTrigger value="code" className="rounded-[8px] data-[state=active]:border-transparent dark:data-[state=active]:border-transparent data-[state=active]:shadow-none dark:data-[state=active]:bg-background">
                  <i className="ri-code-line" />
                </TabsTrigger>
              </TabsList>
              <Button
                className="h-8 rounded-[8px] px-2 bg-background hover:bg-background border-[0.5px] border-[#3B3B3B]"
                onClick={handleDownloadZip}
                disabled={!activeFragment?.files || isDownloading}
              >
                <i className="ri-download-2-line w-4 h-4 mb-1" />
                {isDownloading ? "Zipping..." : "Download ZIP"}
              </Button>

              {displayUrl && (
                <div className="flex items-center gap-2">
                  <Button
                    className="h-8 w-8 p-0 rounded-[8px] bg-background hover:bg-background border-[0.5px] border-[#3B3B3B]"
                    onClick={() => setFragmentKey((prev) => prev + 1)}
                  >
                    <i className="ri-refresh-line" />
                  </Button>
                  <Button
                    className="h-8 w-8 p-0 rounded-[8px] bg-background hover:bg-background border-[0.5px] border-[#3B3B3B]"
                    asChild
                  >
                    <a href={displayUrl} target="_blank" rel="noopener noreferrer">
                      <i className="ri-external-link-line" />
                    </a>
                  </Button>
                  <Button
                    className="h-8 w-8 p-0 rounded-[8px] bg-background hover:bg-background border-[0.5px] border-[#3B3B3B]"
                    onClick={handleCopyUrl}
                  >
                    {copiedUrl ? <i className="ri-check-line text-white" /> : <i className="ri-file-copy-line" />}
                  </Button>
                </div>
              )}
              
              <div className="ml-auto flex items-center gap-x-1">
                <div className="bg-[#282828] rounded-full px-3 py-2 text-sm text-white">
                  <i className="ri-sparkling-2-fill text-white text-sm mr-1.5" />
                  {usage ? `${Number(usage?.remainingCredits).toLocaleString("en-US")} credits` : "Loading credits..."}
                </div>
                {usage?.plan === "free" && (
                  <Button asChild size="sm" className="bg-white text-[#1C1C1C] hover:bg-white">
                    <Link href="/pricing">
                      Upgrade
                    </Link>
                  </Button>
                )}
                <UserControl />
              </div>
            </div>

            <div className="flex-1 relative overflow-hidden bg-background">
              <TabsContent value="preview" className="h-full m-0">
                {activeFragment ? (
                  <FragmentWeb key={`${activeFragment.id}-${fragmentKey}`} data={activeFragment} />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                    <h2 className="text-sm text-white mb-1">Build site</h2>
                    <p className="text-sm text-[#737373] leading-relaxed">
                      Your website preview will appear here
                    </p>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="code" className="h-full m-0">
                {!!activeFragment?.files && (
                  <FileExplorer
                    files={activeFragment.files as { [path: string]: string }}
                  />
                )}
              </TabsContent>
            </div>
          </Tabs>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};
