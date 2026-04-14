"use client";

import { toast } from "sonner";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { Suspense, useState, useTransition, useEffect, useRef } from "react";
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
  const [selectedSceneUrl, setSelectedSceneUrl] = useState<string | null>(null);

  // Drag-and-drop state – whole window
  const [isDragging, setIsDragging] = useState(false);
  const [droppedFile, setDroppedFile] = useState<File | null>(null);
  const dragCounterRef = useRef(0);

  // Scene generation preview state
  const [sceneIsGenerating, setSceneIsGenerating] = useState(false);
  const [sceneImageUrls, setSceneImageUrls] = useState<string[]>([]);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [extractingVideoUrl, setExtractingVideoUrl] = useState<string | null>(null);
  const [extractedZipUrl, setExtractedZipUrl] = useState<string | null>(null);

  useEffect(() => {
    if (activeStageTab !== "SCENE") return;

    const onDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current++;
      if (e.dataTransfer?.types.includes("Files")) setIsDragging(true);
    };
    const onDragLeave = () => {
      dragCounterRef.current--;
      if (dragCounterRef.current === 0) setIsDragging(false);
    };
    const onDragOver = (e: DragEvent) => e.preventDefault();
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current = 0;
      setIsDragging(false);
      const file = e.dataTransfer?.files?.[0];
      if (file && file.type.startsWith("image/")) setDroppedFile(file);
    };

    window.addEventListener("dragenter", onDragEnter);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onDragEnter);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("drop", onDrop);
      dragCounterRef.current = 0;
      setIsDragging(false);
    };
  }, [activeStageTab]);

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
        } catch (e) {
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

  // Seed scene images from DB on project load
  const rawSceneUrls = (project as Record<string, unknown>)?.sceneImageUrls;
  useEffect(() => {
    const urls: string[] = Array.isArray(rawSceneUrls) ? rawSceneUrls : [];
    setSceneImageUrls(urls);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id, rawSceneUrls]);

  const handleFrameGenerated = async (url: string) => {
    setSceneImageUrls((prev) => [...prev, url]);
    setSceneIsGenerating(false);
    await refetch();
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

  const currentStage = project.currentStage as Stage;
  const isVideoLoading = currentStage === "GENERATING_VIDEO";

  return (
    <div className="h-screen bg-background relative">
      {/* Full-screen drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-none">
          <i className="ri-download-line text-white text-3xl mb-3" />
          <p className="text-white text-lg tracking-wide">Drop your image</p>
        </div>
      )}
      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="absolute inset-0 z-[200] flex items-center justify-center bg-black/85 backdrop-blur-sm"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setLightboxUrl(null); }}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <i className="ri-close-line" />
          </button>
          {lightboxUrl.match(/\.(mp4|webm)$/i) ? (
            <video
              src={lightboxUrl}
              autoPlay
              controls
              loop
              className="max-w-[80%] max-h-[80vh] rounded-2xl shadow-2xl object-contain bg-black"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxUrl}
              alt="Scene preview"
              className="max-w-[80%] max-h-[80vh] rounded-2xl shadow-2xl object-contain bg-black/20"
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
      )}
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel
          defaultSize={sidebarDefaultSize}
          minSize={sidebarMinSize}
          maxSize={sidebarMaxSize}
          className="flex flex-col min-h-0 bg-sidebar border-r"
        >
          <ErrorBoundary fallback={<p>Project header error</p>}>
            <Suspense fallback={<p>Loading project...</p>}>
              <ProjectHeader projectId={projectId} />
            </Suspense>
          </ErrorBoundary>

          <StageIndicator
            currentStage={currentStage}
            activeTab={activeStageTab}
            onStageClick={(stage) => setActiveStageTab(stage)}
          />

          {activeStageTab === "SCENE" && (
            <SceneBuilder
              projectId={projectId}
              initialPrompt={project.messages?.[0]?.content || ""}
              droppedFile={droppedFile}
              onGeneratingChange={setSceneIsGenerating}
              onFrameGenerated={handleFrameGenerated}
              onNext={() => setActiveStageTab("VIDEO")}
            />
          )}

          {(activeStageTab === "VIDEO" || activeStageTab === "GENERATING_VIDEO") && (
            <VideoBuilder
              projectId={projectId}
              selectedSceneUrl={selectedSceneUrl}
              isGenerating={isVideoLoading}
              onNext={() => setActiveStageTab("SITE")}
              onBack={() => setActiveStageTab("SCENE")}
              onClearSelection={() => setSelectedSceneUrl(null)}
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
                  extractedZipUrl={extractedZipUrl}
                  onBack={() => setActiveStageTab("VIDEO")}
                />
              </Suspense>
            </ErrorBoundary>
          )}
        </ResizablePanel>

        <ResizableHandle className="hover:bg-primary transition-colors" />

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
            <div className="w-full flex items-center p-2 border-b gap-x-2 bg-background h-[49px] shrink-0">
              {activeStageTab === "SITE" && (
                <>
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
                </>
              )}
              <div className="ml-auto flex items-center gap-x-3">
                <div className="bg-[#1c1c1c] border border-white/5 rounded-lg px-3 py-1.5 text-[11px] text-white/50 font-medium">
                  1,325/1,500 credits left
                </div>
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

            <div className="flex-1 relative overflow-hidden">
              {(activeStageTab === "SCENE" || activeStageTab === "GENERATING_VIDEO") ? (
                <>
                  {/* Empty state – centered in the full area */}
                  {!sceneIsGenerating && sceneImageUrls.length === 0 && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                      <h2 className="text-lg font-medium text-white mb-2">Build scene</h2>
                      <p className="text-sm text-white/30 leading-relaxed">
                        Describe the world you want. We&apos;ll generate a visual you can animate.
                      </p>
                    </div>
                  )}
                  {/* Cards grid */}
                  {(sceneIsGenerating || sceneImageUrls.length > 0) && (
                    <div className="p-3">
                      <div className="grid grid-cols-3 gap-3">
                        {/* Currently generating card */}
                        {sceneIsGenerating && (
                          <div className="bg-[#1a1a1a] border border-white/5 rounded-xl overflow-hidden">
                            <div className="aspect-video flex flex-col items-center justify-center gap-2">
                              <i className="ri-loader-4-line text-white/60 text-2xl animate-spin" />
                              <p className="text-white/50 text-xs">Generating</p>
                            </div>
                          </div>
                        )}
                        {/* All generated image cards */}
                        {[...sceneImageUrls].reverse().map((url, idx) => (
                          <div key={idx} className="bg-[#1a1a1a] border border-white/5 rounded-xl overflow-hidden group">
                            <div className="relative aspect-video cursor-pointer" onClick={() => setLightboxUrl(url)}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={url}
                                alt={`Generated scene ${idx + 1}`}
                                className="w-full h-full object-cover"
                              />
                              {/* Hover action buttons */}
                              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <a
                                  href={url}
                                  download
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-black/60 backdrop-blur-sm text-white hover:bg-black/80"
                                >
                                  <i className="ri-download-line text-sm" />
                                </a>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setLightboxUrl(url); }}
                                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-black/60 backdrop-blur-sm text-white hover:bg-black/80"
                                >
                                  <i className="ri-fullscreen-line text-sm" />
                                </button>
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                setSelectedSceneUrl(url);
                                setActiveStageTab("VIDEO");
                              }}
                              className="w-full py-2.5 text-xs text-white/60 hover:text-white/90 transition-colors border-t border-white/5"
                            >
                              Use this scene
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : activeStageTab === "VIDEO" ? (
                <div className="flex-1 relative overflow-hidden flex flex-col h-full w-full">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {(!((project as any)?.videoUrls?.length > 0) && !isVideoLoading) ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                      <h2 className="text-lg font-medium text-white mb-2">Build video</h2>
                      <p className="text-sm text-white/30 leading-relaxed max-w-[280px]">
                        Describe the world you want. We&apos;ll generate a visual you can animate.
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 w-full h-full overflow-y-auto">
                      <div className="grid grid-cols-2 gap-4">
                        {isVideoLoading && (
                          <div className="bg-[#1a1a1a] border border-white/5 rounded-xl overflow-hidden aspect-video">
                            <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                              <i className="ri-loader-4-line text-white/60 text-2xl animate-spin" />
                              <p className="text-white/50 text-xs">Generating</p>
                            </div>
                          </div>
                        )}
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {((project as any)?.videoUrls as string[] || []).slice().reverse().map((url, idx) => (
                          <div key={idx} className="bg-[#1a1a1a] border border-white/5 rounded-xl overflow-hidden group flex flex-col">
                            <div className="relative aspect-video">
                                <video src={url} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <a href={url} download onClick={(e) => e.stopPropagation()} className="w-8 h-8 flex items-center justify-center rounded-full bg-black/60 shadow-lg backdrop-blur-sm text-white hover:bg-black/80 transition-transform hover:scale-105">
                                    <i className="ri-download-line text-sm" />
                                  </a>
                                  <button onClick={(e) => { e.stopPropagation(); setLightboxUrl(url); }} className="w-8 h-8 flex items-center justify-center rounded-full bg-black/60 shadow-lg backdrop-blur-sm text-white hover:bg-black/80 transition-transform hover:scale-105">
                                    <i className="ri-fullscreen-line text-sm" />
                                  </button>
                                </div>
                            </div>
                            <button
                              disabled={extractingVideoUrl === url}
                              onClick={async () => {
                                try {
                                  setExtractingVideoUrl(url);
                                  const res = await fetch("/api/extract-frames", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ projectId, videoUrl: url }),
                                  });
                                  if (!res.ok) throw new Error("Failed to extract frames");
                                  const data = await res.json();
                                  setExtractedZipUrl(data.zipUrl);
                                  setSelectedVideoUrl(url);
                                  setActiveStageTab("SITE");
                                } catch (e) {
                                  toast.error("Extraction failed: " + String(e));
                                } finally {
                                  setExtractingVideoUrl(null);
                                }
                              }}
                              className="relative w-full py-3 text-xs font-medium text-white/60 hover:text-white/90 hover:bg-white/5 disabled:opacity-50 transition-colors border-t border-white/5 flex items-center justify-center gap-2"
                            >
                              {extractingVideoUrl === url ? (
                                <>
                                  <i className="ri-loader-4-line animate-spin text-sm" />
                                  <span>Preparing...</span>
                                </>
                              ) : (
                                "Use as background"
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>              ) : (
                <>
                  <TabsContent value="preview" className="h-full m-0">
                    {activeFragment ? (
                      <FragmentWeb data={activeFragment} />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full opacity-30 select-none">
                        <i className="ri-layout-masonry-line text-6xl mb-4" />
                        <p>Type a prompt to build your site.</p>
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
                </>
              )}
            </div>
          </Tabs>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};
