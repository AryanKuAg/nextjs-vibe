import { VideoBlock } from "@/modules/projects/ui/components/background-builder-right";

export interface Template {
  id: string;
  name: string;
  coverUrl: string;
  blocks: VideoBlock[];
}

export const TEMPLATES: Template[] = [
  {
    id: "template-1",
    name: "Airplane",
    coverUrl: "https://storage.googleapis.com/sites.framerate.space/templates/airplane_1.png",
    blocks: [
      {
        startFrameUrl: "https://storage.googleapis.com/sites.framerate.space/templates/airplane_1.png",
        startFrameHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/airplane_1.png"],
        endFrameUrl: "https://storage.googleapis.com/sites.framerate.space/templates/airplane_2.png",
        endFrameHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/airplane_2.png"],
        videoUrl: "https://storage.googleapis.com/sites.framerate.space/templates/airplane_video_1.mp4",
        videoHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/airplane_video_1.mp4"],
        isGeneratingStart: false,
        isGeneratingEnd: false,
        isGeneratingVideo: false,
        startPrompt: "",
        endPrompt: "",
        videoPrompt: "",
      },
      {
        startFrameUrl: "https://storage.googleapis.com/sites.framerate.space/templates/airplane_2.png",
        startFrameHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/airplane_2.png"],
        endFrameUrl: "https://storage.googleapis.com/sites.framerate.space/templates/airplane_3.png",
        endFrameHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/airplane_3.png"],
        videoUrl: "https://storage.googleapis.com/sites.framerate.space/templates/airplane_video_2.mp4",
        videoHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/airplane_video_2.mp4"],
        isGeneratingStart: false,
        isGeneratingEnd: false,
        isGeneratingVideo: false,
        startPrompt: "",
        endPrompt: "",
        videoPrompt: "",
      },
      {
        startFrameUrl: "https://storage.googleapis.com/sites.framerate.space/templates/airplane_3.png",
        startFrameHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/airplane_3.png"],
        endFrameUrl: "https://storage.googleapis.com/sites.framerate.space/templates/airplane_4.png",
        endFrameHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/airplane_4.png"],
        videoUrl: "https://storage.googleapis.com/sites.framerate.space/templates/airplane_video_3.mp4",
        videoHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/airplane_video_3.mp4"],
        isGeneratingStart: false,
        isGeneratingEnd: false,
        isGeneratingVideo: false,
        startPrompt: "",
        endPrompt: "",
        videoPrompt: "",
      }
    ]
  },
  {
    id: "template-2",
    name: "Cave",
    coverUrl: "https://storage.googleapis.com/sites.framerate.space/templates/cave_1.jpg",
    blocks: [
      {
        startFrameUrl: "https://storage.googleapis.com/sites.framerate.space/templates/cave_1.jpg",
        startFrameHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/cave_1.jpg"],
        endFrameUrl: "https://storage.googleapis.com/sites.framerate.space/templates/cave_2.jpg",
        endFrameHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/cave_2.jpg"],
        videoUrl: "https://storage.googleapis.com/sites.framerate.space/templates/cave_video_1.mp4",
        videoHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/cave_video_1.mp4"],
        isGeneratingStart: false,
        isGeneratingEnd: false,
        isGeneratingVideo: false,
        startPrompt: "",
        endPrompt: "",
        videoPrompt: "",
      }
    ]
  }
];
