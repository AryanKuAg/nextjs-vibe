export const extractLastFrame = (videoUrl: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.src = videoUrl;
    video.muted = true;
    video.playsInline = true;

    // First wait for metadata to know the duration
    video.onloadedmetadata = () => {
      // Seek to very near the end
      // Sometimes duration can be slightly inaccurate or seeking to exact duration fails,
      // so we subtract 0.1s. If video is shorter than 0.1s, seek to duration.
      video.currentTime = Math.max(0, video.duration - 0.1);
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Failed to get canvas 2d context"));
          return;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/png");
        resolve(dataUrl);
      } catch (err) {
        reject(err);
      }
    };

    video.onerror = (e) => {
      reject(new Error("Error loading video for frame extraction: " + e));
    };

    // Load the video to trigger metadata event
    video.load();
  });
};
