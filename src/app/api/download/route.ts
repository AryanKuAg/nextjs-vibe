import { NextRequest, NextResponse } from "next/server";
import * as https from "https";
import * as http from "http";

export async function GET(req: NextRequest) {
  const urlStr = req.nextUrl.searchParams.get("url");
  if (!urlStr) {
    return NextResponse.json({ error: "Missing url param" }, { status: 400 });
  }

  // Ensure valid URL
  if (!urlStr.startsWith("http://") && !urlStr.startsWith("https://")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { buffer, contentType } = await new Promise<{buffer: Buffer, contentType: string}>((resolve, reject) => {
      const isHttps = urlStr.startsWith("https://");
      const client = isHttps ? https : http;
      
      const request = client.get(urlStr, { family: 4 }, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          // Handle redirect
          client.get(res.headers.location, { family: 4 }, (redirectRes) => {
            const chunks: Buffer[] = [];
            redirectRes.on("data", (chunk) => chunks.push(chunk));
            redirectRes.on("end", () => resolve({
              buffer: Buffer.concat(chunks),
              contentType: redirectRes.headers["content-type"] || "application/octet-stream"
            }));
            redirectRes.on("error", reject);
          }).on("error", reject);
          return;
        }
        
        if (!res.statusCode || res.statusCode >= 400) {
          reject(new Error(`Failed to fetch asset: ${res.statusCode}`));
          return;
        }

        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => resolve({
          buffer: Buffer.concat(chunks),
          contentType: res.headers["content-type"] || "application/octet-stream"
        }));
      });

      request.on("error", reject);
      request.on("timeout", () => {
        request.destroy();
        reject(new Error("Timeout"));
      });
      request.setTimeout(15000);
    });

    const ext = contentType.includes("png") ? "png" : contentType.includes("jpeg") ? "jpg" : contentType.includes("mp4") ? "mp4" : "bin";
    const filename = `spatial-${Date.now()}.${ext}`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${filename}"`,
        "Content-Length": String(buffer.byteLength),
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (err) {
    console.error("[download] error:", err);
    return NextResponse.json({ error: "Proxy failed" }, { status: 500 });
  }
}
