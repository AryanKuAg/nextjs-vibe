"use client";

import { toast } from "sonner";
import Link from "next/link";
import { Suspense, useState, useTransition, useEffect, useRef } from "react";
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
import { StageIndicator } from "../components/stage-indicator";
import { BackgroundBuilderLeft } from "../components/background-builder-left";
import { BackgroundBuilderRight, VideoBlock, BlockTab } from "../components/background-builder-right";
import { extractLastFrame } from "@/lib/video-utils";

// Removed frame extraction since end frames are mandatory

interface Props {
  projectId: string;
};

type Stage = "BACKGROUND" | "SITE";

export const ProjectView = ({ projectId }: Props) => {
  const trpc = useTRPC();
  // const queryClient = useQueryClient();

  // Load project to get initial state
  const { data: project, refetch } = useQuery(
    trpc.projects.getOne.queryOptions({ id: projectId })
  );

  const { data: usage, refetch: refetchUsage } = useQuery(trpc.usage.status.queryOptions());

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

  // Local state for UI navigation
  const [activeStageTab, setActiveStageTab] = useState<Stage>("BACKGROUND");

  const emptyBlock: VideoBlock = {
    startFrameUrl: null, startFrameHistory: [],
    endFrameUrl: null, endFrameHistory: [],
    videoUrl: null, videoHistory: [],
    isGeneratingStart: false, isGeneratingEnd: false, isGeneratingVideo: false,
  };

  // Read block count from localStorage SYNCHRONOUSLY in the initializer.
  // This runs before any effect, so there is no race condition.
  const [blocks, setBlocks] = useState<VideoBlock[]>([emptyBlock]);

  const extractedFramesCacheRef = useRef<Record<string, string>>({});

  useEffect(() => {
    blocks.forEach(async (block) => {
      if (block.videoUrl && !block.endFrameUrl && !extractedFramesCacheRef.current[block.videoUrl]) {
        try {
          extractedFramesCacheRef.current[block.videoUrl] = "pending";
          const frameUrl = await extractLastFrame(block.videoUrl);
          extractedFramesCacheRef.current[block.videoUrl] = frameUrl;
          
          setBlocks(prev => {
            const newBlocks = [...prev];
            for (let j = 1; j < newBlocks.length; j++) {
              const rawInherited = newBlocks[j - 1].videoUrl ? (newBlocks[j - 1].endFrameUrl || extractedFramesCacheRef.current[newBlocks[j - 1].videoUrl!] || null) : null;
              const inheritedUrl = rawInherited === "pending" ? null : rawInherited;
              if (newBlocks[j].startFrameUrl !== inheritedUrl) {
                newBlocks[j] = { ...newBlocks[j], startFrameUrl: inheritedUrl };
                if (inheritedUrl) {
                  const history = newBlocks[j].startFrameHistory || [];
                  if (!history.includes(inheritedUrl)) {
                    newBlocks[j].startFrameHistory = [...history, inheritedUrl];
                  }
                }
              }
            }
            return newBlocks;
          });
        } catch (e) {
          console.error("Failed to extract frame for", block.videoUrl, e);
          extractedFramesCacheRef.current[block.videoUrl] = ""; 
        }
      }
    });
  }, [blocks]);

  const [activeBlockIndex, setActiveBlockIndex] = useState(0);
  const [activeBlockTab, setActiveBlockTab] = useState<BlockTab>("START");
  // Prevent the DB restore effect from running more than once
  const hasRestoredFromDBRef = useRef(false);
  // True once the client-side localStorage restore has completed.
  // The save effect is gated on this so it can't overwrite localStorage
  // before the restore runs.
  const [hasRestored, setHasRestored] = useState(false);

  // Restore block count + prompts from localStorage after hydration.
  // Must use useEffect (not useState initializer) so SSR and CSR both start
  // with [emptyBlock] and avoid a hydration mismatch.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`vibe-blocks-${projectId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 1) {
          setBlocks(parsed.map((item: Record<string, string | undefined>) => ({
            ...emptyBlock,
            startPrompt: item?.startPrompt,
            endPrompt: item?.endPrompt,
            videoPrompt: item?.videoPrompt,
          })));
        }
      }
    } catch (e) {
      console.error("[blocks] Failed to restore from localStorage:", e);
    }
    // Signal that restore is done — batched with setBlocks above so
    // the save effect always sees the correct block array on its first run.
    setHasRestored(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount (client-only)

  const handleAddBlock = () => {
    if (blocks.length < 4) {
      setBlocks(prev => {
        const lastBlock = prev[prev.length - 1];
        const rawInherited = lastBlock.videoUrl ? (lastBlock.endFrameUrl || extractedFramesCacheRef.current[lastBlock.videoUrl] || null) : null;
        const inheritedUrl = rawInherited === "pending" ? null : rawInherited;
        const newBlock = {
          ...emptyBlock,
          startFrameUrl: inheritedUrl,
          startFrameHistory: inheritedUrl ? [inheritedUrl] : [],
        };
        return [...prev, newBlock];
      });
      setActiveBlockIndex(blocks.length);
      setActiveBlockTab("END"); // Skip "START" tab since they shouldn't edit the inherited start frame
    }
  };

  const handleRemoveBlock = (index: number) => {
    setBlocks(prev => {
      const newBlocks = [...prev];
      newBlocks.splice(index, 1);
      return newBlocks;
    });
    if (activeBlockIndex >= index) {
      handleSetActiveBlockIndex(Math.max(0, index - 1));
    }
  };

  const handleSetActiveBlockIndex = (index: number) => {
    setActiveBlockIndex(index);
    if (index > 0 && activeBlockTab === "START") {
      setActiveBlockTab("END");
    } else if (index === 0 && activeBlockTab === "END" && !blocks[0]?.endFrameUrl) {
      // Optional: switch back to START if going back to 0? The original code had `if (index === 1) setActiveBlockTab("START");` inside handleRemoveBlock.
      // Let's just do:
    }
    // Also from handleRemoveBlock:
    if (index === 0 && activeBlockIndex > 0) {
      setActiveBlockTab("START"); // revert to START when going back to the first box
    }
  };

  const handleApplyTemplate = (templateBlocks: VideoBlock[]) => {
    setBlocks(templateBlocks);
    setActiveBlockIndex(0);
    setActiveBlockTab("START");
  };

  const updateBlock = (index: number, updates: Partial<VideoBlock>) => {
    setBlocks(prev => {
      const newBlocks = [...prev];
      newBlocks[index] = { ...newBlocks[index], ...updates };

      // Cascade inherited start frames for all subsequent blocks
      for (let i = 1; i < newBlocks.length; i++) {
        const rawInherited = newBlocks[i - 1].videoUrl ? (newBlocks[i - 1].endFrameUrl || extractedFramesCacheRef.current[newBlocks[i - 1].videoUrl!] || null) : null;
        const inheritedUrl = rawInherited === "pending" ? null : rawInherited;
        if (newBlocks[i].startFrameUrl !== inheritedUrl) {
          newBlocks[i] = { ...newBlocks[i], startFrameUrl: inheritedUrl };
          if (inheritedUrl) {
            // Keep history in sync with inherited frame, preventing duplicates
            const history = newBlocks[i].startFrameHistory || [];
            if (!history.includes(inheritedUrl)) {
              newBlocks[i].startFrameHistory = [...history, inheritedUrl];
            }
          }
        }
      }

      return newBlocks;
    });
  };

  const [extractedZipUrl, setExtractedZipUrl] = useState<string | null>(null);
  const [extractedFrameCount, setExtractedFrameCount] = useState<number | undefined>(
    (project as { frameCount?: number | null })?.frameCount ?? undefined
  );
  const [isExtracting, setIsExtracting] = useState(false);

  const handleProceed = async () => {
    // Check if any videos have been generated yet
    const hasVideos = blocks.some(b => b.videoUrl);

    if (!hasVideos) {
      // No videos generated yet — skip extraction and go straight to the site builder
      toast.info("No videos generated yet. You can generate videos and extract frames later.");
      setActiveStageTab("SITE");
      return;
    }

    // Collect the currently active video URL per block (in order)
    const activeVideoUrls = blocks
      .map(b => b.videoUrl)
      .filter((url): url is string => !!url);

    try {
      setIsExtracting(true);
      const res = await fetch("/api/extract-frames", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, activeVideoUrls })
      });
      if (res.ok) {
        const data = await res.json();
        setExtractedZipUrl(data.zipUrl);
        setExtractedFrameCount(data.frameCount);
        toast.success("Frames extracted successfully!");
      } else {
        let errorMsg = res.statusText;
        try {
          const errData = await res.json();
          errorMsg = errData?.error ?? errorMsg;
        } catch { /* body wasn't JSON */ }
        console.error("Failed to extract frames:", errorMsg);
        toast.error(`Extraction failed: ${errorMsg}`);
      }
    } catch (e) {
      console.error(e);
      toast.error("An error occurred during frame extraction");
    } finally {
      setIsExtracting(false);
      setActiveStageTab("SITE");
    }
  };

  // Sync initial render from project
  useEffect(() => {
    if (project) {
      if (project.currentStage === "SITE") {
        setActiveStageTab("SITE");
      } else {
        setActiveStageTab(prev => prev === "SITE" ? "SITE" : "BACKGROUND");
      }
      
      const frameCount = (project as { frameCount?: number | null })?.frameCount;
      if (frameCount && extractedFrameCount === undefined) {
        setExtractedFrameCount(frameCount);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.currentStage, (project as { frameCount?: number | null })?.frameCount]);

  // Merge URL history and prompt data from DB into the existing blocks.
  // Block COUNT is already set correctly from the localStorage restore above.
  // This effect only runs once per project load (gated by hasRestoredFromDBRef).
  useEffect(() => {
    // Wait until localStorage restore is done so we don't clobber the block count
    if (!project || !hasRestored || hasRestoredFromDBRef.current) return;
    hasRestoredFromDBRef.current = true;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sceneUrls = ((project as any)?.sceneImageUrls as any[]) || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const videoUrls = ((project as any)?.videoUrls as any[]) || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dbPrompts = ((project as any)?.prompts as any[]) || [];

    setBlocks(prev => {
      // Start from the current blocks (already size-correct from localStorage initializer)
      const newBlocks = prev.map(b => ({ ...b }));

      const ensureBlock = (idx: number) => {
        while (newBlocks.length <= idx) {
          newBlocks.push({
            startFrameUrl: null, startFrameHistory: [],
            endFrameUrl: null, endFrameHistory: [],
            videoUrl: null, videoHistory: [],
            isGeneratingStart: false, isGeneratingEnd: false, isGeneratingVideo: false,
          });
        }
      };

      // If DB has MORE blocks than localStorage (e.g. after a different device saves),
      // extend newBlocks to match
      if (dbPrompts.length > newBlocks.length) {
        ensureBlock(dbPrompts.length - 1);
      }

      // Merge prompts from DB (DB wins for text prompts since it's the source of truth)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dbPrompts.forEach((dp: any, i: number) => {
        if (newBlocks[i]) {
          if (dp.startPrompt) newBlocks[i].startPrompt = dp.startPrompt;
          if (dp.endPrompt) newBlocks[i].endPrompt = dp.endPrompt;
          if (dp.videoPrompt) newBlocks[i].videoPrompt = dp.videoPrompt;
        }
      });

      // Apply scene image URLs from DB
      sceneUrls.forEach((item: unknown) => {
        if (typeof item === "string") {
          ensureBlock(0);
          const history = newBlocks[0].startFrameHistory || [];
          if (!history.includes(item)) {
            newBlocks[0].startFrameHistory = [...history, item];
            newBlocks[0].startFrameUrl = item;
          }
        } else if (item && typeof item === "object") {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const parsed = item as any;
          const bIdx = parsed.blockIndex || 0;
          ensureBlock(bIdx);
          if (parsed.type === "END") {
            const history = newBlocks[bIdx].endFrameHistory || [];
            if (!history.includes(parsed.url)) {
              newBlocks[bIdx].endFrameHistory = [...history, parsed.url];
              newBlocks[bIdx].endFrameUrl = parsed.url;
            }
          } else {
            const history = newBlocks[bIdx].startFrameHistory || [];
            if (!history.includes(parsed.url)) {
              newBlocks[bIdx].startFrameHistory = [...history, parsed.url];
              newBlocks[bIdx].startFrameUrl = parsed.url;
            }
          }
        }
      });

      // Apply video URLs from DB
      videoUrls.forEach((item: unknown) => {
        if (typeof item === "string") {
          ensureBlock(0);
          const history = newBlocks[0].videoHistory || [];
          if (!history.includes(item)) {
            newBlocks[0].videoHistory = [...history, item];
            newBlocks[0].videoUrl = item;
          }
        } else if (item && typeof item === "object") {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const parsed = item as any;
          const bIdx = parsed.blockIndex || 0;
          ensureBlock(bIdx);
          const history = newBlocks[bIdx].videoHistory || [];
          if (!history.includes(parsed.url)) {
            newBlocks[bIdx].videoHistory = [...history, parsed.url];
            newBlocks[bIdx].videoUrl = parsed.url;
          }
        }
      });

      // Inherit start frame from the previous block's end frame if missing
      for (let i = 1; i < newBlocks.length; i++) {
        const rawInherited = newBlocks[i - 1].videoUrl ? (newBlocks[i - 1].endFrameUrl || extractedFramesCacheRef.current[newBlocks[i - 1].videoUrl!] || null) : null;
        const inheritedUrl = rawInherited === "pending" ? null : rawInherited;

        if (newBlocks[i].startFrameUrl !== inheritedUrl) {
          newBlocks[i].startFrameUrl = inheritedUrl;
          if (inheritedUrl) {
            const history = newBlocks[i].startFrameHistory || [];
            if (!history.includes(inheritedUrl)) {
              newBlocks[i].startFrameHistory = [...history, inheritedUrl];
            }
          }
        }
      }

      return newBlocks;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id, hasRestored]);

  // Sync background generated URLs (like videos from polling) continuously.
  useEffect(() => {
    if (!project || !hasRestored) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sceneUrls = ((project as any)?.sceneImageUrls as any[]) || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const videoUrls = ((project as any)?.videoUrls as any[]) || [];

    setBlocks(prev => {
      const newBlocks = prev.map(b => ({ ...b }));
      let changed = false;

      sceneUrls.forEach((item: unknown) => {
        if (item && typeof item === "object") {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const parsed = item as any;
          const bIdx = parsed.blockIndex || 0;
          if (newBlocks[bIdx]) {
            if (parsed.type === "END") {
              const history = newBlocks[bIdx].endFrameHistory || [];
              if (!history.includes(parsed.url)) {
                newBlocks[bIdx].endFrameHistory = [...history, parsed.url];
                newBlocks[bIdx].endFrameUrl = parsed.url; // set the newest one as active
                newBlocks[bIdx].isGeneratingEnd = false;
                changed = true;
              }
            } else {
              const history = newBlocks[bIdx].startFrameHistory || [];
              if (!history.includes(parsed.url)) {
                newBlocks[bIdx].startFrameHistory = [...history, parsed.url];
                newBlocks[bIdx].startFrameUrl = parsed.url;
                newBlocks[bIdx].isGeneratingStart = false;
                changed = true;
              }
            }
          }
        }
      });

      videoUrls.forEach((item: unknown) => {
        if (item && typeof item === "object") {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const parsed = item as any;
          const bIdx = parsed.blockIndex || 0;
          if (newBlocks[bIdx]) {
            const history = newBlocks[bIdx].videoHistory || [];
            if (!history.includes(parsed.url)) {
              newBlocks[bIdx].videoHistory = [...history, parsed.url];
              newBlocks[bIdx].videoUrl = parsed.url;
              newBlocks[bIdx].isGeneratingVideo = false;
              changed = true;
            }
          }
        }
      });

      if (changed) {
        // Cascade start frame from previous block's end frame if missing
        for (let i = 1; i < newBlocks.length; i++) {
          const rawInherited = newBlocks[i - 1].videoUrl ? (newBlocks[i - 1].endFrameUrl || extractedFramesCacheRef.current[newBlocks[i - 1].videoUrl!] || null) : null;
          const inheritedUrl = rawInherited === "pending" ? null : rawInherited;

          if (newBlocks[i].startFrameUrl !== inheritedUrl) {
            newBlocks[i] = { ...newBlocks[i], startFrameUrl: inheritedUrl };
            if (inheritedUrl) {
              const history = newBlocks[i].startFrameHistory || [];
              if (!history.includes(inheritedUrl)) {
                newBlocks[i].startFrameHistory = [...history, inheritedUrl];
              }
            }
          }
        }
        return newBlocks;
      }

      return prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.sceneImageUrls, project?.videoUrls, hasRestored]);



  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Persist block prompts to localStorage and DB on every change.
  // Gated on hasRestored so we don't write stale state before the
  // localStorage restore useEffect has run.
  useEffect(() => {
    if (!hasRestored || !project?.id || blocks.length === 0) return;

    const dataToSave = blocks.map(b => ({
      startPrompt: b.startPrompt,
      endPrompt: b.endPrompt,
      videoPrompt: b.videoPrompt
    }));

    // Save locally immediately
    localStorage.setItem(`vibe-blocks-${project.id}`, JSON.stringify(dataToSave));

    // Debounce saving to DB
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    const { mutationFn } = trpc.projects.updatePrompts.mutationOptions();
    saveTimeoutRef.current = setTimeout(() => {
      if (mutationFn) {
        mutationFn({ projectId: project.id, prompts: dataToSave })
          .catch(err => console.error("Failed to save prompts to DB:", err));
      }
    }, 1500);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasRestored, project?.id, blocks]);

  // const cancelVideoGeneration = useMutation(
  //   trpc.projects.cancelVideoGeneration.mutationOptions({
  //     onSuccess: () => {
  //       toast.success("Generation cancelled");
  //       queryClient.invalidateQueries(trpc.projects.getOne.queryOptions({ id: projectId }));
  //     },
  //     onError: (error) => {
  //       toast.error("Failed to cancel: " + error.message, { duration: Infinity });
  //     }
  //   })
  // );

  // Polling for video generation
  useEffect(() => {
    if (project?.currentStage === "GENERATING_VIDEO") {
      const interval = setInterval(() => {
        refetch();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [project?.currentStage, refetch]);

  // Track video generation status to show error toasts
  const previousIsVideoLoading = useRef(project?.currentStage === "GENERATING_VIDEO");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const previousVideoUrlsLength = useRef(((project as any)?.videoUrls as string[] || []).length);

  useEffect(() => {
    const isVideoLoading = project?.currentStage === "GENERATING_VIDEO";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const currentVideoUrlsLength = ((project as any)?.videoUrls as string[] || []).length;

    if (previousIsVideoLoading.current && !isVideoLoading) {
      if (currentVideoUrlsLength === previousVideoUrlsLength.current) {
        toast.error("Video generation failed. This usually happens if your prompt triggers the AI safety filters, or inputs were invalid. Please tweak your prompt and try again.", { duration: Infinity });

        setBlocks(prev => {
          const newBlocks = [...prev];
          const generatingIndex = newBlocks.findIndex(b => b.isGeneratingVideo);
          if (generatingIndex !== -1) {
            newBlocks[generatingIndex] = { ...newBlocks[generatingIndex], isGeneratingVideo: false };
          }
          return newBlocks;
        });
      } else {
        toast.success("Video generated successfully!");
        refetchUsage();

        // Find the block that was generating and update it
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const newVideoUrls = ((project as any)?.videoUrls as any[] || []);
        if (newVideoUrls.length > 0) {
          setBlocks(prev => {
            const newBlocks = [...prev];
            const lastItem = newVideoUrls[newVideoUrls.length - 1];
            const finalUrl = typeof lastItem === "string" ? lastItem : lastItem?.url;
            const targetIndex = typeof lastItem === "string" ? 0 : (lastItem?.blockIndex || 0);

            // Ensure array has enough blocks (rare edge case, but safe)
            while (newBlocks.length <= targetIndex) {
              newBlocks.push({ ...emptyBlock });
            }

            const targetBlock = newBlocks[targetIndex];

            if (finalUrl) {
              let newHistory = targetBlock.videoHistory || [];
              if (!newHistory.includes(finalUrl)) {
                newHistory = [...newHistory, finalUrl];
              }

              newBlocks[targetIndex] = {
                ...targetBlock,
                videoUrl: finalUrl,
                videoHistory: newHistory,
                isGeneratingVideo: false
              };
            }

            // Also reset any stuck loaders
            for (let i = 0; i < newBlocks.length; i++) {
              if (i !== targetIndex) {
                newBlocks[i] = { ...newBlocks[i], isGeneratingVideo: false };
              }
            }
            return newBlocks;
          });
        }
      }
    }

    previousIsVideoLoading.current = isVideoLoading;
    previousVideoUrlsLength.current = currentVideoUrlsLength;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project, refetchUsage]);

  const handleDownloadZip = () => {
    if (!activeFragment?.files) return;

    startTransition(async () => {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      // Add all code files from the fragment (skip binary placeholders)
      const files = activeFragment.files as { [path: string]: string };
      Object.entries(files).forEach(([path, content]) => {
        if (content !== "BINARY_ASSET_OMITTED_FROM_SYNC") {
          zip.file(path, content);
        }
      });

      // Merge extracted frames (public/ folder) if available
      const cdnBase = process.env.NEXT_PUBLIC_CDN_URL || `https://storage.googleapis.com/${process.env.GCS_BUCKET_NAME || 'sites.framerate.space'}`;
      const resolvedZipUrl = extractedZipUrl || (project?.id ? `${cdnBase}/frames/${project.id}/frames.zip` : null);
      if (resolvedZipUrl) {
        try {
          // Fetch directly from storage bucket since it supports CORS, 
          // bypassing Vercel's 4.5MB serverless response limit
          let fetchUrl = resolvedZipUrl;
          // Ensure we hit storage.googleapis.com directly if the CDN doesn't forward CORS headers
          if (!fetchUrl.includes("storage.googleapis.com")) {
             const bucketName = process.env.NEXT_PUBLIC_GCS_BUCKET_NAME || 'sites.framerate.space';
             const pathParts = new URL(resolvedZipUrl).pathname.split('/').filter(Boolean);
             const pathKey = pathParts.slice(pathParts.indexOf('frames')).join('/');
             fetchUrl = `https://storage.googleapis.com/${bucketName}/${pathKey}`;
          }

          const res = await fetch(fetchUrl);
          if (res.ok) {
            const zipBuffer = await res.arrayBuffer();
            const framesZip = await JSZip.loadAsync(zipBuffer);
            const fileNames = Object.keys(framesZip.files).filter(n => !framesZip.files[n].dir);
            for (const relativePath of fileNames) {
              const fileData = await framesZip.files[relativePath].async("blob");
              zip.file(`public/${relativePath}`, fileData);
            }
          } else {
            console.warn("[Download ZIP] Direct fetch returned non-ok:", res.status);
          }
        } catch (e) {
          console.error("[Download ZIP] Failed to merge frames zip:", e);
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

  return (
    <div className="h-screen bg-background relative">
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel
          defaultSize={sidebarDefaultSize}
          minSize={sidebarMinSize}
          maxSize={sidebarMaxSize}
          className="flex flex-col min-h-0 bg-background"
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
            hasFrames={!!extractedZipUrl || extractedFrameCount !== undefined}
            hasMessages={!!project?.messages?.length}
          />

          {activeStageTab === "BACKGROUND" && (
            <BackgroundBuilderLeft
              projectId={projectId}
              blocks={blocks}
              activeBlockIndex={activeBlockIndex}
              activeBlockTab={activeBlockTab}
              onTabChange={setActiveBlockTab}
              onProceed={handleProceed}
              onSkip={() => setActiveStageTab("SITE")}
              isExtracting={isExtracting}
              updateBlock={updateBlock}
              onApplyTemplate={handleApplyTemplate}
            />
          )}

          {activeStageTab === "SITE" && (
            <ErrorBoundary fallback={<p>Messages container error</p>}>
              <Suspense fallback={<div className="flex-1 flex items-center justify-center"><i className="ri-loader-4-line animate-spin inline-block text-2xl text-white" /></div>}>
                <MessagesContainer
                  projectId={projectId}
                  activeFragment={activeFragment}
                  setActiveFragment={setActiveFragment}
                  stage="SITE"
                  extractedZipUrl={extractedZipUrl}
                  extractedFrameCount={extractedFrameCount}
                  onBack={() => setActiveStageTab("BACKGROUND")}
                />
              </Suspense>
            </ErrorBoundary>
          )}
        </ResizablePanel>

        <ResizableHandle className="hover:bg-white transition-colors" />

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
            <div className="w-full flex items-center p-2.5  gap-x-2 bg-background h-[56px] shrink-0 border-b">
              {activeStageTab === "SITE" && (
                <>
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
                </>
              )}
              <div className="ml-auto flex items-center gap-x-1">
                <div className="bg-[#282828]  rounded-full px-3 py-2 text-sm text-white">
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
              {activeStageTab === "BACKGROUND" ? (
                <BackgroundBuilderRight
                  blocks={blocks}
                  activeBlockIndex={activeBlockIndex}
                  setActiveBlockIndex={handleSetActiveBlockIndex}
                  onAddBlock={handleAddBlock}
                  onRemoveBlock={handleRemoveBlock}
                  updateBlock={updateBlock}
                />
              ) : (
                <>
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
                </>
              )}
            </div>
          </Tabs>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};
