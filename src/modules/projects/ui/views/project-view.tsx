"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { Suspense, useState, useTransition, useEffect } from "react";
import "remixicon/fonts/remixicon.css";
import { useQuery } from "@tanstack/react-query";

import { useTRPC } from "@/trpc/client";
import { Fragment } from "@/generated/prisma";
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
import { StageIndicator } from "../components/stage-indicator";
import { SceneBuilder } from "../components/scene-builder";
import { VideoBuilder } from "../components/video-builder";
import { MessageForm } from "../components/message-form";
import { toast } from "sonner";

interface Props {
  projectId: string;
};

type Stage = "SCENE" | "GENERATING_VIDEO" | "VIDEO" | "SITE";

export const ProjectView = ({ projectId }: Props) => {
  const { has } = useAuth();
  const hasProAccess = has?.({ plan: "pro" });
  const trpc = useTRPC();

  // Load project to get initial state
  const { data: project, refetch } = useQuery(
    trpc.projects.getOne.queryOptions({ id: projectId })
  );

  const [activeFragment, setActiveFragment] = useState<Fragment | null>(null);
  const [tabState, setTabState] = useState<"preview" | "code">("preview");
  const [isDownloading, startTransition] = useTransition();

  // Local state for UI navigation
  const [activeStageTab, setActiveStageTab] = useState<Stage>("SCENE");
  
  // Sync initial render from project
  useEffect(() => {
    if (project && activeStageTab === "SCENE") {
      setActiveStageTab(project.currentStage as Stage);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.currentStage]);

  // Polling for video generation
  useEffect(() => {
    if (project?.currentStage === "GENERATING_VIDEO") {
      const interval = setInterval(() => {
        refetch();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [project?.currentStage, refetch]);

  const handleDownloadZip = () => {
    if (!activeFragment?.files) return;
    
    startTransition(async () => {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      const files = activeFragment.files as { [path: string]: string };
      Object.entries(files).forEach(([path, content]) => {
        if (content !== "BINARY_ASSET_OMITTED_FROM_SYNC") {
          zip.file(path, content);
        }
      });

      if (project?.id) {
        try {
          const res = await fetch(`/api/frames-zip?projectId=${project.id}`);
          if (res.ok) {
            const zipBuffer = await res.arrayBuffer();
            const framesZip = await JSZip.loadAsync(zipBuffer);
            const fileNames = Object.keys(framesZip.files).filter(n => !framesZip.files[n].dir);
            for (const relativePath of fileNames) {
              const fileData = await framesZip.files[relativePath].async("blob");
              zip.file(`public/${relativePath}`, fileData);
            }
          } else {
            console.warn("frames-zip proxy returned non-ok:", res.status);
          }
        } catch(e) {
          console.error("Failed to merge frames zip into codebase download", e);
        }
      }

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

  const handleFramesGenerated = async (startUrl?: string, endUrl?: string) => {
    await refetch();
  };

  if (!project) return null;

  const currentStage = project.currentStage as Stage;
  const isVideoLoading = currentStage === "GENERATING_VIDEO";

  return (
    <div className="h-screen bg-background">
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel
          defaultSize={35}
          minSize={20}
          className="flex flex-col min-h-0 bg-sidebar border-r"
        >
          <ErrorBoundary fallback={<p>Project header error</p>}>
            <Suspense fallback={<p>Loading project...</p>}>
              <ProjectHeader projectId={projectId} />
            </Suspense>
          </ErrorBoundary>

          <StageIndicator 
            currentStage={currentStage} 
            onStageClick={(stage) => setActiveStageTab(stage)} 
          />

          {activeStageTab === "SCENE" && (
             <SceneBuilder 
               projectId={projectId}
               startFrameUrl={project.startFrameUrl}
               endFrameUrl={project.endFrameUrl}
               initialPrompt={project.messages?.[0]?.content || ""}
               onFramesGenerated={handleFramesGenerated}
               onNext={() => setActiveStageTab("VIDEO")}
             />
          )}

          {(activeStageTab === "VIDEO" || activeStageTab === "GENERATING_VIDEO") && (
            <VideoBuilder 
              projectId={projectId}
              isGenerating={isVideoLoading}
              videoUrl={project.videoUrl}
              onNext={() => setActiveStageTab("SITE")}
            />
          )}

          {activeStageTab === "SITE" && (
            <ErrorBoundary fallback={<p>Messages container error</p>}>
              <Suspense fallback={<p>Loading messages...</p>}>
                <MessagesContainer
                  projectId={projectId}
                  activeFragment={activeFragment}
                  setActiveFragment={setActiveFragment}
                  stage="SITE"
                />
              </Suspense>
            </ErrorBoundary>
          )}
        </ResizablePanel>
        
        <ResizableHandle className="hover:bg-primary transition-colors" />
        
        <ResizablePanel
          defaultSize={65}
          minSize={50}
          className="bg-background relative"
        >
          {(activeStageTab === "SCENE" || activeStageTab === "GENERATING_VIDEO") ? (
            <div className="flex items-center justify-center h-full opacity-30 select-none">
               <i className="ri-layout-masonry-line text-8xl" />
            </div>
          ) : activeStageTab === "VIDEO" ? (
            <div className="flex items-center justify-center h-full p-12 bg-black">
               {project.videoUrl && (
                 <video src={project.videoUrl} autoPlay loop muted controls className="w-full max-h-full rounded-2xl shadow-2xl" />
               )}
            </div>
          ) : (
            <Tabs
              className="h-full gap-y-0"
              defaultValue="preview"
              value={tabState}
              onValueChange={(value) => setTabState(value as "preview" | "code")}
            >
              <div className="w-full flex items-center p-2 border-b gap-x-2 bg-background">
                <TabsList className="h-8 p-0 border rounded-md">
                  <TabsTrigger value="preview" className="rounded-md">
                    <i className="ri-eye-line mr-1.5" /> <span>Demo</span>
                  </TabsTrigger>
                  <TabsTrigger value="code" className="rounded-md">
                    <i className="ri-code-line mr-1.5" /> <span>Code</span>
                  </TabsTrigger>
                </TabsList>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 rounded-md px-3 border-border/50 hover:bg-white/5"
                  onClick={handleDownloadZip}
                  disabled={!activeFragment?.files || isDownloading}
                >
                  <i className="ri-download-line w-4 h-4 mr-2" />
                  {isDownloading ? "Zipping..." : "Download ZIP"}
                </Button>
                <div className="ml-auto flex items-center gap-x-2">
                  {!hasProAccess && (
                    <Button asChild size="sm" variant="tertiary">
                      <Link href="/pricing">
                        <i className="ri-crown-line mr-1.5" /> Upgrade
                      </Link>
                    </Button>
                  )}
                  <UserControl />
                </div>
              </div>
              <TabsContent value="preview" className="h-[calc(100%-49px)]">
                {activeFragment ? (
                  <FragmentWeb data={activeFragment} />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full opacity-30 select-none">
                     <i className="ri-layout-masonry-line text-6xl mb-4" />
                     <p>Type a prompt to build your site.</p>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="code" className="min-h-0 h-[calc(100%-49px)] overflow-hidden">
                {!!activeFragment?.files && (
                  <FileExplorer
                    files={activeFragment.files as { [path: string]: string }}
                  />
                )}
              </TabsContent>
            </Tabs>
          )}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};
