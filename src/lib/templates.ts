import { VideoBlock } from "@/modules/projects/ui/components/background-builder-right";

export interface Template {
  id: string;
  name: string;
  coverUrl: string;
  blocks: VideoBlock[];
  rawHtml?: string;
}

export const TEMPLATES: Template[] = [
  {
    id: "template-1",
    name: "Airplane",
    coverUrl: "https://storage.googleapis.com/sites.framerate.space/templates/airplane_1.png",
    rawHtml: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
    <style>body { font-family: 'Inter', sans-serif; }</style>
</head>
<body class="bg-black text-white overflow-hidden">
    <video src="{{VIDEO_URL}}" autoplay loop muted playsinline class="absolute inset-0 w-full h-full object-cover z-0 opacity-60"></video>
    <div class="relative z-10 flex flex-col items-center justify-center h-screen px-4 text-center">
        <h1 class="text-5xl md:text-7xl font-extrabold tracking-tighter mb-6">Explore the Skies</h1>
        <p class="text-lg md:text-xl text-gray-300 max-w-2xl mb-10">Discover new horizons with our premium travel packages. Your journey begins here.</p>
        <button class="bg-white text-black px-8 py-4 rounded-full font-semibold hover:scale-105 transition-transform">Book Now</button>
    </div>
</body>
</html>`,
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
    rawHtml: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
    <style>body { font-family: 'Inter', sans-serif; }</style>
</head>
<body class="bg-black text-white">
    <div class="fixed inset-0 z-0 flex items-center justify-center opacity-50">
        <p class="text-gray-500">Interactive Scroll Background placeholder<br/>ZIP: {{FRAMES_ZIP_URL}}</p>
    </div>
    <div class="relative z-10 space-y-[100vh] py-[50vh] px-8 text-center">
        <section>
            <h1 class="text-6xl font-bold mb-4">Section 1</h1>
            <p class="text-xl">Scroll down to see the sequence animate.</p>
        </section>
        <section>
            <h1 class="text-6xl font-bold mb-4">Section 2</h1>
            <p class="text-xl">The background frames change as you scroll.</p>
        </section>
    </div>
</body>
</html>`,
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

];
