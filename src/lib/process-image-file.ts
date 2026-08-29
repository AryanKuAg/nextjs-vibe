/** Longest edge, in pixels, that an uploaded reference is scaled down to. */
const MAX_EDGE = 2048;

/**
 * Reads a user-selected image into a data URL, downscaled and re-encoded.
 *
 * The downscale is not cosmetic: an un-resized phone photo or 4K screenshot
 * produces a data URL of several megabytes, which is large enough to be rejected
 * on the way to the server and far larger than any vision model needs. 2048px on
 * the longest edge is more than enough to read a layout from, and still good
 * enough to serve as a 16:9 reference frame.
 */
export const processImageFile = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      reject(new Error("Unsupported format. Use JPEG, PNG, WebP, or GIF."));
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      reject(new Error("Image must be under 15MB."));
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new window.Image();
      img.onload = () => {
        const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          resolve(ev.target?.result as string);
          return;
        }

        // Transparent PNGs would otherwise composite onto black once flattened
        // into JPEG, which reads as a completely different design.
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.9));
      };
      img.onerror = () => reject(new Error("Failed to decode image."));
      img.src = ev.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsDataURL(file);
  });
