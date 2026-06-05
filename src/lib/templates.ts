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
  },
  {
    id: "template-3",
    name: "Mars",
    coverUrl: "https://storage.googleapis.com/sites.framerate.space/templates/mars_image_1.jpg",
    blocks: [
      {
        startFrameUrl: "https://storage.googleapis.com/sites.framerate.space/templates/mars_image_1.jpg",
        startFrameHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/mars_image_1.jpg"],
        endFrameUrl: "https://storage.googleapis.com/sites.framerate.space/templates/mars_image_2.png",
        endFrameHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/mars_image_2.png"],
        videoUrl: "https://storage.googleapis.com/sites.framerate.space/templates/mars_video_1.mp4",
        videoHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/mars_video_1.mp4"],
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
    id: "template-4",
    name: "Beach",
    coverUrl: "https://storage.googleapis.com/sites.framerate.space/templates/beach_image_1.jpg",
    blocks: [
      {
        startFrameUrl: "https://storage.googleapis.com/sites.framerate.space/templates/beach_image_1.jpg",
        startFrameHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/beach_image_1.jpg"],
        endFrameUrl: "https://storage.googleapis.com/sites.framerate.space/templates/beach_image_2.png",
        endFrameHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/beach_image_2.png"],
        videoUrl: "https://storage.googleapis.com/sites.framerate.space/templates/beach_video_1.mp4",
        videoHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/beach_video_1.mp4"],
        isGeneratingStart: false,
        isGeneratingEnd: false,
        isGeneratingVideo: false,
        startPrompt: "",
        endPrompt: "",
        videoPrompt: "",
      },
      {
        startFrameUrl: "https://storage.googleapis.com/sites.framerate.space/templates/beach_image_2.png",
        startFrameHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/beach_image_2.png"],
        endFrameUrl: "https://storage.googleapis.com/sites.framerate.space/templates/beach_image_3.png",
        endFrameHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/beach_image_3.png"],
        videoUrl: "https://storage.googleapis.com/sites.framerate.space/templates/beach_video_2.mp4",
        videoHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/beach_video_2.mp4"],
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
    id: "template-5",
    name: "Green Train",
    coverUrl: "https://storage.googleapis.com/sites.framerate.space/templates/green_train_image_1.jpeg",
    blocks: [
      {
        startFrameUrl: "https://storage.googleapis.com/sites.framerate.space/templates/green_train_image_1.jpeg",
        startFrameHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/green_train_image_1.jpeg"],
        endFrameUrl: "https://storage.googleapis.com/sites.framerate.space/templates/green_train_image_2.png",
        endFrameHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/green_train_image_2.png"],
        videoUrl: "https://storage.googleapis.com/sites.framerate.space/templates/green_train_video_1.mp4",
        videoHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/green_train_video_1.mp4"],
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
    id: "template-6",
    name: "Forest",
    coverUrl: "https://storage.googleapis.com/sites.framerate.space/templates/forest_image_1.jpg",
    blocks: [
      {
        startFrameUrl: "https://storage.googleapis.com/sites.framerate.space/templates/forest_image_1.jpg",
        startFrameHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/forest_image_1.jpg"],
        endFrameUrl: "https://storage.googleapis.com/sites.framerate.space/templates/forest_image_2.jpg",
        endFrameHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/forest_image_2.jpg"],
        videoUrl: "https://storage.googleapis.com/sites.framerate.space/templates/forest_video_1.mp4",
        videoHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/forest_video_1.mp4"],
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
    id: "hero-template-1",
    name: "Human",
    coverUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_human_image_1.png",
    blocks: [
      {
        startFrameUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_human_image_1.png",
        startFrameHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/hero_human_image_1.png"],
        endFrameUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_human_image_2.png",
        endFrameHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/hero_human_image_2.png"],
        videoUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_human_video_1.mp4",
        videoHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/hero_human_video_1.mp4"],
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
    id: "hero-template-2",
    name: "Blob",
    coverUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_blob_image_1.jpeg",
    blocks: [
      {
        startFrameUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_blob_image_1.jpeg",
        startFrameHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/hero_blob_image_1.jpeg"],
        endFrameUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_blob_image_2.png",
        endFrameHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/hero_blob_image_2.png"],
        videoUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_blob_video_1.mp4",
        videoHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/hero_blob_video_1.mp4"],
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
    id: "hero-template-3",
    name: "Mars",
    coverUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_mars_image_1.jpg",
    blocks: [
      {
        startFrameUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_mars_image_1.jpg",
        startFrameHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/hero_mars_image_1.jpg"],
        endFrameUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_mars_image_2.png",
        endFrameHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/hero_mars_image_2.png"],
        videoUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_mars_video_1.mp4",
        videoHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/hero_mars_video_1.mp4"],
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
    id: "hero-template-4",
    name: "Red Man",
    coverUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_red_man_image_1.jpeg",
    blocks: [
      {
        startFrameUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_red_man_image_1.jpeg",
        startFrameHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/hero_red_man_image_1.jpeg"],
        endFrameUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_red_man_image_2.png",
        endFrameHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/hero_red_man_image_2.png"],
        videoUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_red_man_video_1.mp4",
        videoHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/hero_red_man_video_1.mp4"],
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
    id: "hero-template-5",
    name: "Purple Coins",
    coverUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_purple_coins_image_1.jpeg",
    blocks: [
      {
        startFrameUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_purple_coins_image_1.jpeg",
        startFrameHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/hero_purple_coins_image_1.jpeg"],
        endFrameUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_purple_coins_image_2.png",
        endFrameHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/hero_purple_coins_image_2.png"],
        videoUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_purple_coins_video_1.mp4",
        videoHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/hero_purple_coins_video_1.mp4"],
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
    id: "hero-template-6",
    name: "Man Grass Field",
    coverUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_man_grass_field_image_1.jpg",
    blocks: [
      {
        startFrameUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_man_grass_field_image_1.jpg",
        startFrameHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/hero_man_grass_field_image_1.jpg"],
        endFrameUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_man_grass_field_image_2.jpg",
        endFrameHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/hero_man_grass_field_image_2.jpg"],
        videoUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_man_grass_field_video_1.mp4",
        videoHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/hero_man_grass_field_video_1.mp4"],
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
    id: "hero-template-7",
    name: "Modern Home",
    coverUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_modern_home_image_1.jpeg",
    blocks: [
      {
        startFrameUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_modern_home_image_1.jpeg",
        startFrameHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/hero_modern_home_image_1.jpeg"],
        endFrameUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_modern_home_image_2.png",
        endFrameHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/hero_modern_home_image_2.png"],
        videoUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_modern_home_video_1.mp4",
        videoHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/hero_modern_home_video_1.mp4"],
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
    id: "hero-template-8",
    name: "Train",
    coverUrl: "",
    blocks: [
      {
        startFrameUrl: "",
        startFrameHistory: [""],
        endFrameUrl: "",
        endFrameHistory: [""],
        videoUrl: "",
        videoHistory: [""],
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
    id: "hero-template-9",
    name: "Grassfield",
    coverUrl: "",
    blocks: [
      {
        startFrameUrl: "",
        startFrameHistory: [""],
        endFrameUrl: "",
        endFrameHistory: [""],
        videoUrl: "",
        videoHistory: [""],
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
    id: "hero-template-10",
    name: "Galaxy Spinning",
    coverUrl: "",
    blocks: [
      {
        startFrameUrl: "",
        startFrameHistory: [""],
        endFrameUrl: "",
        endFrameHistory: [""],
        videoUrl: "",
        videoHistory: [""],
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
    id: "hero-template-11",
    name: "Grass Flower",
    coverUrl: "",
    blocks: [
      {
        startFrameUrl: "",
        startFrameHistory: [""],
        endFrameUrl: "",
        endFrameHistory: [""],
        videoUrl: "",
        videoHistory: [""],
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
    id: "hero-template-12",
    name: "Dark Flowers",
    coverUrl: "",
    blocks: [
      {
        startFrameUrl: "",
        startFrameHistory: [""],
        endFrameUrl: "",
        endFrameHistory: [""],
        videoUrl: "",
        videoHistory: [""],
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
    id: "hero-template-13",
    name: "Red Waves",
    coverUrl: "",
    blocks: [
      {
        startFrameUrl: "",
        startFrameHistory: [""],
        endFrameUrl: "",
        endFrameHistory: [""],
        videoUrl: "",
        videoHistory: [""],
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
    id: "hero-template-14",
    name: "Robot",
    coverUrl: "",
    blocks: [
      {
        startFrameUrl: "",
        startFrameHistory: [""],
        endFrameUrl: "",
        endFrameHistory: [""],
        videoUrl: "",
        videoHistory: [""],
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
    id: "hero-template-15",
    name: "Coins",
    coverUrl: "",
    blocks: [
      {
        startFrameUrl: "",
        startFrameHistory: [""],
        endFrameUrl: "",
        endFrameHistory: [""],
        videoUrl: "",
        videoHistory: [""],
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
    id: "hero-template-16",
    name: "Night Study",
    coverUrl: "",
    blocks: [
      {
        startFrameUrl: "",
        startFrameHistory: [""],
        endFrameUrl: "",
        endFrameHistory: [""],
        videoUrl: "",
        videoHistory: [""],
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
    id: "hero-template-17",
    name: "Grass Animal",
    coverUrl: "",
    blocks: [
      {
        startFrameUrl: "",
        startFrameHistory: [""],
        endFrameUrl: "",
        endFrameHistory: [""],
        videoUrl: "",
        videoHistory: [""],
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
    id: "hero-template-18",
    name: "Windmill",
    coverUrl: "",
    blocks: [
      {
        startFrameUrl: "",
        startFrameHistory: [""],
        endFrameUrl: "",
        endFrameHistory: [""],
        videoUrl: "",
        videoHistory: [""],
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
    id: "hero-template-19",
    name: "Cube",
    coverUrl: "",
    blocks: [
      {
        startFrameUrl: "",
        startFrameHistory: [""],
        endFrameUrl: "",
        endFrameHistory: [""],
        videoUrl: "",
        videoHistory: [""],
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
    id: "hero-template-20",
    name: "Planet Walking",
    coverUrl: "",
    blocks: [
      {
        startFrameUrl: "",
        startFrameHistory: [""],
        endFrameUrl: "",
        endFrameHistory: [""],
        videoUrl: "",
        videoHistory: [""],
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
    id: "hero-template-21",
    name: "Waterfall",
    coverUrl: "",
    blocks: [
      {
        startFrameUrl: "",
        startFrameHistory: [""],
        endFrameUrl: "",
        endFrameHistory: [""],
        videoUrl: "",
        videoHistory: [""],
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
    id: "hero-template-22",
    name: "Green Landscape",
    coverUrl: "",
    blocks: [
      {
        startFrameUrl: "",
        startFrameHistory: [""],
        endFrameUrl: "",
        endFrameHistory: [""],
        videoUrl: "",
        videoHistory: [""],
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
    id: "hero-template-23",
    name: "Night Grass",
    coverUrl: "",
    blocks: [
      {
        startFrameUrl: "",
        startFrameHistory: [""],
        endFrameUrl: "",
        endFrameHistory: [""],
        videoUrl: "",
        videoHistory: [""],
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
    id: "hero-template-24",
    name: "Man Wave",
    coverUrl: "",
    blocks: [
      {
        startFrameUrl: "",
        startFrameHistory: [""],
        endFrameUrl: "",
        endFrameHistory: [""],
        videoUrl: "",
        videoHistory: [""],
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
    id: "hero-template-25",
    name: "Meditation",
    coverUrl: "",
    blocks: [
      {
        startFrameUrl: "",
        startFrameHistory: [""],
        endFrameUrl: "",
        endFrameHistory: [""],
        videoUrl: "",
        videoHistory: [""],
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
    id: "hero-template-26",
    name: "Man Walking",
    coverUrl: "",
    blocks: [
      {
        startFrameUrl: "",
        startFrameHistory: [""],
        endFrameUrl: "",
        endFrameHistory: [""],
        videoUrl: "",
        videoHistory: [""],
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
    id: "hero-template-27",
    name: "Butterfly",
    coverUrl: "",
    blocks: [
      {
        startFrameUrl: "",
        startFrameHistory: [""],
        endFrameUrl: "",
        endFrameHistory: [""],
        videoUrl: "",
        videoHistory: [""],
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
    id: "hero-template-28",
    name: "Flower Landscape",
    coverUrl: "",
    blocks: [
      {
        startFrameUrl: "",
        startFrameHistory: [""],
        endFrameUrl: "",
        endFrameHistory: [""],
        videoUrl: "",
        videoHistory: [""],
        isGeneratingStart: false,
        isGeneratingEnd: false,
        isGeneratingVideo: false,
        startPrompt: "",
        endPrompt: "",
        videoPrompt: "",
      }
    ]
  },

];
