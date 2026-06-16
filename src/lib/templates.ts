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
    coverUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_train_image_1.jpeg",
    blocks: [
      {
        startFrameUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_train_image_1.jpeg",
        startFrameHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/hero_train_image_1.jpeg"],
        endFrameUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_train_image_2.png",
        endFrameHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/hero_train_image_2.png"],
        videoUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_train_video_1.mp4",
        videoHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/hero_train_video_1.mp4"],
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
    coverUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_grassfield_image_1.jpeg",
    blocks: [
      {
        startFrameUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_grassfield_image_1.jpeg",
        startFrameHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/hero_grassfield_image_1.jpeg"],
        endFrameUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_man_grass_field_image_2.jpg",
        endFrameHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/hero_man_grass_field_image_2.jpg"],
        videoUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_grassfield_video_1.mp4",
        videoHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/hero_grassfield_video_1.mp4"],
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
    coverUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_galaxy_spinning_image_1.jpg",
    blocks: [
      {
        startFrameUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_galaxy_spinning_image_1.jpg",
        startFrameHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/hero_galaxy_spinning_image_1.jpg"],
        endFrameUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_galaxy_spinning_image_2.png",
        endFrameHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/hero_galaxy_spinning_image_2.png"],
        videoUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_galaxy_spinning_video_1.mp4",
        videoHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/hero_galaxy_spinning_video_1.mp4"],
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
    coverUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_grass_flower_image_1.png",
    blocks: [
      {
        startFrameUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_grass_flower_image_1.png",
        startFrameHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/hero_grass_flower_image_1.png"],
        endFrameUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_grass_flower_image_2.png",
        endFrameHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/hero_grass_flower_image_2.png"],
        videoUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_grass_flower_video_1.mp4",
        videoHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/hero_grass_flower_video_1.mp4"],
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
    coverUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_dark_flowers_image_1.jpeg",
    blocks: [
      {
        startFrameUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_dark_flowers_image_1.jpeg",
        startFrameHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/hero_dark_flowers_image_1.jpeg"],
        endFrameUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_dark_flowers_image_2.png",
        endFrameHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/hero_dark_flowers_image_2.png"],
        videoUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_dark_flowers_video_1.mp4",
        videoHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/hero_dark_flowers_video_1.mp4"],
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
    coverUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_red_waves_image_1.jpeg",
    blocks: [
      {
        startFrameUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_red_waves_image_1.jpeg",
        startFrameHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/hero_red_waves_image_1.jpeg"],
        endFrameUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_red_waves_image_2.png",
        endFrameHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/hero_red_waves_image_2.png"],
        videoUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_red_waves_video_1.mp4",
        videoHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/hero_red_waves_video_1.mp4"],
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
    coverUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_robot_image_1.png",
    blocks: [
      {
        startFrameUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_robot_image_1.png",
        startFrameHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/hero_robot_image_1.png"],
        endFrameUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_robot_image_2.png",
        endFrameHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/hero_robot_image_2.png"],
        videoUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_robot_video_1.mp4",
        videoHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/hero_robot_video_1.mp4"],
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
    coverUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_coins_image_1.png",
    blocks: [
      {
        startFrameUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_coins_image_1.png",
        startFrameHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/hero_coins_image_1.png"],
        endFrameUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_coins_image_2.png",
        endFrameHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/hero_coins_image_2.png"],
        videoUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_coins_video_1.mp4",
        videoHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/hero_coins_video_1.mp4"],
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
    coverUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_night_study_image_1.jpeg",
    blocks: [
      {
        startFrameUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_night_study_image_1.jpeg",
        startFrameHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/hero_night_study_image_1.jpeg"],
        endFrameUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_night_study_image_2.png",
        endFrameHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/hero_night_study_image_2.png"],
        videoUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_night_study_video_1.mp4",
        videoHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/hero_night_study_video_1.mp4"],
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
    coverUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_grass_animal_image_1.png",
    blocks: [
      {
        startFrameUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_grass_animal_image_1.png",
        startFrameHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/hero_grass_animal_image_1.png"],
        endFrameUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_grass_animal_image_2.png",
        endFrameHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/hero_grass_animal_image_2.png"],
        videoUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_grass_animal_video_1.mp4",
        videoHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/hero_grass_animal_video_1.mp4"],
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
    coverUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_windmill_image_1.jpeg",
    blocks: [
      {
        startFrameUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_windmill_image_1.jpeg",
        startFrameHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/hero_windmill_image_1.jpeg"],
        endFrameUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_windmill_image_2.png",
        endFrameHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/hero_windmill_image_2.png"],
        videoUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_windmill_video_1.mp4",
        videoHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/hero_windmill_video_1.mp4"],
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
    coverUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_cube_image_1.jpeg",
    blocks: [
      {
        startFrameUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_cube_image_1.jpeg",
        startFrameHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/hero_cube_image_1.jpeg"],
        endFrameUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_cube_image_2.png",
        endFrameHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/hero_cube_image_2.png"],
        videoUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_cube_video_1.mp4",
        videoHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/hero_cube_video_1.mp4"],
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
    coverUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_planet_walking_image_1.jpg",
    blocks: [
      {
        startFrameUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_planet_walking_image_1.jpg",
        startFrameHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/hero_planet_walking_image_1.jpg"],
        endFrameUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_planet_walking_image_2.png",
        endFrameHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/hero_planet_walking_image_2.png"],
        videoUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_planet_walking_video_1.mp4",
        videoHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/hero_planet_walking_video_1.mp4"],
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
    coverUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_waterfall_image_1.jpeg",
    blocks: [
      {
        startFrameUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_waterfall_image_1.jpeg",
        startFrameHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/hero_waterfall_image_1.jpeg"],
        endFrameUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_waterfall_image_2.png",
        endFrameHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/hero_waterfall_image_2.png"],
        videoUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_waterfall_video_1.mp4",
        videoHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/hero_waterfall_video_1.mp4"],
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
    coverUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_green_landscape_image_1.jpeg",
    blocks: [
      {
        startFrameUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_green_landscape_image_1.jpeg",
        startFrameHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/hero_green_landscape_image_1.jpeg"],
        endFrameUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_green_landscape_image_2.png",
        endFrameHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/hero_green_landscape_image_2.png"],
        videoUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_green_landscape_video_1.mp4",
        videoHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/hero_green_landscape_video_1.mp4"],
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
    coverUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_night_grass_image_1.jpeg",
    blocks: [
      {
        startFrameUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_night_grass_image_1.jpeg",
        startFrameHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/hero_night_grass_image_1.jpeg"],
        endFrameUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_night_grass_image_2.png",
        endFrameHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/hero_night_grass_image_2.png"],
        videoUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_night_grass_video_1.mp4",
        videoHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/hero_night_grass_video_1.mp4"],
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
    coverUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_man_wave_image_1.jpeg",
    blocks: [
      {
        startFrameUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_man_wave_image_1.jpeg",
        startFrameHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/hero_man_wave_image_1.jpeg"],
        endFrameUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_man_wave_image_2.png",
        endFrameHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/hero_man_wave_image_2.png"],
        videoUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_man_wave_video_1.mp4",
        videoHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/hero_man_wave_video_1.mp4"],
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
    coverUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_meditation_image_1.jpeg",
    blocks: [
      {
        startFrameUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_meditation_image_1.jpeg",
        startFrameHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/hero_meditation_image_1.jpeg"],
        endFrameUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_meditation_image_2.png",
        endFrameHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/hero_meditation_image_2.png"],
        videoUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_meditation_video_1.mp4",
        videoHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/hero_meditation_video_1.mp4"],
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
    coverUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_man_walking_image_1.jpg",
    blocks: [
      {
        startFrameUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_man_walking_image_1.jpg",
        startFrameHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/hero_man_walking_image_1.jpg"],
        endFrameUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_man_walking_image_2.png",
        endFrameHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/hero_man_walking_image_2.png"],
        videoUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_man_walking_video_1.mp4",
        videoHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/hero_man_walking_video_1.mp4"],
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
    coverUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_butterfly_image_1.jpeg",
    blocks: [
      {
        startFrameUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_butterfly_image_1.jpeg",
        startFrameHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/hero_butterfly_image_1.jpeg"],
        endFrameUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_butterfly_image_2.png",
        endFrameHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/hero_butterfly_image_2.png"],
        videoUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_butterfly_video_1.mp4",
        videoHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/hero_butterfly_video_1.mp4"],
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
    coverUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_flower_landscape_image_1.jpeg",
    blocks: [
      {
        startFrameUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_flower_landscape_image_1.jpeg",
        startFrameHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/hero_flower_landscape_image_1.jpeg"],
        endFrameUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_flower_landscape_image_2.png",
        endFrameHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/hero_flower_landscape_image_2.png"],
        videoUrl: "https://storage.googleapis.com/sites.framerate.space/templates/hero_flower_landscape_video_1.mp4",
        videoHistory: ["https://storage.googleapis.com/sites.framerate.space/templates/hero_flower_landscape_video_1.mp4"],
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
    id: "pesudo-template-1",
    name: "Blob",
    coverUrl: "https://pub-2c7b2ddd2cef4117b3dcb1c04704d106.r2.dev/templates/Blob/template.png",
    blocks: [
      {
        startFrameUrl: "https://pub-2c7b2ddd2cef4117b3dcb1c04704d106.r2.dev/templates/Blob/bg-first-frame.jpg",
        startFrameHistory: ["https://pub-2c7b2ddd2cef4117b3dcb1c04704d106.r2.dev/templates/Blob/bg-first-frame.jpg"],
        endFrameUrl: "",
        endFrameHistory: [""],
        videoUrl: "https://pub-2c7b2ddd2cef4117b3dcb1c04704d106.r2.dev/templates/Blob/bg.mp4",
        videoHistory: ["https://pub-2c7b2ddd2cef4117b3dcb1c04704d106.r2.dev/templates/Blob/bg.mp4", "https://pub-2c7b2ddd2cef4117b3dcb1c04704d106.r2.dev/templates/Blob/bg2.mp4"],
        isGeneratingStart: false,
        isGeneratingEnd: false,
        isGeneratingVideo: false,
        startPrompt: "",
        endPrompt: "",
        videoPrompt: "",
        builderPrompt: `Build a single-page landing site with two full-height sections (Hero \+ Capabilities), both using looping background videos with custom JS crossfade, a shared liquid-glass design system, and Framer Motion entrance animations.

Tech stack (pinned, CDN-only)  
\<script src="https://cdn.tailwindcss.com"\>\</script\>  
\<script src="https://unpkg.com/react@18.3.1/umd/react.development.js" integrity="sha384-hD6/rw4ppMLGNu3tX5cjIb+uRZ7UkRJ6BPkLpg4hAu/6onKUg4lLsHAs9EBPT82L" crossorigin="anonymous"\>\</script\>  
\<script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js" integrity="sha384-u6aeetuaXnQ38mYT8rp6sbXaQe3NL9t+IBXmnYxwkUI2Hw4bsp2Wvmx4yRQF1uAm" crossorigin="anonymous"\>\</script\>  
\<script src="https://unpkg.com/@babel/standalone@7.29.0/babel.min.js" integrity="sha384-m08KidiNqLdpJqLq95G/LEi8Qvjl/xUYll3QILypMoQ65QorJ9Lvtp2RXYGBFj1y" crossorigin="anonymous"\>\</script\>  
\<script src="https://unpkg.com/framer-motion@11.11.17/dist/framer-motion.js"\>\</script\>  
\<script\>window.Motion \= window.FramerMotion;\</script\>  
Body is bg: \#000. Page is a React app mounted on \#root, all components are \<script type="text/babel"\> files exporting via window.X \= X.

Fonts  
Google Fonts:  
family=Instrument+Serif:ital@0;1\&family=Barlow:wght@300;400;500;600

Tailwind config adds:  
font-heading → 'Instrument Serif', serif (always italic in use)  
font-body → 'Barlow', sans-serif  
Default border radius override: DEFAULT: "9999px" (so bare rounded → pill).

Liquid-glass utilities (exact CSS, in a \<style\> block)  
Two variants — .liquid-glass (subtle, for nav/chips/cards) and .liquid-glass-strong (heavier blur, for primary CTA):

.liquid-glass {  
background: rgba(255,255,255,0.01);  
background-blend-mode: luminosity;  
backdrop-filter: blur(4px);  
\-webkit-backdrop-filter: blur(4px);  
border: none;  
box-shadow: inset 0 1px 1px rgba(255,255,255,0.1);  
position: relative;  
overflow: hidden;  
}  
.liquid-glass::before {  
content: "";  
position: absolute; inset: 0;  
border-radius: inherit;  
padding: 1.4px;  
background: linear-gradient(180deg,  
rgba(255,255,255,0.45) 0%,  
rgba(255,255,255,0.15) 20%,  
rgba(255,255,255,0) 40%,  
rgba(255,255,255,0) 60%,  
rgba(255,255,255,0.15) 80%,  
rgba(255,255,255,0.45) 100%);  
\-webkit-mask: linear-gradient(\#fff 0 0\) content-box, linear-gradient(\#fff 0 0);  
\-webkit-mask-composite: xor;  
mask-composite: exclude;  
pointer-events: none;  
}  
.liquid-glass-strong {  
backdrop-filter: blur(50px);  
box-shadow: 4px 4px 4px rgba(0,0,0,0.05), inset 0 1px 1px rgba(255,255,255,0.15);  
}  
.liquid-glass-strong::before {  
content: "";  
position: absolute; inset: 0;  
border-radius: inherit;  
padding: 1.4px;  
background: linear-gradient(180deg,  
rgba(255,255,255,0.5) 0%,  
rgba(255,255,255,0.2) 20%,  
rgba(255,255,255,0) 40%,  
rgba(255,255,255,0) 60%,  
rgba(255,255,255,0.2) 80%,  
rgba(255,255,255,0.5) 100%);  
\-webkit-mask: linear-gradient(\#fff 0 0\) content-box, linear-gradient(\#fff 0 0);  
\-webkit-mask-composite: xor;  
mask-composite: exclude;  
pointer-events: none;  
}

FadingVideo component (custom JS crossfade, no CSS transitions)  
Wraps a \<video autoPlay muted playsInline preload="auto"\> starting at opacity: 0\. Behavior:  
FADE\_MS \= 500, FADE\_OUT\_LEAD \= 0.55 seconds.  
fadeTo(target, duration) uses requestAnimationFrame; reads current opacity from video.style.opacity so each new fade resumes from wherever the last one left off. Each call calls cancelAnimationFrame on the previous rAF id before starting.  
On loadeddata: set opacity 0, play(), fadeTo(1).  
On timeupdate: if fadingOutRef not set and duration \- currentTime \<= 0.55 and \> 0, flip the ref and fadeTo(0).  
On ended: set opacity 0; after setTimeout(100ms) reset currentTime \= 0, play(), clear fadingOutRef, fadeTo(1).  
loop attribute is OFF (we implement looping manually via ended).  
Cleanup on unmount: cancel rAF, remove listeners.

Section 1 — Hero (full viewport, black bg)  
Background video (120% width/height, top-aligned, centered horizontally — focal point is the top of frame):  
src: https://pub-2c7b2ddd2cef4117b3dcb1c04704d106.r2.dev/templates/Blob/bg.mp4  
class: absolute left-1/2 top-0 \-translate-x-1/2 object-cover object-top z-0  
style: { width: "120%", height: "120%" }  
No overlay. z-10 layer holds: Navbar → Hero content (flex-1, centered) → Partners.

Navbar (fixed top-4, px-8 / lg:px-16, z-50)  
Left: 48×48 liquid-glass circle with italic serif lowercase "o" (Instrument Serif).  
Center (desktop only): liquid-glass pill, px-1.5 py-1.5, holding 5 text links — Reserve, Estates, Retreats, Heritage, Concierge — each px-3 py-2 text-sm font-medium text-white/90 font-body. Followed by a white pill button Request Berth \+ ArrowUpRight icon (bg-white text-black, whitespace-nowrap).  
Right: 48×48 invisible spacer to balance logo.

Hero content (centered, pt-24 px-4)  
All animated with Framer Motion, initial: {filter: blur(10px), opacity: 0, y: 20}, easeOut.

Badge (delay 0.4s): liquid-glass rounded-full pill. Contains white pill chip "Private" (bg-white text-black px-3 py-1 text-xs font-semibold) \+ text "The Elysium Orbital Estate Opens Applications 2026" (text-sm text-white/90, pr-3).  
Headline — BlurText component (word-by-word animation). Text: "Inhabit The Infinite Beyond The Clouds". Classes: text-6xl md:text-7xl lg:text-\[5.5rem\] font-heading italic text-white leading-\[0.8\] max-w-2xl justify-center tracking-\[-4px\].  
Subheading (delay 0.8s, mt-4 text-sm md:text-base text-white max-w-2xl font-body font-light leading-tight): "Step out of the temporary and into the permanent. Our ultra-high-vacuum architectural sanctuaries offer unparalleled residential permanence among the stars—curated, silent, and transcendent."  
CTAs (delay 1.1s, flex items-center gap-6 mt-6):  
Primary: liquid-glass-strong rounded-full px-5 py-2.5 text-sm font-medium text-white with "Acquire Residence" \+ ArrowUpRight (h-5 w-5).  
Secondary: bare text link, "View Horizon" \+ Play icon (h-4 w-4, filled).  
Stats row (delay 1.3s, flex items-stretch gap-4 mt-8): two liquid-glass cards, p-5 w-\[220px\] rounded-\[1.25rem\], each:  
Top: white 28×28 outline SVG icon (clock for card 1, globe for card 2).  
Bottom: large number in Instrument Serif italic white (text-4xl tracking-\[-1px\] leading-none): "0.00G" / "14 Private". Label below (text-xs text-white font-body font-light mt-2): "True Microgravity Atmosphere" / "Bespoke Celestial Penthouses".

Partners (bottom of hero, delay 1.4s)  
flex flex-col items-center gap-4 pb-8:  
liquid-glass rounded-full chip (px-3.5 py-1 text-xs font-medium text-white): "In alliance with premier multi-planetary architectural guilds".  
Row of 5 names in Instrument Serif italic white, text-2xl md:text-3xl tracking-tight, gap-12/md:gap-16: Aether · Vesper · Zenith · Kronos · Nova.

BlurText component (word-by-word blur-in)  
IntersectionObserver triggers on 10% visibility. Splits text by spaces. Each word is a motion.span with:  
initial: {filter: 'blur(10px)', opacity: 0, y: 50}  
3-step keyframes to {filter: 'blur(5px)', opacity: 0.5, y: \-5} → {filter: 'blur(0px)', opacity: 1, y: 0}  
duration: 0.7 (stepDuration 0.35 × 2), times: \[0, 0.5, 1\], ease: easeOut  
Stagger: delay \= (i \* 100\) / 1000 seconds  
display: inline-block, marginRight: 0.28em (not non-breaking-space — letter-spacing \-4px eats nbsp).  
Parent \<p\> is display: flex; flexWrap: wrap; justifyContent: center; rowGap: 0.1em.

Section 2 — Capabilities (min-h-screen, black bg)  
Background video (full-bleed, no 120% scale):  
src: https://pub-2c7b2ddd2cef4117b3dcb1c04704d106.r2.dev/templates/Blob/bg2.mp4  
class: absolute inset-0 w-full h-full object-cover z-0  
Same FadingVideo treatment. No overlay.

Content (relative z-10 px-8 md:px-16 lg:px-20 pt-24 pb-10 flex flex-col min-h-screen):

Header (mb-auto):  
Kicker: text-sm font-body text-white/80 mb-6 → // Sanctuary Craft  
Heading: font-heading italic text-white text-6xl md:text-7xl lg:text-\[6rem\] leading-\[0.9\] tracking-\[-3px\]:  
Habitation  
perfected  
(two lines, \<br/\> between).

Three cards (grid grid-cols-1 md:grid-cols-3 gap-6 mt-16): each is liquid-glass rounded-\[1.25rem\] p-6 min-h-\[360px\] flex flex-col.

Top row of each card (flex items-start justify-between gap-4):  
Left: 44×44 nested liquid-glass square (rounded-\[0.75rem\]) with a white Material Icons SVG (fill currentColor, h-6 w-6 text-white). Use these path values:  
Card 1: path M5 21q-.825 0-1.412-.587T3 19V5q0-.825.588-1.412T5 3h14q.825 0 1.413.588T21 5v14q0 .825-.587 1.413T19 21H5Zm1-4h12l-3.75-5-3 4L9 13l-3 4Z  
Card 2: path M4 6.47 5.76 10H20v8H4V6.47M22 4h-4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.89-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4Z  
Card 3: path M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1Zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7Z

Right: flex flex-wrap justify-end gap-1.5 max-w-\[70%\] — 4 small liquid-glass pill tags (rounded-full px-3 py-1 text-\[11px\] text-white/90 font-body whitespace-nowrap):  
Card 1: Elysian Views · Clear Panoramic · Infinite Horizon · Aura Shield  
Card 2: Pure Mass · Thermal Shielding · Multi-Generation · Core Vault  
Card 3: Stellar Sync · Solar Refraction · Deep Calm · Kinetic Dim

Middle: flex-1 spacer.

Bottom of each card (mt-6):  
Title h3: font-heading italic text-white text-3xl md:text-4xl tracking-\[-1px\] leading-none — "Stellar Vista" / "Monolith Hull" / "Lumina Matrix"  
Body p (mt-3 text-sm text-white/90 font-body font-light leading-snug max-w-\[32ch\]):  
"An elegant framework that morphs to display flawless cosmic vistas—from passing comets to the radiant arc of Earth's sunrise."  
"Engineer your private legacy across generations. Impeccably dense alloy shielding ensures perfect silence from the chaotic cosmos."  
"Intelligent refraction technology harvesting pure solar waves. Experience bespoke interior environments calibrated to perfect rhythm."

Icons (inline lucide-style SVGs, currentColor stroke)  
ArrowUpRight: 24×24, M7 17L17 7 \+ M7 7h10v10, strokeWidth 2, round caps.  
Play: 24×24 filled polygon 6 4 20 12 6 20 6 4\.

Notes  
All text white; no green, no gradient backgrounds.  
No CSS transitions on the videos — fades must be rAF-driven per the FadingVideo spec.  
Videos are full-bleed with no dark overlay; contrast comes from the liquid-glass chrome.  
Framer Motion dev warnings about list keys can be suppressed with a console.error filter wrapper — they're benign.`
      }
    ]
  },
  {
    id: "pesudo-template-2",
    name: "Theo",
    coverUrl: "https://pub-2c7b2ddd2cef4117b3dcb1c04704d106.r2.dev/templates/Theo/Template.png",
    blocks: [
      {
        startFrameUrl: "https://pub-2c7b2ddd2cef4117b3dcb1c04704d106.r2.dev/templates/Theo/bg-first-frame.png",
        startFrameHistory: ["https://pub-2c7b2ddd2cef4117b3dcb1c04704d106.r2.dev/templates/Theo/bg-first-frame.png"],
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
        builderPrompt: `Build a 3D Creator portfolio landing page for "Theo" using React, TypeScript, Tailwind CSS, Framer Motion, and Lucide React. The page has a dark theme (#0C0C0C background) with the font Kanit (Google Fonts, weights 300-900). The page title is "Theo -- 3D Creator".

GLOBAL STYLES
Background: #0C0C0C on html, body, #root, and the main wrapper
Font family: 'Kanit', sans-serif
Global reset: box-sizing border-box, margin 0, padding 0
CSS class .hero-heading: gradient text using background: linear-gradient(180deg, #646973 0%, #BBCCD7 100%) with -webkit-background-clip: text and -webkit-text-fill-color: transparent
Main wrapper has overflowX: 'clip'
SECTION ORDER
HeroSection
AboutSection
ServicesSection
ProjectsSection
1. HERO SECTION
Full viewport height (h-screen), flex column layout with overflowX: clip.

Navbar: Horizontal nav bar with 4 links -- "Story", "Rates", "Work", "Connect" -- evenly spaced with justify-between. Text color #D7E2EA, font-medium, uppercase, tracking-wider. Sizes: text-sm md:text-lg lg:text-[1.4rem]. Padding: px-6 md:px-10 pt-6 md:pt-8. Hover: opacity 70% with 200ms transition.

Hero Heading: Massive h1 with text "Hi, i'm theo" (lowercase "i", curly apostrophe via &apos;). Uses the .hero-heading gradient text class. Font-black, uppercase, tracking-tight, leading-none, whitespace-nowrap, w-full. Font sizes: text-[14vw] sm:text-[15vw] md:text-[16vw] lg:text-[17.5vw]. Margin top: mt-6 sm:mt-4 md:-mt-5. Wrapped in overflow-hidden container.

Bottom bar: Flexbox justify-between items-end with pb-7 sm:pb-8 md:pb-10:

Left: paragraph text "a 3d artist obsessed with building bold and immersive worlds", color #D7E2EA, font-light, uppercase, tracking-wide, leading-snug. Font size: clamp(0.75rem, 1.4vw, 1.5rem). Max-width: max-w-[160px] sm:max-w-[220px] md:max-w-[260px].
Right: ContactButton component (see below)
Hero Portrait: Centered absolutely. Uses a Magnet component (mouse-following magnetic effect) wrapping an image. Image URL: https://shrug-person-78902957.figma.site/_components/v2/d24c01ad3a56fc65e942a1f501eb73db42d7cf9a/Rectangle_40443.81459862.png. Magnet settings: padding 150, strength 3, activeTransition "transform 0.3s ease-out", inactiveTransition "transform 0.6s ease-in-out". Positioning: absolute left-1/2 -translate-x-1/2 z-10. Width: w-[280px] sm:w-[360px] md:w-[440px] lg:w-[520px]. On mobile: top-1/2 -translate-y-1/2. On sm+: sm:top-auto sm:translate-y-0 sm:bottom-0.

FadeIn animations: Navbar fades in with delay 0, y -20. Heading: delay 0.15, y 40. Left text: delay 0.35, y 20. Contact button: delay 0.5, y 20. Portrait: delay 0.6, y 30.

2. ABOUT SECTION
Full-height centered section with min-h-screen, padding px-5 sm:px-8 md:px-10 py-20.

Four decorative 3D images positioned absolutely in corners:

Top-left: Moon icon -- https://shrug-person-78902957.figma.site/_components/v2/ebb2b8f25d8e24d5f0a5ca8af4c950de81aa2fd7/moon_icon.11395d36.png -- w-[120px] sm:w-[160px] md:w-[210px], positioned top-[4%] left-[1%] sm:left-[2%] md:left-[4%]. FadeIn: delay 0.1, x -80, y 0, duration 0.9.
Bottom-left: 3D object -- https://shrug-person-78902957.figma.site/_components/v2/ebb2b8f25d8e24d5f0a5ca8af4c950de81aa2fd7/p59_1.4659672e.png -- w-[100px] sm:w-[140px] md:w-[180px], positioned bottom-[8%] left-[3%] sm:left-[6%] md:left-[10%]. FadeIn: delay 0.25, x -80, y 0, duration 0.9.
Top-right: Lego icon -- https://shrug-person-78902957.figma.site/_components/v2/ebb2b8f25d8e24d5f0a5ca8af4c950de81aa2fd7/lego_icon-1.703bb594.png -- w-[120px] sm:w-[160px] md:w-[210px], positioned top-[4%] right-[1%] sm:right-[2%] md:right-[4%]. FadeIn: delay 0.15, x 80, y 0, duration 0.9.
Bottom-right: 3D group -- https://shrug-person-78902957.figma.site/_components/v2/ebb2b8f25d8e24d5f0a5ca8af4c950de81aa2fd7/Group_134-1.2e04f3ce.png -- w-[130px] sm:w-[170px] md:w-[220px], positioned bottom-[8%] right-[3%] sm:right-[6%] md:right-[10%]. FadeIn: delay 0.3, x 80, y 0, duration 0.9.
Heading: "My story" using .hero-heading gradient text, font-black, uppercase, leading-none, tracking-tight, centered. Font size: clamp(3rem, 12vw, 160px). FadeIn: delay 0, y 40.

Animated paragraph: Uses a character-by-character scroll-driven opacity animation. Text: "With more than six years of experience in 3d and motion design, i focus on branding, visual storytelling, and immersive digital experiences, i truly enjoy collaborating with brands that want to leave a lasting impression. Let's create something extraordinary together!" -- color #D7E2EA, font-medium, centered, leading-relaxed, max-w-[560px], font size clamp(1rem, 2vw, 1.35rem). Each character animates from opacity 0.2 to 1 based on scroll progress, with scroll offset ['start 0.8', 'end 0.2'].

Contact button below the text block. Gap between heading/text: gap-10 sm:gap-14 md:gap-16. Gap between text block and button: gap-16 sm:gap-20 md:gap-24.

3. SERVICES SECTION
White background (#FFFFFF), with rounded-t-[40px] sm:rounded-t-[50px] md:rounded-t-[60px] top corners. Padding: px-5 sm:px-8 md:px-10 py-20 sm:py-24 md:py-32.

Heading: "What I do" in #0C0C0C, font-black, uppercase, centered, font size clamp(3rem, 12vw, 160px). Margin bottom: mb-16 sm:mb-20 md:mb-28.

5 service items in a vertical list, max-w-5xl, centered:

01 - Concept Art: "Translating raw ideas into vivid concept art and mood boards that set the tone for games, films, and brand worlds."
02 - Texturing & Lighting: "Hand-crafted textures and cinematic lighting setups that give every render depth, mood, and material realism."
03 - Animation: "Smooth character and product animation that brings stillness to life and adds rhythm to digital experiences."
04 - Brand Visuals: "Building a distinct visual language across logos, color, and 3d assets that make a brand instantly recognizable."
05 - Interactive Design: "Designing immersive, interaction-ready 3d experiences for websites, products, and installations."
Each item: horizontal layout with number (font-black, font size clamp(3rem, 10vw, 140px), color #0C0C0C) on the left and name + description stacked vertically on the right. Name: font-medium, uppercase, font size clamp(1rem, 2.2vw, 2.1rem). Description: font-light, leading-relaxed, max-w-2xl, font size clamp(0.85rem, 1.6vw, 1.25rem), opacity 0.6. Items separated by 1px borders (rgba(12, 12, 12, 0.15)). Padding: py-8 sm:py-10 md:py-12. Staggered FadeIn: each item delays by i * 0.1.

4. PROJECTS SECTION
Dark background (#0C0C0C), rounded top corners rounded-t-[40px] sm:rounded-t-[50px] md:rounded-t-[60px], pulled up with -mt-10 sm:-mt-12 md:-mt-14, z-10.

Heading: "Work" (singular) using .hero-heading gradient, same styling as other headings.

3 sticky-stacking project cards that scale down as you scroll past them (card stacking effect using Framer Motion useScroll and useTransform). Each card is sticky top-24 md:top-32 inside an h-[85vh] container.

Scale calculation: targetScale = 1 - (totalCards - 1 - index) * 0.03. Each card offset by top: \${index * 28}px.

Each card has: rounded-[40px] sm:rounded-[50px] md:rounded-[60px], border-2 border-[#D7E2EA], background #0C0C0C, padding p-4 sm:p-6 md:p-8.

Card layout:

Top row: Number (huge, same style as services), category label, project name, and a "View Live" ghost button (rounded-full, border-2 #D7E2EA, uppercase, tracking-widest).
Bottom row: Two-column image grid -- left column (40% width) has 2 stacked images, right column (60%) has 1 tall image. All images have heavy border radius rounded-[40px] sm:rounded-[50px] md:rounded-[60px]. Left top image height: clamp(130px, 16vw, 230px). Left bottom image height: clamp(160px, 22vw, 340px).
Project data with CloudFront image URLs:

Project 01 - "Pulse Interactive" (Client):

Col1 image 1: https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260412_055344_5eff02e0-87a5-41ce-b64f-eb08da8f33db.png&w=1280&q=85
Col1 image 2: https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260412_055431_11d841fd-8b41-46a5-82e4-b04f2407a7d8.png&w=1280&q=85
Col2 image: https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260412_055451_e317bf2d-28d4-48cc-86b0-6f72f25b6327.png&w=1280&q=85
Project 02 - "Nova Brand System" (Personal):

Col1 image 1: https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260412_055654_911201c5-36d9-4bc6-bac7-331adfce159f.png&w=1280&q=85
Col1 image 2: https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260412_055723_5ceda0b8-d9c2-4665-b2e3-83ba19ba76d1.png&w=1280&q=85
Col2 image: https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260412_055753_adc5dcbd-a8e6-49c0-b43a-9b030d835cea.png&w=1280&q=85
Project 03 - "Vertex Studios" (Client):

Col1 image 1: https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260412_055759_963cfb0b-4bd1-4b0f-9d0a-09bd6cf95b2f.png&w=1280&q=85
Col1 image 2: https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260412_060108_438f781a-9846-4dcc-89ab-c4e6cb830f5b.png&w=1280&q=85
Col2 image: https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260412_055818_9d062121-ad7e-46b9-999a-1a6a692ef1ee.png&w=1280&q=85
REUSABLE COMPONENTS
ContactButton: Rounded-full pill button with gradient background linear-gradient(123deg, #18011F 7%, #B600A8 37%, #7621B0 72%, #BE4C00 100%), inner box-shadow 0px 4px 4px rgba(181, 1, 167, 0.25), 4px 4px 12px #7721B1 inset, white 2px outline with -3px offset. Text: white, font-medium, uppercase, tracking-widest. Sizes: px-8 py-3 sm:px-10 sm:py-3.5 md:px-12 md:py-4, text text-xs sm:text-sm md:text-base. Label: "Say Hello".

LiveProjectButton: Ghost/outline pill button. Rounded-full, border-2 border-[#D7E2EA], text color #D7E2EA, font-medium, uppercase, tracking-widest. Sizes: px-8 py-3 sm:px-10 sm:py-3.5, text text-sm sm:text-base. Hover: bg-[#D7E2EA]/10. Label: "View Live".

FadeIn: Framer Motion wrapper using whileInView with viewport={{ once: true, margin: "50px", amount: 0 }}. Accepts delay, duration (default 0.7), x (default 0), y (default 30). Easing: [0.25, 0.1, 0.25, 1]. Uses motion.create() for dynamic element types.

Magnet: Mouse-following magnetic hover effect. Tracks mouse position relative to element center, applies translate3d transform divided by strength factor. Activates when cursor is within padding distance of element edge. Smooth transition in (0.3s ease-out) and out (0.6s ease-in-out). Uses willChange: 'transform'.

AnimatedText: Character-by-character scroll-reveal text animation. Each character goes from opacity 0.2 to 1 based on its position in the text relative to scroll progress. Uses Framer Motion useScroll targeting the paragraph element with offset ['start 0.8', 'end 0.2']. Each character uses invisible placeholder + absolute positioned animated span.

KEY DEPENDENCIES
react, react-dom (^18.3.1)
framer-motion (^12.38.0)
lucide-react (^0.344.0)
tailwindcss (^3.4.1)
vite, typescript
RESPONSIVE BREAKPOINTS
All sections use Tailwind's default breakpoints (sm: 640px, md: 768px, lg: 1024px) with mobile-first approach. Heavy use of clamp() for fluid typography. The entire design scales gracefully from mobile to ultra-wide screens.
`
      }
    ]
  },
  {
    id: "pesudo-template-3",
    name: "Computer",
    coverUrl: "https://pub-2c7b2ddd2cef4117b3dcb1c04704d106.r2.dev/templates/computer/template.png",
    blocks: [
      {
        startFrameUrl: "https://pub-2c7b2ddd2cef4117b3dcb1c04704d106.r2.dev/templates/computer/bg-first-frame.jpg",
        startFrameHistory: ["https://pub-2c7b2ddd2cef4117b3dcb1c04704d106.r2.dev/templates/computer/bg-first-frame.jpg"],
        endFrameUrl: "",
        endFrameHistory: [""],
        videoUrl: "https://pub-2c7b2ddd2cef4117b3dcb1c04704d106.r2.dev/templates/computer/bg.mp4",
        videoHistory: ["https://pub-2c7b2ddd2cef4117b3dcb1c04704d106.r2.dev/templates/computer/bg.mp4"],
        isGeneratingStart: false,
        isGeneratingEnd: false,
        isGeneratingVideo: false,
        startPrompt: "",
        endPrompt: "",
        videoPrompt: "",
        builderPrompt: `Build a full-screen hero landing page for a creative agency called "Mainframe" using React, TypeScript, Vite, and Tailwind CSS. Here is every detail: 
        ---
        FONTS

        Load two fonts in \`index.html\` via these stylesheet links:

        * Heading: \`https://db.onlinewebfonts.com/c/5ac3fe7c6abd2f62067f266d89671492?family=HelveticaNowDisplay-Medium\`  
        * Body: \`https://db.onlinewebfonts.com/c/1aa3377e489837a26d019bba501e779d?family=HelveticaNowDisplayW01-Rg\`

        In \`index.css\`, define CSS variables:

:root {  
  \--font-heading: 'HelveticaNowDisplay-Medium', 'Helvetica Neue', Arial, sans-serif;  
  \--font-body: 'HelveticaNowDisplayW01-Rg', 'Helvetica Neue', Arial, sans-serif;  
}

body {  
  font-family: var(--font-body);  
}

The entire page uses \`var(--font-body)\` except the logo text which uses \`var(--font-heading)\`.

---

BACKGROUND VIDEO (mouse-scrub controlled)

* A full-screen \`<video>\` element is \`position: fixed; inset: 0; z-index: 0; object-fit: cover; object-position: 70% center;\`.  
* Video source URL:  
  \`https://pub-2c7b2ddd2cef4117b3dcb1c04704d106.r2.dev/templates/computer/bg.mp4\`  
* The video is \`muted\`, \`playsInline\`, \`preload="auto"\`. It does NOT autoplay.  
* The video scrubs forward/backward based on horizontal mouse movement. Use a \`mousemove\` event listener on \`window\`. Track \`prevX\`, compute \`delta = currentX - prevX\`, convert to a time offset:  
  \`(delta / window.innerWidth) * SENSITIVITY * video.duration\`  
  where \`SENSITIVITY = 0.8\`.  
  Clamp \`targetTime\` between 0 and \`video.duration\`.  
  Use \`video.currentTime\` to seek, and an \`onSeeked\` handler to queue the next seek if \`targetTime\` has moved, preventing seek-flooding.

---

NAVBAR (fixed, z-index: 10\)

* Fixed to top, full width.  
* Padding: \`px-5 sm:px-8 py-4 sm:py-5\`.  
* Flex row, \`justify-between\`, \`items-center\`.

Logo (left):

* Flex row with \`gap-3\`.  
* Text \`"Mainframe®"\` at \`text-[21px] sm:text-[26px]\`, \`tracking-tight\`, black, using \`var(--font-heading)\`.  
* Beside it, a decorative asterisk character \`✳︎\` at \`text-[25px] sm:text-[30px]\`, black, \`select-none\`, \`letter-spacing: -0.02em\`.

Desktop nav links (center, hidden below md):

* Flex row, \`text-[23px]\`, black.  
* Links:  
  * Research  
  * Ventures  
  * Journal  
  * Contact  
* Separated by commas rendered as \`,\` .  
* Each link has \`hover:opacity-60 transition-opacity\`.

Desktop CTA (right, hidden below md):

* Anchor text:  
  \`"Start a conversation"\`  
* \`text-[23px]\`, black, \`underline underline-offset-2\`, \`hover:opacity-60 transition-opacity\`.

Mobile hamburger:

* Same behavior and styling as original.

Mobile overlay:

* Same behavior and styling as original.  
* Same links:  
  * Research  
  * Ventures  
  * Journal  
  * Contact  
  * Start a conversation

---

HERO SECTION (z-index: 1\)

* Full \`h-screen\`, flex column.  
* On mobile: \`justify-end pb-12\`.  
* On \`md:\`: \`justify-center pb-0\`.  
* Horizontal padding: \`px-5 sm:px-8 md:px-10\`.  
* \`overflow-hidden\`.

Content container:

* \`max-w-xl\`, \`relative z-10\`.  
1. Blurred intro label  
* \`pointer-events-none\`  
* \`select-none\`  
* \`mb-5 sm:mb-6\`

Font styling remains unchanged.

Text:

Line 1:  
"Future systems, human instincts,"

Line 2:  
"crafted into experiences that move people."

Separated by a \`<br />\`.

---

2. Typewriter text

Use the same \`useTypewriter\` hook and animation behavior.

Text:

"We partner with ambitious founders and brands to create products, identities, and digital worlds that feel inevitable the moment they exist."

Rendered in the same element with identical styling and cursor behavior.

---

3. Action pill buttons

Same animation, spacing, styling, and interactions.

White pill buttons:

* "Launch a project"  
* "Join the team"  
* "Book a discovery call"  
* "Explore our process"

Outline pill button:

Text:  
"Connect: hello@mainframe.co"

The email portion should remain underlined with \`underline-offset-1\`.

Include the same 12×12 copy icon and clipboard-copy functionality.

On click, copy:

\`hello@mainframe.co\`

to the clipboard.

---

DEPENDENCIES

Only React, ReactDOM, Tailwind CSS, and Vite.

No other UI libraries.

Lucide-react is available but not used in this component.`
      }
    ]
  },
  {
    id: "pesudo-template-4",
    name: "Flower Landscape",
    coverUrl: "https://pub-2c7b2ddd2cef4117b3dcb1c04704d106.r2.dev/templates/flower%20landscape/template.png",
    blocks: [
      {
        startFrameUrl: "https://pub-2c7b2ddd2cef4117b3dcb1c04704d106.r2.dev/templates/flower%20landscape/first_frame.jpg",
        startFrameHistory: ["https://pub-2c7b2ddd2cef4117b3dcb1c04704d106.r2.dev/templates/flower%20landscape/first_frame.jpg"],
        endFrameUrl: "",
        endFrameHistory: [""],
        videoUrl: "https://pub-2c7b2ddd2cef4117b3dcb1c04704d106.r2.dev/templates/flower%20landscape/bg.mp4",
        videoHistory: ["https://pub-2c7b2ddd2cef4117b3dcb1c04704d106.r2.dev/templates/flower%20landscape/bg.mp4"],
        isGeneratingStart: false,
        isGeneratingEnd: false,
        isGeneratingVideo: false,
        startPrompt: "",
        endPrompt: "",
        videoPrompt: "",
        builderPrompt: `Build a single-page React + TypeScript + Vite + Tailwind site that is a full-screen video-background landing page with a contact form. Use 'lucide-react' for icons.

Brand Name
Nova Atelier

Layout & Sizing
* Root: 'min-h-screen' white background with padding 'p-3 sm:p-4 md:p-6'.
* Inside the root, one large rounded card with 'rounded-2xl sm:rounded-3xl', 'overflow-hidden'. Heights: 'min-h-[calc(100vh-24px)] sm:min-h-[calc(100vh-32px)] md:min-h-[calc(100vh-48px)] lg:h-[calc(100vh-48px)]'. On desktop it locks to viewport; on tablet/mobile it expands to content.
* Background video fills the card ('absolute inset-0 w-full h-full object-cover'). The video element has 'autoPlay muted loop playsInline'.

Use this exact URL:
https://pub-2c7b2ddd2cef4117b3dcb1c04704d106.r2.dev/templates/flower%20landscape/bg.mp4

* Content layer: 'relative z-10 flex flex-col' with the same min-height ladder as the card and 'lg:h-full', padding 'p-4 sm:p-6 md:p-8', 'gap-6'.

Fonts
* Import from Google Fonts in 'index.css': 'Inter' (weights 300-700) and 'Instrument Serif' (italic + regular).
* Set '* { font-family: 'Inter', sans-serif; }' globally.
* Use 'Instrument Serif' italic for one accent word inline (see headline below).

Navbar (top)
* Pill bar with 'bg-white/60 backdrop-blur-md rounded-2xl shadow-sm', padding 'pl-3 sm:pl-4 pr-2 py-2', 'w-full sm:w-auto', 'flex items-center gap-3 sm:gap-6'.
* Logo: 32x32 inline SVG ('viewBox="0 0 256 256"') with two black filled paths forming a stylized "N":
M 256 256 L 128 256 L 0 128 L 128 128 Z M 256 128 L 128 128 L 0 0 L 128 0 Z
* Links (hidden on mobile, shown 'sm:flex'):
  * Philosophy
  * Services
  * Case Studies
  * Perspectives

Class:
'text-gray-800 text-sm font-medium hover:opacity-60 transition-opacity whitespace-nowrap'

* CTA button on the right:
  * Label: Let's talk
  * Black pill 'bg-black text-white text-sm font-medium px-4 sm:px-5 py-2 rounded-xl hover:bg-gray-800'

On mobile it floats right with 'ml-auto'.

Spacer
Use:
<div className="flex-1 min-h-[2rem]" />
between nav and bottom row.

Bottom row (headline + form)
Container:
'flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6'

Headline (left)
<p> with white text:
'text-3xl sm:text-4xl xl:text-5xl font-medium leading-tight drop-shadow-lg lg:max-w-lg xl:max-w-2xl shrink-0'

Content:
We turn ambitious ideas
into enduring experiences

The word enduring is wrapped in a <span> with inline style:
fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontWeight: 400

Contact form card (right)
Outer:
'w-full lg:w-[min(480px,45%)] shrink-0'

Card:
'bg-white rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden'

Inner:
'p-4 sm:p-6 flex flex-col gap-4'

Heading
Text: Let's create something remarkable ✨
Class: 'text-xl sm:text-2xl font-semibold text-black tracking-tight'

Email + socials row
Always horizontal:
'flex flex-row items-center justify-between gap-3 bg-gray-50 rounded-2xl px-4 py-2.5'

Left side:
Small label: Start the conversation
Email link: hello@novaatelier.co
Class: 'text-blue-600 font-semibold hover:underline truncate'

Right side:
Four social buttons using the same SocialBtn helper and icon setup.

OR divider
Horizontal lines on either side of: OR
using the exact same styles.

Form
'flex flex-col gap-4'
Label: Tell us what you're imagining
Name placeholder: Your name
Email placeholder: Work email
Textarea placeholder: Share your goals, challenges, or the opportunity you're exploring...

Services section
Label: I'm interested in...
Tags remain multi-select with identical behavior.

Services list (exact order):
Brand Strategy
Website Design
Product Design
Custom Development
E-Commerce
Content Systems
Motion & 3D
Growth Strategy
Something Else

Submit button
Label: Start the conversation
While loading: Sending...
Use identical styling and behavior.

Success state
Green check pill remains identical.
Heading: Message received!
Subtext: We'll be in touch within one business day.

State (useState)
Keep exactly:
selected: string[]
name: string
email: string
message: string
sending: boolean
sent: boolean

Transitions / Animations
Keep all original transition behavior:
* Tailwind transition utilities only
* No animation libraries
* 'backdrop-blur-md' navbar

Constants at top of file
Keep:
VIDEO_URL
SERVICES

Files
src/App.tsx
* Entire component plus SocialBtn helper

src/index.css
* Google Fonts import
* Tailwind directives
* Global font assignment

tailwind.config.js
* Scan:
  ./index.html
  ./src/**/*.{ts,tsx}

Maintain the exact structure, responsiveness, state management, interactions, sizing, and implementation details described above. Only change the content and branding to match Nova Atelier.`
      }
    ]
  },
  {
    id: "pesudo-template-5",
    name: "Landscape",
    coverUrl: "https://pub-2c7b2ddd2cef4117b3dcb1c04704d106.r2.dev/templates/landscape/template.png",
    blocks: [
      {
        startFrameUrl: "https://pub-2c7b2ddd2cef4117b3dcb1c04704d106.r2.dev/templates/landscape/bg-first-frame.jpg",
        startFrameHistory: ["https://pub-2c7b2ddd2cef4117b3dcb1c04704d106.r2.dev/templates/landscape/bg-first-frame.jpg"],
        endFrameUrl: "",
        endFrameHistory: [""],
        videoUrl: "https://pub-2c7b2ddd2cef4117b3dcb1c04704d106.r2.dev/templates/landscape/bg.mp4",
        videoHistory: ["https://pub-2c7b2ddd2cef4117b3dcb1c04704d106.r2.dev/templates/landscape/bg.mp4"],
        isGeneratingStart: false,
        isGeneratingEnd: false,
        isGeneratingVideo: false,
        startPrompt: "",
        endPrompt: "",
        videoPrompt: "",
        builderPrompt: `Prompt: Cinematic Hero Section with Looping Video Background

Create a fullscreen single-page hero section using React + Vite + Tailwind CSS + TypeScript with the following specifications:

Fonts:
Display text (headings, logo): Instrument Serif
Body text (navigation, descriptions): Inter
Import both fonts in /src/styles/fonts.css

Video Background:
URL: https://pub-2c7b2ddd2cef4117b3dcb1c04704d106.r2.dev/templates/landscape/bg.mp4

Position: top: '300px' with inset: 'auto 0 0 0'

Implement custom fade-in/fade-out loop logic using React useEffect and useRef:
Use requestAnimationFrame to continuously monitor currentTime and duration
Fade in over 0.5s at the start (opacity 0 to 1)
Fade out over 0.5s before the end (opacity 1 to 0)
On ended event: set opacity to 0, wait 100ms, reset currentTime = 0, then play() again
This creates a seamless manual loop with smooth fade transitions

Add gradient overlays:
absolute inset-0 bg-gradient-to-b from-background via-transparent to-background positioned over the video

Navigation Bar:

Logo:
"Velora®" (with registered trademark symbol as superscript)

Logo styling:
text-3xl
tracking-tight
Instrument Serif
color #000000

Menu items:
Home (color #000000)
Collective
Manifesto
Insights
Connect

All non-active menu items color:
#6F6F6F

Menu items:
text-sm with transition-colors

CTA button:
"Start Something"

rounded-full
px-6 py-2.5
text-sm
background #000000
text #FFFFFF
hover scale 1.03

Layout:
flex justify-between
px-8 py-6
max-w-7xl mx-auto

Hero Section:

Positioning:
paddingTop: 'calc(8rem - 75px)'
pb-40

Layout:
flex flex-col items-center justify-center text-center px-6

Headline:

Text:
"Where vision becomes something worth remembering."

Styling:
text-5xl sm:text-7xl md:text-8xl
max-w-7xl
font-normal

Font:
Instrument Serif

Line height:
0.95

Letter spacing:
-2.46px

Color:
#000000 for main text

#6F6F6F + italic for emphasized words:
"vision"
"worth remembering."

Animation:
animate-fade-rise

Description:

Text:
"We collaborate with founders, artists, and ambitious teams to shape brands, products, and experiences that leave a lasting impression. Thoughtfully designed, carefully crafted, and built to endure."

Styling:
text-base sm:text-lg
max-w-2xl
mt-8
leading-relaxed

Color:
#6F6F6F

Animation:
animate-fade-rise-delay

Hero CTA Button:

Text:
"Start Something"

Styling:
rounded-full
px-14 py-5
text-base
mt-12

Colors:
background #000000
text #FFFFFF

Hover:
scale 1.03

Animation:
animate-fade-rise-delay-2

Colors:

Background:
#FFFFFF

Headlines, logo, buttons:
#000000

Descriptions and inactive navigation:
#6F6F6F

Button text:
#FFFFFF

Animations (in /src/styles/theme.css):

fade-rise:
opacity 0 → 1
translateY 20px → 0
duration 0.8s
ease-out

fade-rise-delay:
same animation with 0.2s delay

fade-rise-delay-2:
same animation with 0.4s delay

Layout Structure:

Container:
relative min-h-screen w-full overflow-hidden

Background video layer (z-0)

Gradient overlay on video

Navigation bar (z-10)

Hero section (z-10)

All elements should be fully responsive, elegant, editorial, and cinematic, maintaining a premium luxury-tech aesthetic with smooth motion, generous whitespace, refined typography, and seamless video transitions.`
      }
    ]
  },
  {
    id: "pesudo-template-6",
    name: "Stake",
    coverUrl: "https://pub-2c7b2ddd2cef4117b3dcb1c04704d106.r2.dev/templates/stake/template.png",
    blocks: [
      {
        startFrameUrl: "https://pub-2c7b2ddd2cef4117b3dcb1c04704d106.r2.dev/templates/stake/first-frame.jpg",
        startFrameHistory: ["https://pub-2c7b2ddd2cef4117b3dcb1c04704d106.r2.dev/templates/stake/first-frame.jpg"],
        endFrameUrl: "",
        endFrameHistory: [""],
        videoUrl: "https://pub-2c7b2ddd2cef4117b3dcb1c04704d106.r2.dev/templates/stake/bg.mp4",
        videoHistory: ["https://pub-2c7b2ddd2cef4117b3dcb1c04704d106.r2.dev/templates/stake/bg.mp4"],
        isGeneratingStart: false,
        isGeneratingEnd: false,
        isGeneratingVideo: false,
        startPrompt: "",
        endPrompt: "",
        videoPrompt: "",
        builderPrompt: `Build a full-screen hero section for a data-security SaaS landing page called "vaultone" using React + TypeScript + Tailwind CSS, with a looping fullscreen background video, a floating pill-shaped navbar, and large staggered typography.

Fonts & Global Styles
Load Google font "Readex Pro" weights 300, 400, 500, 600, 700.
Set body font-family: 'Readex Pro', system-ui, -apple-system, sans-serif;, background #000, color #fff, antialiased.
Make html, body, #root height 100%.
Add a .hero-title class with letter-spacing: -0.04em; line-height: 0.95;.

Section container
A <section> with classes: relative h-screen w-full overflow-hidden bg-black.

Background video
<video> with className="absolute inset-0 w-full h-full object-cover", autoPlay loop muted playsInline, and src="https://pub-2c7b2ddd2cef4117b3dcb1c04704d106.r2.dev/templates/stake/bg.mp4".

Navbar (absolute, z-20, px-6 md:px-10 pt-6, top-0 left-0 right-0)
A <nav> with flex items-center justify-between gap-4.

Left pill: flex items-center gap-2 bg-neutral-900/90 backdrop-blur rounded-full pl-4 pr-6 py-3 containing:
A custom white SVG logo (viewBox 0 0 256 256, class h-5 w-5) with path:
M 128 192 L 128 256 L 64.5 256 L 32 223 L 0 192 L 0 128 L 64 128 Z
M 256 192 L 256 256 L 192.5 256 L 160 223 L 128 192 L 128 128 L 192 128 Z
M 128 64 L 128 128 L 64.5 128 L 32 95 L 0 64 L 0 0 L 64 0 Z
M 256 64 L 256 128 L 192.5 128 L 160 95 L 128 64 L 128 0 L 192 0 Z
filled #ffffff.

Brand text:
"vaultone"
(text-white text-sm font-normal tracking-tight).

Center pill (hidden on mobile):
hidden md:flex items-center gap-1 bg-neutral-900/90 backdrop-blur rounded-full px-3 py-2 with four anchor links:
* infrastructure
* security
* resources
* pricing

Each text-neutral-300 hover:text-white transition-colors text-sm px-5 py-2 rounded-full.

Right button:
"book demo"
bg-white text-black text-sm font-normal rounded-full px-6 py-3 hover:bg-neutral-200 transition-colors.

Foreground content wrapper:
relative h-full w-full (rendered after Navbar, above the video).

Three giant staggered headline words (each an <h1> with class hero-title absolute text-white font-medium text-[14vw] md:text-[13vw]):
"secure" — left-4 md:left-10 top-[18%]
"every" — right-4 md:right-10 top-[38%]
"byte" — left-[18%] md:left-[28%] top-[58%]

All lowercase.

Description paragraph (absolute, left-6 md:left-10 top-[46%], max-w-[240px] text-[15px] leading-snug text-white/90):
"protecting critical information at every layer, helping modern teams stay resilient in a connected world"

Stat block — top-right (absolute right-6 md:right-24 top-[14%]):
Row: flex items-center gap-3 justify-end — a diagonal divider (hidden md:block h-px w-24 bg-white/40 rotate-[20deg]) then number
"+82k"
(text-4xl md:text-5xl font-medium tracking-tight).

Sublabel:
"companies protected"
(text-xs md:text-sm text-white/70 mt-1 text-right).

Bottom gradient overlay:
pointer-events-none absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-b from-transparent to-black.

Stat block — bottom-left (absolute left-6 md:left-20 bottom-20 md:bottom-24):
Row: number
"+2.3b"
then divider hidden md:block h-px w-24 bg-white/40 rotate-[-20deg].

Sublabel:
"records secured"
(text-xs md:text-sm text-white/70 mt-1).

Stat block — bottom-right (absolute right-6 md:right-20 bottom-16 md:bottom-20):
Row: diagonal divider rotate-[-20deg] then
"+480k"

Sublabel:
"active users"
(right-aligned, text-white/70).

Notes
All text is lowercase.
Navbar pills use bg-neutral-900/90 backdrop-blur.
Only transitions:
hover:text-white on nav links
hover:bg-neutral-200 on the button.
No purple/indigo anywhere; palette is pure black, white, neutral-900, and white opacity variants (white/40, white/70, white/90).
Responsive: mobile hides nav links and diagonal dividers; typography scales via vw units.`
      }
    ]
  },
  {
    id: "pesudo-template-7",
    name: "Stone",
    coverUrl: "https://pub-2c7b2ddd2cef4117b3dcb1c04704d106.r2.dev/templates/stone/template.png",
    blocks: [
      {
        startFrameUrl: "https://pub-2c7b2ddd2cef4117b3dcb1c04704d106.r2.dev/templates/stone/bg-first-frame.webp",
        startFrameHistory: ["https://pub-2c7b2ddd2cef4117b3dcb1c04704d106.r2.dev/templates/stone/bg-first-frame.webp"],
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
        builderPrompt: `Build a full-screen, dark-themed hero section for a geology brand called Strata, using React 18 + TypeScript + Vite + Tailwind CSS and lucide-react for icons. The signature feature is a cursor-following spotlight that reveals a second image through a soft circular mask on top of a base image. Match every detail below exactly.

Fonts
Add this to the top of 'src/index.css', then '@tailwind base/components/utilities':

@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@1,400;1,500;1,600&display=swap');
* { font-family: 'Inter', sans-serif; }
.font-playfair { font-family: 'Playfair Display', serif; }

- Body/UI font: Inter.
- Display/wordmark accent: Playfair Display, italic.

Asset URLs (use these exactly)
- Base image ('BG_IMAGE_1'):
  https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260609_195923_b0ba8ace-1d1d-4f2c-9a28-1ab84b330680.png&w=1280&q=85
- Reveal image ('BG_IMAGE_2'):
  https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260609_201152_bba90a12-bf12-459f-91f0-51f237dbaf3b.png&w=1280&q=85

Layout & structure
Root wrapper: 'min-h-screen bg-white tracking-[-0.02em]', inline 'fontFamily: "'Inter', sans-serif"'.

Section ('<section>'): 'relative w-full overflow-hidden h-screen bg-black', inline 'style={{ height: '100dvh' }}'. Layers, by z-index:
1. Base image ('z-10'): 'absolute inset-0 bg-center bg-cover bg-no-repeat', background = 'BG_IMAGE_1'.
2. Reveal layer ('z-30'): a 'RevealLayer' component (see below) showing 'BG_IMAGE_2'.
3. Heading ('z-50'): 'absolute top-[14%] left-0 right-0 flex flex-col items-center text-center px-5 pointer-events-none'. An '<h1>' with 'text-white leading-[0.95]' containing two block spans:
   - Line 1: 'block font-playfair italic font-normal text-5xl sm:text-7xl md:text-8xl', inline 'letterSpacing: '-0.05em'', text "Stone remembers".
   - Line 2: 'block font-normal text-5xl sm:text-7xl md:text-8xl -mt-1', inline 'letterSpacing: '-0.08em'', text "what time forgets".
4. Bottom-left paragraph ('z-50'): 'hidden sm:block absolute bottom-14 left-10 md:left-14 max-w-[260px]'. '<p className="text-sm text-white/80 leading-relaxed">' — "Each band of rock is a sentence in an old language, written in ash, coral, and ice across an unimaginable span of time."
5. Bottom-right block ('z-50'): 'absolute bottom-10 sm:bottom-24 left-5 right-5 sm:left-auto sm:right-10 md:right-14 max-w-full sm:max-w-[260px] flex flex-col items-start gap-4 sm:gap-5'. Contains a '<p className="text-xs sm:text-sm text-white/80 leading-relaxed">' — "Our field guides help you read the rock face itself, tracing minerals, fossils, and fault lines hidden in the land around you." — and a Begin Exploring button: 'bg-[#e8702a] hover:bg-[#d2611f] text-white text-sm font-medium px-7 py-3 rounded-full transition-all hover:scale-[1.03] active:scale-95 hover:shadow-lg hover:shadow-[#e8702a]/30'.

The cursor spotlight reveal (core mechanic)
In the parent, define 'const SPOTLIGHT_R = 260;' and track the mouse with smoothing:
- Refs: 'mouse' (raw), 'smooth' (eased), 'rafRef'; state 'cursorPos' (init '{x:-999,y:-999}').
- 'mousemove' listener stores raw 'e.clientX/clientY'.
- A 'requestAnimationFrame' loop lerps: 'smooth.x += (mouse.x - smooth.x) * 0.1' (same for y), then 'setCursorPos'. Clean up listener + cancel RAF on unmount.

RevealLayer({ image, cursorX, cursorY }):
- Holds a hidden '<canvas>' ('absolute inset-0 pointer-events-none', 'style={{display:'none'}}') sized to 'window.innerWidth/Height' on mount + resize.
- A reveal '<div>' ('absolute inset-0 bg-center bg-cover bg-no-repeat z-30 pointer-events-none') with the reveal image as background.
- On every render: clear canvas, build a radial gradient at '(cursorX, cursorY)' from radius 0 → 'SPOTLIGHT_R' with stops:
  '0 → rgba(255,255,255,1)', '0.4 → 1', '0.6 → 0.75', '0.75 → 0.4', '0.88 → 0.12', '1 → 0'.
  Fill an arc of radius 'SPOTLIGHT_R' with it. Then 'canvas.toDataURL()' and apply it as 'maskImage'/'webkitMaskImage' on the reveal div with 'maskSize: '100% 100%''. This makes the second image visible only inside the soft glowing circle that trails the cursor.

Navigation (fixed, over hero)
'<nav className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between p-4 sm:p-5">':
- Left: an inline SVG logo (26x26, viewBox '0 0 256 256', 'fill="#ffffff"', path 'M 256 256 L 128 256 L 0 128 L 128 128 Z M 256 128 L 128 128 L 0 0 L 128 0 Z') + wordmark '<span className="text-white text-2xl font-playfair italic">Strata</span>'.
- Center pill ('hidden md:flex absolute left-1/2 -translate-x-1/2 bg-white/20 backdrop-blur-md border border-white/30 rounded-full px-2 py-2 items-center gap-1'): buttons Expeditions (active: full white text), then Mineral Atlas, Fault Lines, Membership, Live Dig ('text-white/80 ... hover:bg-white/20 hover:text-white transition-colors', 'px-4 py-1.5 rounded-full text-sm font-medium').
- Right (desktop): 'hidden md:block bg-white text-gray-900 text-sm font-semibold px-6 py-2.5 rounded-full hover:bg-gray-100' — Join Now.

Animations (premium, on load)
Add to 'index.css':

@keyframes heroReveal { 0%{opacity:0;transform:translateY(28px);filter:blur(12px)} 100%{opacity:1;transform:translateY(0);filter:blur(0)} }
@keyframes heroFadeUp { 0%{opacity:0;transform:translateY(20px)} 100%{opacity:1;transform:translateY(0)} }
@keyframes heroZoom { 0%{transform:scale(1.12)} 100%{transform:scale(1)} }
.hero-anim { opacity:0; animation-fill-mode:forwards; animation-timing-function:cubic-bezier(0.16,1,0.3,1); }
.hero-reveal { animation-name:heroReveal; animation-duration:1.1s; }
.hero-fade { animation-name:heroFadeUp; animation-duration:1s; }
.hero-zoom { animation:heroZoom 1.8s cubic-bezier(0.16,1,0.3,1) forwards; }
@media (prefers-reduced-motion: reduce){ .hero-anim,.hero-zoom{ animation:none; opacity:1; } }

Apply:
- Base image div → add 'hero-zoom' (slow Ken Burns zoom-out).
- Heading line 1 → 'hero-anim hero-reveal', inline 'animationDelay: '0.25s''; line 2 → same with ''0.42s'' (blur-rise, staggered).
- Bottom-left paragraph wrapper → 'hero-anim hero-fade', 'animationDelay: '0.7s''.
- Bottom-right wrapper → 'hero-anim hero-fade', 'animationDelay: '0.85s''.

Responsiveness
- Heading scales 'text-5xl' → 'sm:text-7xl' → 'md:text-8xl'.
- Center nav pill and desktop Join Now are 'hidden' below 'md'; the mobile hamburger is 'md:hidden'.
- Bottom-left paragraph is 'hidden sm:block'; bottom-right block is full-width on mobile ('left-5 right-5') and right-anchored from 'sm'.
- Use '100dvh' so mobile browser chrome doesn't clip the section.`
      }
    ]
  },
  {
    id: "pesudo-template-8",
    name: "Turtle",
    coverUrl: "https://pub-2c7b2ddd2cef4117b3dcb1c04704d106.r2.dev/templates/turtle/template.png",
    blocks: [
      {
        startFrameUrl: "https://pub-2c7b2ddd2cef4117b3dcb1c04704d106.r2.dev/templates/turtle/bg-first-frame.jpg",
        startFrameHistory: ["https://pub-2c7b2ddd2cef4117b3dcb1c04704d106.r2.dev/templates/turtle/bg-first-frame.jpg"],
        endFrameUrl: "",
        endFrameHistory: [""],
        videoUrl: "https://pub-2c7b2ddd2cef4117b3dcb1c04704d106.r2.dev/templates/turtle/bg.mp4",
        videoHistory: ["https://pub-2c7b2ddd2cef4117b3dcb1c04704d106.r2.dev/templates/turtle/bg.mp4"],
        isGeneratingStart: false,
        isGeneratingEnd: false,
        isGeneratingVideo: false,
        startPrompt: "",
        endPrompt: "",
        videoPrompt: "",
        builderPrompt: `Build a fullscreen hero landing page for a creative agency called "OBSIDIAN" using React, Tailwind CSS, and Vite. The page should be a single viewport-height section with a looping background video and all content overlaid on top.

Background video:
Use this exact CloudFront URL as a fullscreen '<video>' element with 'autoPlay', 'muted', 'loop', and 'playsInline' attributes, set to 'object-cover' to fill the entire viewport:
https://pub-2c7b2ddd2cef4117b3dcb1c04704d106.r2.dev/templates/turtle/bg.mp4

Fonts (loaded in index.html):
1. "FSP DEMO - PODIUM Sharp 4.11" from https://db.onlinewebfonts.com/c/8b75d9dcff6a48c35a46656192adf019?family=FSP+DEMO+-+PODIUM+Sharp+4.11 -- used for the brand name and main heading. Create a '.font-podium' utility class for it and register it in tailwind.config.js as 'fontFamily.podium'.
2. "Inter" from Google Fonts (weights 400, 500, 600, 700) -- used for body text, nav links, stats, and CTAs. Register it in tailwind.config.js as 'fontFamily.inter'.

Icons: Use 'lucide-react' for all icons: 'ArrowUpRight', 'Award', 'Crown', and 'X'.

Navbar:
- Horizontal bar at the top with responsive padding ('px-6 sm:px-10 lg:px-16', 'py-5 lg:py-7').
- Left: brand name "OBSIDIAN" in 'font-podium', white, bold, uppercase, 'text-2xl sm:text-3xl', 'tracking-wider'.
- Center (hidden below 'md'): four nav links -- "Portfolio", "Process", "Services", "Connect" -- in 'font-inter', 'text-sm', 'text-white/80', 'tracking-widest', uppercase, with 'hover:text-white' transition.
- Right (hidden below 'md'): a "START A PROJECT" link with an 'ArrowUpRight' icon, styled as a bordered button ('border border-white/30 hover:border-white/60', 'px-6 py-3', 'text-xs', 'tracking-widest', uppercase, 'hover:bg-white/10').
- Right (visible below 'md'): a hamburger button made of three white 'div' bars ('w-6 h-0.5', 'w-6 h-0.5', 'w-4 h-0.5' with 'space-y-1.5').

Mobile Menu Overlay (below 'md' only):
- Fixed fullscreen overlay ('fixed inset-0 z-50') with 'bg-black/95 backdrop-blur-sm'.
- Toggles visibility via React 'useState' -- when open: 'opacity-100 visible', when closed: 'opacity-0 invisible', with 'transition-all duration-500'.
- Header row matches the navbar: brand name on left, 'X' close icon on right.
- Centered vertically: each of the 4 nav links rendered in 'font-podium', 'text-4xl sm:text-5xl', white, uppercase, with staggered entrance animations using inline 'style' -- each item gets 'transitionDelay: i * 80 + 100ms', 'opacity' and 'translateY(20px)' transitions based on the open state.
- Below the links: a "START A PROJECT" bordered button with the same staggered animation pattern.
- All links call 'setMenuOpen(false)' on click.

Hero Content (vertically centered, left-aligned):
All hero elements use staggered 'animate-fade-up' animations (defined in CSS as '@keyframes fade-up' translating from 'translateY(30px), opacity:0' to 'translateY(0), opacity:1' over '0.8s ease-out'). Each successive element has an additional '0.2s' delay. Elements start with 'opacity: 0' and use 'animation-fill-mode: forwards'.

1. Tagline: A 'Crown' icon (lucide, 'w-4 h-4', 'text-white/70') followed by "Independent Creative Powerhouse" in 'text-white/70', 'text-xs sm:text-sm', 'font-inter', 'tracking-[0.3em]', uppercase. Uses 'animate-fade-up' (no delay). Has 'mb-6 lg:mb-8'.

2. Main Heading: Three lines in 'font-podium', white, uppercase, 'leading-[0.92]', 'tracking-tight', each using 'text-[clamp(2.8rem,8vw,7rem)]':
   - "Craft."
   - "Elevate."
   - "Command."
   Uses 'animate-fade-up-delay-1' (0.2s delay).

3. Subtext: "We craft bold visual identities" (line break) "that don't just get noticed --" then bold white "they get remembered." in 'text-white/70', 'text-sm sm:text-base', 'font-inter', 'leading-relaxed', 'max-w-md'. Uses 'animate-fade-up-delay-2' (0.4s delay). 'mt-6 lg:mt-8'.

4. CTA Row: Uses 'animate-fade-up-delay-3' (0.6s delay), 'mt-8 lg:mt-10', 'flex flex-wrap items-center gap-4 sm:gap-6'.
   - Black button "EXPLORE OUR WORK" with 'ArrowUpRight' icon. 'bg-black hover:bg-neutral-900', 'px-5 sm:px-7 py-3 sm:py-4', 'text-[11px] sm:text-xs', 'tracking-widest', uppercase. Arrow has 'group-hover:translate-x-0.5 group-hover:-translate-y-0.5' transition.
   - Beside it (hidden on mobile, 'hidden sm:flex'): an 'Award' icon ('w-8 h-8', 'text-white/50') with two lines of text: "Industry-Leading" / "Design Studio" in 'text-white/60', 'text-xs', 'tracking-wider', uppercase.

5. Stats Row: Uses 'animate-fade-up-delay-4' (0.8s delay), 'mt-8 sm:mt-10 lg:mt-14', 'flex flex-wrap gap-6 sm:gap-12 lg:gap-16'. Three stats:
   - "180+" / "Projects Delivered"
   - "98%" / "Client Satisfaction"
   - "12+" / "Years of Craft"
   Values in 'font-inter', white, 'text-2xl sm:text-4xl lg:text-5xl', bold, 'tracking-tight'. Labels in 'text-white/50', 'text-[9px] sm:text-xs', 'tracking-widest', uppercase, 'mt-1'.

CSS Animations (defined in index.css under '@layer utilities'):

@keyframes fade-up {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes scale-in {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}

With classes: '.animate-fade-up' (0s delay), '.animate-fade-up-delay-1' through '.animate-fade-up-delay-4' (0.2s increments, starting 'opacity: 0'), '.animate-fade-in', '.animate-fade-in-delay'.

Responsive behavior:
- Full layout is mobile-first with breakpoints at 'sm' (640px), 'md' (768px), and 'lg' (1024px).
- Nav links and "START A PROJECT" button show at 'md'+; hamburger shows below 'md'.
- Award badge hides on mobile ('hidden sm:flex').
- All text sizes, paddings, gaps, and margins scale up through 'sm:' and 'lg:' prefixes.
- Stats and CTA row use 'flex-wrap' to prevent overflow on small screens.

Make everything fully mobile responsive. Use a single 'App.tsx' component with 'useState' for the menu toggle. No routing needed.`
      }
    ]
  }
].filter(t => !t.id.startsWith('hero-'));
